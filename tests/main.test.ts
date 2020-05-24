import Game, {StateEnum} from "../models/game.model";
import {
    MAX_TIME_IN_ACTION_NAME_SEC, MAX_TIME_IN_ACTION_SCORES_SEC,
    POINTS_CORRECT_GUESS,
    POINTS_FOR_MISLEADING_SOMEONE,
    POINTS_WIN_ON_YOUR_TURN
} from "../index";

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');

jest.setTimeout(30000);

describe('Post Endpoints', () => {
    beforeAll(async () => {
        await mongoose.connect("mongodb://localhost:27099/drawfulTest", {useNewUrlParser: true, useUnifiedTopology: true})
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

        let wordAdd = await request(app).post("/admin/word").send({lang, word});
        expect(wordAdd.body.code).toEqual(0);

        // Check words
        let w = await request(app).get("/admin/word").send();
        expect(w.body).toEqual({ code: 0, data: words });
    };

    async function checkGameJanski() {
        let game = await request(app).get("/game/" + code + "?user=janski").send();
        expect(game.body).toEqual({code: 0, data: gameStateJanski});
    }
    async function checkGameKeti() {
        let game = await request(app).get("/game/" + code + "?user=keti").send();
        expect(game.body).toEqual({code: 0, data: gameStateKeti});
    }
    async function checkGameKatu() {
        let game = await request(app).get("/game/" + code + "?user=katu").send();
        expect(game.body).toEqual({code: 0, data: gameStateKatu});
    }
    async function checkGame() {
        await checkGameJanski();
        await checkGameKeti();
        await checkGameKatu();
    }

    async function checkChooseFromWords(words: string[]) {
        let game = await request(app).get("/game/" + code + "?user=janski").send();
        expect(game.body.data.chooseWord.length).toEqual(words.length);
        game = await request(app).get("/game/" + code + "?user=keti").send();
        expect(game.body.data.chooseWord.length).toEqual(words.length);
        game = await request(app).get("/game/" + code + "?user=katu").send();
        expect(game.body.data.chooseWord.length).toEqual(words.length);

        gameStateJanski.chooseWord = expect.arrayContaining(words);
        gameStateKeti.chooseWord = expect.arrayContaining(words);
        gameStateKatu.chooseWord = expect.arrayContaining(words);
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

    function setTurnName(turn: string, score: number) {
        gameStateJanski.turn = turn;
        gameStateKatu.turn = turn;
        gameStateKeti.turn = turn;
        gameStateJanski.turnScore = score;
        gameStateKatu.turnScore = score;
        gameStateKeti.turnScore = score;
    }

    function clearTurnName() {
        delete gameStateJanski.turn;
        delete gameStateKatu.turn;
        delete gameStateKeti.turn;
        delete gameStateJanski.turnScore;
        delete gameStateKatu.turnScore;
        delete gameStateKeti.turnScore;
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

    function setStateActionScores(guesses: any, tunName: string, turnScore: number, p1: number, p2: number, p3: number) {
        setState(StateEnum.ACTION_SCORES);
        setGuesses(guesses);
        setTurnName(tunName, turnScore)
        setWaiting([]);
        finishStage(p1, p2, p3);
        setStateSeconds(MAX_TIME_IN_ACTION_SCORES_SEC);
    }

    it('Test main flow', async () => {
        await addWord("w1", "ge");

        // Create game by Janski
        const createGame = await request(app).post('/game').send({user: "janski"});
        expect(createGame.body.code).toEqual(0);

        code = createGame.body.data.code;

        gameStateJanski = {code, owner: "janski", players: [{name: "janski", score: 0}], state: StateEnum.CREATED, waitingFor: [], word: "w1"};
        await checkGameJanski();

        await addWord("w2", "ge");

        // Join game by Keti
        expect((await request(app).post("/game/" + code + "/join").send({user: "keti"})).body.code)
            .toEqual(0);

        gameStateKeti = {code, owner: "janski", players: [{name: "janski", score: 0}, {name: "keti", score: 0}], state: StateEnum.CREATED, waitingFor: [], word: "w2"};
        gameStateJanski.players.push({name: "keti", score: 0});

        await checkGameKeti();

        // Cannot join second times with same user
        expect((await await request(app).post("/game/" + code + "/join").send({user: "keti"})).body.code)
            .toEqual(-3);

        // Join game by Katu
        await addWord("w3", "ge");
        expect((await request(app).post("/game/" + code + "/join").send({user: "katu"})).body.code)
            .toEqual(0);

        gameStateKatu = {code, owner: "janski", players: [{name: "janski", score: 0}, {name: "keti", score: 0}, {name: "katu", score: 0}], state: StateEnum.CREATED, waitingFor: [], word: "w3"};
        gameStateKeti.players.push({name: "katu", score: 0});
        gameStateJanski.players.push({name: "katu", score: 0});

        await checkGame();

        // Make sure getGame fails for invalid guys
        expect((await request(app).get("/game/" + code + "?user=temo").send()).body.code)
            .toEqual(-2);

        // Only owner can start the game
        expect((await request(app).post("/game/" + code + "/start").send({user: "keti"})).body.code)
            .toEqual(-3);

        // Start game
        expect((await request(app).post("/game/" + code + "/start").send({user: "janski"})).body.code)
            .toEqual(0);

        setState(StateEnum.WAITING_FOR_INITIAL_PIC);
        setWaiting(["janski", "keti", "katu"])
        await checkGame();

        // Janski saves a pic
        expect((await request(app).post("/game/" + code + "/1/savepic").send({user: "janski", pic: "AAA"})).body.code)
            .toEqual(0);

        setWaiting(["keti", "katu"])
        await checkGame();

        // Nonexistent users cannot save a pic
        expect((await request(app).post("/game/" + code + "/1/savepic").send({user: "zoro", pic: "AAA"})).body.code)
            .toEqual(-3);

        // Keti saves a pic
        expect((await request(app).post("/game/" + code + "/1/savepic").send({user: "keti", pic: "BBB"})).body.code)
            .toEqual(0);

        // Nothing changes
        setWaiting(["katu"])
        await checkGame();

        // Katu saves a pic
        expect((await request(app).post("/game/" + code + "/1/savepic").send({user: "katu", pic: "CCC"})).body.code)
            .toEqual(0);

        setStateActionName(["keti", "katu"], "AAA", gameStateJanski);

        // Check and fix permutations before checking the game
        const permutations: any = await Game.findOne({code}).lean(true);
        const started = permutations.permutation[0];
        for (let i = 0; i < 3; i++) {
            expect(permutations.players[i].waiting_for_action).toEqual(i !== started);
        }

        expect((permutations as any).permutation.sort()).toEqual([0, 1, 2]);
        await Game.updateOne({code}, {$set: {permutation: [0, 1, 2], "players.$[].waiting_for_action": true}});
        await Game.updateOne({code}, {$set: {"players.0.waiting_for_action": false}});

        await checkGame();

        // players: [{janski, w1}, {keti, w2}]
        // permutation: [0, 1]

        // Zhani cannot choose on his turn.
        expect((await request(app).post("/game/" + code + "/pickWord").send({user: "janski", word: "ww1"})).body.code)
            .toEqual(-3);

        // Nor some weirdo
        expect((await request(app).post("/game/" + code + "/pickWord").send({user: "zorp", word: "ww1"})).body.code)
            .toEqual(-4);

        // Keti gives a name
        expect((await request(app).post("/game/" + code + "/pickWord").send({user: "keti", word: "ww1"})).body.code)
            .toEqual(0);

        // Nothing changes
        setWaiting(["katu"]);
        await checkGame();

        // Katu gives a name
        expect((await request(app).post("/game/" + code + "/pickWord").send({user: "katu", word: "ww2"})).body.code)
            .toEqual(0);

        // double check sizes
        await checkChooseFromWords(["w1", "ww1", "ww2"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["keti", "katu"]);
        await checkGame();

        // Zhani cannot guess the word
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "janski", word: "ww1"})).body.code)
            .toEqual(-3);

        // Nor some weirdo
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "zorp", word: "ww1"})).body.code)
            .toEqual(-5);

        // Keti cannot guess nonexistent word
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "keti", word: "kvakva"})).body.code)
            .toEqual(-4);

        // Keti cannot guess her own word
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "keti", word: "ww1"})).body.code)
            .toEqual(-6);

        // Keti guesses correctly
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "keti", word: "w1"})).body.code)
            .toEqual(0);

        // Nothing changes
        setWaiting(["katu"]);
        await checkGame();

        // Katu guesses Keti's word
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "katu", word: "ww1"})).body.code)
            .toEqual(0);

        setStateActionScores([
            {chosen_word: "ww1", guessed_word: "w1", name: "keti", score: POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE},
            {chosen_word: "ww2", guessed_word: "ww1", name: "katu", score: 0}],
            "janski",
            POINTS_WIN_ON_YOUR_TURN,
            POINTS_WIN_ON_YOUR_TURN,
            POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE,
            0);

        await checkGame();

        // Nothing happens
        await checkGame();

        // pass time.
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900*1000}});

        /**************************************
         *
         *      S  T  A  G  E      I I
         *
         **************************************/

        setStateActionName(["janski", "katu"], "BBB", gameStateKeti);
        await checkGame();

        // Zhani chooses
        expect((await request(app).post("/game/" + code + "/pickWord").send({user: "janski", word: "ww11"})).body.code)
            .toEqual(0);

        // Keti cannot choose
        expect((await request(app).post("/game/" + code + "/pickWord").send({user: "keti", word: "ww11"})).body.code)
            .toEqual(-3);

        // Nothing changes
        setWaiting(["katu"]);
        await checkGame();

        // Katu chooses the same!
        expect((await request(app).post("/game/" + code + "/pickWord").send({user: "katu", word: "ww11"})).body.code)
            .toEqual(0);

        // double check sizes
        await checkChooseFromWords(["w2", "ww11", "ww11"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["janski", "katu"]);
        await checkGame();

        // Janski can guess his own word, if there is a duplicate
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "janski", word: "ww11"})).body.code)
            .toEqual(0);

        setWaiting(["katu"]);
        await checkGame();

        // Katu guesses her own too
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "katu", word: "ww11"})).body.code)
            .toEqual(0);

        setStateActionScores([
            {chosen_word: "ww11", guessed_word: "ww11", name: "janski", score: POINTS_FOR_MISLEADING_SOMEONE},
            {chosen_word: "ww11", guessed_word: "ww11", name: "katu", score: POINTS_FOR_MISLEADING_SOMEONE}],
            "keti",
            0,
            POINTS_FOR_MISLEADING_SOMEONE,
            0,
            POINTS_FOR_MISLEADING_SOMEONE);
        await checkGame();

        // pass time.
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900*1000}});

        /**************************************
         *
         *      S  T  A  G  E      I I I
         *
         **************************************/

        setStateActionName(["janski", "keti"], "CCC", gameStateKatu);
        await checkGame();

        // Zhani chooses
        expect((await request(app).post("/game/" + code + "/pickWord").send({user: "janski", word: "ww22"})).body.code)
            .toEqual(0);

        setWaiting(["keti"]);
        await checkGame();

        // Keti chooses same as original word!
        expect((await request(app).post("/game/" + code + "/pickWord").send({user: "keti", word: "w3"})).body.code)
            .toEqual(0);

        await checkChooseFromWords(["w3", "ww22", "w3"]);

        setState(StateEnum.ACTION_CHOOSE);
        setWaiting(["janski", "keti"]);
        await checkGame();

        // Janski guesses correctly
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "janski", word: "w3"})).body.code)
            .toEqual(0);

        setWaiting(["keti"]);
        await checkGame();

        // Keti also guesses correctly, it's own word!
        expect((await request(app).post("/game/" + code + "/guessWord").send({user: "keti", word: "w3"})).body.code)
            .toEqual(0);

        setStateActionScores([
            {chosen_word: "ww22", guessed_word: "w3", name: "janski", score: POINTS_CORRECT_GUESS},
            {chosen_word: "w3", guessed_word: "w3", name: "keti", score: POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE}],
            "katu",
            0,
            POINTS_CORRECT_GUESS,
            POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE,
            0);
        await checkGame();

        // pass time.
        await Game.updateOne({}, {$set: {stageTillTime: Date.now() - 900*1000}});

        setState(StateEnum.FINISHED);
        clearGuesses();
        clearTurnName();
        clearStateSeconds();
        delete gameStateJanski.namePic;
        delete gameStateKeti.namePic;
        delete gameStateKatu.namePic;
        delete gameStateJanski.remainingSec;
        delete gameStateKeti.remainingSec;
        delete gameStateKatu.remainingSec;
        await checkGame();
    });
});