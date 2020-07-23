import {randomString} from "../utils/other";
import Game, {StateEnum} from "../models/game.model";
import Stage from "../models/stage.model";
import {Response, ResponseFail, ResponseOk} from "../utils/Response";
import {GameServiceHelpers} from "./GameServiceHelpers";
import {MAX_TIME_IN_ACTION_CHOOSE_SEC, MAX_TIME_IN_ACTION_NAME_SEC, MAX_TIME_IN_ACTION_SCORES_SEC} from "../index";
const md5 = require('md5');

export class GameService {

    constructor(private readonly helper: GameServiceHelpers) {
    }

    public async getGame(code: string, user: string): Promise<Response<GameResponse>> {
        const gameDocument = await Game.findOne({code});
        if (!gameDocument) {
            return ResponseFail(-1);
        }


        const game = gameDocument.toObject();
        if (!game.players.find((p) => p.name === user)) {
            return ResponseFail(-2);
        }

        const remainingSec = (game.stageTillTime - Date.now())/1000;
        if (game.stageTillTime && Date.now() > game.stageTillTime) {
            await this.helper.checkAndAdvanceState(gameDocument, true);
            return this.getGame(code, user);
        }

        const baseData: BaseGameResponse = {
                code: game.code,
                owner: game.owner,
                players: game.players.map((p) => {
                    return {
                        name: p.name,
                        score: p.score
                    }
                }),
                state: game.state,
                maxScore: Number(game.maxScore),
                word: game.players.find((e) => e.name === user)?.word,
                waitingFor: game.players.filter((e) => e.waiting_for_action).map((e) => e.name)
        };

        let response: GameResponse = null;

        switch (baseData.state) {
            case StateEnum.CREATED:
                response = {
                    ...baseData,
                    state: StateEnum.CREATED
                };
                break;

            case StateEnum.WAITING_FOR_INITIAL_PIC:
                response = {
                    ...baseData,
                    state: StateEnum.WAITING_FOR_INITIAL_PIC
                };
                break;

            case StateEnum.ACTION_NAME:
                response = {
                    ...baseData,
                    stateSeconds: MAX_TIME_IN_ACTION_NAME_SEC,
                    state: StateEnum.ACTION_NAME,
                    namePic: this.helper.getCurrentTurnPic(gameDocument),
                    myTurn: this.helper.getCurrentTurnName(gameDocument) === user,
                    remainingSec: remainingSec
                };
                break;

            case StateEnum.ACTION_CHOOSE:
                response = {
                    ...baseData,
                    stateSeconds: MAX_TIME_IN_ACTION_CHOOSE_SEC,
                    state: StateEnum.ACTION_CHOOSE,
                    namePic: this.helper.getCurrentTurnPic(gameDocument),
                    myTurn: this.helper.getCurrentTurnName(gameDocument) === user,
                    remainingSec: remainingSec,
                    chooseWord: (await this.helper.getAllWordsToGuess(gameDocument))
                        .map((w) => w.word)
                        .sort((w1, w2) => md5(w1) < md5(w2) ? 1 : -1)
                };
                break;

            case StateEnum.ACTION_SCORES:
                const lastStage = (await Stage.find({game: game._id}).sort({stage: -1}));
                const turnName = this.helper.getCurrentTurnName(gameDocument);
                response = {
                    ...baseData,
                    state: StateEnum.ACTION_SCORES,
                    remainingSec: remainingSec,
                    stateSeconds: MAX_TIME_IN_ACTION_SCORES_SEC,
                    namePic: this.helper.getCurrentTurnPic(gameDocument),
                    turn: turnName,
                    turnScore: lastStage[0].get("guesses").find((g) => g.name === turnName).score,
                    guesses: lastStage[0].get("guesses")
                        .filter((g) => g.name !== lastStage[0].get("name"))
                        .map((g) => {
                            return {
                                name: g.name,
                                chosen_word: g.chosen_word,
                                guessed_word: g.guessed_word,
                                score: g.score
                            }
                        })
                };
                break;

            case StateEnum.FINISHED: {
                response = {
                    ...baseData,
                    state: StateEnum.FINISHED,
                }
            }
        }

        return ResponseOk(response);
    }

    // state:none -> state:created
    public async newGame(user: string, score: number, lang: string): Promise<Response<GeneratedGameCode>> {
        const code = randomString(4);
        const word = await this.helper.getNonexistentWord(code, lang);
        const game = new Game({
            code,
            owner: user,
            stage: 0,
            lang,
            players: [this.helper.getPlayer(user, word)],
            state: "created",
            stageStartTime: Date.now(),
            maxScore: score,
            allUsedWords: []
        });
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

        const word = await this.helper.getNonexistentWord(code, game.get("lang"));
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

export interface BaseGameResponse {
    code: string;
    owner: string;
    players: Array<{
        name: string;
        score: number;
    }>;
    maxScore: number;
    state: StateEnum;
    word?: string;
    waitingFor?: string[];
};

export type GameResponse = CreateGameResponse | WaitingForPicGameResponsew | ActionNameGameResponse |
    ActionChooseGameResponse | ActionScoresGameResponse | FinishedGameResponse;

export interface CreateGameResponse extends BaseGameResponse {
    state: StateEnum.CREATED
}

export interface WaitingForPicGameResponsew extends BaseGameResponse {
    state: StateEnum.WAITING_FOR_INITIAL_PIC
}

export interface ActionNameGameResponse extends BaseGameResponse {
    state: StateEnum.ACTION_NAME;
    myTurn: boolean;
    namePic: string;
    stateSeconds: number;
    remainingSec: number;
}

export interface ActionChooseGameResponse extends BaseGameResponse {
    state: StateEnum.ACTION_CHOOSE;
    myTurn: boolean;
    namePic: string;
    chooseWord: string[];
    stateSeconds: number;
    remainingSec: number;
}

export interface ActionScoresGameResponse extends BaseGameResponse {
    state: StateEnum.ACTION_SCORES;
    stateSeconds: number;
    remainingSec: number;
    turn: string;
    turnScore: number;
    namePic: string;
    guesses: Array<{
        name: string;
        chosen_word: string;
        guessed_word: string;
        score: number;
    }>;
}

export interface FinishedGameResponse extends BaseGameResponse {
    state: StateEnum.FINISHED;
}