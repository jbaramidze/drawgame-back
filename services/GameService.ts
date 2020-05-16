import {randomString} from "../utils/other";
import Game, {StateEnum} from "../models/game.model";
import Stage from "../models/stage.model";
import {Response, ResponseFail, ResponseOk} from "../utils/Response";
import {GameServiceHelpers} from "./GameServiceHelpers";
import {MAX_TIME_IN_ACTION_CHOOSE_SEC, MAX_TIME_IN_ACTION_NAME_SEC, MAX_TIME_IN_ACTION_SCORES_SEC} from "../index";

export class GameService {

    constructor(private readonly helper: GameServiceHelpers) {
    }

    public async getGame(code: string, user: string): Promise<Response<GameResponse>> {
        const gameDocument = await Game.findOne({code});
        if (!gameDocument) {
            return ResponseFail(-1);
        }

        const game = gameDocument.toObject();
        const ret: GameResponse = {
            code: game.code,
            owner: game.owner,
            players: game.players.map((p) => {
                return {
                    name: p.name,
                    score: p.score
                }
            }),
            state: game.state,
            word: game.players.find((e) => e.name === user)?.word,
            waitingFor: game.players.filter((e) => e.waiting_for_action).map((e) => e.name)
        };

        if (game.state === StateEnum.ACTION_NAME) {
            const remainingSec = MAX_TIME_IN_ACTION_NAME_SEC - (Date.now() - game.stageStartTime)/1000;
            if (remainingSec < 0) {
                await this.helper.checkAndAdvanceState(game, true);
                return this.getGame(code, user);
            }

            ret.namePic = this.helper.getCurrentTurnPic(gameDocument);
            if (this.helper.getCurrentTurnName(gameDocument) === user) {
                ret.myTurn = true;
            }
            ret.remainingSec = remainingSec;
        } else if (game.state === StateEnum.ACTION_CHOOSE) {
            const remainingSec = MAX_TIME_IN_ACTION_CHOOSE_SEC - (Date.now() - game.stageStartTime)/1000;
            if (remainingSec < 0) {
                await this.helper.checkAndAdvanceState(game, true);
                return this.getGame(code, user);
            }

            ret.namePic = this.helper.getCurrentTurnPic(gameDocument);
            if (this.helper.getCurrentTurnName(gameDocument) === user) {
                ret.myTurn = true;
            }
            ret.remainingSec = remainingSec;

            ret.chooseWord = (await this.helper.getAllWordsToGuess(gameDocument))
                .map((w) => w.word)
                .sort(() => Math.random() - 0.5);
        } else if (game.state === StateEnum.ACTION_SCORES) {
            const remainingSec = MAX_TIME_IN_ACTION_SCORES_SEC - (Date.now() - game.stageStartTime)/1000;
            if (remainingSec < 0) {
                await this.helper.checkAndAdvanceState(gameDocument, true);
                return this.getGame(code, user);
            }
            const lastStage = (await Stage.find({game: game._id}).sort({stage: -1}));
            ret.guesses = lastStage[0].get("guesses")
                .filter((g) => g.chosen_word)
                .map((g) => {
                    return {
                        name: g.name,
                        chosen_word: g.chosen_word,
                        guessed_word: g.guessed_word
                    }
                });
            ret.remainingSec = remainingSec;
        }

        return ResponseOk(ret);
    }

    // state:none -> state:created
    public async newGame(user: string): Promise<Response<GeneratedGameCode>> {
        const code = randomString(4);
        const word = await this.helper.getNonexistentWord(code);
        const game = new Game({code, owner: user, stage: 0, players: [this.helper.getPlayer(user, word)], state: "created", stageStartTime: Date.now()});
        await game.save();
        return ResponseOk({code});
    }

    // state:created
    public async joinGame(code: string, user: string): Promise<Response<null>> {
        const game = await Game.findOne({code});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "created") {
            return ResponseFail(-2);
        }

        if (this.helper.getAllPlayerNames(game).find((name) => name === user)) {
            return ResponseFail(-3);
        }

        const word = await this.helper.getNonexistentWord(code);
        await Game.updateOne({code}, {$push: {players: this.helper.getPlayer(user, word)}});
        return ResponseOk(null);
    }

    // state:created -> state:waiting_for_initial_pic
    public async startGame(code: string, user: string): Promise<Response<null>> {
        const game = await Game.findOne({code});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "created") {
            return ResponseFail(-2);
        }

        if (user !== game.get("owner")) {
            return ResponseFail(-3);
        }

        await Game.updateOne({code}, {$set: {
            state: StateEnum.WAITING_FOR_INITIAL_PIC,
            stageStartTime: Date.now(),
            "players.$[].waiting_for_action": true
        }});
        return ResponseOk(null);
    }

    // state:waiting_for_initial_pic -> state:action_name
    public async savePic(code: string, user: string, pic: string): Promise<Response<null>> {
        let game = await Game.findOne({code}, {"state": 1, "players": "1"});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "waiting_for_initial_pic") {
            return ResponseFail(-2);
        }

        const updated = await Game.updateOne({code, players: {$elemMatch: {name: user}}}, {$set: {
            "players.$.pic": pic,
            "players.$.waiting_for_action": false
        }});

        if (updated.nModified === 0) {
            return ResponseFail(-3);
        }

        game = await Game.findOne({code});
        await this.helper.checkAndAdvanceState(game);
        return ResponseOk(null);
    }

    // state:action_name -> state:action_choose
    public async pickWord(code: string, player: string, word: string): Promise<Response<null>> {
        let game = await Game.findOne({code});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "action_name") {
            return ResponseFail(-2);
        }

        if (this.helper.getCurrentTurnName(game) === player) {
            return ResponseFail(-3);
        }

        const updated = await Game.updateOne({code, players: {$elemMatch: {name: player}}}, {
            $set: {
                "players.$.stage.chosen_word": word,
                "players.$.waiting_for_action": false
            }
        });

        if (updated.nModified === 0) {
            return ResponseFail(-4);
        }

        game = await Game.findOne({code});
        await this.helper.checkAndAdvanceState(game);
        return ResponseOk(null);
    }

    // state:action_choose -> state:showing_scores -> state:action_name?
    public async guessWord(code: string, player: string, word: string): Promise<Response<null>> {
        let game = await Game.findOne({code});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "action_choose") {
            return ResponseFail(-2);
        }

        if (this.helper.getCurrentTurnName(game) === player) {
            return ResponseFail(-3);
        }

        const words = (await this.helper.getAllWordsToGuess(game)).filter((w) => w.word === word);

        if (words.length === 0) {
            return ResponseFail(-4);
        }

        // Let the user choose his word, if it's more then 1 times.
        if (words.length === 1 && words[0].owner === player) {
            return ResponseFail(-6);
        }

        const updated = await Game.updateOne({code, players: {$elemMatch: {name: player}}}, {
            $set: {
                "players.$.stage.guessed_word": word,
                "players.$.waiting_for_action": false
            }
        });

        if (updated.nModified === 0) {
            return ResponseFail(-5);
        }

        game = await Game.findOne({code});
        await this.helper.checkAndAdvanceState(game);
        return ResponseOk(null);
    }
}

export interface GeneratedGameCode {
    code: string;
}

export interface GameResponse {
    code: string;
    owner: string;
    players: Array<{
        name: string;
        score: number;
    }>;
    state: StateEnum;
    word?: string;
    waitingFor?: string;
    myTurn?: boolean; // ACTION_NAME, ACTION_CHOOSE
    namePic?: string; // ACTION_NAME, ACTION_CHOOSE
    chooseWord?: string[]; // ACTION_CHOOSE
    remainingSec?: number // ACTION_NAME, ACTION_CHOOSE, ACTION_SCORES
    guesses?: Array<{  // ACTION_SCORES
        name: string;
        chosen_word: string;
        guessed_word: string;
    }>;
};