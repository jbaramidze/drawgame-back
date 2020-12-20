A small online board game, developed during the first wave of Covid :)

You can play it at https://jdrawgame.herokuapp.com/

To launch it on local env, you first need to launch MongoDB container, which can be done by going to `mongo` directory and executing:

    docker build -t drawgame-mongo .
    docker run -p 27099:27017 -d drawgame-mongo

Once it starts, you can open two separate terminals for frontend app and backend app, and launch the following two commands in corresponding terminals:

    npm run devBE
    npm run devFE
