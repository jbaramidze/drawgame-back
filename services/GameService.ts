import {randomString} from "../utils/other";
import Game, {StateEnum} from "../models/game.model";
import {Response, ResponseFail, ResponseOk} from "../utils/Response";
import {GameServiceHelpers} from "./GameServiceHelpers";

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
                    name: p.name
                }
            }),
            state: game.state,
            word: game.players.find((e) => e.name === user)?.word
        };

        if (game.state === StateEnum.ACTION_NAME) {
            const turnId = game.permutation[game.stage];
            ret.namePic = game.players[turnId].pic;
            if (game.players[turnId].name === user) {
                ret.myTurn = true;
            }
        } else if (game.state === StateEnum.ACTION_CHOOSE) {
            const turnId = game.permutation[game.stage];
            ret.namePic = game.players[turnId].pic;
            if (game.players[turnId].name === user) {
                ret.myTurn = true;
            }

            ret.chooseWord = [...(await Game.aggregate([
                {$match: {code}},
                {$unwind: "$players"},
                {$group: {
                    _id:  1,
                    words: {
                        $push: "$players.stage.chosen_word"
                    }
                }}
                ]
            ))[0].words, game.players[turnId].word]
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
        const game = await Game.findOne({code}, {"state": 1});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "created") {
            return ResponseFail(-2);
        }

        const word = await this.helper.getNonexistentWord(code);
        await Game.updateOne({code}, {$push: {players: this.getPlayer(user, word)}});
        return ResponseOk(null);
    }

    private getPlayer(user: string, word: string) {
        return {
            name: user,
            word,
            waiting_for_action: false,
            score: 0
        };
    }

    // state:created -> state:waiting_for_initial_pic
    public async startGame(code: string, user: string): Promise<Response<null>> {
        const game = await Game.findOne({code}, {"state": 1, "owner": 1});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "created") {
            return ResponseFail(-2);
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

        await Game.updateOne({code, players: {$elemMatch: {name: user}}}, {$set: {"players.$.pic": pic, "players.$.waiting_for_action": false}});
        await this.helper.checkAndAdvanceState(code, game);
        return ResponseOk(null);
    }

    // state:action_name -> state:action_choose
    public async pickWord(code: string, player: string, word: string): Promise<Response<null>> {
        const game = await Game.findOne({code}, {"state": 1, "players": "1", "stages": 1});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "action_name") {
            return ResponseFail(-2);
        }

        await Game.updateOne({code, players: {$elemMatch: {name: player}}}, {
            $set: {
                "players.$.stage.chosen_word": word,
                "players.$.waiting_for_action": false
            }
        });

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