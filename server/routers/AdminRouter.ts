import express from "express";
import {body, validationResult} from "express-validator";
import {AdminService} from "../services/AdminService";

export class AdminRouter {
    private readonly router = express.Router();

    constructor(private readonly adminService: AdminService) {
        this.router.post(
            "/word",
            [body("word").isString().notEmpty(), body("lang").isString().notEmpty()],
            // @ts-ignore
            async (req, res) => {
                if (!this.validate(req, res)) {
                    return;
                }

                res.json(await this.adminService.addWord(req.body.lang, req.body.word));
            }
        );

        this.router.get(
            "/word",
            [],
            // @ts-ignore
            async (req, res) => {
                res.json(await this.adminService.getAllWords());
            }
        );
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
