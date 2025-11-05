# Dockerfile minimal pour Clever-Cloud (Option A)
# L'image réelle est passée via la variable IMAGE (env → build-arg)
# GitHub Actions build l'image complète depuis ci/Dockerfile et la push vers GHCR
# Clever-Cloud pull cette image pré-construite via ARG IMAGE

ARG IMAGE
FROM ${IMAGE}

# Le port et la commande sont déjà définis dans l'image de base
