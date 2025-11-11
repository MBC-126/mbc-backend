#!/bin/bash
set -e

echo "🚀 Déploiement Strapi vers Clever Cloud"
echo "========================================"
echo ""

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Vérifier qu'on est sur la bonne branche
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}📍 Branche actuelle: ${CURRENT_BRANCH}${NC}"

# 2. Vérifier que le remote Clever Cloud existe
if ! git remote | grep -q "clever"; then
    echo -e "${RED}❌ Remote 'clever' non trouvé${NC}"
    echo ""
    echo "Ajoute le remote Clever Cloud avec:"
    echo "git remote add clever git+ssh://git@push-n3-par-clevercloud-customers.services.clever-cloud.com/app_596f177d-c0ee-49a5-9022-4be4c53be87f.git"
    exit 1
fi

echo -e "${GREEN}✅ Remote Clever Cloud trouvé${NC}"
echo ""

# 3. Optionnel: Build local pour tester
read -p "Veux-tu builder l'image localement pour tester d'abord? (o/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo -e "${BLUE}🔨 Build de l'image Docker...${NC}"
    docker build -t mbc-backend:local .
    
    echo ""
    read -p "Veux-tu tester l'image localement? (o/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        echo -e "${BLUE}🧪 Test de l'image en local sur http://localhost:8080${NC}"
        echo "Appuie sur Ctrl+C pour arrêter le test"
        docker run --rm -p 8080:8080 \
            -e DATABASE_CLIENT=sqlite \
            -e DATABASE_FILENAME=.tmp/data.db \
            mbc-backend:local
        exit 0
    fi
fi

# 4. Commit et push vers Clever Cloud
echo ""
echo -e "${BLUE}📦 Status Git:${NC}"
git status --short

echo ""
read -p "Commit et déployer vers Clever Cloud? (o/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "Déploiement annulé"
    exit 0
fi

# Demander le message de commit
echo "Message de commit (ou Enter pour 'Deploy to Clever Cloud'):"
read -r COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-"Deploy to Clever Cloud"}

echo ""
echo -e "${BLUE}📝 Commit des changements...${NC}"
git add .
git commit -m "$COMMIT_MSG" || echo "Rien à committer ou commit échoué"

echo ""
echo -e "${BLUE}🚀 Push vers Clever Cloud (branche master)...${NC}"
git push clever ${CURRENT_BRANCH}:master

echo ""
echo -e "${GREEN}✅ Déploiement lancé !${NC}"
echo ""
echo "📊 Pour voir les logs en direct:"
echo "   clever logs -f"
echo ""
echo "🔗 Dashboard Clever Cloud:"
echo "   https://console.clever-cloud.com/organisations/orga_596f177d-c0ee-49a5-9022-4be4c53be87f/applications/app_596f177d-c0ee-49a5-9022-4be4c53be87f"
