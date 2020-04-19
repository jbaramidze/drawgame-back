import mongoose from "mongoose";

var wordSchema = new mongoose.Schema({
    word: String,
    language: String
}, {timestamps: true});

export default mongoose.model('word', wordSchema);