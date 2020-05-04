import {GameResponse} from "../services/GameService";
import Game, {StateEnum} from "../models/game.model";

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');

describe('Post Endpoints', () => {
    beforeAll(async () => {
        await mongoose.connect("mongodb://localhost:27017/drawfulTest", {useNewUrlParser: true, useUnifiedTopology: true})
    });

    beforeEach(async () => {
        for (const collection in mongoose.connection.collections) {
            mongoose.connection.collections[collection].remove(function() {});
        }
    });

    afterAll(async () => {
        await app.close();
        await mongoose.disconnect();
    });

    let gameStateJanski;
    let gameStateKeti;
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
    async function checkGame() {
        await checkGameJanski();
        await checkGameKeti();
    }

    it('Test main flow', async () => {
        await addWord("w1", "ge");

        // Create game by Janski
        const createGame = await request(app).post('/game').send({user: "janski"});
        expect(createGame.body.code).toEqual(0);

        code = createGame.body.data.code;

        gameStateJanski = {code, owner: "janski", players: [{name: "janski"}], state: StateEnum.CREATED, word: "w1"};
        await checkGameJanski();

        await addWord("w2", "ge");

        // Join game by Keti
        let join = await request(app).post("/game/" + code + "/join").send({user: "keti"});
        expect(join.body.code).toEqual(0);

        gameStateKeti = {code, owner: "janski", players: [{name: "janski"}, {name: "keti"}], state: StateEnum.CREATED, word: "w2"};
        gameStateJanski.players.push({name: "keti"});

        await checkGame();

        // Start game
        let start = await request(app).post("/game/" + code + "/start").send({user: "janski"});
        expect(start.body.code).toEqual(0);

        gameStateKeti.state = StateEnum.WAITING_FOR_INITIAL_PIC;
        gameStateJanski.state = StateEnum.WAITING_FOR_INITIAL_PIC;

        await checkGame();

        // Janski saves a pic
        let savepic = await request(app).post("/game/" + code + "/1/savepic").send({user: "janski", pic: "AAA"});
        expect(savepic.body.code).toEqual(0);

        // Nothing changes
        await checkGame();

        // Keti saves a pic
        savepic = await request(app).post("/game/" + code + "/1/savepic").send({user: "keti", pic: "BBB"});
        expect(savepic.body.code).toEqual(0);

        gameStateKeti.state = StateEnum.ACTION_NAME;
        gameStateKeti.namePic = "AAA";
        gameStateJanski.state = StateEnum.ACTION_NAME;
        gameStateJanski.namePic = "AAA";
        gameStateJanski.myTurn = true;

        // Check and fix permutations before checking the game
        const permutations = await Game.findOne({code}).lean(true);
        expect((permutations as any).permutation.sort()).toEqual([0, 1]);
        await Game.updateOne({code}, {$set: {permutation: [0, 1]}});

        await checkGame();

        // players: [{janski, w1}, {keti, w2}]
        // permutation: [0, 1]

        // Keti gives a name
        const picName = await request(app).post("/game/" + code + "/pickWord").send({user: "keti", word: "ww1"});
        expect(picName.body.code).toEqual(0);

        gameStateKeti.state = StateEnum.ACTION_CHOOSE;
        gameStateJanski.state = StateEnum.ACTION_CHOOSE;
        delete gameStateKeti.namePic;
        delete gameStateJanski.namePic;
        gameStateJanski.chooseWord = expect.arrayContaining(["w1", "ww1"]);
        gameStateKeti.chooseWord = expect.arrayContaining(["w1", "ww1"]);

        // double check sizes
        let game = await request(app).get("/game/" + code + "?user=janski").send();
        expect(game.body.data.chooseWord.length).toEqual(2);
        game = await request(app).get("/game/" + code + "?user=keti").send();
        expect(game.body.data.chooseWord.length).toEqual(2);

        await checkGame();
    });
});