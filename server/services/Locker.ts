import {sleep} from "../utils/other";
import {DGError} from "../common/DGError";
import {Context} from "./Context";

export abstract class BaseLocker {
    public abstract async lock(ctx: Context, word: string);
    public abstract async unlock(ctx: Context, word: string);
    public async withLock<T>(ctx: Context, word: string, cb: () => Promise<T>): Promise<T> {
        await this.lock(ctx, word);
        const response = await cb();
        await this.unlock(ctx, word);

        return response;
    }
}

export class LocalLocker extends BaseLocker {
    private readonly LOCK_RETRIES = 200;
    private readonly RETRY_PERIOD_MS = 50;
    private readonly M = new Map<string, {hash: string; c: number}>();
    public async lock(ctx: Context, word: string) {
        let acquired = false;
        if (!this.M.has(word)) {
            this.M.set(word, {hash: "", c: 0});
        }

        for (let i = 0; i < this.LOCK_RETRIES; i++) {
            const s = this.M.get(word);
            if (s.c === 0) {
                this.M.set(word, {hash: ctx.getHash(), c: 1});
                acquired = true;
                break;
            } else if (s.hash === ctx.getHash()) {
                s.c++;
                acquired = true;
                break;
            } else {
                await sleep(this.RETRY_PERIOD_MS);
            }
        }

        if (!acquired) {
            throw new DGError("Failed acquiring lock");
        }
    }

    public unlock(ctx: Context, word: string) {
        this.M.get(word).c--;
    }
}
