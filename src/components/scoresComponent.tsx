import React, {useContext} from "react";
import CanvasDraw from "react-canvas-draw";
import {Progress} from "./helpers/Progress";
import {i8n} from "../utils/I8n";
import {MainContext} from "../utils/Context";
import {ActionScoresGameResponse} from "../utils/Server";

export function ScoresComponent(props: Props) {
    const ctx = useContext(MainContext);
    const game = props.game;

    return (
        <div
            style={{textAlign: "center", marginTop: "2vh", padding: "1em"}}
            className={"middiv"}
        >
            <CanvasDraw
                disabled={true}
                saveData={game.namePic}
                immediateLoading={true}
                canvasWidth={Math.min(window.innerWidth * 0.7, 750)}
                canvasHeight={window.innerHeight * 0.5}
                style={{display: "inline-block", marginBottom: "10px"}}
                lazyRadius={0}
            />
            <p style={{fontSize: "25px"}} className="text-center">
                {i8n(ctx.lang, "picBelongsToAndGotPoints")}{" "}
                <b>{game.turnWord}</b>
            </p>
            <div style={{overflow: "auto"}}>
                <table className="table">
                    <thead>
                        <tr>
                            <th scope="col">{i8n(ctx.lang, "name")}</th>
                            <th scope="col">{i8n(ctx.lang, "action")}</th>
                            <th scope="col">{i8n(ctx.lang, "mislead")}</th>
                            <th scope="col">{i8n(ctx.lang, "score")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr key={game.turn}>
                            <td>{game.turn}</td>
                            <td>{i8n(ctx.lang, "author")}</td>
                            <td></td>
                            <td>
                                {
                                    game.players.find(
                                        (p) => p.name === game.turn
                                    )!.score
                                }{" "}
                                (+{game.turnScore})
                            </td>
                        </tr>
                        {game.guesses.map((g) => (
                            <tr key={g.name}>
                                <td>{g.name}</td>
                                <td>
                                    {g.guessed_word === game.turnWord
                                        ? i8n(ctx.lang, "guessed")
                                        : i8n(ctx.lang, "couldnotguess")}
                                </td>
                                <td>
                                    {game.guesses.reduce(
                                        (p, c) =>
                                            c.guessed_word === g.chosen_word
                                                ? p + 1
                                                : p,
                                        0
                                    )}
                                </td>
                                <td>
                                    {
                                        game.players.find(
                                            (p) => p.name === g.name
                                        )!.score
                                    }{" "}
                                    (+{g.score})
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Progress
                    remaining={game.remainingSec}
                    total={game.stateSeconds}
                />
            </div>
        </div>
    );
}

interface Props {
    game: ActionScoresGameResponse;
    name: string;
}
