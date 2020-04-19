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

    it('Test main flow', async () => {
        // Create game by Janski
        const createGame = await request(app).post('/game').send({user: "janski"});
        expect(createGame.body.code).toEqual(0);

        const code = createGame.body.data.code;

        let game = await request(app).get("/game/" + code).send();
        expect(game.body).toEqual({code: 0, data: {code, owner: "janski", players: [], state: "created"}});

        // Add one word
        let wordAdd = await request(app).post("/admin/word").send({lang: "ge", word: "w1"});
        expect(wordAdd.body.code).toEqual(0);

        let words = await request(app).get("/admin/word").send();
        expect(words.body).toEqual({ code: 0, data: [ { lang: 'ge', word: 'w1' } ] });

        // Join game by Keti
        let join = await request(app).post("/game/" + code + "/join").send({user: "keti"});
        expect(join.body.code).toEqual(0);

        game = await request(app).get("/game/" + code).send();
        expect(game.body).toEqual({code: 0, data: {code, owner: "janski", players: [{name: "keti", word: "w1"}], state: "created"}});

        // Add one more word and join by Katu
        wordAdd = await request(app).post("/admin/word").send({lang: "ge", word: "w2"});
        expect(wordAdd.body.code).toEqual(0);
        join = await request(app).post("/game/" + code + "/join").send({user: "katu"});
        expect(join.body.code).toEqual(0);

        game = await request(app).get("/game/" + code).send();
        expect(game.body).toEqual({code: 0, data: {code, owner: "janski", state: "created", players: [
            {name: "keti", word: "w1"},
            {name: "katu", word: "w2"}
            ]}});
    });
});