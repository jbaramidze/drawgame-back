import {Context} from "./Context";

export class Logger {
    constructor(private readonly name: string) {}

    public info(ctx: Context, data: string, meta?: any) {
        this.log(ctx, Severity.INFO, data, meta);
    }
    public warning(ctx: Context, data: string, meta?: any) {
        this.log(ctx, Severity.WARNING, data, meta);
    }
    public error(ctx: Context, data: string, meta?: any) {
        this.log(ctx, Severity.ERROR, data, meta);
    }

    private log(ctx: Context, severity: Severity, data: string, meta?: any) {
        console.log(`${ctx.getPrefix()}: !${String(severity).toUpperCase()}! ${data} ${meta ? JSON.stringify(meta) : ""}`);
    }
}

enum Severity {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
}
