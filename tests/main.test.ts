import Game, {StateEnum} from "../models/game.model";
import {POINTS_CORRECT_GUESS, POINTS_FOR_MISLEADING_SOMEONE, POINTS_WIN_ON_YOUR_TURN} from "../index";

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');

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

    function setState(state: StateEnum) {
        gameStateKeti.state = state;
        gameStateJanski.state = state;
        gameStateKatu.state = state;
    }

    function setWaiting(waiting: string[]) {
        gameStateKeti.waitingFor = waiting;
        gameStateJanski.waitingFor = waiting;
        gameStateKatu.waitingFor = waiting;
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

        // Only owner can start the game
        expect((await await request(app).post("/game/" + code + "/start").send({user: "keti"})).body.code)
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

        setState(StateEnum.ACTION_NAME);
        gameStateKeti.namePic = "AAA";
        gameStateJanski.namePic = "AAA";
        gameStateKatu.namePic = "AAA";
        gameStateJanski.myTurn = true;
        gameStateJanski.remainingSec = expect.any(Number);
        gameStateKeti.remainingSec = expect.any(Number);
        gameStateKatu.remainingSec = expect.any(Number);

        // Check and fix permutations before checking the game
        const permutations = await Game.findOne({code}).lean(true);
        expect((permutations as any).permutation.sort()).toEqual([0, 1, 2]);
        await Game.updateOne({code}, {$set: {permutation: [0, 1, 2]}});

        setWaiting(["keti", "katu"]);
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
        let game = await request(app).get("/game/" + code + "?user=janski").send();
        expect(game.body.data.chooseWord.length).toEqual(3);
        game = await request(app).get("/game/" + code + "?user=keti").send();
        expect(game.body.data.chooseWord.length).toEqual(3);
        game = await request(app).get("/game/" + code + "?user=katu").send();
        expect(game.body.data.chooseWord.length).toEqual(3);

        gameStateJanski.chooseWord = expect.arrayContaining(["w1", "ww1", "ww2"]);
        gameStateKeti.chooseWord = expect.arrayContaining(["w1", "ww1", "ww2"]);
        gameStateKatu.chooseWord = expect.arrayContaining(["w1", "ww1", "ww2"]);
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

        setState(StateEnum.ACTION_SCORES);
        setWaiting([]);
        delete gameStateKeti.namePic;
        delete gameStateJanski.namePic;
        delete gameStateKatu.namePic;
        delete gameStateKeti.chooseWord;
        delete gameStateJanski.chooseWord;
        delete gameStateKatu.chooseWord;
        delete gameStateJanski.myTurn;
        delete gameStateKatu.myTurn;
        delete gameStateKeti.myTurn;

        const newPlayers = [
            {name: "janski", score: POINTS_WIN_ON_YOUR_TURN},
            {name: "keti", score: POINTS_CORRECT_GUESS + POINTS_FOR_MISLEADING_SOMEONE},
            {name: "katu", score: 0}
        ];

        gameStateJanski.players = newPlayers;
        gameStateKeti.players = newPlayers;
        gameStateKatu.players = newPlayers;

        await checkGame();
    });
});