import mongoose from "mongoose";

const wordSchema = new mongoose.Schema({
    word: String,
    lang: String
}, {timestamps: true});

export default mongoose.model('word', wordSchema);