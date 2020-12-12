import React, {useContext} from 'react';
import {LangContext, Props, StateEnum} from "../App";
import CanvasDraw from "react-canvas-draw";
import {Progress} from "../utils/Progress";
import {i8n} from "../utils/I8n";

export function ScoresComponent(props: Props) {
    const l = useContext(LangContext);
    if (!props.game || props.game.state !== StateEnum.ACTION_SCORES) {
        return (<div/>);
    }

    const game = props.game;

    return (<div style={{textAlign: "center", marginTop: "2vh", padding: "1em"}} className={"middiv"}>
            <CanvasDraw
                disabled={true}
                saveData={game.namePic}
                immediateLoading={true}
                canvasWidth={Math.min(window.innerWidth * 0.7, 750)}
                canvasHeight={window.innerHeight * 0.5}
                style={{display: "inline-block", marginBottom: "10px"}}
                lazyRadius={0}/>
        <p style={{fontSize: "25px"}} className="text-center">
            {i8n(l, "picBelongsToAndGotPoints")} <b>{game.turnWord}</b>
        </p>
        <div style={{overflow: "auto"}}>
            <table className="table">
                <thead>
                <tr>
                    <th scope="col">{i8n(l, "name")}</th>
                    <th scope="col">{i8n(l, "action")}</th>
                    <th scope="col">{i8n(l, "mislead")}</th>
                    <th scope="col">{i8n(l, "score")}</th>
                </tr>
                </thead>
                <tbody>
                <tr key={game.turn}>
                    <td>{game.turn}</td>
                    <td>{i8n(l, "author")}</td>
                    <td></td>
                    <td>{game.players.find((p) => p.name === game.turn).score} (+{game.turnScore})</td>
                </tr>
                {game.guesses.map((g) => <tr key={g.name}>
                    <td>{g.name}</td>
                    <td>{g.guessed_word === game.turnWord ? i8n(l,"guessed") : i8n(l, "couldnotguess")}</td>
                    <td>{game.guesses.reduce((p, c) => c.guessed_word === g.chosen_word ? p + 1 : p, 0)}</td>
                    <td>{game.players.find((p) => p.name === g.name).score} (+{g.score})</td>
                </tr>)}
                </tbody>
            </table>
            <Progress remaining={game.remainingSec} total={game.stateSeconds}/>
        </div>
    </div>)
}