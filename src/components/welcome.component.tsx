import React, {useContext, useState} from 'react';
import axios from "axios"
import {BEURL, LangContext} from "../App";
import Select from 'react-select';
import {i8n} from "../utils/I8n";

interface iOption { label: string; value: string; };

export function WelcomeComponent(props) {
    const l = useContext(LangContext);
    const options: iOption[] = [
        { value: '20', label: i8n(l, "before20p") },
        { value: '40', label: i8n(l, "before40p") },
        { value: '60', label: i8n(l, "before60p") }
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
            sessionStorage.setItem("name", props.name);
        }
    };

    const create = async () => {
        setSent(true);
        const response = await axios.post(BEURL + "/api/game/", {user: props.name, score: score.value, lang: l});
        const code = response.data.data.code;
        props.setCode(code);
        sessionStorage.setItem("code", code);
        sessionStorage.setItem("name", props.name);
    };

    const setLang = (lang: string) => {
        localStorage.setItem("lang", lang);
        window.location.reload(true);
    }

    return (
        <div className={"middiv"}>
            <div style={{height: "50px"}}>
                <a href={"#"} onClick={() => setLang("en")}>
                    <img style={{width: "64px", height: "35px", float: "right"}} src={"flag-en.jpg"}/>
                </a>
                <a href={"#"} onClick={() => setLang("ge")}>
                    <img style={{width: "64px", height: "35px", float: "right", marginRight: "10px"}} src={"flag-ge.jpg"}/>
                </a>
            </div>
            <div className="form-group">
                <input
                    type="text"
                    className="form-control"
                    placeholder={i8n(l, "name") + "...."}
                    disabled={connectToggled !== "none"}
                    onChange={(e) => props.setName(e.target.value)}
                    value={props.name}/>
            </div>
            <div className="form-group">
                <button
                    type="button"
                    className={"welcome_btn_l btn btn-primary"}
                    disabled={props.name.length === 0}
                    onClick={() => setConnectToggled("create")}>
                    {i8n(l, "createGame")}
                </button>
                <button
                    type="button"
                    disabled={props.name.length === 0}
                    onClick={() => setConnectToggled("connect")}
                    className="welcome_btn_r btn btn-success">
                    {i8n(l, "joinGame")}
                </button>
            </div>
            {connectToggled === "connect" &&
            [<div className="form-group" key={"div1"}>
                <input
                    type="text"
                    value={codeValue}
                    onChange={(e) => setCodeValue(e.target.value)}
                    className="form-control"
                    placeholder={i8n(l, "code")}/>
            </div>,
                <div className="form-group" key={"div2"}>
                <button
                    onClick={join}
                    disabled={sent}
                    style={{"width": "100%"}}
                    className="btn btn-success">
                    {i8n(l, "connect")}
                </button>
                </div>
            ]}
            {connectToggled === "create" &&
            [<div className="form-group" key={"div1"}>
                <Select
                    value={score}
                    options={options}
                    onChange={(e) => setScore(e as iOption)}
                />
            </div>,
                <div className="form-group" key={"div2"}>
                    <button
                        onClick={create}
                        disabled={sent}
                        style={{"width": "100%"}}
                        className="btn btn-success">
                        {i8n(l, "create")}
                    </button>
                </div>
            ]}
            {error !== 0 && <div className="alert alert-danger" role="alert">
                {i8n(l, "operationFailed")}: {error}
            </div>}
        </div>
    );
}
