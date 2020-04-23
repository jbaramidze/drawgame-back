import {randomString} from "../utils/other";
import Game, {StateEnum} from "../models/game.model";
import Word from "../models/word.model";
import {ResponseOk, Response, ResponseFail} from "../utils/Response";

export class GameService {
    public async newGame(user: string): Promise<Response<GeneratedGameCode>> {
        const code = randomString(4);
        const word = await this.getNonexistentWord(code);
        const game = new Game({code, owner: user, players: [{name: user, word}], state: "created"});
        await game.save();
        return ResponseOk({code});
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

        return ResponseOk(ret);
    }

    public async joinGame(code: string, user: string): Promise<Response<null>> {
        const game = await Game.findOne({code}, {"state": 1});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "created") {
            return ResponseFail(-2);
        }

        const word = await this.getNonexistentWord(code);
        await Game.updateOne({code}, {$push: {players: {name: user, word, waiting: true}}});
        return ResponseOk(null);
    }

    public async savePic(code: string, user: string, pic: string): Promise<Response<null>> {
        const game = await Game.findOne({code}, {"state": 1});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "waiting_for_initial_pic") {
            return ResponseFail(-2);
        }

        await Game.updateOne({code, players: {$elemMatch: {name: user}}}, {$set: {"players.$.pic": pic, "players.$.waiting": false}});

        if ((await Game.find({code, "players.waiting": true})).length === 0) {
            await Game.updateOne({code}, {$set: {state: "started"}});
        }

        return ResponseOk(null);
    }

    private async getNonexistentWord(code: string) {
        const count = await Word.countDocuments();
        let word;
        do {
            const index = Math.floor(Math.random() * count);
            const words = await Word.find();
            word = words[index].get("word");
        } while ((await Game.find({"$and": [{code}, {"players.word": word}]})).length > 0);

        return word;
    }

    public async startGame(code: string, user: string): Promise<Response<null>> {
        const game = await Game.findOne({code}, {"state": 1, "owner": 1});
        if (!game) {
            return ResponseFail(-1);
        }

        if (game.get("state") !== "created") {
            return ResponseFail(-2);
        }

        await Game.updateOne({code}, {$set: {state: "waiting_for_initial_pic"}});
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
};