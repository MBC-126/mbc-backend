# /mbc-backend/Dockerfile

# Étape 1: Construire l'application
FROM node:18-alpine AS build
WORKDIR /opt/app
COPY ./package.json ./yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

# Étape 2: Lancer l'application en production (adapté pour le dev)
FROM node:18-alpine
WORKDIR /opt/app
COPY --from=build /opt/app ./
RUN yarn install --production
EXPOSE 1337
CMD ["yarn", "develop"]