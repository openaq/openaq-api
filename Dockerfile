FROM node:10-alpine

RUN apk add python make g++
# Install NPM dependencies. Do this first so that if package.json hasn't
# changed we don't have to re-run npm install during `docker build`
COPY package.json /app/package.json
WORKDIR /app
RUN npm install

FROM node:10-alpine

WORKDIR /app
COPY --from=0 /app /app
# Copy the app
COPY ["newrelic.js", ".eslintrc", ".eslintignore", ".babelrc", "knexfile.js", "index.js", "/app/"]
COPY ["app.js", "/app/"]
COPY lib /app/lib/
COPY test /app/test/
COPY api /app/api/
COPY config /app/config/
COPY migrations /app/migrations/
COPY seeds /app/seeds/

CMD ["npm", "start"]
