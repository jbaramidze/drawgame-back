FROM mongo

ENV MONGO_INITDB_ROOT_USERNAME user
ENV MONGO_INITDB_ROOT_PASSWORD pass
ENV MONGO_INITDB_DATABASE drawgame
COPY init.js /docker-entrypoint-initdb.d/

CMD ["mongod"]
