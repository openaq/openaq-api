FROM node:6

COPY . /code

WORKDIR /code

RUN npm install

EXPOSE 3004

CMD ["node", "index.js"]
