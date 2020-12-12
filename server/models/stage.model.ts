import mongoose from "mongoose";

const stageSchema = new mongoose.Schema({
    game: mongoose.Types.ObjectId,
    stage: Number,
    name: String,
    word: String,
    pic: String,
    score: Number,
    guesses: [{
        name: String,
        chosen_word: String,
        guessed_word: String,
        score: Number
    }]
}, {timestamps: true});

export default mongoose.model('stage', stageSchema);