import {MongooseDocument} from "mongoose";
import Game from "../models/game.model";
import Word from "../models/word.model";
import Stage from "../models/stage.model";
import {POINTS_CORRECT_GUESS, POINTS_FOR_MISLEADING_SOMEONE, POINTS_WIN_ON_YOUR_TURN} from "../server";

export class GameServiceHelpers {
    public async checkAndAdvanceState(code: string) {
        const game = await Game.findOne({code});
        if (game.get("players").find((p) => p.waiting_for_action)) {
            return
        }

        if (game.get("state") === "waiting_for_initial_pic") {
            const count = game.get("players").length;
            await Game.updateOne({code}, {
                $set: {
                    state: "action_name",
                    permutation: this.randomPermutation(count),
                    "players.$[].waiting_for_action": true
                }
            });

            // FIXME: Can we do in 1 go?
            await Game.updateOne({code}, {$set: {"players.0.waiting_for_action": false}});
        } else if (game.get("state") === "action_name") {
            await Game.updateOne({code}, {
                $set: {
                    state: "action_choose",
                    "players.$[].waiting_for_action": true
                }
            });

            await Game.updateOne({code}, {$set: {"players.0.waiting_for_action": false}});
        } else if (game.get("state") === "action_choose") {

            const gameObject = game.toObject();
            const nonTurnPlayers = gameObject.players.filter((player) => player.stage);

            // update scores of the guy whose turn it was
            const correctGuessers = this.getCorrectGuessers(game);
            const totalPlayers = this.getAllPlayersCount(game);
            const currentTurnName = this.getCurrentTurnName(game);
            const currentTurnWord = this.getCurrentTurnWord(game);
            let scoreOfTurnPlayer = 0;
            if (correctGuessers !== 0 && correctGuessers !== totalPlayers) {
                scoreOfTurnPlayer = POINTS_WIN_ON_YOUR_TURN;
            }

            // update scores of other guys
            const map = new Map<string, number>();
            this.getAllPlayerNames(game)
                .filter((p) => p !== currentTurnName)
                .forEach((p) => map.set(p, 0))

            nonTurnPlayers.forEach((p) => {
                if (p.stage.guessed_word === currentTurnWord) {
                    map.set(p.name, map.get(p.name) + POINTS_CORRECT_GUESS);
                } else {
                    const lier = nonTurnPlayers.find((i) => i.stage.chosen_word === p.stage.guessed_word).name;
                    map.set(lier, map.get(lier) + POINTS_FOR_MISLEADING_SOMEONE);
                }
            });

            const stage = new Stage({
                game: gameObject._id,
                stage: gameObject.stage,
                name: this.getCurrentTurnName(game),
                word: this.getCurrentTurnWord(game),
                pic: this.getCurrentTurnPic(game),
                score: scoreOfTurnPlayer,
                guesses: nonTurnPlayers.map((player) => {
                    return {
                        name: player.name,
                        chosen_word: player.stage.chosen_word,
                        guessed_word: player.stage.guessed_word,
                        score: map.get(player.name)
                    };
                })
            });
            await stage.save();

            await Game.updateOne({code, players: {$elemMatch: {name: currentTurnName}}}, {
                $inc: {
                    "players.$.score": scoreOfTurnPlayer
                }
            });

            for (const [k, v] of map.entries()) {
                await Game.updateOne({code, players: {$elemMatch: {name: k}}}, {
                    $inc: {
                        "players.$.score": v
                    }
                });
            }

            // Change state, delete stage
            await Game.updateOne({code}, {
                $set: {
                    "state": "action_scores"
                },
                $unset: {
                    "players.$[].stage": ""
                }
            });
        }
    }

    public getCorrectGuessers(game: MongooseDocument) {
        const word = this.getCurrentTurnWord(game);
        let count = 0;
        game.toObject().players.map((p) => {
            if (p.stage && p.stage.guessed_word === word) {
                count++;
            }
        })

        return count;
    }

    public async getNonexistentWord(code: string) {
        const count = await Word.countDocuments();
        let word;
        do {
            const index = Math.floor(Math.random() * count);
            const words = await Word.find();
            word = words[index].get("word");
        } while ((await Game.find({"$and": [{code}, {"players.word": word}]})).length > 0);

        return word;
    }

    public getCurrentTurnPic(game: MongooseDocument) {
        const turnId = game.get("permutation")[game.get("stage")];
        return game.get("players")[turnId].pic;
    }

    public getCurrentTurnName(game: MongooseDocument) {
        const turnId = game.get("permutation")[game.get("stage")];
        return game.get("players")[turnId].name;
    }

    public getCurrentTurnWord(game: MongooseDocument) {
        const turnId = game.get("permutation")[game.get("stage")];
        return game.get("players")[turnId].word;
    }

    public getAllPlayerNames(game: MongooseDocument) {
        return game.get("players").toObject().map((v) => v.name)
    }

    public getAllPlayersCount(game: MongooseDocument) {
        return game.get("players").length;
    }

    public async getAllWordsToGuess(game: MongooseDocument) {
        const others = (await Game.aggregate([
                {$match: {code: game.get('code')}},
                {$unwind: "$players"},
                {$group: {
                        _id:  1,
                        words: {
                            $push: {
                                word: "$players.stage.chosen_word",
                                owner: "$players.name"
                            }
                        }
                    }}
            ]
        ))[0].words;

        return [...(others.filter((w) => w.word)), {word: this.getCurrentTurnWord(game), owner: game.get("owner")}];
    }

    public getPlayer(user: string, word: string) {
        return {
            name: user,
            word,
            waiting_for_action: false,
            score: 0
        };
    }

    public randomPermutation(n: number) {
        const result = new Array(n)
        result[0] = 0
        for(let i = 1; i < n; ++i) {
            const idx = (Math.random()*(i+1))|0
            if(idx < i) {
                result[i] = result[idx]
            }
            result[idx] = i
        }
        return result
    }
}