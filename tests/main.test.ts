const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');

describe('Post Endpoints', () => {
    beforeAll(async () => {
        await mongoose.connect("mongodb://localhost:27017/drawfulTest", {useNewUrlParser: true, useUnifiedTopology: true})
    });

    afterAll(async () => {
        await app.close();
        await mongoose.disconnect();
    });

    it('Test main flow', async () => {
        const createGame = await request(app).post('/game').send({user: "janski"});
        expect(createGame.body.code).toEqual(0);

        const code = createGame.body.data.code;

        let game = await request(app).get("/game/" + code).send();
        expect(game.body).toEqual({code: 0, data: {code, owner: "janski", players: [], state: "created"}});

        let join1 = await request(app).post("/game/" + code + "/join").send({user: "keti"});
        expect(join1.body.code).toEqual(0);
    });
});