FROM node:26-alpine AS base
WORKDIR /app

FROM base AS dev
RUN mkdir node_modules /home/node/.npm && chown node:node /app node_modules /home/node/.npm
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm ci && npm run db:migrate && npm run db:seed && npm run start:dev"]

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
USER node
EXPOSE 3000
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/database/seed.js && exec node dist/main.js"]
