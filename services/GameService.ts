import {randomString} from "../utils/other";
import Game, {StateEnum} from "../models/game.model";
import {Response, ResponseFail, ResponseOk} from "../utils/Response";
import {GameServiceHelpers} from "./GameServiceHelpers";
import {MongooseDocument} from "mongoose";

export class GameService {

    constructor(private readonly helper: GameServiceHelpers) {
    }

    private getCurrentTurnPic(game: MongooseDocument) {
        const turnId = game.get("permutation")[game.get("stage")];
        return game.get("players")[turnId].pic;
    }

    private getCurrentTurnName(game: MongooseDocument) {
        const turnId = game.get("permutation")[game.get("stage")];
        return game.get("players")[turnId].name;
    }

    private getCurrentTurnWord(game: MongooseDocument) {
        const turnId = game.get("permutation")[game.get("stage")];
        return game.get("players")[turnId].word;
    }

    private getAllPlayerNames(game: MongooseDocument) {
        return game.get("players").toObject().map((v) => v.name)
    }

    private async getAllWordsToGuess(game: MongooseDocument) {
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

    private async getAllStageWords(game: MongooseDocument) {
        return game.get("stage")
    }

    private getPlayer(user: string, word: string) {
        return {
            name: user,
            word,
            waiting_for_action: false,
            score: 0
        };
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
                    name: p.name
                }
            }),
            state: game.state,
            word: game.players.find((e) => e.name === user)?.word
        };

        if (game.state === StateEnum.ACTION_NAME) {
            ret.namePic = this.getCurrentTurnPic(gameDocument);
            if (this.getCurrentTurnName(gameDocument) === user) {
                ret.myTurn = true;
            }
        } else if (game.state === StateEnum.ACTION_CHOOSE) {
            ret.namePic = this.getCurrentTurnPic(gameDocument);
            if (this.getCurrentTurnName(gameDocument) === user) {
                ret.myTurn = true;
            }

            ret.chooseWord = (await this.getAllWordsToGuess(gameDocument))
                .map((w) => w.word)
                .sort(() => Math.random() - 0.5);
        }

        return ResponseOk(ret);
    }

    // state:none -> state:created
    public async newGame(user: string): Promise<Response<GeneratedGameCode>> {
        const code = randomString(4);
        const word = await this.helper.getNonexistentWord(code);
        const game = new Game({code, owner: user, stage: 0, players: [this.getPlayer(user, word)], state: "created"});
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

        if (this.getAllPlayerNames(game).find((name) => name === user)) {
            return ResponseFail(-3);
        }

        const word = await this.helper.getNonexistentWord(code);
        await Game.updateOne({code}, {$push: {players: this.getPlayer(user, word)}});
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
            state: "waiting_for_initial_pic",
            "players.$[].waiting_for_action": true
        }});
        return ResponseOk(null);
    }

    // state:waiting_for_initial_pic -> state:action_name
    public async savePic(code: string, user: string, pic: string): Promise<Response<null>> {
        const game = await Game.findOne({code}, {"state": 1, "players": "1"});
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

        await this.helper.checkAndAdvanceState(code, game);
        return ResponseOk(null);
    }

    // state:action_name -> state:action_choose
    public async pickWord(code: string, player: string, word: string): Promise<Response<null>> {
        const game = await Game.findOne({code});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "action_name") {
            return ResponseFail(-2);
        }

        if (this.getCurrentTurnName(game) === player) {
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

        await this.helper.checkAndAdvanceState(code, game);
        return ResponseOk(null);
    }

    // state:action_choose -> state:showing_scores -> state:action_name?
    public async guessWord(code: string, player: string, word: string): Promise<Response<null>> {
        const game = await Game.findOne({code});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "action_choose") {
            return ResponseFail(-2);
        }

        if (this.getCurrentTurnName(game) === player) {
            return ResponseFail(-3);
        }

        if (!(await this.getAllWordsToGuess(game)).find((w) => w.word === word)) {
            return ResponseFail(-4);
        }

        if ((await this.getAllWordsToGuess(game)).find((w) => w.word === word).owner === player) {
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

        await this.helper.checkAndAdvanceState(code, game);
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
    }>;
    state: StateEnum;
    word?: string;
    myTurn?: boolean;
    namePic?: string;
    chooseWord?: string[];
};