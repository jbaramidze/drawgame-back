import React, {useContext, useState} from 'react';
import axios from "axios";
import {BEURL, LangContext, Props, StateEnum} from "../App";
import {i8n} from "../utils/I8n";

export function PregameComponent(props: Props) {
    const l = useContext(LangContext);
    const [error, setError] = useState(0);
    const [sent, setSent] = useState(false);

    if (!props.game || props.game.state !== StateEnum.CREATED) {
        return (<div/>);
    }

    const startGame = async () => {
        setSent(true);
        const response = await axios.post(BEURL + "/api/game/" + props.game.code + "/start", {user: props.name});
        if (response.data.code < 0) {
            setSent(false);
            setError(response.data.code);
        } else {
            setError(0);
        }
    };

    const playersList = props.game.players.map((v) => {
        return <li key={v.name} className="list-group-item"> {v.name} </li>
    });


    return (
        <div className={"middiv"}>
            <p style={{fontSize: "25px"}} className="text-center">
                {i8n(l, "code")}:&nbsp;
                <span className={"pregame_code"}>
                    {props.game?.code}
                </span>
            </p>
            <p style={{fontSize: "25px"}} className="text-center">{i8n(l, "players")}:</p>
            <ul className="list-group">
                {playersList}
            </ul>
            { props.game.owner === props.name &&
                <button
                    onClick={startGame}
                    style={{marginTop: "15px"}}
                    className="btn btn-primary btn-lg btn-block"
                    disabled={props.game.players.length < 2 || sent}
                >
                    {i8n(l, "start")}!
                </button>
            }
            {error !== 0 && <div className="alert alert-danger" role="alert">
                {i8n(l, "operationFailed")}: {error}
            </div>}
        </div>
    );
}
