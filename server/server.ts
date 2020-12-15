import express from "express"
import cors from "cors"
import {GameRouter} from "./routers/GameRouter"
import {GameService} from "./services/GameService";
import {AdminService} from "./services/AdminService";
import {AdminRouter} from "./routers/AdminRouter";
import {GameServiceHelpers} from "./services/GameServiceHelpers";
import path from "path";
import { LocalLocker } from './services/Locker';

const locker = new LocalLocker();
const gameServiceHelpers = new GameServiceHelpers();
const gameService = new GameService(gameServiceHelpers, locker);
const gameRouter = new GameRouter(gameService);

const adminService = new AdminService();
const adminRouter = new AdminRouter(adminService);

const app = express();
app.use(cors());
app.use(express.json());
const apiRouter = express.Router();
apiRouter.use("/game", gameRouter.getRouter());
apiRouter.use("/admin", adminRouter.getRouter());
app.use("/api", apiRouter);

const buildPath = path.join(__dirname, '..', 'build');
app.use(express.static(buildPath));

module.exports = app;

