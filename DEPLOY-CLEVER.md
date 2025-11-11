# 🚀 Guide de déploiement Clever Cloud

## Prérequis

1. ✅ Clever Tools CLI installé : `npm install -g clever-tools`
2. ✅ Authentifié : `clever login`
3. ✅ Remote git configuré
4. ✅ Variables d'environnement configurées sur Clever Cloud

## Variables d'environnement OBLIGATOIRES sur Clever Cloud

Vérifie dans le dashboard Clever Cloud que ces variables sont définies :

### Base de données (auto depuis l'add-on PostgreSQL)
- `POSTGRESQL_ADDON_HOST`
- `POSTGRESQL_ADDON_PORT`
- `POSTGRESQL_ADDON_DB`
- `POSTGRESQL_ADDON_USER`
- `POSTGRESQL_ADDON_PASSWORD`

### Strapi (à définir manuellement)
```bash
clever env set NODE_ENV production
clever env set HOST "0.0.0.0"
clever env set PORT 8080

# Génère ces secrets avec: node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
clever env set APP_KEYS "key1,key2,key3,key4"
clever env set API_TOKEN_SALT "ton-salt"
clever env set ADMIN_JWT_SECRET "ton-secret"
clever env set TRANSFER_TOKEN_SALT "ton-salt"
clever env set JWT_SECRET "ton-jwt-secret"
```

### Database config (si PostgreSQL add-on)
```bash
clever env set DATABASE_CLIENT postgres
clever env set DATABASE_HOST '${POSTGRESQL_ADDON_HOST}'
clever env set DATABASE_PORT '${POSTGRESQL_ADDON_PORT}'
clever env set DATABASE_NAME '${POSTGRESQL_ADDON_DB}'
clever env set DATABASE_USERNAME '${POSTGRESQL_ADDON_USER}'
clever env set DATABASE_PASSWORD '${POSTGRESQL_ADDON_PASSWORD}'
clever env set DATABASE_SSL false
```

### Stockage S3/Cellar (si add-on Cellar)
```bash
clever env set AWS_ACCESS_KEY_ID '${CELLAR_ADDON_KEY_ID}'
clever env set AWS_SECRET_ACCESS_KEY '${CELLAR_ADDON_KEY_SECRET}'
clever env set AWS_REGION "eu-west-3"
clever env set AWS_BUCKET "ton-bucket"
clever env set AWS_ENDPOINT "https://cellar-c2.services.clever-cloud.com"
```

### Healthcheck
```bash
clever env set CC_HEALTH_CHECK_PATH "/_health"
```

## Méthode 1: Script automatique (RECOMMANDÉ)

```bash
# Rendre le script exécutable
chmod +x deploy-to-clever.sh

# Lancer le déploiement
./deploy-to-clever.sh
```

Le script va :
1. ✅ Vérifier la configuration git
2. 🔨 (Optionnel) Builder et tester en local
3. 📝 Committer les changements
4. 🚀 Pusher vers Clever Cloud

## Méthode 2: Déploiement manuel

### Étape 1: Vérifier/ajouter le remote Clever Cloud

```bash
# Vérifier les remotes
git remote -v

# Si 'clever' n'existe pas, l'ajouter
git remote add clever git+ssh://git@push-n3-par-clevercloud-customers.services.clever-cloud.com/app_596f177d-c0ee-49a5-9022-4be4c53be87f.git
```

### Étape 2: Builder et tester en local (optionnel mais recommandé)

```bash
# Build
docker build -t mbc-backend:local .

# Test avec SQLite (sans BDD)
docker run --rm -p 8080:8080 \
  -e DATABASE_CLIENT=sqlite \
  -e DATABASE_FILENAME=.tmp/data.db \
  mbc-backend:local

# Ouvre http://localhost:8080 pour tester
```

### Étape 3: Commit et push

```bash
# Commit
git add .
git commit -m "Fix: Use complete Dockerfile for Clever Cloud deployment"

# Push vers Clever Cloud (branch master)
git push clever main:master
```

### Étape 4: Suivre les logs

```bash
# Logs en temps réel
clever logs -f

# Ou via le dashboard
https://console.clever-cloud.com
```

## Dépannage

### L'app ne démarre pas (timeout sur port 8080)

**Symptômes :**
```
Nothing listening on 0.0.0.0:8080 yet
error Command failed with signal "SIGKILL"
```

**Causes possibles :**

1. **Variables d'environnement manquantes**
   ```bash
   clever env
   ```
   Vérifie que `PORT=8080` et toutes les vars de BDD sont présentes.

2. **Problème de mémoire (OOM)**
   - Solution: Activer "Dedicated build instance" dans le dashboard
   - Ou augmenter la taille de l'instance

3. **Database non accessible**
   ```bash
   # Vérifie que l'add-on PostgreSQL est bien linké
   clever service link-addon <addon-id>
   ```

4. **APP_KEYS manquantes**
   Strapi ne peut pas démarrer sans ces clés.

### Logs utiles

```bash
# Logs d'application
clever logs

# Logs de build
clever logs --before

# Status de l'app
clever status

# Informations sur l'app
clever applications
```

### Redéployer sans push

```bash
# Redémarrer l'app
clever restart

# Ou via le webhook (si configuré)
curl -X POST "$CLEVER_WEBHOOK_URL"
```

## Architecture du déploiement

```
┌─────────────────┐
│   Local Build   │  ← Tu peux tester ici avant
└────────┬────────┘
         │
         │ git push clever main:master
         ▼
┌─────────────────┐
│  Clever Cloud   │
│  Git Receiver   │  ← Détecte le push
└────────┬────────┘
         │
         │ Détecte Dockerfile
         ▼
┌─────────────────┐
│  Docker Build   │  ← Build l'image (peut OOM ici)
│  2-stage build  │     Solution: Dedicated build
└────────┬────────┘
         │
         │ docker run
         ▼
┌─────────────────┐
│   Container     │  ← L'app doit écouter 0.0.0.0:8080
│   (Production)  │     Clever Cloud check pendant 2min
└─────────────────┘
```

## Checklist avant déploiement

- [ ] Dockerfile à la racine (pas dans ci/)
- [ ] Variables d'environnement configurées
- [ ] Add-ons (PostgreSQL + Cellar) linkés
- [ ] Healthcheck endpoint existe (`/_health`)
- [ ] Remote git 'clever' configuré
- [ ] Test local OK (optionnel)

## Commandes utiles

```bash
# Voir les variables d'env
clever env

# Définir une variable
clever env set MA_VAR "valeur"

# Lister les add-ons
clever service link-addon

# Informations sur l'app
clever applications

# Redémarrer
clever restart

# Ouvrir dans le navigateur
clever open
```

## Support

- Documentation Clever Cloud Docker: https://www.clever-cloud.com/developers/doc/applications/docker/
- Dashboard: https://console.clever-cloud.com
- Logs: `clever logs -f`
