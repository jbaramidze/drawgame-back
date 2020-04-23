import express from "express"
import {body, validationResult, param, query} from "express-validator";
import {GameService} from "../services/GameService";

export class GameRouter {
    private readonly router = express.Router();

    constructor(private readonly gameService: GameService) {

        this.router.post("/",
            [body('user').isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                res.json(await this.gameService.newGame(req.body.user));
            });

        this.router.get("/:code",
            [param("code").isString().notEmpty(),
                      query("user").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                res.json(await this.gameService.getGame(req.params.code, req.query.user))
            });

        this.router.post("/:code/join",
            [body('user').isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                res.json(await this.gameService.joinGame(req.params.code, req.body.user));
            });

        this.router.post("/:code/1/savepic",
            [body('user').isString().notEmpty(),
                      body('pic').isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                res.json(await this.gameService.savePic(req.params.code, req.body.user, req.body.pic));
            });

        this.router.post("/:code/start",
            [body("user").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                res.json(await this.gameService.startGame(req.params.code, req.body.user));
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
