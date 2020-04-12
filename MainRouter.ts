import express from "express"
import {body, validationResult, param} from "express-validator";
import {GameService} from "./services/GameService";

export class MainRouter {
    private readonly router = express.Router();

    constructor(private readonly gameService: GameService) {

        this.router.post("/game",
            [body('user').isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                res.json(await this.gameService.newGame(req.body.user));
            });

        this.router.get("/game/:code",
            [param("code").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                res.json(await this.gameService.getGame(req.params.code))
            });

        this.router.post("/game/:code/join",
            [body('user').isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                res.json(await this.gameService.joinGame(req.params.code, req.body.user));
            });
    }

    private validate(req: any, res: any) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({errors: errors.array()});
            return false;
        }

        return true;
    }

    public getRouter() {
        return this.router;
    }
}
