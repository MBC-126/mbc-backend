#!/bin/bash

echo "🔍 Vérification de la configuration Clever Cloud"
echo "================================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Vérifier clever CLI
if ! command -v clever &> /dev/null; then
    echo -e "${RED}❌ Clever Tools CLI non installé${NC}"
    echo "Installe-le avec: npm install -g clever-tools"
    exit 1
fi
echo -e "${GREEN}✅ Clever Tools CLI installé${NC}"

# Vérifier la connexion
if ! clever profile &> /dev/null; then
    echo -e "${RED}❌ Non authentifié sur Clever Cloud${NC}"
    echo "Connecte-toi avec: clever login"
    exit 1
fi
echo -e "${GREEN}✅ Authentifié sur Clever Cloud${NC}"
echo ""

# Récupérer les variables d'environnement
echo "📋 Variables d'environnement définies:"
echo "======================================"
ENV_VARS=$(clever env 2>/dev/null)

# Variables obligatoires
REQUIRED_VARS=(
    "PORT"
    "NODE_ENV"
    "HOST"
    "APP_KEYS"
    "API_TOKEN_SALT"
    "ADMIN_JWT_SECRET"
    "TRANSFER_TOKEN_SALT"
    "JWT_SECRET"
)

# Variables de base de données (une de ces combinaisons doit exister)
DB_VARS=(
    "DATABASE_CLIENT"
    "POSTGRESQL_ADDON_HOST"
)

echo ""
echo "🔑 Variables Strapi obligatoires:"
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if echo "$ENV_VARS" | grep -q "^$var"; then
        echo -e "  ${GREEN}✅${NC} $var"
    else
        echo -e "  ${RED}❌${NC} $var ${YELLOW}(MANQUANT)${NC}"
        MISSING_VARS+=("$var")
    fi
done

echo ""
echo "🗄️ Configuration base de données:"
DB_OK=false
for var in "${DB_VARS[@]}"; do
    if echo "$ENV_VARS" | grep -q "^$var"; then
        echo -e "  ${GREEN}✅${NC} $var"
        DB_OK=true
    fi
done

if [ "$DB_OK" = false ]; then
    echo -e "  ${RED}❌${NC} Aucune configuration BDD trouvée"
    echo "  💡 Vérifie que l'add-on PostgreSQL est linké"
fi

# Variables optionnelles mais recommandées
echo ""
echo "☁️ Stockage objet (Cellar/S3):"
STORAGE_VARS=("AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "AWS_BUCKET")
for var in "${STORAGE_VARS[@]}"; do
    if echo "$ENV_VARS" | grep -q "^$var"; then
        echo -e "  ${GREEN}✅${NC} $var"
    else
        echo -e "  ${YELLOW}⚠️${NC} $var (optionnel)"
    fi
done

echo ""
echo "🏥 Healthcheck:"
if echo "$ENV_VARS" | grep -q "^CC_HEALTH_CHECK_PATH"; then
    echo -e "  ${GREEN}✅${NC} CC_HEALTH_CHECK_PATH défini"
else
    echo -e "  ${YELLOW}⚠️${NC} CC_HEALTH_CHECK_PATH non défini (recommandé)"
fi

# Résumé
echo ""
echo "================================================"
if [ ${#MISSING_VARS[@]} -eq 0 ] && [ "$DB_OK" = true ]; then
    echo -e "${GREEN}✅ Configuration OK !${NC}"
    echo ""
    echo "Tu peux déployer avec:"
    echo "  ./deploy-to-clever.sh"
else
    echo -e "${RED}❌ Configuration incomplète${NC}"
    echo ""
    echo "Variables manquantes:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    
    if [ "$DB_OK" = false ]; then
        echo "  - Configuration base de données"
    fi
    
    echo ""
    echo "Pour définir une variable:"
    echo "  clever env set NOM_VARIABLE 'valeur'"
    echo ""
    echo "Pour générer les secrets Strapi:"
    echo "  node generate-secrets.js"
fi

echo ""
echo "📊 Pour voir toutes les variables:"
echo "   clever env"
