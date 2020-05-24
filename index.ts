import mongoose from "mongoose";
const app = require("./server");

// Scores
export const POINTS_WIN_ON_YOUR_TURN = 5;
export const POINTS_CORRECT_GUESS = 3;
export const POINTS_FOR_MISLEADING_SOMEONE = 1;

// Times
export const MAX_TIME_IN_ACTION_NAME_SEC = 60;
export const MAX_TIME_IN_ACTION_CHOOSE_SEC = 60;
export const MAX_TIME_IN_ACTION_SCORES_SEC = 20;

mongoose.connect("mongodb://localhost:27099/drawful", {useNewUrlParser: true, useUnifiedTopology: true})
    .catch((e) => {
        console.log("ERROR! Failed connecting to mongoose" + JSON.stringify(e));
    });

app.listen(3000, () => console.log(`Listening at http://localhost:${3000}`));

