// This file contains duplicates from server repo. CRA won't let us include files from outside src,
// so the easiest solution would be to duplicate interfaces.

export enum StateEnum {
    CREATED = "created",
    WAITING_FOR_INITIAL_PIC = "waiting_for_initial_pic",
    ACTION_NAME = "action_name",
    ACTION_CHOOSE = "action_choose",
    ACTION_SCORES = "action_scores",
    FINISHED = "finished",
}

export interface Response<T> {
    code: number;
    data?: T;
}

export interface SuccessResponse<T> extends Response<T> {
    code: 0;
    data: T;
}

export interface FailureResponse extends Response<any> {
    hint?: string;
}

export function ResponseOk<T>(data: T): SuccessResponse<T> {
    return {
        code: 0,
        data: data,
    };
}

export function ResponseFail(code: number, hint?: string): FailureResponse {
    return {
        code: code,
        hint,
    };
}

export function ResponseIsOk<T>(
    response: Response<T>
): response is SuccessResponse<T> {
    return response.code === 0;
}

export interface BaseGameResponse {
    code: string;
    owner: string;
    players: Array<{
        name: string;
        score: number;
    }>;
    maxScore: number;
    state: StateEnum;
    word?: string;
    waitingFor?: string[];
}

export type GameResponse =
    | CreateGameResponse
    | WaitingForPicGameResponsew
    | ActionNameGameResponse
    | ActionChooseGameResponse
    | ActionScoresGameResponse
    | FinishedGameResponse;

export interface CreateGameResponse extends BaseGameResponse {
    state: StateEnum.CREATED;
}

export interface WaitingForPicGameResponsew extends BaseGameResponse {
    state: StateEnum.WAITING_FOR_INITIAL_PIC;
}

export interface ActionNameGameResponse extends BaseGameResponse {
    state: StateEnum.ACTION_NAME;
    myTurn: boolean;
    namePic: string;
    stateSeconds: number;
    remainingSec: number;
}

export interface ActionChooseGameResponse extends BaseGameResponse {
    state: StateEnum.ACTION_CHOOSE;
    myTurn: boolean;
    namePic: string;
    chooseWord: string[];
    stateSeconds: number;
    remainingSec: number;
}

export interface ActionScoresGameResponse extends BaseGameResponse {
    state: StateEnum.ACTION_SCORES;
    stateSeconds: number;
    remainingSec: number;
    turn: string;
    turnScore: number;
    turnWord: string;
    namePic: string;
    guesses: Array<{
        name: string;
        chosen_word: string;
        guessed_word: string;
        score: number;
    }>;
}

export interface FinishedGameResponse extends BaseGameResponse {
    state: StateEnum.FINISHED;
}
