import express from "express"
import {body, validationResult, param, query} from "express-validator";
import {GameService} from "../services/GameService";
import {DGError} from "../common/DGError";

export class GameRouter {
    private readonly router = express.Router();

    private async withErrorProcessing<T>(res: any, promise: Promise<T>): Promise<T> {
        try {
            return res.json(await promise);
        } catch (error) {
            if (error instanceof DGError) {
                res.status(422).json({errors: error.message});
                return ;
            } else {
                throw error;
            }
        }
    }

    constructor(private readonly gameService: GameService) {

        this.router.post("/",
            [body('user').isString().notEmpty(),
                     body('lang').isString().notEmpty(),
                     body('score').isNumeric().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                // FIXME: why do we need Numeric() if it has isNumeric?
                await this.withErrorProcessing(res, this.gameService.newGame(
                    req.body.user,
                    Number(req.body.score),
                    req.body.lang));
        })

        this.router.get("/:code",
            [param("code").isString().notEmpty(),
                      query("user").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                await this.withErrorProcessing(res, this.gameService.getGame(
                    req.params.code,
                    req.query.user
                ));
            });

        this.router.post("/:code/join",
            [body('user').isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                await this.withErrorProcessing(res, this.gameService.joinGame(
                    req.params.code,
                    req.body.user
                ));
            });

        this.router.post("/:code/start",
            [body("user").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                await this.withErrorProcessing(res, this.gameService.startGame(
                    req.params.code,
                    req.body.user
                ));
            });

        // FIXME: wtf is 1 doing there
        this.router.post("/:code/1/savepic",
            [body('user').isString().notEmpty(),
                      body('pic').isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                await this.withErrorProcessing(res, this.gameService.savePic(
                    req.params.code,
                    req.body.user,
                    req.body.pic
                ));
            });

        this.router.post("/:code/pickWord",
            [body('user').isString().notEmpty(),
                body('word').isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                await this.withErrorProcessing(res, this.gameService.pickWord(
                    req.params.code,
                    req.body.user,
                    req.body.word
                ));
            });

        this.router.post("/:code/guessWord",
            [body('user').isString().notEmpty(),
                body('word').isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                await this.withErrorProcessing(res, this.gameService.guessWord(
                    req.params.code,
                    req.body.user,
                    req.body.word
                ));
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
