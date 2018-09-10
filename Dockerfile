FROM node:alpine
ENV NODE_ENV=production
WORKDIR /opt/app

RUN apk add -U tzdata
RUN cp /usr/share/zoneinfo/Europe/Helsinki /etc/localtime

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN ./node_modules/.bin/tsc

CMD ["node", "./built/index.js"]

USER node
