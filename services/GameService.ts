import {randomString} from "../utils/other";
import Game from "../models/game.model";
import {ResponseOk, Response, ResponseFail} from "../utils/Response";

export class GameService {
    public async newGame(body: NewGameRequest): Promise<Response<GeneratedGameCode>> {
        const code = randomString(4);
        const game = new Game({code, owner: body.user, players: []});
        await game.save();
        return ResponseOk({code});
    }

    public async getGame(code: string): Promise<Response<null>> {
        const game = await Game.findOne({code});
        if (!game) {
            return ResponseFail(-1);
        }

        return ResponseOk(game.toObject());
    }

    public async joinGame(code: string, body: JoinGameRequest) {
        await Game.updateOne({code}, {$push: {players: body.user}});
        return ResponseOk(null);
    }
}

export interface NewGameRequest {
    user: string;
}

export interface JoinGameRequest {
    user: string;
}


export interface GeneratedGameCode {
    code: string;
}

export interface GameData {
    code: string;
    user: string;
    players: string[];
}