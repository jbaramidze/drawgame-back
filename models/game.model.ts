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
        enum: ["created", "waiting_for_initial_pic", "started", "finished"],
    },
    permutation: [Number],
    turn: Number
}, {timestamps: true});

export default mongoose.model('game', gameSchema);

export enum StateEnum {
    CREATED = "created",
    WAITING_FOR_INITIAL_PIC = "waiting_for_initial_pic",
    STARTED = "started",
    FINISHED = "finished"
}