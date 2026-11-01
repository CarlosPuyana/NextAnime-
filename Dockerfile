FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY backend ./backend
COPY shared ./shared
RUN npx tsc -p backend/tsconfig.json
RUN npm prune --omit=dev
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY server.js ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["npm","start"]
