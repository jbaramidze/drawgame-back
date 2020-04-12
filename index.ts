import express, {Router} from "express"
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors"
import {MainRouter} from "./MainRouter"
import {GameService} from "./services/GameService";

async function init(router: Router) {
    const app = express();
    app.use(cors());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use("/", router);
    const port = 3000;

    (async() => {
        await mongoose.connect("mongodb://localhost:27017/drawful", {useNewUrlParser: true, useUnifiedTopology: true});
        app.listen(port, () => console.log(`Listening at http://localhost:${port}`));
    })();
}

const gameService = new GameService();
const mainRouter = new MainRouter(gameService);


init(mainRouter.getRouter()).then();


