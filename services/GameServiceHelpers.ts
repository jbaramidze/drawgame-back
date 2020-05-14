import {MongooseDocument} from "mongoose";
import Game from "../models/game.model";
import Word from "../models/word.model";

export class GameServiceHelpers {
    public async checkAndAdvanceState(code: string, game: MongooseDocument) {
        if ((await Game.find({code, "players.waiting_for_action": true})).length > 0) {
            return
        }

        if (game.get("state") === "waiting_for_initial_pic") {
            const count = game.get("players").length;
            await Game.updateOne({code}, {$set: {
                    state: "action_name",
                    permutation: this.randomPermutation(count),
                    "players.$[].waiting_for_action": true
                }});

            // FIXME: Can we do in 1 go?
            await Game.updateOne({code}, {$set: {"players.0.waiting_for_action": false}});
        } else if (game.get("state") === "action_name") {
            await Game.updateOne({code}, {$set: {
                state: "action_choose",
                "players.$[].waiting_for_action": true
            }});

            await Game.updateOne({code}, {$set: {"players.0.waiting_for_action": false}});
        } else if (game.get("state") === "action_choose") {
            // NEXT: get stage info, copy to new collection, update points before this.
            await Game.updateOne({code}, {
                $set: {
                    state: "action_scores"
                },
                $unset: {
                    "players.$[].stage": ""
                }
            });
        }
    }

    public async getNonexistentWord(code: string) {
        const count = await Word.countDocuments();
        let word;
        do {
            const index = Math.floor(Math.random() * count);
            const words = await Word.find();
            word = words[index].get("word");
        } while ((await Game.find({"$and": [{code}, {"players.word": word}]})).length > 0);

        return word;
    }

    private randomPermutation(n: number) {
        const result = new Array(n)
        result[0] = 0
        for(let i = 1; i < n; ++i) {
            const idx = (Math.random()*(i+1))|0
            if(idx < i) {
                result[i] = result[idx]
            }
            result[idx] = i
        }
        return result
    }
}