export type Languages = "ge" | "en";

const map = new Map<string, {[key in Languages]: string}>([
    ["name", {ge: "სახელი", en: "name"}],
    ["createGame", {ge: "თამაშის შექმნა", en: "Create game"}],
    ["joinGame", {ge: "მიერთება", en: "Join game"}],
    ["code", {ge: "კოდი", en: "code"}],
    ["connect", {ge: "დაკავშირება", en: "Connect"}],
    ["create", {ge: "შექმნა", en: "Create"}],
    ["operationFailed", {ge: "ოპერაცია ჩაფლავდა", en: "Operation failed"}],
    ["before20p", {ge: "20 ქულამდე", en: "Till 20 points"}],
    ["before40p", {ge: "40 ქულამდე", en: "Till 40 points"}],
    ["before60p", {ge: "60 ქულამდე", en: "Till 60 points"}],
    ["players", {ge: "მოთამაშეები", en: "Players"}],
    ["start", {ge: "დაწყება", en: "Start"}],
    ["clear", {ge: "წაშლა", en: "Clear"}],
    ["accepted", {ge: "მიღებულია", en: "Accepted"}],
    ["send", {ge: "გაგზავნა", en: "Send"}],
    ["waitingFor", {ge: "ველოდები", en: "Waiting for"}],
    ["pleaseDraw", {ge: "დახატე", en: "Please draw"}],
    [
        "waitingTillPeopleChoose",
        {
            ge: "ველოდებით როდის აარჩევენ.....",
            en: "Waiting for others to choose....",
        },
    ],
    [
        "choosePicName",
        {
            ge: "აარჩიე სურათის სახელი....",
            en: "Guess the original name of the pic",
        },
    ],
    ["gameOver", {ge: "დამთავრდა!", en: "Game over!"}],
    ["score", {ge: "ქულა", en: "score"}],
    ["startOver", {ge: "ახლიდან", en: "Play again"}],
    [
        "waitingForOthersToName",
        {
            ge: "ველოდებით როდის მოუფიქრებენ სხვები სახელს.....",
            en: "Waiting till others will think up a name for this.....",
        },
    ],
    ["accept", {ge: "დაფიქსირება", en: "accept"}],
    ["picBelongsToAndGotPoints", {ge: "ეს არის ", en: "This is "}],
    ["namedThePic", {ge: "სურათს დაარქვა", en: "Named the pic"}],
    ["chose", {ge: "აარჩია", en: "Chose"}],
    ["total", {ge: "სულ", en: "Total"}],
    ["action", {ge: "მოქმედება", en: "Action"}],
    ["nooneGuessed", {ge: "ვერავინ გამოიცნო", en: "Noone guessed"}],
    ["someGuessed", {ge: "ზოგმა გამოიცნო", en: "Some guessed"}],
    ["guessed", {ge: "გამოიცნო", en: "Guessed"}],
    ["couldnotguess", {ge: "ვერ გამოიცნო", en: "Could not guess"}],
    ["mislead", {ge: "შეაცდინა", en: "Mislead"}],
    ["author", {ge: "ავტორი", en: "Author"}],
]);

export function i8n(
    l: Languages,
    key: string,
    args: Array<string | number> = []
) {
    let data: string = map.get(key)?.[l]!;
    for (let i = 0; i < args.length; i++) {
        data = data.replace(`@${i}@`, String(args[i]));
    }

    return data;
}
