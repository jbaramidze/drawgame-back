import mongoose from "mongoose";

var gameSchema = new mongoose.Schema({
    code: String,
    owner: String,
    players: [{name: String, word: String}],
    state: {
        type: String,
        enum: ["created", "started", "finished"]
    }
}, {timestamps: true});

export default mongoose.model('game', gameSchema);