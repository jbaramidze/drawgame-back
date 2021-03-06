import React, {useContext, useState} from "react";
import {BEURL} from "../App";
import CanvasDraw from "react-canvas-draw";
import axios from "axios";
import {Progress} from "./helpers/Progress";
import {i8n} from "../utils/I8n";
import {getAuthHeader} from "../utils/Auth";
import {MainContext} from "../utils/Context";
import {ActionNameGameResponse} from "../utils/Server";

export function NameComponent(props: Props) {
    const ctx = useContext(MainContext);
    const [word, setWord] = useState("");
    const [error, setError] = useState(0);
    const [sent, setSent] = useState(false);

    const nameThePic = async () => {
        setSent(true);
        const response = await axios.post(BEURL + "/api/game/" + props.game.code + "/pickWord", {user: props.name, word: word}, getAuthHeader());
        if (response.data.code < 0) {
            setSent(false);
            setError(response.data.code);
        } else {
            setError(0);
        }
    };

    const game = props.game;
    const waitingForMe = props.game && props.game.waitingFor?.includes(props.name);

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
                    {i8n(ctx.lang, "waitingForOthersToName")}
                </p>
            )}
            {!game.myTurn && (
                <div>
                    <p style={{fontSize: "25px"}} className="text-center">
                        {" "}
                        ეს არის:{" "}
                    </p>
                    <div className="form-group">
                        <input
                            type="text"
                            value={word}
                            className="form-control"
                            onChange={(e) => setWord(e.target.value)}
                            placeholder={i8n(ctx.lang, "name") + "...."}
                        />
                    </div>
                    <div className="form-group">
                        <button
                            style={{marginTop: "15px"}}
                            type="button"
                            disabled={sent || !waitingForMe || word === ""}
                            className="btn btn-primary btn-lg btn-block"
                            onClick={nameThePic}
                        >
                            {i8n(ctx.lang, "accept")}
                        </button>
                    </div>
                </div>
            )}
            <Progress remaining={game.remainingSec} total={game.stateSeconds} />
            {error !== 0 && (
                <div className="alert alert-danger" role="alert">
                    {i8n(ctx.lang, "operationFailed")}: {error}
                </div>
            )}
            <p style={{paddingTop: "10px"}} className="text-monospace">
                ველოდები: {props.game.waitingFor?.join(", ")}
            </p>
        </div>
    );
}

interface Props {
    game: ActionNameGameResponse;
    name: string;
}
