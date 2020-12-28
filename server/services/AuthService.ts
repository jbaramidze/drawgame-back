import {sign, verify} from "jsonwebtoken";
import {Response, ResponseFail, ResponseOk} from "../utils/Response";

export class AuthService {
    private readonly expire = "1h";
    constructor(private readonly secret: string) {}

    public createToken(code: string, user: string) {
        return sign(
            {
                code,
                user,
            },
            this.secret,
            {expiresIn: this.expire}
        );
    }

    public authenticate(code: string, user: string, headers: any): Response<null> {
        if (!headers["authorization"]) {
            return ResponseFail(-100, "Missing auth header");
        }

        const key = headers["authorization"].split(" ");
        if (!key) {
            return ResponseFail(-100, "Invalid auth header type");
        }

        let data;

        try {
            data = verify(key[1], this.secret);
        } catch (e) {
            return ResponseFail(-100, "Invalid auth header");
        }

        if (data["code"] !== code || data["user"] !== user) {
            return ResponseFail(-100, "Wrong auth header");
        }

        return ResponseOk(null);
    }
}
