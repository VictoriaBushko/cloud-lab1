FROM node:20.17-alpine

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .

USER node

EXPOSE 3001

CMD ["node", "server.js"]
