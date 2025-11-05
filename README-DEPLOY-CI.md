# 🚀 Déploiement automatique avec GitHub Actions + Clever Cloud

Ce guide explique comment configurer le CI/CD pour build automatique et déploiement sur Clever Cloud.

---

## 📋 Vue d'ensemble

**Workflow automatique :**
```
Push vers main → GitHub Actions build Docker → Push vers GHCR → Clever Cloud redéploie
```

**Avantages :**
- ✅ Build sur GitHub (RAM illimitée, plus de SIGKILL)
- ✅ Déploiement automatique (< 2 min)
- ✅ Images versionnées et traçables
- ✅ Cache intelligent pour builds rapides

---

## 🔧 Configuration initiale

### 1. Activer GitHub Container Registry (GHCR)

GitHub Container Registry est **gratuit** et déjà intégré à ton organisation `MBC-126`.

**Aucune action requise** - le workflow utilise automatiquement `ghcr.io/mbc-126/mbc-backend`.

---

### 2. Configurer les secrets GitHub

Va sur GitHub : **`MBC-126/mbc-backend` → Settings → Secrets and variables → Actions**

Ajoute les secrets suivants :

#### a) Token et Secret Clever Cloud

**Récupérer les credentials Clever Cloud :**

```bash
# Installer le CLI Clever Cloud (si pas déjà fait)
npm install -g clever-tools

# Se connecter
clever login

# Récupérer ton token
clever profile
```

Ou via l'interface web Clever Cloud :
1. Aller dans **Account → Information**
2. Section **Tokens** → Créer un nouveau token
3. Copier `Consumer Key` et `Consumer Secret`

**Ajouter les secrets GitHub :**
- `CLEVER_TOKEN` = Consumer Key
- `CLEVER_SECRET` = Consumer Secret

#### b) ID de l'organisation Clever Cloud

```bash
# Lister les organisations
clever organisations
```

Copier l'ID de ton organisation (format : `orga_xxxxxxxx`) et l'ajouter comme secret :
- `CLEVER_ORG_ID` = `orga_xxxxxxxx`

#### c) ID de l'application

```bash
# Lister les applications
clever applications

# Ou trouver l'ID d'une app spécifique
clever applications | grep mbc-backend
```

L'ID est au format `app_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

Ajouter le secret :
- `CLEVER_APP_ID` = `app_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Résumé des secrets à ajouter :**
| Secret Name | Description | Exemple |
|-------------|-------------|---------|
| `CLEVER_TOKEN` | Consumer Key Clever Cloud | `ck_xxxxxxxxxxxxxx` |
| `CLEVER_SECRET` | Consumer Secret Clever Cloud | `cs_xxxxxxxxxxxxxx` |
| `CLEVER_ORG_ID` | ID de l'organisation | `orga_xxxxxxxx` |
| `CLEVER_APP_ID` | ID de l'application mbc-backend | `app_xxxxxxxx-xxxx-...` |

---

### 3. Configurer Clever Cloud pour utiliser l'image pré-construite

#### Option A : Via l'interface web (RECOMMANDÉ)

1. Aller sur **Clever Cloud Dashboard → mbc-backend application**
2. **Environment variables** → Ajouter :
   ```
   CC_DOCKER_EXPOSED_HTTP_PORT=8080
   CC_MOUNT_DOCKER_SOCKET=false
   ```
3. **Information** → Section "Deployment" :
   - Changer de **"Build from Dockerfile"** vers **"Docker Image"**
   - Image : `ghcr.io/mbc-126/mbc-backend:latest`

#### Option B : Via CLI

```bash
# Se connecter à l'app
clever link mbc-backend

# Configurer l'image Docker
clever env set CC_DOCKER_EXPOSED_HTTP_PORT 8080
clever env set CC_MOUNT_DOCKER_SOCKET false

# Définir l'image à utiliser
clever config update --image ghcr.io/mbc-126/mbc-backend:latest
```

---

### 4. Rendre l'image GitHub Container Registry publique

**Pourquoi ?** Clever Cloud doit pouvoir pull l'image sans authentification.

**Étapes :**
1. Aller sur GitHub : **MBC-126 → Packages → mbc-backend**
2. **Package settings** (en bas à droite)
3. Section **Danger Zone** → **Change visibility** → **Public**

**Alternative (si tu veux garder privé) :**
- Créer un GitHub Personal Access Token avec scope `read:packages`
- L'ajouter dans les variables Clever Cloud pour authentification registry

---

## 🎯 Utilisation

### Déploiement automatique

**C'est automatique !** À chaque push vers `main` :

1. GitHub Actions build l'image Docker
2. Push vers `ghcr.io/mbc-126/mbc-backend:latest`
3. Clever Cloud est notifié et redéploie automatiquement

**Suivre le déploiement :**
```bash
# Logs GitHub Actions
# → MBC-126/mbc-backend → Actions → Dernier workflow

# Logs Clever Cloud
clever logs
```

---

### Déploiement manuel

Tu peux aussi déclencher un build manuellement :

**Via GitHub :**
1. Aller sur **Actions** → **Build & Deploy Docker Image**
2. Cliquer sur **Run workflow** → Sélectionner `main` → **Run**

**Via CLI Clever Cloud (redéploiement uniquement) :**
```bash
clever restart --without-cache
```

---

## 📦 Images disponibles

Le workflow crée plusieurs tags pour chaque build :

| Tag | Description | Exemple |
|-----|-------------|---------|
| `latest` | Dernière version de `main` | `ghcr.io/mbc-126/mbc-backend:latest` |
| `main` | Branch `main` | `ghcr.io/mbc-126/mbc-backend:main` |
| `main-abc1234` | Commit SHA court | `ghcr.io/mbc-126/mbc-backend:main-abc1234` |

**Utilisation :**
```bash
# Pull locale pour tester
docker pull ghcr.io/mbc-126/mbc-backend:latest
docker run -p 8080:8080 --env-file .env ghcr.io/mbc-126/mbc-backend:latest

# Rollback vers un commit spécifique sur Clever Cloud
clever config update --image ghcr.io/mbc-126/mbc-backend:main-abc1234
clever restart
```

---

## 🐛 Troubleshooting

### Le build GitHub Actions échoue avec "permission denied"

**Solution :** Vérifier les permissions du workflow.

Dans `.github/workflows/docker-build-deploy.yml`, assure-toi d'avoir :
```yaml
permissions:
  contents: read
  packages: write
```

---

### Clever Cloud ne peut pas pull l'image

**Erreur :** `Error pulling image: unauthorized`

**Solutions :**

1. **Vérifier que l'image est publique** (recommandé) :
   - GitHub → MBC-126 → Packages → mbc-backend → Change visibility → Public

2. **OU configurer l'authentification registry** :
   ```bash
   # Créer un GitHub Personal Access Token (PAT) avec scope read:packages
   # Puis sur Clever Cloud :
   clever env set CC_DOCKER_LOGIN_USERNAME <github-username>
   clever env set CC_DOCKER_LOGIN_PASSWORD <github-pat>
   clever restart
   ```

---

### Le déploiement Clever Cloud ne se déclenche pas

**Vérifier les secrets GitHub :**
```bash
# Les secrets suivants doivent être définis :
CLEVER_TOKEN
CLEVER_SECRET
CLEVER_ORG_ID
CLEVER_APP_ID
```

**Vérifier les logs GitHub Actions :**
- Aller dans **Actions** → Dernier workflow → Job "deploy-to-clever-cloud"
- Vérifier la sortie de l'étape "Trigger Clever Cloud deployment"

**Alternative : Webhook Clever Cloud**

Si l'API ne fonctionne pas, tu peux configurer un webhook :
1. Clever Cloud → Application → Notifications → Add webhook
2. URL : Utiliser un service comme [Zapier](https://zapier.com) ou créer un endpoint custom

---

### L'application Clever Cloud ne démarre pas

**Vérifier les variables d'environnement :**
```bash
clever env
```

Assure-toi que **toutes** les variables du fichier `README-DEPLOY-CI.md` (section variables d'environnement) sont définies.

**Vérifier les logs de démarrage :**
```bash
clever logs --since 10m
```

---

## 🔐 Sécurité

### Secrets à protéger

**Ne JAMAIS commit dans Git :**
- `.env`
- Credentials Clever Cloud
- GitHub Personal Access Tokens
- Firebase Private Key

**Utiliser GitHub Secrets pour :**
- `CLEVER_TOKEN`, `CLEVER_SECRET`
- `CLEVER_ORG_ID`, `CLEVER_APP_ID`

**Utiliser Clever Cloud Environment Variables pour :**
- Toutes les variables d'environnement de production
- `DATABASE_URL`, `S3_ACCESS_SECRET`, etc.

---

## 📊 Monitoring

### Suivre les déploiements

**Dashboard GitHub Actions :**
```
https://github.com/MBC-126/mbc-backend/actions
```

**Logs en temps réel Clever Cloud :**
```bash
clever logs -f
```

**Vérifier quelle image tourne actuellement :**
```bash
clever status
```

---

## 🚀 Workflow complet

### 1. Développement local
```bash
git checkout -b feature/nouvelle-fonctionnalite
# ... développement ...
git commit -m "feat: nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite
```

### 2. Pull Request & Review
```bash
# Créer PR sur GitHub
# → Code review
# → Tests manuels
```

### 3. Merge vers main
```bash
git checkout main
git merge feature/nouvelle-fonctionnalite
git push origin main
```

### 4. Déploiement automatique
```
→ GitHub Actions détecte le push vers main
→ Build l'image Docker (2-3 min)
→ Push vers ghcr.io/mbc-126/mbc-backend:latest
→ Trigger Clever Cloud redeploy
→ Clever Cloud pull la nouvelle image (30s)
→ Restart avec la nouvelle version (30s)
→ ✅ Déployé en production
```

**Temps total : ~4-5 minutes** (au lieu de 10+ min avec build sur Clever Cloud)

---

## 📝 Variables d'environnement Clever Cloud

Voir le fichier principal que je t'ai donné avec toutes les variables (DATABASE_URL, S3, Firebase, etc.).

**Format Clever Cloud :**
```bash
clever env set NOM_VARIABLE "valeur"
```

**Ou en masse via l'interface web** (copier-coller le bloc que je t'ai fourni).

---

## 🎉 C'est prêt !

Une fois tout configuré :
1. ✅ Push vers `main`
2. ✅ Attendre 4-5 minutes
3. ✅ Ton backend est déployé automatiquement

**Vérifier le déploiement :**
```bash
curl https://api.mabase.app/api/health
```

---

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Clever Cloud Docker Deployment](https://www.clever-cloud.com/doc/docker/)
- [Clever Cloud API](https://www.clever-cloud.com/doc/clever-cloud-apis/cc-api/)

---

**Besoin d'aide ?** Ouvre une issue sur le repo ou contacte l'équipe DevOps.
