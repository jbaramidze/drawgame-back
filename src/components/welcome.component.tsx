import React, {useContext, useState} from "react";
import axios from "axios";
import {BEURL} from "../App";
import Select from "react-select";
import {i8n} from "../utils/I8n";
import {MainContext} from "../utils/Context";

interface iOption {
    label: string;
    value: string;
}

export function WelcomeComponent(props: Props) {
    const ctx = useContext(MainContext);
    const options: iOption[] = [
        {value: "20", label: i8n(ctx.lang, "before20p")},
        {value: "40", label: i8n(ctx.lang, "before40p")},
        {value: "60", label: i8n(ctx.lang, "before60p")},
    ];

    const [codeValue, setCodeValue] = useState("");
    const [connectToggled, setConnectToggled] = useState<"none" | "connect" | "create">("none");
    const [sent, setSent] = useState(false);
    const [score, setScore] = useState(options[0]);
    const [error, setError] = useState(0);

    const join = async () => {
        setSent(true);
        const response = await axios.post(BEURL + "/api/game/" + codeValue + "/join", {user: props.name});
        if (response.data.code < 0) {
            setSent(false);
            setError(response.data.code);
        } else {
            setError(0);
            props.setCode(codeValue);
            sessionStorage.setItem("code", codeValue);
            sessionStorage.setItem("hash", response.data.data.token);
            sessionStorage.setItem("name", props.name);
        }
    };

    const create = async () => {
        setSent(true);
        const response = await axios.post(BEURL + "/api/game/", {
            user: props.name,
            score: score.value,
            lang: ctx.lang,
        });
        const code = response.data.data.code;
        props.setCode(code);
        sessionStorage.setItem("code", code);
        sessionStorage.setItem("hash", response.data.data.token);
        sessionStorage.setItem("name", props.name);
    };

    const setLang = (lang: string) => {
        localStorage.setItem("lang", lang);
        window.location.reload(true);
    };

    return (
        <div className={"middiv"}>
            <div style={{height: "50px"}}>
                <button onClick={() => setLang("en")} className="lang_en" />
                <button onClick={() => setLang("ge")} className="lang_ge" />
            </div>
            <div className="form-group">
                <input
                    type="text"
                    className="form-control"
                    placeholder={i8n(ctx.lang, "name") + "...."}
                    disabled={connectToggled !== "none"}
                    onChange={(e) => props.setName(e.target.value)}
                    value={props.name}
                />
            </div>
            <div className="form-group">
                <button
                    type="button"
                    className={"welcome_btn_l btn btn-primary"}
                    disabled={props.name.length === 0}
                    onClick={() => setConnectToggled("create")}
                >
                    {i8n(ctx.lang, "createGame")}
                </button>
                <button
                    type="button"
                    disabled={props.name.length === 0}
                    onClick={() => setConnectToggled("connect")}
                    className="welcome_btn_r btn btn-success"
                >
                    {i8n(ctx.lang, "joinGame")}
                </button>
            </div>
            {connectToggled === "connect" && [
                <div className="form-group" key={"div1"}>
                    <input
                        type="text"
                        value={codeValue}
                        onChange={(e) => setCodeValue(e.target.value)}
                        className="form-control"
                        placeholder={i8n(ctx.lang, "code")}
                    />
                </div>,
                <div className="form-group" key={"div2"}>
                    <button onClick={join} disabled={sent} style={{width: "100%"}} className="btn btn-success">
                        {i8n(ctx.lang, "connect")}
                    </button>
                </div>,
            ]}
            {connectToggled === "create" && [
                <div className="form-group" key={"div1"}>
                    <Select value={score} options={options} onChange={(e) => setScore(e as iOption)} />
                </div>,
                <div className="form-group" key={"div2"}>
                    <button onClick={create} disabled={sent} style={{width: "100%"}} className="btn btn-success">
                        {i8n(ctx.lang, "create")}
                    </button>
                </div>,
            ]}
            {error !== 0 && (
                <div className="alert alert-danger" role="alert">
                    {i8n(ctx.lang, "operationFailed")}: {error}
                </div>
            )}
        </div>
    );
}

interface Props {
    setCode: React.Dispatch<React.SetStateAction<string>>;
    name: string;
    setName: React.Dispatch<React.SetStateAction<string>>;
}
