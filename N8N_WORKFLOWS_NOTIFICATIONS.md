# 🔄 Workflows N8N pour Notifications FCM

**Date:** 2025-11-02
**Backend:** Strapi MaBase Connectée
**N8N Version:** Recommandé 1.0+

---

## 📋 Vue d'Ensemble

Deux workflows N8N sont requis pour automatiser les notifications FCM:

1. **Important Announcements** - Notifications planifiées (J-10 à 9h)
2. **Covoiturage Reminders** - Notifications 1h avant départ

---

## 🔐 Prérequis

### Variables d'Environnement N8N

Configurer dans N8N:
```env
STRAPI_API_URL=https://api.mabase.app
STRAPI_API_TOKEN=votre_token_api_strapi_secret
```

### Backend Strapi

Variables requises dans `.env`:
```env
N8N_WEBHOOK_URL=https://votre-instance-n8n.com/webhook
N8N_WEBHOOK_SECRET=secret_partagé_avec_n8n
N8N_API_SECRET=token_pour_authentifier_n8n
```

**Important:** Le `N8N_API_SECRET` doit être ajouté dans la policy `require-api-token` de Strapi.

---

## 📢 Workflow 1: Important Announcements

### Description
Envoie les notifications planifiées pour les Important Announcements à J-10 à 9h.

### Configuration

#### Node 1: Cron Trigger
```yaml
Type: Schedule Trigger
Cron Expression: 0 */1 * * *  # Toutes les heures
Description: Vérifie les notifications planifiées toutes les heures
```

**Alternative - Plus fréquent:**
```yaml
Cron Expression: */30 * * * *  # Toutes les 30 minutes
```

#### Node 2: HTTP Request
```yaml
Type: HTTP Request
Method: POST
URL: ${STRAPI_API_URL}/api/important-announcements/send-scheduled

Authentication: None (utilise header)
Headers:
  Authorization: Bearer ${STRAPI_API_TOKEN}
  Content-Type: application/json

Timeout: 30000

Options:
  - Response Format: JSON
  - Retry on Fail: Yes
  - Max Retries: 3
```

**Corps de la requête:** Vide (pas de body requis)

#### Node 3: Log Response (Optionnel)
```yaml
Type: Code
Description: Log le nombre de notifications envoyées

Code:
const response = $input.first().json;
console.log(`✅ Important Announcements: ${response.sent || 0} notifications envoyées`);
return {
  success: true,
  sent: response.sent
};
```

### Réponse Attendue

```json
{
  "success": true,
  "sent": 3
}
```

- `sent`: Nombre de notifications envoyées

### Diagramme du Workflow

```
┌─────────────────────────────────┐
│  Schedule Trigger               │
│  Cron: 0 */1 * * *              │
│  (Toutes les heures)            │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  HTTP Request                   │
│  POST /api/important-           │
│  announcements/send-scheduled   │
│                                 │
│  Headers:                       │
│  Authorization: Bearer ${TOKEN} │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Code (Log)                     │
│  console.log(response.sent)     │
└─────────────────────────────────┘
```

### Test du Workflow

1. Créer une Important Announcement dans Strapi avec:
   - `startDate`: Dans 15 jours
   - `priority`: high
2. Vérifier que `notificationScheduledFor` est défini à J-10 à 9h
3. Modifier `notificationScheduledFor` à maintenant - 1 min
4. Déclencher manuellement le workflow N8N
5. Vérifier que la notification est reçue sur les appareils
6. Vérifier que `notificationSent` est passé à `true`

---

## 🚗 Workflow 2: Covoiturage Reminders

### Description
Reçoit un webhook quand un covoiturage est créé/modifié, calcule l'heure "1h avant départ", attend jusqu'à cette heure, puis envoie la notification FCM.

### Configuration

#### Node 1: Webhook Trigger
```yaml
Type: Webhook
Path: /carpool-schedule
Method: POST
Authentication: Header Auth

Header Name: X-Webhook-Secret
Header Value: ${N8N_WEBHOOK_SECRET}

Response:
  Status Code: 200
  Body: {"success": true, "message": "Reminder scheduled"}
```

**Payload reçu depuis Strapi:**
```json
{
  "carpoolId": 123,
  "departureTime": "2025-11-02T14:00:00.000Z",
  "departureLocation": "Base Aérienne 102",
  "arrivalLocation": "Paris Gare de Lyon",
  "driverId": 45,
  "eventType": "created"
}
```

#### Node 2: Calculate Reminder Time
```yaml
Type: Code
Description: Calcule l'heure de rappel (1h avant départ)

Code:
const payload = $input.first().json.body;
const departureTime = new Date(payload.departureTime);
const reminderTime = new Date(departureTime.getTime() - (60 * 60 * 1000)); // -1h

const now = new Date();

// Si l'heure de reminder est déjà passée, ne pas envoyer
if (reminderTime < now) {
  console.log(`⚠️ Reminder time already passed for carpool ${payload.carpoolId}`);
  return null; // Arrête le workflow
}

return {
  carpoolId: payload.carpoolId,
  reminderTime: reminderTime.toISOString(),
  departureTime: payload.departureTime,
  departureLocation: payload.departureLocation,
  arrivalLocation: payload.arrivalLocation,
  delayMs: reminderTime.getTime() - now.getTime()
};
```

#### Node 3: Wait Until Reminder Time
```yaml
Type: Wait
Wait Type: For Webhook Call (ou utiliser Schedule trigger)

Alternative - Utiliser "Execute Workflow" avec délai:
Type: Code
Description: Schedule le reminder

Code:
const data = $input.first().json;
setTimeout(() => {
  // Déclenche le node suivant
}, data.delayMs);
```

**⚠️ Note:** N8N a des limitations sur les délais longs. Options:
1. Utiliser un **Workflow séparé** avec Cron qui vérifie toutes les 5 min si c'est l'heure
2. Utiliser une **base de données externe** (Redis/PostgreSQL) pour stocker les reminders planifiés

#### Node 4: HTTP Request - Send Reminder
```yaml
Type: HTTP Request
Method: POST
URL: ${STRAPI_API_URL}/api/carpools/{{ $json.carpoolId }}/send-reminder

Authentication: None
Headers:
  Authorization: Bearer ${STRAPI_API_TOKEN}
  Content-Type: application/json

Timeout: 30000

Options:
  - Response Format: JSON
  - Retry on Fail: Yes
  - Max Retries: 2
```

**Corps:** Vide (carpoolId dans l'URL)

#### Node 5: Log Success
```yaml
Type: Code
Description: Log le résultat

Code:
const response = $input.first().json;
console.log(`✅ Reminder sent for carpool ${response.carpoolId}: ${response.sentTo} participants`);
return response;
```

### Réponse Attendue

```json
{
  "success": true,
  "message": "Reminder envoyé avec succès.",
  "sentTo": 4
}
```

- `sentTo`: Nombre de participants notifiés (conducteur + passagers acceptés)

### Diagramme du Workflow

```
┌────────────────────────────────┐
│  Webhook Trigger               │
│  POST /carpool-schedule        │
│  Auth: X-Webhook-Secret        │
└──────────┬─────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│  Code: Calculate Time          │
│  reminderTime = departure - 1h │
│  delayMs = reminder - now      │
└──────────┬─────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│  Wait / Schedule               │
│  Attend jusqu'à reminderTime   │
└──────────┬─────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│  HTTP Request                  │
│  POST /api/carpools/:id/       │
│       send-reminder            │
│                                │
│  Headers:                      │
│  Authorization: Bearer ${TOKEN}│
└──────────┬─────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│  Code (Log)                    │
│  console.log(sentTo)           │
└────────────────────────────────┘
```

### Alternative: Workflow avec Base de Données

Pour les longs délais (> 1h), utiliser un workflow en 2 parties:

**Workflow A: Enregistrer Reminder**
1. Webhook trigger
2. Code: Calculate reminder time
3. **Database Insert:** Stocker dans table `carpool_reminders`
   - `carpoolId`
   - `reminderTime`
   - `sent: false`

**Workflow B: Check & Send Reminders** (Cron toutes les 5 min)
1. Schedule trigger: `*/5 * * * *`
2. **Database Query:** `SELECT * FROM carpool_reminders WHERE reminderTime <= NOW() AND sent = false`
3. Loop: Pour chaque reminder
4. HTTP Request: `/api/carpools/:id/send-reminder`
5. **Database Update:** Marquer `sent = true`

### Test du Workflow

1. Créer un covoiturage dans l'app avec `departureTime` dans 2 heures
2. Vérifier que le webhook N8N est appelé (logs Strapi + logs N8N)
3. Vérifier que le reminder est planifié pour dans 1h
4. Attendre (ou modifier `reminderTime` manuellement pour test)
5. Vérifier que la notification FCM est reçue par conducteur + passagers

---

## 🔧 Configuration Backend Strapi

### Policy: require-api-token

Créer ou modifier `/src/policies/require-api-token.ts`:

```typescript
export default (policyContext, config, { strapi }) => {
  const authHeader = policyContext.request.header.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  const validToken = process.env.N8N_API_SECRET;

  if (token !== validToken) {
    console.error('❌ Invalid API token from N8N');
    return false;
  }

  console.log('✅ Valid API token from N8N');
  return true;
};
```

**Enregistrer la policy dans `/src/index.ts`:**

```typescript
export default {
  register({ strapi }) {
    strapi.policy('global::require-api-token', require('./policies/require-api-token'));
  },
};
```

---

## 🧪 Tests des Workflows

### Test Important Announcements

**Commande cURL:**
```bash
curl -X POST https://api.mabase.app/api/important-announcements/send-scheduled \
  -H "Authorization: Bearer VOTRE_TOKEN_API" \
  -H "Content-Type: application/json"
```

**Réponse attendue:**
```json
{
  "success": true,
  "sent": 2
}
```

### Test Carpool Reminder

**1. Test du Webhook:**
```bash
curl -X POST https://votre-n8n.com/webhook/carpool-schedule \
  -H "X-Webhook-Secret: VOTRE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "carpoolId": 123,
    "departureTime": "2025-11-02T15:00:00.000Z",
    "departureLocation": "Base",
    "arrivalLocation": "Ville",
    "driverId": 45,
    "eventType": "created"
  }'
```

**2. Test de l'Endpoint Send Reminder:**
```bash
curl -X POST https://api.mabase.app/api/carpools/123/send-reminder \
  -H "Authorization: Bearer VOTRE_TOKEN_API" \
  -H "Content-Type: application/json"
```

**Réponse attendue:**
```json
{
  "success": true,
  "message": "Reminder envoyé avec succès.",
  "sentTo": 4
}
```

---

## 📊 Monitoring et Logs

### Dans N8N
- Activer **Workflow History**
- Vérifier les **Executions** (succès/échecs)
- Logs dans la console N8N

### Dans Strapi
Logs à surveiller:
```
✅ Webhook n8n OK → carpool 123
⏰ Envoi reminder pour covoiturage 123
✅ Reminder envoyé instantanément à 4 participants
✅ Important Announcements: 2 notifications envoyées
```

### Erreurs Courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| 401 Unauthorized | Token API invalide | Vérifier `STRAPI_API_TOKEN` dans N8N |
| 403 Forbidden | Policy bloque | Vérifier policy `require-api-token` |
| 404 Not Found | Route incorrecte | Vérifier URL endpoint |
| Timeout | Backend lent | Augmenter timeout à 60s |
| Webhook non reçu | Secret invalide | Vérifier `N8N_WEBHOOK_SECRET` |

---

## 🎯 Checklist de Déploiement

### Backend Strapi
- [ ] Variables d'environnement configurées (N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET, N8N_API_SECRET)
- [ ] Policy `require-api-token` créée et enregistrée
- [ ] Routes configurées avec la policy
- [ ] Backend redémarré après modifications

### N8N
- [ ] Workflow 1: Important Announcements créé et activé
- [ ] Workflow 2: Covoiturage Reminders créé et activé
- [ ] Variables d'environnement configurées (STRAPI_API_URL, STRAPI_API_TOKEN)
- [ ] Webhooks testés et fonctionnels

### Tests
- [ ] Test Important Announcements avec curl
- [ ] Test Carpool Reminder avec curl
- [ ] Test end-to-end: Créer covoiturage → Vérifier webhook → Attendre 1h (ou forcer) → Vérifier notification
- [ ] Monitoring activé (logs N8N + Strapi)

---

## 🚀 Déploiement N8N

### Options d'Hébergement

1. **N8N Cloud** (Recommandé pour simplicité)
   - https://n8n.cloud
   - Géré, maintenance automatique
   - Prix: ~$20/mois

2. **Self-Hosted** (Docker)
   ```bash
   docker run -d \
     --name n8n \
     -p 5678:5678 \
     -e N8N_HOST=votre-domaine.com \
     -e N8N_PROTOCOL=https \
     -e N8N_PORT=5678 \
     -e WEBHOOK_URL=https://votre-domaine.com/ \
     -v ~/.n8n:/home/node/.n8n \
     n8nio/n8n
   ```

3. **Railway / Render / Heroku**
   - Déploiement one-click
   - Scaling automatique

### Configuration SSL

**Important:** Webhooks DOIVENT être en HTTPS.

Options:
- N8N Cloud: SSL automatique
- Self-hosted: Utiliser Nginx + Let's Encrypt
- Railway/Render: SSL automatique

---

## 📞 Support

Pour questions/problèmes:
1. Vérifier les logs Strapi backend
2. Vérifier les executions N8N
3. Tester avec cURL les endpoints individuellement
4. Consulter la doc N8N: https://docs.n8n.io

---

**Dernière mise à jour:** 2025-11-02
**Version Backend:** Strapi 4.x avec FCM natif
**Prochaines améliorations:**
- Workflow pour reminders J-1 (optionnel)
- Workflow pour digest hebdomadaire (optionnel)
