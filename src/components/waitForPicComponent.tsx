import React, {useContext, useRef, useState} from 'react';
import {BEURL, LangContext, Props, StateEnum} from "../App";
import CanvasDraw from 'react-canvas-draw';
import axios from "axios";
import {i8n} from "../utils/I8n";

export function WaitForPicComponent(props: Props) {
    const l = useContext(LangContext);
    const [error, setError] = useState(0);
    const [sent, setSent] = useState(false);
    const canvasRef = useRef<CanvasDraw>();

    if (!props.game || props.game.state !== StateEnum.WAITING_FOR_INITIAL_PIC) {
        return (<div/>);
    }

    const clicked = async () => {
        try {
            if (JSON.parse(canvasRef.current?.getSaveData() as any).lines.length === 0) {
                return;
            }
        } catch (e) {
        }
        setSent(true);
        const response = await axios.post(BEURL + "/api/game/" + props.game.code + "/1/savepic", {
            user: props.name,
            pic: canvasRef.current?.getSaveData()
        });
        if (response.data.code < 0) {
            setSent(false);
            setError(response.data.code);
        } else {
            setError(0);
        }
    };

    const erase = async () => {
        canvasRef.current.clear();
    }

    const waitingForMe = (props.game && props.game.waitingFor.includes(props.name));

    return (<div className={"middiv"} style={{textAlign: "center", marginTop: "5vh", padding: "1em"}}>
        <p style={{fontSize: "25px"}} className="text-center">{i8n(l, "pleaseDraw")} {
            props.game.word
        }</p>
        <div>
        <CanvasDraw
            canvasWidth={Math.min(window.innerWidth * 0.7, 750)}
            canvasHeight={window.innerHeight * 0.5}
            ref={canvasRef}
            disabled={sent || !waitingForMe}
            style={{display: "inline-block", marginBottom: "20px"}}
            brushRadius={1}
            lazyRadius={0} />
        </div>
        <div>
        <button
            type="button"
            className="btn btn-secondary btn-sm welcome_btn_l"
            disabled={sent || !waitingForMe}
            onClick={erase}>
            {i8n(l, "clear")}
        </button>
        <button
            type="button"
            className="btn btn-primary btn-sm welcome_btn_r"
            disabled={sent || !waitingForMe}
            onClick={clicked}>
            {sent || !waitingForMe ? i8n(l, "accepted") : i8n(l, "send")}
        </button>
        </div>
        {error !== 0 && <div style={{marginTop: "10px"}} className="alert alert-danger" role="alert">
            {i8n(l, "operationFailed")}: {error}
        </div> }
        <p style={{paddingTop: "10px"}} className="text-monospace">{i8n(l, "waitingFor")}: {props.game.waitingFor.join(", ")}</p>

    </div>)
}
