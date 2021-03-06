import express from "express";
import {body, validationResult, param, query} from "express-validator";
import {GameService} from "../services/GameService";
import {DGError} from "../common/DGError";
import {Context} from "../services/Context";
import {Logger} from "../services/Logger";
import {Response, ResponseIsOk} from "../utils/Response";
import {AuthService} from "../services/AuthService";

export class GameRouter {
    private readonly router = express.Router();
    private readonly logger = new Logger("GameRouter");

    private async withErrorProcessing<T>(ctx: Context, promise: Promise<Response<T>>): Promise<Response<T>> {
        try {
            const data = await promise;
            if (data.code !== 0) {
                this.logger.warning(ctx, `Returning code ${data.code}`);
            }
            return ctx.getRes().json(data);
        } catch (error) {
            if (error instanceof DGError) {
                this.logger.warning(ctx, `Returning ${error.message}`);
                ctx.getRes().status(422).json({errors: error.message});
                return;
            } else {
                throw error;
            }
        }
    }

    constructor(private readonly gameService: GameService, private readonly auth: AuthService) {
        this.router.post(
            "/",
            [body("user").isString().notEmpty(), body("lang").isString().notEmpty(), body("score").isNumeric().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                const ctx = new Context(req, res);
                if (!this.validate(ctx)) {
                    return;
                }

                // FIXME: why do we need Numeric() if it has isNumeric?
                await this.withErrorProcessing(ctx, this.gameService.newGame(ctx, req.body.user, Number(req.body.score), req.body.lang));
            }
        );

        this.router.get(
            "/:code",
            [param("code").isString().notEmpty(), query("user").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                const ctx = new Context(req, res);
                if (!this.validate(ctx) || !this.authenticate(ctx)) {
                    return;
                }

                await this.withErrorProcessing(ctx, this.gameService.getGame(ctx, req.params.code, req.query.user));
            }
        );

        this.router.post(
            "/:code/join",
            [body("user").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                const ctx = new Context(req, res);
                if (!this.validate(ctx)) {
                    return;
                }

                await this.withErrorProcessing(ctx, this.gameService.joinGame(ctx, req.params.code, req.body.user));
            }
        );

        this.router.post(
            "/:code/start",
            [body("user").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                const ctx = new Context(req, res);
                if (!this.validate(ctx) || !this.authenticate(ctx)) {
                    return;
                }

                await this.withErrorProcessing(ctx, this.gameService.startGame(ctx, req.params.code, req.body.user));
            }
        );

        this.router.post(
            "/:code/savepic",
            [body("user").isString().notEmpty(), body("pic").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                const ctx = new Context(req, res);
                if (!this.validate(ctx) || !this.authenticate(ctx)) {
                    return;
                }

                await this.withErrorProcessing(ctx, this.gameService.savePic(ctx, req.params.code, req.body.user, req.body.pic));
            }
        );

        this.router.post(
            "/:code/pickWord",
            [body("user").isString().notEmpty(), body("word").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                const ctx = new Context(req, res);
                if (!this.validate(ctx) || !this.authenticate(ctx)) {
                    return;
                }

                await this.withErrorProcessing(ctx, this.gameService.pickWord(ctx, req.params.code, req.body.user, req.body.word));
            }
        );

        this.router.post(
            "/:code/guessWord",
            [body("user").isString().notEmpty(), body("word").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                const ctx = new Context(req, res);
                if (!this.validate(ctx) || !this.authenticate(ctx)) {
                    return;
                }

                await this.withErrorProcessing(ctx, this.gameService.guessWord(ctx, req.params.code, req.body.user, req.body.word));
            }
        );
    }

    private authenticate(ctx: Context) {
        const user = ctx.getReq().body.user ?? ctx.getReq().query.user;
        const authResponse = this.auth.authenticate(ctx.getReq().params.code, user, ctx.getReq().headers);

        if (!ResponseIsOk(authResponse)) {
            this.logger.warning(ctx, `Auth failed for user ${user}`, {authResponse});
            ctx.getRes().json(authResponse);
            return false;
        }

        return true;
    }

    private validate(ctx: Context) {
        const errors = validationResult(ctx.getReq());
        if (!errors.isEmpty()) {
            ctx.getRes().status(422).json({errors: errors.array()});
            return false;
        }

        return true;
    }

    public getRouter() {
        return this.router;
    }
}
