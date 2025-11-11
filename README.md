# 🎯 MBC Backend - Configuration Déploiement Clever Cloud

## 📌 Changements apportés

Le déploiement a été simplifié et optimisé pour Clever Cloud :

### ✅ Nouveau setup
- **Dockerfile complet** à la racine (plus besoin de GHCR)
- **Scripts de déploiement** automatisés
- **Vérification de configuration** avant déploiement
- **Test local** avant push
- **Build multi-stage** optimisé pour réduire la taille

### ❌ Ancien setup (supprimé)
- Dockerfile minimal qui pullait depuis GHCR
- Dépendance au CI/CD GitHub
- Authentification complexe sur registries

---

## 🚀 Déploiement en 3 étapes

### 1. Configuration initiale (une seule fois)

```bash
# Rendre les scripts exécutables
chmod +x *.sh *.js

# Générer les secrets Strapi
node generate-secrets.js

# Copier et exécuter les commandes affichées
# Exemple:
clever env set APP_KEYS "key1,key2,key3,key4"
clever env set API_TOKEN_SALT "ton-salt"
# ... etc
```

### 2. Vérification

```bash
# Vérifier que tout est configuré
./check-config.sh

# Si OK, tu verras : ✅ Configuration OK !
```

### 3. Déploiement

```bash
# Tester en local (optionnel mais recommandé)
./test-docker.sh

# Déployer sur Clever Cloud
./deploy-to-clever.sh
```

---

## 📂 Structure du projet

```
mbc-backend/
├── Dockerfile                  # Dockerfile optimisé pour Clever Cloud
├── docker-compose.yml          # Pour le dev local
├── docker-compose.prod.yml     # Config production locale
│
├── deploy-to-clever.sh         # 🚀 Script de déploiement
├── check-config.sh             # ✅ Vérification config
├── test-docker.sh              # 🧪 Test local Docker
├── generate-secrets.js         # 🔐 Génération secrets
│
├── QUICKSTART.md               # ⚡ Guide rapide
├── DEPLOY-CLEVER.md            # 📖 Documentation complète
├── README.md                   # 📋 Ce fichier
│
├── config/                     # Configuration Strapi
│   ├── server.ts              # Config serveur (port 8080)
│   ├── database.ts            # Config BDD (PostgreSQL)
│   └── plugins.ts             # Config plugins (S3/Cellar)
│
└── src/                        # Code source
    └── api/
        └── health/            # Healthcheck endpoint
```

---

## 🔧 Configuration requise sur Clever Cloud

### Variables obligatoires

```bash
# Strapi
APP_KEYS="key1,key2,key3,key4"    # 4 clés séparées par des virgules
API_TOKEN_SALT="..."              # Salt pour les tokens API
ADMIN_JWT_SECRET="..."            # Secret pour JWT admin
TRANSFER_TOKEN_SALT="..."         # Salt pour les tokens de transfert
JWT_SECRET="..."                  # Secret JWT général

# Serveur
NODE_ENV=production
HOST=0.0.0.0
PORT=8080

# Base de données (auto si add-on PostgreSQL linké)
DATABASE_CLIENT=postgres
DATABASE_HOST=${POSTGRESQL_ADDON_HOST}
DATABASE_PORT=${POSTGRESQL_ADDON_PORT}
DATABASE_NAME=${POSTGRESQL_ADDON_DB}
DATABASE_USERNAME=${POSTGRESQL_ADDON_USER}
DATABASE_PASSWORD=${POSTGRESQL_ADDON_PASSWORD}
DATABASE_SSL=false

# Healthcheck
CC_HEALTH_CHECK_PATH=/_health
```

### Add-ons à linker

1. **PostgreSQL** - Base de données
2. **Cellar** - Stockage objet (pour les uploads)

---

## 🛠️ Scripts disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `deploy-to-clever.sh` | Déploie sur Clever Cloud | `./deploy-to-clever.sh` |
| `check-config.sh` | Vérifie la configuration | `./check-config.sh` |
| `test-docker.sh` | Teste l'image en local | `./test-docker.sh` |
| `generate-secrets.js` | Génère les secrets Strapi | `node generate-secrets.js` |

---

## 🐛 Dépannage

### Problème : "Nothing listening on 0.0.0.0:8080"

**Causes possibles :**
1. Variables d'environnement manquantes
2. Base de données non accessible
3. Mémoire insuffisante (OOM)

**Solutions :**
```bash
# 1. Vérifier les variables
./check-config.sh

# 2. Vérifier l'add-on PostgreSQL
clever services

# 3. Activer "Dedicated build instance" dans le dashboard
```

### Problème : "SIGKILL"

C'est un problème de mémoire.

**Solutions :**
1. Dashboard → Application → Edit → Cocher "Dedicated build instance"
2. Augmenter la taille de l'instance

### Problème : Build échoue en local

```bash
# Vérifier Docker
docker version

# Nettoyer le cache Docker
docker builder prune

# Rebuild sans cache
docker build --no-cache -t mbc-backend:test .
```

---

## 📊 Monitoring

### Voir les logs

```bash
# Logs en temps réel
clever logs -f

# Logs récents
clever logs

# Status de l'application
clever status
```

### Endpoints de monitoring

- **Health check** : `https://ton-app.cleverapps.io/_health`
- **Admin Strapi** : `https://ton-app.cleverapps.io/admin`
- **API** : `https://ton-app.cleverapps.io/api`

---

## 🔄 Workflow de développement

### Développement local

```bash
# Avec Docker Compose
docker-compose up

# Ou directement
yarn install
yarn develop
```

### Déploiement production

```bash
# 1. Développer en local
yarn develop

# 2. Tester avec Docker
./test-docker.sh

# 3. Commit
git add .
git commit -m "feat: nouvelle fonctionnalité"

# 4. Déployer
./deploy-to-clever.sh
```

---

## 📚 Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Guide de démarrage rapide
- [DEPLOY-CLEVER.md](./DEPLOY-CLEVER.md) - Documentation complète du déploiement
- [Clever Cloud Docs](https://www.clever-cloud.com/developers/doc/applications/docker/)
- [Strapi Docs](https://docs.strapi.io)

---

## 🆘 Support

Si tu rencontres un problème :

1. **Vérifier la configuration**
   ```bash
   ./check-config.sh
   ```

2. **Consulter les logs**
   ```bash
   clever logs -f
   ```

3. **Tester en local**
   ```bash
   ./test-docker.sh
   ```

4. **Documentation**
   - [DEPLOY-CLEVER.md](./DEPLOY-CLEVER.md)
   - [Clever Cloud Dashboard](https://console.clever-cloud.com)

---

## ✅ Checklist de déploiement

Avant de déployer, assure-toi que :

- [ ] Scripts sont exécutables (`chmod +x *.sh`)
- [ ] Secrets générés (`node generate-secrets.js`)
- [ ] Variables configurées sur Clever Cloud
- [ ] Configuration vérifiée (`./check-config.sh` ✅)
- [ ] Add-on PostgreSQL linké
- [ ] Add-on Cellar linké
- [ ] Test local réussi (optionnel)
- [ ] Remote git 'clever' configuré

---

## 🎯 Commandes essentielles

```bash
# Déployer
./deploy-to-clever.sh

# Vérifier config
./check-config.sh

# Tester localement
./test-docker.sh

# Voir les logs
clever logs -f

# Redémarrer
clever restart

# Variables d'env
clever env
```

---

**Dernière mise à jour :** 2025-11-11  
**Version :** 2.0 (nouveau système de déploiement)
