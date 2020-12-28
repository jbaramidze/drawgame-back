import React, {useContext, useState} from "react";
import {BEURL} from "../App";
import CanvasDraw from "react-canvas-draw";
import axios from "axios";
import {Progress} from "./helpers/Progress";
import {i8n} from "../utils/I8n";
import {getAuthHeader} from "../utils/Auth";
import {MainContext} from "../utils/Context";
import {ActionChooseGameResponse} from "../utils/Server";

export function ChooseComponent(props: Props) {
    const ctx = useContext(MainContext);
    const [error, setError] = useState(0);
    const [clicked, setClicked] = useState("");

    const click = async (e: any) => {
        setClicked(e.target.name);
        const response = await axios.post(
            BEURL + "/api/game/" + props.game.code + "/guessWord",
            {user: props.name, word: e.target.name},
            getAuthHeader()
        );
        if (response.data.code < 0) {
            setClicked("");
            setError(response.data.code);
        } else {
            setError(0);
        }
    };

    const game = props.game;

    const buttonArray = game.chooseWord.map((word) => {
        const disabled = clicked || game.myTurn;
        return (
            <button
                key={word}
                style={{
                    width: "40%",
                    height: "50px",
                    margin: "10px 5%",
                    fontSize: "18px",
                }}
                type="button"
                disabled={!!disabled}
                name={word}
                onClick={click}
                className={`btn ${clicked !== word ? "btn-primary" : "btn-info"} btn-sm`}
            >
                {word}
            </button>
        );
    });

    return (
        <div style={{textAlign: "center", marginTop: "2vh", padding: "1em"}} className={"middiv"}>
            <CanvasDraw
                disabled={true}
                saveData={game.namePic}
                immediateLoading={true}
                canvasWidth={Math.min(window.innerWidth * 0.7, 750)}
                canvasHeight={window.innerHeight * 0.5}
                style={{display: "inline-block", marginBottom: "10px"}}
                lazyRadius={0}
            />
            {game.myTurn && (
                <p style={{fontSize: "25px"}} className="text-center">
                    {i8n(ctx.lang, "waitingTillPeopleChoose")}
                </p>
            )}
            {!game.myTurn && (
                <p style={{fontSize: "25px"}} className="text-center">
                    {i8n(ctx.lang, "choosePicName")}
                </p>
            )}
            <div>{buttonArray}</div>
            <Progress remaining={game.remainingSec} total={game.stateSeconds} />
            {error !== 0 && (
                <div className="alert alert-danger" role="alert">
                    {i8n(ctx.lang, "operationFailed")}: {error}
                </div>
            )}
            <p style={{paddingTop: "10px"}} className="text-monospace">
                {i8n(ctx.lang, "waitingFor")}: {props.game.waitingFor?.join(", ")}
            </p>
        </div>
    );
}

interface Props {
    game: ActionChooseGameResponse;
    name: string;
}
