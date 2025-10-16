# 📚 API Infrastructure Booking - Guide d'utilisation

**Date** : 2025-10-13
**Version** : 1.0
**Backend** : Strapi v5 + PostgreSQL + Firebase FCM

---

## 🎯 Vue d'ensemble

Système complet de réservation d'infrastructures avec :
- ✅ Validation des règles (horaires, durée, cooldown, blackouts)
- ✅ Contraintes DB dures anti-chevauchement (GIST exclusion)
- ✅ Notifications push FCM bidirectionnelles
- ✅ Export ICS sécurisé avec cache ETag
- ✅ Workflow pending → approved/rejected → cancelled

---

## 🔐 Authentification

Toutes les routes (sauf `/calendar.ics`) requièrent un JWT token :

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📌 Endpoints Booking

### 1. Créer une réservation

**POST** `/api/bookings`

**Body** :
```json
{
  "data": {
    "facility": 1,
    "start_at": "2025-10-15T10:00:00.000Z",
    "end_at": "2025-10-15T12:00:00.000Z",
    "note": "Cours de yoga"
  }
}
```

**Validation automatique** :
- Jour autorisé (`open_days`)
- Horaires autorisés (`open_hours`)
- Durée min/max respectée
- Délai de prévenance (`lead_time_min`)
- Cooldown respecté
- Pas de chevauchement avec blackouts

**Réponse 200** :
```json
{
  "data": {
    "id": 1,
    "status": "pending",
    "start_at": "2025-10-15T10:00:00.000Z",
    "end_at": "2025-10-15T12:00:00.000Z"
  }
}
```

**Réponse 400** (validation échouée) :
```json
{
  "error": {
    "message": "Validation échouée",
    "errors": [
      { "field": "hours", "message": "Horaires non autorisés. Créneaux disponibles: 08:00-18:00" }
    ]
  }
}
```

**Push notification** → Tous les managers de la facility reçoivent :
```json
{
  "title": "Réservation en attente",
  "body": "Une demande attend votre validation",
  "data": {
    "screen": "ManagerInbox",
    "facilityId": "1",
    "bookingId": "1"
  }
}
```

---

### 2. Approuver une réservation

**POST** `/api/bookings/:id/approve`

**Policy** : `is-facility-manager` (seuls les managers peuvent approuver)

**Body** : vide

**Réponse 200** :
```json
{
  "data": {
    "success": true,
    "bookingId": 1
  }
}
```

**Réponse 409** (chevauchement détecté par contrainte DB) :
```json
{
  "error": {
    "status": 409,
    "message": "Créneau déjà réservé (chevauchement détecté)"
  }
}
```

**Push notification** → Requester reçoit :
```json
{
  "title": "Réservation validée",
  "body": "Votre réservation pour Salle de sport a été approuvée",
  "data": {
    "screen": "BookingDetails",
    "bookingId": "1"
  }
}
```

---

### 3. Refuser une réservation

**POST** `/api/bookings/:id/reject`

**Policy** : `is-facility-manager`

**Body** :
```json
{
  "reason": "Salle réservée pour maintenance"
}
```

**Réponse 200** :
```json
{
  "data": {
    "success": true,
    "bookingId": 1
  }
}
```

**Push notification** → Requester reçoit :
```json
{
  "title": "Réservation refusée",
  "body": "Salle réservée pour maintenance",
  "data": {
    "screen": "BookingDetails",
    "bookingId": "1"
  }
}
```

---

### 4. Annuler une réservation

**POST** `/api/bookings/:id/cancel`

**Policy** : `is-requester-or-manager`

**Conditions** :
- **Requester** : peut annuler si `now + lead_time_min < start_at`
- **Manager** : peut annuler à tout moment

**Réponse 200** :
```json
{
  "data": {
    "success": true,
    "bookingId": 1
  }
}
```

**Réponse 403** (délai dépassé pour requester) :
```json
{
  "error": {
    "status": 403,
    "message": "Délai d'annulation dépassé"
  }
}
```

**Push notifications** :
- Si requester annule → Managers reçoivent "Réservation annulée par le demandeur"
- Si manager annule → Requester reçoit "Votre réservation a été annulée par le gestionnaire"

---

## 🏢 Endpoints Facility

### 5. Ajouter une indisponibilité (blackout)

**POST** `/api/facilities/:id/blockouts`

**Policy** : `is-facility-manager`

**Body** :
```json
{
  "start_at": "2025-10-20T08:00:00.000Z",
  "end_at": "2025-10-20T18:00:00.000Z",
  "reason": "Maintenance annuelle"
}
```

**Réponse 200** :
```json
{
  "data": {
    "id": 1,
    "start_at": "2025-10-20T08:00:00.000Z",
    "end_at": "2025-10-20T18:00:00.000Z",
    "reason": "Maintenance annuelle"
  }
}
```

**Réponse 409** (chevauchement avec autre blackout) :
```json
{
  "error": {
    "status": 409,
    "message": "Chevauchement avec une autre indisponibilité"
  }
}
```

---

### 6. Export calendrier ICS

**GET** `/api/facilities/:id/calendar.ics?token=xxx`

**Auth** : Public (mais token ICS requis)

**Headers de cache** :
```
ETag: "d41d8cd98f00b204e9800998ecf8427e"
Last-Modified: Mon, 13 Oct 2025 15:00:00 GMT
Cache-Control: public, max-age=60, stale-while-revalidate=120
Content-Type: text/calendar; charset=utf-8
```

**Réponse 200** :
```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MaBase//Infrastructure Calendar//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Salle de sport
X-WR-TIMEZONE:Europe/Paris
BEGIN:VEVENT
UID:1@mabase.app
DTSTAMP:20251013T150000Z
DTSTART:20251015T100000Z
DTEND:20251015T120000Z
SUMMARY:Salle de sport
DESCRIPTION:Réservation validée
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR
```

**Réponse 304** (cache valide) :
```
(Corps vide)
```

**Réponse 403** (token invalide) :
```json
{
  "error": {
    "status": 403,
    "message": "Token invalide"
  }
}
```

**Usage** :
```bash
# S'abonner au calendrier (Apple, Google, Outlook)
webcal://localhost:1337/api/facilities/1/calendar.ics?token=xxx
```

---

### 7. Régénérer le token ICS

**POST** `/api/facilities/:id/ics/regen`

**Policy** : `is-facility-manager`

**Body** : vide

**Réponse 200** :
```json
{
  "data": {
    "icsToken": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

**Effet** : Révoque l'ancien token (anciens abonnements ICS ne fonctionnent plus)

---

## 📱 Endpoints Device Token (FCM)

### 8. Enregistrer un token FCM

**POST** `/api/devices/register`

**Body** :
```json
{
  "token": "dXkP7xK...",
  "platform": "ios"
}
```

**Réponse 200** :
```json
{
  "data": {
    "id": 1,
    "token": "dXkP7xK...",
    "platform": "ios",
    "enabled": true,
    "last_seen": "2025-10-13T15:00:00.000Z"
  }
}
```

**Comportement upsert** :
- Si token existe → met à jour user + platform + last_seen
- Si token n'existe pas → crée

---

### 9. Désactiver un token FCM

**POST** `/api/devices/unregister`

**Body** :
```json
{
  "token": "dXkP7xK..."
}
```

**Réponse 200** :
```json
{
  "data": {
    "success": true
  }
}
```

---

## 🧪 Exemples de tests

### Test 1 : Créer une facility avec règles

```bash
curl -X POST http://localhost:1337/api/facilities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Salle de sport",
      "rules": {
        "open_days": [1,2,3,4,5],
        "open_hours": [{"start":"08:00","end":"20:00"}],
        "min_duration_min": 60,
        "max_duration_min": 180,
        "lead_time_min": 120,
        "cooldown_min": 30
      }
    }
  }'
```

---

### Test 2 : Créer une réservation valide

```bash
curl -X POST http://localhost:1337/api/bookings \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "facility": 1,
      "start_at": "2025-10-15T10:00:00.000Z",
      "end_at": "2025-10-15T12:00:00.000Z",
      "note": "Cours de yoga"
    }
  }'
```

---

### Test 3 : Approuver (en tant que manager)

```bash
curl -X POST http://localhost:1337/api/bookings/1/approve \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

---

### Test 4 : Tester contrainte anti-chevauchement

```bash
# Créer booking 1 : 10h-12h
curl -X POST http://localhost:1337/api/bookings/1/approve -H "Authorization: Bearer MANAGER_TOKEN"

# Créer booking 2 : 11h-13h (chevauchement !)
curl -X POST http://localhost:1337/api/bookings/2/approve -H "Authorization: Bearer MANAGER_TOKEN"

# Résultat attendu : 409 Conflict
```

---

### Test 5 : Export ICS avec cache

```bash
# Première requête (génère ICS)
curl -i "http://localhost:1337/api/facilities/1/calendar.ics?token=xxx"
# → 200 OK + ETag

# Deuxième requête avec ETag (cache valide)
curl -i -H "If-None-Match: ETAG_VALUE" \
  "http://localhost:1337/api/facilities/1/calendar.ics?token=xxx"
# → 304 Not Modified
```

---

## 🔒 Sécurité

### Contraintes DB (niveau PostgreSQL)

1. **booking_no_overlap** : Empêche 2 réservations `approved` de chevaucher sur une même facility
2. **blackout_no_overlap** : Empêche 2 blackouts de chevaucher sur une même facility

### Policies (niveau Strapi)

1. **is-facility-manager** : Vérifie que `userId ∈ facility.managers`
2. **is-requester-or-manager** : Vérifie que `userId = booking.requester` OU `userId ∈ facility.managers`

### Tokens

1. **JWT Token** : Authentification utilisateur (toutes routes sauf ICS)
2. **ICS Token** : UUID révocable pour accès calendrier public

### Validation serveur

- Toutes les validations sont **serveur-side** (jamais confiance client)
- Règles appliquées : `open_days`, `open_hours`, `min/max_duration`, `lead_time`, `cooldown`, `blackouts`

---

## 📊 Codes d'erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 304 | Not Modified (cache ICS valide) |
| 400 | Bad Request (validation échouée, paramètres manquants) |
| 401 | Unauthorized (JWT token manquant/invalide) |
| 403 | Forbidden (policy échouée, token ICS invalide) |
| 404 | Not Found (ressource introuvable) |
| 409 | Conflict (chevauchement détecté par contrainte DB) |
| 500 | Internal Server Error |

---

## 🚀 Workflow complet

```
1. User crée booking (pending)
   → Push aux managers

2. Manager approve
   → Contrainte DB vérifie chevauchement
   → Si OK: statut = approved
   → Push au requester

3. ICS auto-mise à jour
   → ETag change
   → Clients calendar récupèrent nouvelle version

4. Si besoin annuler
   → Requester peut annuler si délai OK
   → Manager peut annuler toujours
   → Push à l'autre partie
```

---

## 📝 Notes d'implémentation

### Strapi v5 - Relations

Les relations utilisent des **link tables** :
- `bookings_facility_lnk`
- `bookings_requester_lnk`
- `facilities_managers_lnk`
- `device_tokens_user_lnk`
- `facility_blackouts_facility_lnk`

Des **triggers PostgreSQL** synchronisent automatiquement les colonnes FK (`facility_id`, `requester_id`, `user_id`) pour permettre les contraintes GIST.

### Timestamps

Toutes les dates sont en `timestamptz` (UTC) pour compatibilité avec `tstzrange()` (contraintes GIST).

### Push Notifications

- Service FCM utilise **HTTP v1 API** (google-auth-library)
- Tokens invalides (`UNREGISTERED`) sont automatiquement désactivés
- Pas de PII dans les payloads (RGPD-compliant)

---

**🎉 Backend 100% opérationnel - Prêt pour intégration frontend React Native !**
