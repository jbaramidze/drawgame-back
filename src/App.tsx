import React, {useEffect, useState} from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import "./App.css"
import {BrowserRouter, Route, Redirect} from 'react-router-dom';
import {WelcomeComponent} from "./components/welcome.component";
import {PregameComponent} from "./components/pregame.component";
import {WaitForPicComponent} from "./components/waitForPicComponent";
import axios from "axios";
import {ChooseComponent} from "./components/chooseComponent";
import {NameComponent} from "./components/nameComponent";
import {ScoresComponent} from "./components/scoresComponent";
import {FinishedComponent} from "./components/finishedComponent";

export const BEURL = process.env.REACT_APP_BEURL || "";

export const LangContext = React.createContext('en');

export function App() {
    const [code, setCode] = useState(sessionStorage.getItem("code"));
    const [name, setName] = useState(sessionStorage.getItem("name") || "");
    const [game, setGame] = useState(null);
    const [link, setLink] = useState(null);

    useEffect(() => {
        //return ;
        if (code === null) {
            setLink("/");
            return ;
        }

        const poll = async () => {
            const response = await axios.get(BEURL + "/api/game/" + code+"?user=" + name);

            setGame(response.data.data);
            if (response.data.data.state === StateEnum.CREATED) {
                setLink("/pregame");
            } else if (response.data.data.state === StateEnum.WAITING_FOR_INITIAL_PIC) {
                setLink("/game/waitingForPic");
            } else if (response.data.data.state === StateEnum.ACTION_NAME) {
                setLink("/game/actionName");
            } else if (response.data.data.state === StateEnum.ACTION_CHOOSE) {
                setLink("/game/actionChoose");
            } else if (response.data.data.state === StateEnum.ACTION_SCORES) {
                setLink("/game/actionScores");
            } else if (response.data.data.state === StateEnum.FINISHED) {
                setLink("/game/finished");
            }

            setTimeout(poll, 800);
        };

        poll()
    }, [code, name]);

    // const game2: GameResponse = {
    //     code: "GS0q",
    //     owner: "ჟანსკი",
    //     players: [
    //         {
    //             name: "ჟანსკი",
    //             score: 5
    //         },
    //         {
    //             name: "ქეთი",
    //             score: 3
    //         },
    //         {
    //             name: "ქუთა",
    //             score: 6
    //         }
    //     ],
    //     state: StateEnum.ACTION_SCORES,
    //     maxScore: 20,
    //     word: "სიტყვა 3",
    //     waitingFor: [],
    //     remainingSec: 16.279,
    //     stateSeconds: 20,
    //     namePic: "{\"lines\":[{\"points\":[{\"x\":94,\"y\":158},{\"x\":94,\"y\":158},{\"x\":95,\"y\":158},{\"x\":96,\"y\":158},{\"x\":98,\"y\":157},{\"x\":100,\"y\":155},{\"x\":107,\"y\":149},{\"x\":114,\"y\":145},{\"x\":121,\"y\":139},{\"x\":125,\"y\":135},{\"x\":131,\"y\":129},{\"x\":136,\"y\":123},{\"x\":137,\"y\":121},{\"x\":139,\"y\":116},{\"x\":141,\"y\":113},{\"x\":142,\"y\":111},{\"x\":143,\"y\":109},{\"x\":143,\"y\":108},{\"x\":143,\"y\":108},{\"x\":143,\"y\":107},{\"x\":143,\"y\":108},{\"x\":143,\"y\":112},{\"x\":142,\"y\":119},{\"x\":142,\"y\":124},{\"x\":140,\"y\":132},{\"x\":138,\"y\":149},{\"x\":135,\"y\":164},{\"x\":132,\"y\":179},{\"x\":129,\"y\":196},{\"x\":126,\"y\":215},{\"x\":121,\"y\":232},{\"x\":119,\"y\":240},{\"x\":114,\"y\":255},{\"x\":111,\"y\":266},{\"x\":110,\"y\":270},{\"x\":107,\"y\":277},{\"x\":106,\"y\":282},{\"x\":105,\"y\":284},{\"x\":104,\"y\":285},{\"x\":104,\"y\":286},{\"x\":104,\"y\":287},{\"x\":104,\"y\":287},{\"x\":104,\"y\":288},{\"x\":106,\"y\":288},{\"x\":108,\"y\":288},{\"x\":111,\"y\":288},{\"x\":115,\"y\":288},{\"x\":118,\"y\":288},{\"x\":123,\"y\":288},{\"x\":129,\"y\":288},{\"x\":135,\"y\":288},{\"x\":142,\"y\":288},{\"x\":149,\"y\":288},{\"x\":156,\"y\":288},{\"x\":164,\"y\":288},{\"x\":170,\"y\":289},{\"x\":173,\"y\":289},{\"x\":178,\"y\":290},{\"x\":181,\"y\":291},{\"x\":184,\"y\":292},{\"x\":186,\"y\":293},{\"x\":186,\"y\":293}],\"brushColor\":\"#444\",\"brushRadius\":1}],\"width\":400,\"height\":400}",
    //     turn: "ჟანსკი",
    //     turnScore: 5,
    //     turnWord: "სიტყვა 1",
    //     guesses: [
    //         {
    //             name: "ქეთი",
    //             guessed_word: "სიტყვა 1",
    //             score: 3
    //         },
    //         {
    //             name: "ქუთა",
    //             guessed_word: "სიტყვა 1",
    //             score: 3
    //         }
    //     ]
    // }
    //
    // const name2 = "janski";


    return (
        <BrowserRouter>
            <LangContext.Provider value={localStorage.getItem("lang") || "en"}>
            {link && <Redirect to={link}/>}
            <Route exact path={"/"}><WelcomeComponent setCode={setCode} name={name} setName={setName}/></Route>
            <Route path={"/pregame"}><PregameComponent game={game} name={name}/></Route>
            <Route path={"/game/waitingForPic"}><WaitForPicComponent game={game} name={name}/></Route>
            <Route path={"/game/actionName"}><NameComponent game={game} name={name}/></Route>
            <Route path={"/game/actionChoose"}><ChooseComponent game={game} name={name}/></Route>
            <Route path={"/game/actionScores"}><ScoresComponent game={game} name={name}/></Route>
            <Route path={"/game/finished"}><FinishedComponent game={game} name={name}/></Route>
            </LangContext.Provider>
        </BrowserRouter>
    );
}

export interface Props {
    game: GameResponse | null;
    name: string | null;
}

export interface BaseGameResponse {
    code: string;
    owner: string;
    maxScore: number;
    players: Array<{
        name: string;
        score: number;
    }>;
    state: StateEnum;
    word?: string;
    waitingFor?: string[];
};

export type GameResponse = CreateGameResponse | WaitingForPicGameResponsew | ActionNameGameResponse |
    ActionChooseGameResponse | ActionScoresGameResponse | FinishedGameResponse;

export interface CreateGameResponse extends BaseGameResponse {
    state: StateEnum.CREATED
}

export interface WaitingForPicGameResponsew extends BaseGameResponse {
    state: StateEnum.WAITING_FOR_INITIAL_PIC
}

export interface ActionNameGameResponse extends BaseGameResponse {
    state: StateEnum.ACTION_NAME;
    myTurn: boolean;
    namePic: string;
    stateSeconds: number;
    remainingSec: number;
}

export interface ActionChooseGameResponse extends BaseGameResponse {
    state: StateEnum.ACTION_CHOOSE;
    myTurn: boolean;
    namePic: string;
    chooseWord: string[];
    stateSeconds: number;
    remainingSec: number;
}

export interface ActionScoresGameResponse extends BaseGameResponse {
    state: StateEnum.ACTION_SCORES;
    stateSeconds: number;
    remainingSec: number;
    turn: string;
    turnScore: number;
    turnWord: string;
    namePic: string;
    guesses: Array<{
        name: string;
        chosen_word?: string;
        guessed_word?: string;
        score: number;
    }>;
}

export interface FinishedGameResponse extends BaseGameResponse {
    state: StateEnum.FINISHED;
}

export enum StateEnum {
    CREATED = "created",
    WAITING_FOR_INITIAL_PIC = "waiting_for_initial_pic",
    ACTION_NAME = "action_name",
    ACTION_CHOOSE = "action_choose",
    ACTION_SCORES = "action_scores",
    FINISHED = "finished"
}
