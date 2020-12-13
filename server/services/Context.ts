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
        // Pad nicely
        let method: string = this.req.method;
        while(method.length < 5) {
            method += " ";
        }
        return `[${new Date().toISOString()}] ${method}: ${decodeURI(this.req.baseUrl + this.req.url)}`;
    }
}
