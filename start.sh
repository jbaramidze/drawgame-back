#!/bin/bash

./node_modules/typescript/bin/tsc -w &
# Wait for mongo to start
sleep 5
npm run start
