import mongoose from "mongoose";
const app = require("./server");

mongoose.connect("mongodb://localhost:27017/drawful", {useNewUrlParser: true, useUnifiedTopology: true})
    .catch((e) => {
        console.log("ERROR! Failed connecting to mongoose" + JSON.stringify(e));
    });

app.listen(3000, () => console.log(`Listening at http://localhost:${3000}`));

