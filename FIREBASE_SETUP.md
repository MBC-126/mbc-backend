# Configuration Firebase pour les notifications push

## Étapes de configuration

### 1. Créer un projet Firebase

1. Aller sur https://console.firebase.google.com/
2. Créer un nouveau projet ou utiliser un projet existant
3. Activer Firebase Cloud Messaging (FCM)

### 2. Obtenir les credentials

#### Option A : Fichier de clé de compte de service (recommandé pour production)

1. Dans Firebase Console, aller dans **Project Settings** > **Service Accounts**
2. Cliquer sur **Generate new private key**
3. Télécharger le fichier JSON
4. Placer le fichier dans un endroit sécurisé (par ex: `config/firebase-service-account.json`)
5. Ajouter dans `.env`:
   ```
   FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
   ```

#### Option B : Variables d'environnement (recommandé pour développement)

1. Ouvrir le fichier JSON téléchargé
2. Extraire les valeurs suivantes et les ajouter dans `.env`:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
   ```

**Note:** La clé privée doit contenir les `\n` pour les retours à la ligne.

### 3. Configuration Android

1. Dans Firebase Console, ajouter une application Android
2. Télécharger le fichier `google-services.json`
3. Configurer dans l'application React Native Expo

### 4. Configuration iOS

1. Dans Firebase Console, ajouter une application iOS
2. Télécharger le fichier `GoogleService-Info.plist`
3. Configurer dans l'application React Native Expo
4. Configurer les certificats APNs (Apple Push Notification service)

### 5. Tester

Une fois configuré, redémarrer Strapi. Vous devriez voir dans les logs:
```
✅ Firebase Admin SDK initialisé avec fichier de clé
```

Si la configuration échoue, vous verrez:
```
⚠️ Firebase Admin SDK non configuré - Les push notifications ne fonctionneront pas
```

## Sécurité

- ⚠️ Ne jamais commit le fichier de clé de compte de service dans Git
- ⚠️ Ne jamais commit les variables d'environnement contenant les clés
- Ajouter `firebase-service-account.json` dans `.gitignore`
- Utiliser des variables d'environnement pour la production
