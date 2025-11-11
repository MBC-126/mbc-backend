# 🚀 Déploiement rapide - MBC Backend

## TL;DR - Déploiement en 5 minutes

### 1️⃣ Préparer l'environnement

```bash
# Rendre les scripts exécutables
chmod +x deploy-to-clever.sh check-config.sh generate-secrets.js

# Générer les secrets Strapi (si pas déjà fait)
node generate-secrets.js

# Copier et exécuter les commandes affichées
# Par exemple:
clever env set APP_KEYS "ton-app-key-généré"
clever env set API_TOKEN_SALT "ton-salt-généré"
# ... etc
```

### 2️⃣ Vérifier la configuration

```bash
# Vérifier que tout est OK
./check-config.sh
```

Si des variables manquent, définis-les :
```bash
clever env set NOM_VARIABLE "valeur"
```

### 3️⃣ Déployer

```bash
# Méthode simple avec le script
./deploy-to-clever.sh

# OU manuellement
git add .
git commit -m "Deploy to Clever Cloud"
git push clever main:master
```

### 4️⃣ Suivre les logs

```bash
clever logs -f
```

---

## ❓ Problèmes courants

### "Nothing listening on 0.0.0.0:8080"

**Solution 1: Vérifier les variables**
```bash
./check-config.sh
```

**Solution 2: Vérifier que l'add-on PostgreSQL est linké**
```bash
clever services
```

**Solution 3: Activer "Dedicated build instance"**
- Va sur le dashboard Clever Cloud
- Application → Edit → Cocher "Dedicated build instance"

### "SIGKILL" dans les logs

C'est un problème de mémoire. Solutions:
1. Activer "Dedicated build instance" (voir ci-dessus)
2. Augmenter la taille de l'instance (dans le dashboard)

### Variables manquantes

```bash
# Générer de nouveaux secrets
node generate-secrets.js

# Les définir un par un
clever env set APP_KEYS "..."
```

---

## 📁 Fichiers créés

- `deploy-to-clever.sh` - Script de déploiement automatique
- `check-config.sh` - Vérifier la configuration
- `generate-secrets.js` - Générer les secrets Strapi
- `DEPLOY-CLEVER.md` - Documentation complète
- `Dockerfile` - Dockerfile optimisé pour Clever Cloud

---

## 🆘 Support

Si tu as un problème:

1. **Vérifier les logs**
   ```bash
   clever logs -f
   ```

2. **Vérifier la config**
   ```bash
   ./check-config.sh
   ```

3. **Voir le status**
   ```bash
   clever status
   clever applications
   ```

4. **Dashboard**
   https://console.clever-cloud.com

---

## ✅ Checklist finale

Avant de déployer, assure-toi que:

- [ ] Scripts exécutables (`chmod +x *.sh`)
- [ ] Secrets générés et définis sur Clever Cloud
- [ ] Configuration vérifiée (`./check-config.sh`)
- [ ] Add-on PostgreSQL linké
- [ ] Add-on Cellar linké (pour les uploads)
- [ ] Remote git 'clever' configuré

---

## 🎯 Commandes essentielles

```bash
# Déployer
./deploy-to-clever.sh

# Vérifier config
./check-config.sh

# Générer secrets
node generate-secrets.js

# Voir logs
clever logs -f

# Redémarrer
clever restart

# Lister variables
clever env

# Définir variable
clever env set MA_VAR "valeur"
```
