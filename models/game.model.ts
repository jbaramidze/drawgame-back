import mongoose from "mongoose";

var gameSchema = new mongoose.Schema({
    code: String,
    owner: String,
    players: [{
        name: String,
        word: String,
        pic: String,
        waiting: Boolean
    }],
    state: {
        type: String,
        enum: ["created", "waiting_for_initial_pic", "action_name", "action_choose", "action_scores", "finished"],
    },
    permutation: [Number],
    stages: [{
        words: [{
            player: String,
            word: String
        }],
        guesses: [{
            player: String,
            guess: Number
        }]
    }]
}, {timestamps: true});

export default mongoose.model('game', gameSchema);

export enum StateEnum {
    CREATED = "created",
    WAITING_FOR_INITIAL_PIC = "waiting_for_initial_pic",
    ACTION_NAME = "action_name",
    ACTION_CHOOSE = "action_choose",
    ACTION_SCORES = "action_scores",
    FINISHED = "finished"
}