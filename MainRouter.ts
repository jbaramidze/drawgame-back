import express from "express"
import {GameService} from "./services/GameService";

export class MainRouter {
    private readonly router = express.Router();

    constructor(private readonly gameService: GameService) {

        this.router.post("/game", async (req, res) => {
            res.json(await this.gameService.newGame(req.body));
        });

        this.router.get("/game/:code", async (req, res) => {
            res.json(await this.gameService.getGame(req.params.code))
        });

        this.router.post("/game/:code/join", async (req, res) => {
            res.json(await this.gameService.joinGame(req.params.code, req.body));
        });
    }

    public getRouter() {
        return this.router;
    }
}
