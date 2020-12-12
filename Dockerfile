FROM node as build

WORKDIR /app/
ADD package.json .
ADD package-lock.json .
RUN npm install

ADD . .

ENV REACT_APP_BE_ADDR="http://drawgame-env.eba-qwamtbnf.us-east-1.elasticbeanstalk.com:3000"
RUN npm run build


# production environment
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY /config/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
