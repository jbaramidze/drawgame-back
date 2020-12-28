export class DGError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "DGError";
    }
}
