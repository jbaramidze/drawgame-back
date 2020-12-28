import {randomString} from "../utils/other";
export class Context {
    private readonly hash = randomString(10);
    constructor(private readonly req: any, private readonly res: any) {}

    public getHash(): string {
        return this.hash;
    }

    public getRes() {
        return this.res;
    }

    public getReq() {
        return this.req;
    }

    public getPrefix(): string {
        // Pad nicely
        let method: string = this.req.method;
        while (method.length < 4) {
            method += " ";
        }
        return `${method}: ${decodeURI(this.req.baseUrl + this.req.url)}`;
    }
}
