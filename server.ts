import express from "express"
import cors from "cors"
import {MainRouter} from "./MainRouter"
import {GameService} from "./services/GameService";

const gameService = new GameService();
const mainRouter = new MainRouter(gameService);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/", mainRouter.getRouter());

module.exports = app;

