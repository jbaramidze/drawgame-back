export class Context {
    constructor(private readonly req: any,
               private readonly res: any) {
    }

    public getRes() {
        return this.res;
    }

    public getReq() {
        return this.req;
    }

    public getPrefix(): string {
        return `[${new Date().toISOString()}] ${this.req.method}: ${this.req.baseUrl}${this.req.url}`;
    }
}
