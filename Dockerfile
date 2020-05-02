# Builder container
FROM node:12.16.2-slim AS builder
WORKDIR /opt/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx tsc
RUN npx webpack -p


# Build prod container
FROM node:12.16.2-slim
ENV NODE_ENV=production
ENV TZ="Europe/Helsinki"
WORKDIR /opt/app

COPY package.json package-lock.json ./
RUN npm install

COPY --from=builder /opt/app/built/src .

CMD ["node", "./index.js"]

USER node

EXPOSE 5555/udp
EXPOSE 4000/tcp