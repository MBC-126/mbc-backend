#!/bin/bash
set -e

echo "🧪 Test de l'image Docker en local"
echo "=================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Nom de l'image
IMAGE_NAME="mbc-backend:test"

# 1. Build de l'image
echo -e "${BLUE}🔨 Build de l'image Docker...${NC}"
docker build -t $IMAGE_NAME .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build échoué${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build réussi${NC}"
echo ""

# 2. Afficher la taille de l'image
IMAGE_SIZE=$(docker images $IMAGE_NAME --format "{{.Size}}")
echo -e "${BLUE}📦 Taille de l'image: ${IMAGE_SIZE}${NC}"
echo ""

# 3. Demander le mode de test
echo "Mode de test:"
echo "  1) Test rapide avec SQLite (pas de BDD externe)"
echo "  2) Test complet avec PostgreSQL local (docker-compose)"
echo "  3) Test avec les vraies variables Clever Cloud"
echo ""
read -p "Choisis le mode (1-3): " -n 1 -r MODE
echo ""
echo ""

case $MODE in
    1)
        echo -e "${BLUE}🚀 Démarrage avec SQLite...${NC}"
        echo "URL: http://localhost:8080"
        echo "Appuie sur Ctrl+C pour arrêter"
        echo ""
        docker run --rm -p 8080:8080 \
            -e NODE_ENV=development \
            -e HOST=0.0.0.0 \
            -e PORT=8080 \
            -e DATABASE_CLIENT=sqlite \
            -e DATABASE_FILENAME=.tmp/data.db \
            -e APP_KEYS="test1,test2,test3,test4" \
            -e API_TOKEN_SALT="test-salt" \
            -e ADMIN_JWT_SECRET="test-admin-jwt" \
            -e TRANSFER_TOKEN_SALT="test-transfer-salt" \
            -e JWT_SECRET="test-jwt-secret" \
            $IMAGE_NAME
        ;;
    
    2)
        echo -e "${BLUE}🐳 Démarrage avec docker-compose...${NC}"
        if [ ! -f "docker-compose.yml" ]; then
            echo -e "${RED}❌ docker-compose.yml introuvable${NC}"
            exit 1
        fi
        docker-compose up
        ;;
    
    3)
        echo -e "${YELLOW}⚠️  Ce mode nécessite les vraies variables Clever Cloud${NC}"
        echo ""
        
        # Récupérer les variables depuis Clever Cloud
        if ! command -v clever &> /dev/null; then
            echo -e "${RED}❌ Clever Tools CLI non installé${NC}"
            exit 1
        fi
        
        echo "📥 Récupération des variables depuis Clever Cloud..."
        ENV_FILE=$(mktemp)
        
        # Exporter les variables dans un fichier temporaire
        clever env 2>/dev/null | while IFS= read -r line; do
            if [[ $line =~ ^([A-Z_]+)[[:space:]]+\"(.*)\"$ ]]; then
                echo "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}" >> "$ENV_FILE"
            fi
        done
        
        echo -e "${BLUE}🚀 Démarrage avec les variables Clever Cloud...${NC}"
        echo "URL: http://localhost:8080"
        echo "Appuie sur Ctrl+C pour arrêter"
        echo ""
        docker run --rm -p 8080:8080 --env-file "$ENV_FILE" $IMAGE_NAME
        
        # Nettoyer le fichier temporaire
        rm -f "$ENV_FILE"
        ;;
    
    *)
        echo -e "${RED}❌ Mode invalide${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Test terminé${NC}"
