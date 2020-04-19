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
        // Add one word
        let wordAdd = await request(app).post("/admin/word").send({lang: "ge", word: "w1"});
        expect(wordAdd.body.code).toEqual(0);

        // Check words
        let words = await request(app).get("/admin/word").send();
        expect(words.body).toEqual({ code: 0, data: [ { lang: 'ge', word: 'w1' } ] });

        // Create game by Janski
        const createGame = await request(app).post('/game').send({user: "janski"});
        expect(createGame.body.code).toEqual(0);

        const code = createGame.body.data.code;

        // Check game
        let game = await request(app).get("/game/" + code).send();
        expect(game.body).toEqual({code: 0, data: {code, owner: "janski", players: [{name: "janski", word: "w1"}], state: "created"}});

        // Add one more word
        wordAdd = await request(app).post("/admin/word").send({lang: "ge", word: "w2"});
        expect(wordAdd.body.code).toEqual(0);

        // Check words
        words = await request(app).get("/admin/word").send();
        expect(words.body).toEqual({ code: 0, data: [ { lang: 'ge', word: 'w1' }, { lang: "ge", word: "w2" } ] });

        // Join game by Keti
        let join = await request(app).post("/game/" + code + "/join").send({user: "keti"});
        expect(join.body.code).toEqual(0);

        // Check game
        game = await request(app).get("/game/" + code).send();
        expect(game.body).toEqual({code: 0, data: {code, owner: "janski", state: "created", players: [
                    {name: "janski", word: "w1"},
                    {name: "keti", word: "w2"}
        ]}});

    });
});