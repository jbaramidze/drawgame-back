import React, {useContext} from "react";
import {Link} from "react-router-dom";
import {i8n} from "../utils/I8n";
import {MainContext} from "../utils/Context";
import {FinishedGameResponse} from "../utils/Server";

export function FinishedComponent(props: Props) {
    const ctx = useContext(MainContext);
    const game = props.game;

    return (
        <div className={"middiv"} style={{textAlign: "center", marginTop: "5vh", padding: "1em"}}>
            <p style={{fontSize: "25px"}} className="text-center">
                {i8n(ctx.lang, "gameOver")}
            </p>
            <div>
                <table className="table">
                    <thead>
                        <tr>
                            <th scope="col">{i8n(ctx.lang, "name")}</th>
                            <th scope="col">{i8n(ctx.lang, "score")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {game.players.map((g) => (
                            <tr key={g.name}>
                                <td>{g.name}</td>
                                <td>{g.score}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Link to="/" className="btn btn-primary btn-lg btn-block">
                {i8n(ctx.lang, "startOver")}!
            </Link>
        </div>
    );
}

interface Props {
    game: FinishedGameResponse;
    name: string;
}
