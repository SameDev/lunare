FROM node:20-alpine3.19 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine3.19 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine3.19 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV CHECKPOINT_DISABLE=1
RUN apk add --no-cache ffmpeg python3 py3-pip
RUN pip install --no-cache-dir --break-system-packages yt-dlp
RUN addgroup -S musichub && adduser -S musichub -G musichub
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
USER musichub
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
