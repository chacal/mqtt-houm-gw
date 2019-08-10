FROM node:12-slim
ENV NODE_ENV=production
WORKDIR /opt/app

RUN echo "Europe/Helsinki" > /etc/timezone
RUN dpkg-reconfigure -f noninteractive tzdata

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN ./node_modules/.bin/tsc

CMD ["node", "./built/index.js"]

USER node
