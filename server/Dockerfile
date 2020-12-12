FROM node

WORKDIR /app/
ADD package.json .
RUN npm install

ADD . .
RUN ./node_modules/typescript/bin/tsc

EXPOSE 3000
CMD npm run startProd 
