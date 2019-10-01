FROM node:12-slim
ENV NODE_ENV=production
ENV TZ="Europe/Helsinki"
WORKDIR /opt/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN ./node_modules/.bin/tsc

CMD ["node", "./built/index.js"]

USER node

EXPOSE 5555/udp