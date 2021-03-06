import {MongooseDocument} from "mongoose";
import Game, {StateEnum} from "../models/game.model";
import Word from "../models/word.model";
import Stage from "../models/stage.model";
import {
    MAX_TIME_IN_ACTION_CHOOSE_SEC,
    MAX_TIME_IN_ACTION_NAME_SEC,
    MAX_TIME_IN_ACTION_SCORES_SEC,
    POINTS_CORRECT_GUESS,
    POINTS_FOR_MISLEADING_SOMEONE,
    POINTS_WIN_ON_YOUR_TURN,
} from "../index";
import {DGError} from "../common/DGError";
import {Logger} from "./Logger";
import {Context} from "./Context";

export class GameServiceHelpers {
    private readonly logger = new Logger("GameServiceHelpers");

    public applyPermutation(array: string[], permutation: number[]) {
        return new Array(array.length).fill(-1).map((_, i) => array[permutation[i]]);
    }

    public applyRandomPermutation(array: string[]) {
        return this.applyPermutation(array, this.randomPermutation(array.length));
    }

    public async checkAndAdvanceState(ctx: Context, game: MongooseDocument, force?: boolean) {
        if (!force && game.get("players").find((p) => p.waiting_for_action)) {
            return;
        }

        if (game.get("state") === StateEnum.WAITING_FOR_INITIAL_PIC) {
            const count = game.get("players").length;
            const permutation = this.randomPermutation(count);
            await Game.updateOne(
                {code: game.get("code")},
                {
                    $set: {
                        state: StateEnum.ACTION_NAME,
                        stageStartTime: Date.now(),
                        stageTillTime: Date.now() + MAX_TIME_IN_ACTION_NAME_SEC * 1000,
                        permutation,
                        "players.$[].waiting_for_action": true,
                    },
                }
            );

            // FIXME: Can we do in 1 go?
            game = await Game.findOne({code: game.get("code")});
            const turn = this.getCurrentTurnId(game);
            const key = `players.${turn}.waiting_for_action`;
            await Game.updateOne({code: game.get("code")}, {$set: {[key]: false}});
            this.logger.info(ctx, "Moving to state ACTION_NAME from WAITING_FOR_INITIAL_PIC", {permutation, turn});
        } else if (game.get("state") === StateEnum.ACTION_NAME) {
            await Game.updateOne(
                {code: game.get("code")},
                {
                    $set: {
                        state: StateEnum.ACTION_CHOOSE,
                        stageStartTime: Date.now(),
                        stageTillTime: Date.now() + MAX_TIME_IN_ACTION_CHOOSE_SEC * 1000,
                        "players.$[].waiting_for_action": true,
                    },
                }
            );

            const turn = this.getCurrentTurnId(game);
            const key = `players.${turn}.waiting_for_action`;
            await Game.updateOne({code: game.get("code")}, {$set: {[key]: false}});
            this.logger.info(ctx, "Moving to state ACTION_CHOOSE", {turn});
        } else if (game.get("state") === StateEnum.ACTION_CHOOSE) {
            const scores = this.getScoresMap(game);
            await this.createStage(game, scores);

            // Update scores
            for (const [k, v] of scores.entries()) {
                await Game.updateOne(
                    {code: game.get("code"), players: {$elemMatch: {name: k}}},
                    {
                        $inc: {
                            "players.$.score": v,
                        },
                    }
                );
            }

            game = await Game.findOne({code: game.get("code")});
            for (const player of game.get("players")) {
                if (player.score >= game.get("maxScore")) {
                    this.logger.info(ctx, "Moving to state FINISHED");
                    await Game.updateOne(
                        {code: game.get("code")},
                        {
                            $set: {
                                state: StateEnum.FINISHED,
                                stageStartTime: Date.now(),
                                "players.$[].waiting_for_action": false,
                            },
                            $unset: {
                                stageTillTime: "",
                                "players.$[].stage": "",
                            },
                        }
                    );

                    return;
                }
            }

            // Change state, delete stage
            this.logger.info(ctx, "Moving to state ACTION_SCORES");
            await Game.updateOne(
                {code: game.get("code")},
                {
                    $set: {
                        state: StateEnum.ACTION_SCORES,
                        stageStartTime: Date.now(),
                        "players.$[].waiting_for_action": false,
                        stageTillTime: Date.now() + MAX_TIME_IN_ACTION_SCORES_SEC * 1000,
                    },
                    $unset: {
                        "players.$[].stage": "",
                    },
                }
            );
        } else if (game.get("state") === StateEnum.ACTION_SCORES) {
            const stage = this.getCurrentStage(game);
            const playersNum = this.getAllPlayersCount(game);

            if ((stage + 1) % playersNum === 0) {
                const newWords = await this.getNNonexistentWords(
                    game.get("code"),
                    game.get("lang"),
                    game.get("players").length,
                    game.get("allUsedWords")
                );

                const words = {};
                const unset = {};
                for (let i = 0; i < newWords.length; i++) {
                    words[`players.${i}.word`] = newWords[i];
                    words[`players.${i}.waiting_for_action`] = true;
                    unset[`players.${i}.pic`] = "";
                }

                this.logger.info(ctx, "Moving to state WAITING_FOR_INITIAL_PIC", {newWords});
                await Game.updateOne(
                    {code: game.get("code")},
                    {
                        $set: {
                            state: StateEnum.WAITING_FOR_INITIAL_PIC,
                            stageStartTime: Date.now(),
                            ...words,
                        },
                        $unset: {
                            stageTillTime: "",
                            ...unset,
                        },
                        $push: {
                            allUsedWords: {$each: game.get("players").map((p) => p.word)},
                        },
                        $inc: {
                            stage: 1,
                        },
                    }
                );

                return game;
            }

            await Game.updateOne(
                {code: game.get("code")},
                {
                    $set: {
                        state: StateEnum.ACTION_NAME,
                        stageStartTime: Date.now(),
                        stageTillTime: Date.now() + MAX_TIME_IN_ACTION_NAME_SEC * 1000,
                        "players.$[].waiting_for_action": true,
                    },
                    $inc: {
                        stage: 1,
                    },
                }
            );
            game = await Game.findOne({code: game.get("code")});
            const turn = this.getCurrentTurnId(game);
            const key = `players.${turn}.waiting_for_action`;
            this.logger.info(ctx, "Moving to state ACTION_NAME from ACTION_SCORES", {turn});
            await Game.updateOne({code: game.get("code")}, {$set: {[key]: false}});
        }

        game = await Game.findOne({code: game.get("code")});
        return game;
    }

    private async createStage(game: MongooseDocument, scores: Map<string, number>) {
        const nonTurnPlayers = game.get("players").filter((player) => player.stage);
        const stage = new Stage({
            game: game.get("_id"),
            stage: game.get("stage"),
            name: this.getCurrentTurnName(game),
            word: this.getCurrentTurnWord(game),
            pic: this.getCurrentTurnPic(game),
            score: scores.get(this.getCurrentTurnName(game)),
            guesses: nonTurnPlayers.map((player) => {
                return {
                    name: player.name,
                    chosen_word: player.stage.chosen_word,
                    guessed_word: player.stage.guessed_word,
                    score: scores.get(player.name),
                };
            }),
        });
        await stage.save();
    }

    private getScoresMap(game: MongooseDocument) {
        // update scores of the guy whose turn it was
        const correctGuessers = this.getCorrectGuessers(game);
        const totalPlayers = this.getAllPlayersCount(game);
        const currentTurnName = this.getCurrentTurnName(game);
        const currentTurnWord = this.getCurrentTurnWord(game);
        let scoreOfTurnPlayer = 0;
        if (correctGuessers !== 0 && correctGuessers !== totalPlayers - 1) {
            scoreOfTurnPlayer = POINTS_WIN_ON_YOUR_TURN;
        }

        // update scores of other guys
        const map = new Map<string, number>();
        this.getAllPlayerNames(game).forEach((p) => map.set(p, 0));

        const nonTurnPlayers = game.get("players").filter((player) => !player.$isEmpty("stage"));
        nonTurnPlayers.forEach((p) => {
            if (p.stage.guessed_word === currentTurnWord) {
                map.set(p.name, map.get(p.name) + POINTS_CORRECT_GUESS);
            }
            const liers = nonTurnPlayers.filter(
                (i) =>
                    i.name !== p.name && // not himself
                    i.stage.chosen_word === p.stage.guessed_word // guy who offered the lying wor
            );
            for (const lier of liers) {
                map.set(lier.name, map.get(lier.name) + POINTS_FOR_MISLEADING_SOMEONE);
            }
        });

        map.set(currentTurnName, map.get(currentTurnName) + scoreOfTurnPlayer);

        return map;
    }

    public getCorrectGuessers(game: MongooseDocument) {
        const word = this.getCurrentTurnWord(game);
        let count = 0;
        game.toObject().players.forEach((p) => {
            if (p.stage && p.stage.guessed_word === word) {
                count++;
            }
        });

        return count;
    }

    public async getNNonexistentWords(code: string, lang: string, count: number, excludeWords: string[] = []) {
        const words: string[] = [];
        for (let i = 0; i < count; i++) {
            words.push(await this.getNonexistentWord(code, lang, [...excludeWords, ...words]));
        }

        return words;
    }

    public async getNonexistentWord(code: string, lang: string, excludeWords: string[] = []) {
        let triesLeft = 1000;
        const count = await Word.countDocuments({lang});
        if (count === 0) {
            throw new DGError("No words found!");
        }
        let word;
        do {
            triesLeft--;
            if (triesLeft === 0) {
                console.log("ERROR! could not find new word.");
                return "";
            }
            const index = Math.floor(Math.random() * count);
            const words = await Word.find({lang});
            word = words[index].get("word");
        } while (
            (await Game.find({$and: [{code}, {"players.word": word}]})).length > 0 ||
            // eslint-disable-next-line no-loop-func
            excludeWords.find((w) => w === word)
        );

        return word;
    }

    public getCurrentStage(game: MongooseDocument) {
        return game.get("stage");
    }

    public getCurrentTurnId(game: MongooseDocument) {
        return game.get("permutation")[game.get("stage") % game.get("players").length];
    }

    public getCurrentTurnPic(game: MongooseDocument) {
        const turnId = this.getCurrentTurnId(game);
        return game.get("players")[turnId].pic;
    }

    public getCurrentTurnName(game: MongooseDocument) {
        const turnId = this.getCurrentTurnId(game);
        return game.get("players")[turnId].name;
    }

    public getCurrentTurnWord(game: MongooseDocument) {
        const turnId = this.getCurrentTurnId(game);
        return game.get("players")[turnId].word;
    }

    public getAllPlayerNames(game: MongooseDocument) {
        return game
            .get("players")
            .toObject()
            .map((v) => v.name);
    }

    public getAllPlayersCount(game: MongooseDocument) {
        return game.get("players").length;
    }

    public async getAllWordsToGuess(game: MongooseDocument) {
        const others = (
            await Game.aggregate([
                {$match: {code: game.get("code")}},
                {$unwind: "$players"},
                {
                    $group: {
                        _id: 1,
                        words: {
                            $push: {
                                word: "$players.stage.chosen_word",
                                owner: "$players.name",
                            },
                        },
                    },
                },
            ])
        )[0].words;

        return [...others.filter((w) => w.word), {word: this.getCurrentTurnWord(game), owner: this.getCurrentTurnName(game)}];
    }

    public getPlayer(user: string, word: string) {
        return {
            name: user,
            word,
            waiting_for_action: false,
            score: 0,
        };
    }

    public randomPermutation(n: number) {
        const result = new Array(n);
        result[0] = 0;
        for (let i = 1; i < n; ++i) {
            const idx = (Math.random() * (i + 1)) | 0;
            if (idx < i) {
                result[i] = result[idx];
            }
            result[idx] = i;
        }
        return result;
    }
}
