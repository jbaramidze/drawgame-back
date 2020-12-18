export interface Response<T> {
    code: number;
    data?: T
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
        data: data
    };
}

export function ResponseFail(code: number, hint?: string): FailureResponse {
    return {
        code: code,
        hint
    };
}

export function ResponseIsOk(response: Response<any>) {
    return response.code === 0;
}
