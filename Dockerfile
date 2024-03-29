# Builder container
FROM node:16-slim AS builder
WORKDIR /opt/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx tsc


# Build prod container
FROM node:16-slim
ENV NODE_ENV=production
ENV TZ="Europe/Helsinki"
WORKDIR /opt/app

COPY package.json package-lock.json ./
RUN npm install

COPY --from=builder /opt/app/built .

CMD ["node", "./index.js"]

USER node

EXPOSE 5555/udp