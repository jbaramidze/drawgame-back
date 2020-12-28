import Word from "../models/word.model";
import {ResponseOk} from "../utils/Response";

export class AdminService {
    public async addWord(lang: string, word: string) {
        const item = new Word({lang, word});
        await item.save();

        return ResponseOk(null);
    }

    public async getAllWords() {
        const items = await Word.find({}, {lang: 1, word: 1, _id: 0});
        return ResponseOk(items);
    }
}
