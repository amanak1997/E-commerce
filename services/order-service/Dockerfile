FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev

FROM base AS release
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
EXPOSE 3003

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/cluster.js"]
