import React, {useEffect, useState} from "react";
import "bootstrap/dist/css/bootstrap.css";
import "./App.css";
import {WelcomeComponent} from "./components/welcome.component";
import {PregameComponent} from "./components/pregame.component";
import {WaitForPicComponent} from "./components/waitForPicComponent";
import axios, {AxiosResponse} from "axios";
import {ChooseComponent} from "./components/chooseComponent";
import {NameComponent} from "./components/nameComponent";
import {ScoresComponent} from "./components/scoresComponent";
import {FinishedComponent} from "./components/finishedComponent";
import {getAuthHeader} from "./utils/Auth";
import {MainContext} from "./utils/Context";
import {Languages} from "./utils/I8n";
import {StateEnum, Response, ResponseIsOk, GameResponse} from "./utils/Server";

export const BEURL = process.env.REACT_APP_BEURL || "";

export function App() {
    const [code, setCode] = useState<string>(sessionStorage.getItem("code") || "");
    const [name, setName] = useState<string>(sessionStorage.getItem("name") || "");
    const [game, setGame] = useState<GameResponse | null>(null);

    useEffect(() => {
        if (!name || !code) {
            return;
        }

        const poll = async () => {
            let response: AxiosResponse<Response<GameResponse>>;
            try {
                response = await axios.get(BEURL + "/api/game/" + code + "?user=" + name, getAuthHeader());
            } catch (e) {
                setTimeout(poll, 1500);
                return;
            }

            if (!ResponseIsOk(response.data)) {
                setTimeout(poll, 1500);
                return;
            }

            setGame(response.data.data);

            if (response.data.data.state === StateEnum.FINISHED) {
                sessionStorage.removeItem("code");
                sessionStorage.removeItem("name");
                sessionStorage.removeItem("hash");
                return;
            }

            setTimeout(poll, 800);
        };

        poll();
    }, [code, name]);

    return (
        <MainContext.Provider value={{lang: (localStorage.getItem("lang") as Languages) || "en"}}>
            {game == null && <WelcomeComponent setCode={setCode} name={name} setName={setName} />}
            {game?.state === StateEnum.CREATED && <PregameComponent name={name!} game={game} />}
            {game?.state === StateEnum.WAITING_FOR_INITIAL_PIC && <WaitForPicComponent name={name!} game={game} />}
            {game?.state === StateEnum.ACTION_NAME && <NameComponent name={name!} game={game} />}
            {game?.state === StateEnum.ACTION_CHOOSE && <ChooseComponent name={name!} game={game} />}
            {game?.state === StateEnum.ACTION_SCORES && <ScoresComponent name={name!} game={game} />}
            {game?.state === StateEnum.FINISHED && <FinishedComponent name={name!} game={game} />}
        </MainContext.Provider>
    );
}
