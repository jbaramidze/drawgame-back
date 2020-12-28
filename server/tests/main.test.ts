import "jest-extended";
import Game, {StateEnum} from "../models/game.model";
import mongoose from "mongoose";
import supertest from "supertest";
import {
    MAX_TIME_IN_ACTION_NAME_SEC,
    MAX_TIME_IN_ACTION_SCORES_SEC,
    POINTS_CORRECT_GUESS,
    POINTS_FOR_MISLEADING_SOMEONE,
    POINTS_WIN_ON_YOUR_TURN,
} from "../index";

const app = require("../server");

jest.setTimeout(30000);

describe("Post Endpoints", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_ADDR, {useNewUrlParser: true, useUnifiedTopology: true});
    });

    beforeEach(async () => {
        for (const collection in mongoose.connection.collections) {
            mongoose.connection.collections[collection].deleteMany({});
        }
    });

    afterAll(async () => {
        await app.close();
        await mongoose.disconnect();
    });

    let gameStateJanski;
    let gameStateKeti;
    let gameStateKatu;
    let code;
    let words = [];

    async function addWord(word, lang) {
        words.push({lang, word});

        let wordAdd = await supertest(app).post("/api/admin/word").send({lang, word});
        expect(wordAdd.body.code).toEqual(0);

        // Check words
        let w = await supertest(app).get("/api/admin/word").send();
        expect(w.body).toEqual({code: 0, data: words});
    }

    async function checkGameJanski() {
        let game = await supertest(app)
            .get("/api/game/" + code + "?user=janski")
            .set("Authorization", `Bearer ${PlayerTokenMap.get(Player.JANSKI)}`)
            .send();
        expect(game.body).toEqual({code: 0, data: gameStateJanski});
    }
    async function checkGameKeti() {
        let game = await supertest(app)
            .get("/api/game/" + code + "?user=keti")
            .set("Authorization", `Bearer ${PlayerTokenMap.get(Player.KETI)}`)
            .send();
        expect(game.body).toEqual({code: 0, data: gameStateKeti});
    }
    async function checkGameKatu() {
        let game = await supertest(app)
            .get("/api/game/" + code + "?user=katu")
            .set("Authorization", `Bearer ${PlayerTokenMap.get(Player.KATU)}`)
            .send();
        expect(game.body).toEqual({code: 0, data: gameStateKatu});
    }
    async function checkGame() {
        await checkGameJanski();
        await checkGameKeti();
        await checkGameKatu();
    }

    async function checkChooseFromWords(words: string[]) {
        gameStateJanski.chooseWord = words;
        gameStateKeti.chooseWord = words;
        gameStateKatu.chooseWord = words;
    }

    function setState(state: StateEnum) {
        gameStateKeti.state = state;
        gameStateJanski.state = state;
        gameStateKatu.state = state;
    }

    function setGuesses(guesses: any) {
        gameStateKeti.guesses = guesses;
        gameStateJanski.guesses = guesses;
        gameStateKatu.guesses = guesses;
    }

    function clearGuesses() {
        delete gameStateKeti.guesses;
        delete gameStateJanski.guesses;
        delete gameStateKatu.guesses;
    }

    function setStateSeconds(seconds: number) {
        gameStateKeti.stateSeconds = seconds;
        gameStateJanski.stateSeconds = seconds;
        gameStateKatu.stateSeconds = seconds;
    }

    function clearStateSeconds() {
        delete gameStateKeti.stateSeconds;
        delete gameStateJanski.stateSeconds;
        delete gameStateKatu.stateSeconds;
    }

    function setNamePic(pic: string) {
        gameStateKeti.namePic = pic;
        gameStateJanski.namePic = pic;
        gameStateKatu.namePic = pic;
    }

    function setWaiting(waiting: string[]) {
        gameStateKeti.waitingFor = waiting;
        gameStateJanski.waitingFor = waiting;
        gameStateKatu.waitingFor = waiting;
    }

    function setTurnName(turn: string, word: string, score: number) {
        gameStateJanski.turn = turn;
        gameStateKatu.turn = turn;
        gameStateKeti.turn = turn;
        gameStateJanski.turnScore = score;
        gameStateKatu.turnScore = score;
        gameStateKeti.turnScore = score;
        gameStateJanski.turnWord = word;
        gameStateKatu.turnWord = word;
        gameStateKeti.turnWord = word;
    }

    function clearTurnName() {
        delete gameStateJanski.turn;
        delete gameStateKatu.turn;
        delete gameStateKeti.turn;
        delete gameStateJanski.turnScore;
        delete gameStateKatu.turnScore;
        delete gameStateKeti.turnScore;
        delete gameStateJanski.turnWord;
        delete gameStateKatu.turnWord;
        delete gameStateKeti.turnWord;
    }

    function clearTurn() {
        gameStateJanski.myTurn = false;
        gameStateKatu.myTurn = false;
        gameStateKeti.myTurn = false;
    }

    function finishStage(janskiPoints: number, ketiPoints: number, katuPoints: number) {
        delete gameStateKeti.chooseWord;
        delete gameStateJanski.chooseWord;
        delete gameStateKatu.chooseWord;
        delete gameStateKeti.myTurn;
        delete gameStateJanski.myTurn;
        delete gameStateKatu.myTurn;

        const players = gameStateJanski.players;
        players.find((p) => p.name === "janski").score += janskiPoints;
        players.find((p) => p.name === "keti").score += ketiPoints;
        players.find((p) => p.name === "katu").score += katuPoints;

        gameStateJanski.players = players;
        gameStateKeti.players = players;
        gameStateKatu.players = players;
    }

    function setStateActionName(waiting: string[], pic: string, turn: any) {
        clearTurnName();
        clearGuesses();
        clearTurn();
        setState(StateEnum.ACTION_NAME);
        setWaiting(waiting);
        setNamePic(pic);
        turn.myTurn = true;
        setStateSeconds(MAX_TIME_IN_ACTION_NAME_SEC);

        gameStateJanski.remainingSec = expect.any(Number);
        gameStateKeti.remainingSec = expect.any(Number);
        gameStateKatu.remainingSec = expect.any(Number);
    }

    function setStateActionScores(guesses: any, tunName: string, turnWord: string, turnScore: number, p1: number, p2: number, p3: number) {
        setState(StateEnum.ACTION_SCORES);
        setGuesses(guesses);
        setTurnName(tunName, turnWord, turnScore);
        setWaiting([]);
        finishStage(p1, p2, p3);
        setStateSeconds(MAX_TIME_IN_ACTION_SCORES_SEC);
    }

    async function checkAndFixPermutation() {
        // Check and fix permutations before checking the game
        const permutations: any = await Game.findOne({code}).lean(true);
        const started = permutations.permutation[0];
        for (let i = 0; i < 3; i++) {
            expect(permutations.players[i].waiting_for_action).toEqual(i !== started);
        }

        expect((permutations as any).permutation.sort()).toEqual([0, 1, 2]);
        await Game.updateOne({code}, {$set: {permutation: [0, 1, 2], "players.$[].waiting_for_action": true}});
        await Game.updateOne({code}, {$set: {"players.0.waiting_for_action": false}});
    }

    function getInitialState(words: string[]) {
        const scores = gameStateJanski.players.map((i) => i.score);
        return {
            code,
            owner: "janski",
            maxScore: 50,
            players: [
                {name: "janski", score: scores[0]},
                {name: "keti", score: scores[1]},
                {name: "katu", score: scores[2]},
            ],
            state: StateEnum.WAITING_FOR_INITIAL_PIC,
            waitingFor: ["janski", "keti", "katu"],
            word: expect.toBeOneOf(words),
        };
    }

    enum Player {
        JANSKI = "janski",
        KETI = "keti",
        KATU = "katu",
    }

    const PlayerTokenMap = new Map();

    async function savePic(p: Player, data: any) {
        return (
            await supertest(app)
                .post("/api/game/" + code + "/savepic")
                .set("Authorization", `Bearer ${PlayerTokenMap.get(p)}`)
                .send({user: p, ...data})
        ).body.code;
    }
    async function pickWord(p: Player, data: any) {
        return (
            await supertest(app)
                .post("/api/game/" + code + "/pickWord")
                .set("Authorization", `Bearer ${PlayerTokenMap.get(p)}`)
                .send({user: p, ...data})
        ).body.code;
    }
    async function guessWord(p: Player, data: any) {
        return (
            await supertest(app)
                .post("/api/game/" + code + "/guessWord")
                .set("Authorization", `Bearer ${PlayerTokenMap.get(p)}`)
                .send({user: p, ...data})
        ).body.code;
    }

    it("Test main flow", async () => {
        let createGame = await supertest(app).post("/api/game").send({user: "janski", score: 50, lang: "ge"});
        expect(createGame.status).toEqual(422);

        await addWord("w1", "ge");

        // Create game by Janski
        createGame = await supertest(app).post("/api/game").send({user: "janski", score: 50, lang: "ge"});
        expect(createGame.body.code).toEqual(0);

        code = createGame.body.data.code;
        PlayerTokenMap.set(Player.JANSKI, createGame.body.data.token);

        gameStateJanski = {
            code,
            owner: "janski",
            maxScore: 50,
            players: [{name: "janski", score: 0}],
            state: StateEnum.CREATED,
            waitingFor: [],
            word: "w1",
        };
        await checkGameJanski();

        await addWord("w2", "ge");

        // Join game by Keti
        const ketiResponse = await supertest(app)
            .post("/api/game/" + code + "/join")
            .send({user: "keti"});
        expect(ketiResponse.body.code).toEqual(0);
        PlayerTokenMap.set(Player.KETI, ketiResponse.body.data.token);

        gameStateKeti = {
            code,
            owner: "janski",
            maxScore: 50,
            players: [
                {name: "janski", score: 0},
                {name: "keti", score: 0},
            ],
            state: StateEnum.CREATED,
            waitingFor: [],
            word: "w2",
        };
        gameStateJanski.players.push({name: "keti", score: 0});

        await checkGameKeti();

        // Cannot join second times with same user
        expect(
            (
                await await supertest(app)
                    .post("/api/game/" + code + "/join")
                    .send({user: "keti"})
            ).body.code
        ).toEqual(-3);

        // Join game by Katu
        await addWord("w3", "ge");
        const katuResponse = await supertest(app)
            .post("/api/game/" + code + "/join")
            .send({user: "katu"});
        expect(katuResponse.body.code).toEqual(0);
        PlayerTokenMap.set(Player.KATU, katuResponse.body.data.token);

        gameStateKatu = {
            code,
            owner: "janski",
            maxScore: 50,
            players: [
                {name: "janski", score: 0},
                {name: "keti", score: 0},
                {name: "katu", score: 0},
            ],
            state: StateEnum.CREATED,
            waitingFor: [],
            word: "w3",
        };
        gameStateKeti.players.push({name: "katu", score: 0});
        gameStateJanski.players.push({name: "katu", score: 0});

        await checkGame();

        // No auth possible for invalid guys
        expect(
            (
                await supertest(app)
                    .get("/api/game/" + code + "?user=temo")
                    .send()
            ).body.code
        ).toEqual(-100);

        // Only owner can start the game
        expect(
            (
                await supertest(app)
                    .post("/api/game/" + code + "/start")
                    .set("Authorization", `Bearer ${PlayerTokenMap.get(Player.KETI)}`)
                    .send({user: "keti"})
            ).body.code
        ).toEqual(-3);

        // Start game
        expect(
            (
                await supertest(app)
                    .post("/api/game/" + code + "/start")
                    .set("Authorization", `Bearer ${PlayerTokenMap.get(Player.JANSKI)}`)
                    .send({user: "janski"})
            ).body.code
        ).toEqual(0);

        setState(StateEnum.WAITING_FOR_INITIAL_PIC);
        setWaiting(["janski", "keti", "katu"]);
        await checkGame();

        // Janski saves a pic
        expect(await savePic(Player.JANSKI, {pic: "AAA"})).toEqual(0);

        setWaiting(["keti", "katu"]);
        await checkGame();

        // Nonexistent users cannot auth
        expect(await savePic(Player.JANSKI, {pic: "AAA", user: "zoro"})).toEqual(-100);

        // Keti saves a pic
        expect(await savePic(Player.KETI, {pic: "BBB"})).toEqual(0);

        // Nothing changes
        setWaiting(["katu"]);
        await checkGame();

        // Katu saves a pic
        expect(await savePic(Player.KATU, {pic: "CCC"})).toEqual(0);

        setStateActionName(["keti", "katu"], "AAA", gameStateJanski);

        await checkAndFixPermutation();

        await checkGame();

        // players: [{janski, w1}, {keti, w2}]
        // permutation: [0, 1]

        // Zhani cannot choose on his turn.
        expect(await pickWord(Player.JANSKI, {word: "ww1"})).toEqual(-3);

        // Nor unknown guy
        expect(await pickWord(Player.JANSKI, {word: "ww1", user: "zorge"})).toEqual(-100);

        // Keti gives a name
        expect(await pickWord(Player.KETI, {word: "ww1"})).toEqual(0);

        // Nothing changes
        setWaiting(["katu"]);
        await checkGame();

        // Katu gives a name
        expect(await pickWord(Player.KATU, {word: "ww2"})).toEqual(0);

        // double check sizes
        await checkChooseFromWords(["w1", "ww1", "ww2"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["keti", "katu"]);
        await checkGame();

        // Zhani cannot guess the word
        expect(await guessWord(Player.JANSKI, {word: "ww1"})).toEqual(-3);

        // Keti cannot guess nonexistent word
        expect(await guessWord(Player.KETI, {word: "kvakva"})).toEqual(-4);

        // Keti cannot guess her own word
        expect(await guessWord(Player.KETI, {word: "ww1"})).toEqual(-6);

        // Keti guesses correctly
        expect(await guessWord(Player.KETI, {word: "w1"})).toEqual(0);

        // Nothing changes
        setWaiting(["katu"]);
        await checkGame();

        // Katu guesses Keti's word
        expect(await guessWord(Player.KATU, {word: "ww1"})).toEqual(0);

        setStateActionScores(
            [
                {chosen_word: "ww1", guessed_word: "w1", name: "keti", score: POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE},
                {chosen_word: "ww2", guessed_word: "ww1", name: "katu", score: 0},
            ],
            "janski",
            "w1",
            POINTS_WIN_ON_YOUR_TURN,
            POINTS_WIN_ON_YOUR_TURN,
            POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE,
            0
        );

        await checkGame();

        // Nothing happens
        await checkGame();

        // pass time.
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        /**************************************
         *
         *      S  T  A  G  E      I . 2
         *
         **************************************/

        setStateActionName(["janski", "katu"], "BBB", gameStateKeti);
        await checkGame();

        // Zhani chooses
        expect(await pickWord(Player.JANSKI, {word: "ww11"})).toEqual(0);

        // Keti cannot choose
        expect(await pickWord(Player.KETI, {word: "ww11"})).toEqual(-3);

        // Nothing changes
        setWaiting(["katu"]);
        await checkGame();

        // Katu chooses the same!
        expect(await pickWord(Player.KATU, {word: "ww11"})).toEqual(0);

        // double check sizes
        await checkChooseFromWords(["w2", "ww11", "ww11"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["janski", "katu"]);
        await checkGame();

        // Janski can guess his own word, if there is a duplicate
        expect(await guessWord(Player.JANSKI, {word: "ww11"})).toEqual(0);

        setWaiting(["katu"]);
        await checkGame();

        // Katu guesses her own too
        expect(await guessWord(Player.KATU, {word: "ww11"})).toEqual(0);

        setStateActionScores(
            [
                {chosen_word: "ww11", guessed_word: "ww11", name: "janski", score: POINTS_FOR_MISLEADING_SOMEONE},
                {chosen_word: "ww11", guessed_word: "ww11", name: "katu", score: POINTS_FOR_MISLEADING_SOMEONE},
            ],
            "keti",
            "w2",
            0,
            POINTS_FOR_MISLEADING_SOMEONE,
            0,
            POINTS_FOR_MISLEADING_SOMEONE
        );
        await checkGame();

        // pass time.
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        /**************************************
         *
         *      S  T  A  G  E      I . 3
         *
         **************************************/

        setStateActionName(["janski", "keti"], "CCC", gameStateKatu);
        await checkGame();

        // Zhani chooses
        expect(await pickWord(Player.JANSKI, {word: "ww22"})).toEqual(0);

        setWaiting(["keti"]);
        await checkGame();

        // Keti chooses same as original word!
        expect(await pickWord(Player.KETI, {word: "w3"})).toEqual(0);

        await checkChooseFromWords(["w3", "w3", "ww22"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["janski", "keti"]);
        await checkGame();

        // Janski guesses correctly
        expect(await guessWord(Player.JANSKI, {word: "w3"})).toEqual(0);

        setWaiting(["keti"]);
        await checkGame();

        // Keti also guesses correctly, it's own word!
        expect(await guessWord(Player.KETI, {word: "w3"})).toEqual(0);

        setStateActionScores(
            [
                {chosen_word: "ww22", guessed_word: "w3", name: "janski", score: POINTS_CORRECT_GUESS},
                {chosen_word: "w3", guessed_word: "w3", name: "keti", score: POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE},
            ],
            "katu",
            "w3",
            0,
            POINTS_CORRECT_GUESS,
            POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE,
            0
        );
        await checkGame();

        // pass time.
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        /**************************************
         *
         *      S  T  A  G  E      I I . 1
         *
         **************************************/

        gameStateJanski = getInitialState(["w4", "w5", "w6"]);
        gameStateKeti = getInitialState(["w4", "w5", "w6"]);
        gameStateKatu = getInitialState(["w4", "w5", "w6"]);

        await addWord("w4", "ge");
        await addWord("w5", "ge");
        await addWord("w6", "ge");
        await checkGame();

        // make sure words are unique
        let game: any = await Game.findOne({code}).lean(true);
        expect(game.players.map((p) => p.word).sort()).toEqual(["w4", "w5", "w6"]);

        // set them in order.
        await Game.updateOne({code, players: {$elemMatch: {name: "janski"}}}, {"players.$.word": "w4"});
        await Game.updateOne({code, players: {$elemMatch: {name: "keti"}}}, {"players.$.word": "w5"});
        await Game.updateOne({code, players: {$elemMatch: {name: "katu"}}}, {"players.$.word": "w6"});

        await checkGame();

        // make sure words are unique, again
        game = await Game.findOne({code}).lean(true);
        expect(game.players.map((p) => p.word).sort()).toEqual(["w4", "w5", "w6"]);

        // name the pics
        expect(await savePic(Player.JANSKI, {pic: "DDD"})).toEqual(0);
        expect(await savePic(Player.KETI, {pic: "EEE"})).toEqual(0);
        expect(await savePic(Player.KATU, {pic: "FFF"})).toEqual(0);

        setStateActionName(["keti", "katu"], "DDD", gameStateJanski);

        await checkAndFixPermutation();
        await checkGame();

        // Keti gives a name
        // Katu cannot make it in time!
        expect(await pickWord(Player.KETI, {word: "w41"})).toEqual(0);

        // pass time.
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        // double check sizes
        await checkChooseFromWords(["w41", "w4"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["keti", "katu"]);
        await checkGame();

        // keti guesses
        expect(await guessWord(Player.KETI, {word: "w4"})).toEqual(0);

        // katu guesses keti's
        expect(await guessWord(Player.KATU, {word: "w41"})).toEqual(0);

        setStateActionScores(
            [
                {chosen_word: "w41", guessed_word: "w4", name: "keti", score: POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE},
                {chosen_word: undefined, guessed_word: "w41", name: "katu", score: 0},
            ],
            "janski",
            "w4",
            POINTS_WIN_ON_YOUR_TURN,
            POINTS_WIN_ON_YOUR_TURN,
            POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE,
            0
        );

        await checkGame();

        // time passes
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        setStateActionName(["janski", "katu"], "EEE", gameStateKeti);
        await checkGame();

        // Katu chooses, Zhani is too late
        expect(await pickWord(Player.KATU, {word: "w51"})).toEqual(0);

        // pass time.
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        // double check sizes
        await checkChooseFromWords(["w51", "w5"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["janski", "katu"]);
        await checkGame();

        // Both guess
        expect(await guessWord(Player.JANSKI, {word: "w5"})).toEqual(0);
        expect(await guessWord(Player.KATU, {word: "w5"})).toEqual(0);

        setStateActionScores(
            [
                {chosen_word: undefined, guessed_word: "w5", name: "janski", score: POINTS_CORRECT_GUESS},
                {chosen_word: "w51", guessed_word: "w5", name: "katu", score: POINTS_CORRECT_GUESS},
            ],
            "keti",
            "w5",
            0,
            POINTS_CORRECT_GUESS,
            0,
            POINTS_CORRECT_GUESS
        );

        await checkGame();

        // Covered both cases of when cannot choose the word. Now let's test failing to guess the word.

        // time passes
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        setStateActionName(["janski", "keti"], "FFF", gameStateKatu);
        await checkGame();

        expect(await pickWord(Player.JANSKI, {word: "w61"})).toEqual(0);
        expect(await pickWord(Player.KETI, {word: "w62"})).toEqual(0);

        await checkChooseFromWords(["w62", "w61", "w6"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["janski", "keti"]);
        await checkGame();

        // janski guesses, katu is too late
        expect(await guessWord(Player.JANSKI, {word: "w6"})).toEqual(0);

        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        setStateActionScores(
            [
                {chosen_word: "w61", guessed_word: "w6", name: "janski", score: POINTS_CORRECT_GUESS},
                {chosen_word: "w62", guessed_word: undefined, name: "keti", score: 0},
            ],
            "katu",
            "w6",
            POINTS_WIN_ON_YOUR_TURN,
            POINTS_CORRECT_GUESS,
            0,
            POINTS_WIN_ON_YOUR_TURN
        );

        await checkGame();

        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        /**************************************
         *
         *      S  T  A  G  E      I I I . 1
         *
         **************************************/

        gameStateJanski = getInitialState(["w7", "w8", "w9"]);
        gameStateKeti = getInitialState(["w7", "w8", "w9"]);
        gameStateKatu = getInitialState(["w7", "w8", "w9"]);

        await addWord("w7", "ge");
        await addWord("w8", "ge");
        await addWord("w9", "ge");
        await checkGame();

        // make sure words are unique
        game = await Game.findOne({code}).lean(true);
        expect(game.players.map((p) => p.word).sort()).toEqual(["w7", "w8", "w9"]);

        // set them in order.
        await Game.updateOne({code, players: {$elemMatch: {name: "janski"}}}, {"players.$.word": "w7"});
        await Game.updateOne({code, players: {$elemMatch: {name: "keti"}}}, {"players.$.word": "w8"});
        await Game.updateOne({code, players: {$elemMatch: {name: "katu"}}}, {"players.$.word": "w9"});

        await checkGame();

        // make sure words are unique, again
        game = await Game.findOne({code}).lean(true);
        expect(game.players.map((p) => p.word).sort()).toEqual(["w7", "w8", "w9"]);

        // name the pics
        expect(await savePic(Player.JANSKI, {pic: "GGG"})).toEqual(0);
        expect(await savePic(Player.KETI, {pic: "HHH"})).toEqual(0);
        expect(await savePic(Player.KATU, {pic: "III"})).toEqual(0);

        setStateActionName(["keti", "katu"], "GGG", gameStateJanski);
        await checkAndFixPermutation();
        await checkGame();

        // both choose words
        expect(await pickWord(Player.KETI, {word: "w71"})).toEqual(0);
        expect(await pickWord(Player.KATU, {word: "w72"})).toEqual(0);

        await checkChooseFromWords(["w72", "w7", "w71"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["keti", "katu"]);
        await checkGame();

        // keti guesses katu's, katu is too late.
        expect(await guessWord(Player.KETI, {word: "w72"})).toEqual(0);

        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        setStateActionScores(
            [
                {chosen_word: "w71", guessed_word: "w72", name: "keti", score: 0},
                {chosen_word: "w72", guessed_word: undefined, name: "katu", score: POINTS_FOR_MISLEADING_SOMEONE},
            ],
            "janski",
            "w7",
            0,
            0,
            0,
            POINTS_FOR_MISLEADING_SOMEONE
        );

        await checkGame();

        // janski has 2 * POINTS_WIN_ON_YOUR_TURN + 1 * POINTS_FOR_MISLEADING_SOMEONE + 3 * POINTS_CORRECT_GUESS points.
        // needs one POINTS_CORRECT_GUESS and the game is over!

        const score = 2 * POINTS_WIN_ON_YOUR_TURN + POINTS_FOR_MISLEADING_SOMEONE + 4 * POINTS_CORRECT_GUESS;
        await Game.updateOne({code}, {$set: {maxScore: score}});

        gameStateJanski.maxScore = score;
        gameStateKeti.maxScore = score;
        gameStateKatu.maxScore = score;

        // time passes
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900 * 1000}});

        setStateActionName(["janski", "katu"], "HHH", gameStateKeti);
        await checkGame();

        expect(await pickWord(Player.JANSKI, {word: "w81"})).toEqual(0);
        expect(await pickWord(Player.KATU, {word: "w82"})).toEqual(0);

        await checkChooseFromWords(["w81", "w82", "w8"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["janski", "katu"]);
        await checkGame();

        // Janski guesses correctly!
        expect(await guessWord(Player.JANSKI, {word: "w8"})).toEqual(0);
        expect(await guessWord(Player.KATU, {word: "w8"})).toEqual(0);

        setState(StateEnum.FINISHED);
        finishStage(POINTS_CORRECT_GUESS, 0, POINTS_CORRECT_GUESS);
        setWaiting([]);
        clearGuesses();
        clearTurnName();
        clearStateSeconds();
        delete gameStateJanski.namePic;
        delete gameStateKeti.namePic;
        delete gameStateKatu.namePic;
        delete gameStateJanski.remainingSec;
        delete gameStateKeti.remainingSec;
        delete gameStateKatu.remainingSec;
        delete gameStateKeti.chooseWord;
        delete gameStateJanski.chooseWord;
        delete gameStateKatu.chooseWord;

        await checkGame();
    });
});
