import mongoose from "mongoose";

var gameSchema = new mongoose.Schema({
    code: String,
    owner: String,
    players: [String]
}, {timestamps: true});

export default mongoose.model('game', gameSchema);