import React from "react";

export function Progress(props: {remaining: number, total: number}) {
    const ratio = props.remaining / props.total * 100;
    return (
    <div className="progress">
        <div
            className="progress-bar"
            aria-valuenow={25}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar" style={{width: ratio + "%"}}>
        </div>
    </div>)
}