import {randomString} from "../utils/other";
import Game from "../models/game.model";
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

    public async getGame(code: string): Promise<Response<null>> {
        const game = await Game.findOne({code}, {"_id": 0, "__v": 0, "createdAt": 0, "updatedAt": 0, "players._id": 0});
        if (!game) {
            return ResponseFail(-1);
        }

        return ResponseOk(game.toObject());
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
        await Game.updateOne({code}, {$push: {players: {name: user, word}}});
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

        await Game.updateOne({code}, {$set: {state: "started"}});
        return ResponseOk(null);
    }
}

export interface GeneratedGameCode {
    code: string;
}