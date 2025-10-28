# ---- build admin ----
FROM node:20-alpine AS build
WORKDIR /opt/app

# Copie manifest + lock d'abord pour maximiser le cache
COPY package.json yarn.lock ./

# Evite les addons natifs qui râlent : libc6-compat (utile pour sharp, etc.)
RUN apk add --no-cache libc6-compat

# Installe tout (dev + prod) pour pouvoir builder
RUN corepack enable && yarn install --frozen-lockfile --ignore-platform

# Copie le reste du code
COPY . .

# Build Strapi en mode production (admin, schemas…)
ENV NODE_ENV=production
RUN yarn build


# ---- runtime ----
FROM node:20-alpine
WORKDIR /opt/app

ENV NODE_ENV=production
# Même dépendances que build, mais côté runtime on ne garde que prod
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile --production --ignore-platform

# Copie l’app construite
COPY --from=build /opt/app ./

# Exposition & commande
EXPOSE 1337
CMD ["yarn", "start"]
