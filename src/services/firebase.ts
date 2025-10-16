import * as admin from 'firebase-admin';

/**
 * Initialise Firebase Admin SDK
 *
 * Configuration requise :
 * 1. Télécharger le fichier de clé de compte de service depuis Firebase Console
 * 2. Le placer dans le dossier config/ (ou ailleurs sécurisé)
 * 3. Définir la variable d'environnement FIREBASE_SERVICE_ACCOUNT_PATH
 *
 * OU utiliser les variables d'environnement individuelles :
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_PRIVATE_KEY
 * - FIREBASE_CLIENT_EMAIL
 */
export const initializeFirebase = () => {
  try {
    // Vérifier si Firebase est déjà initialisé
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin SDK déjà initialisé');
      return admin;
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (serviceAccountPath) {
      // Méthode 1 : Utiliser le fichier de clé de compte de service
      const serviceAccount = require(serviceAccountPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      console.log('✅ Firebase Admin SDK initialisé avec fichier de clé');
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      // Méthode 2 : Utiliser les variables d'environnement
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });

      console.log('✅ Firebase Admin SDK initialisé avec variables d\'environnement');
    } else {
      console.warn('⚠️ Firebase Admin SDK non configuré - Les push notifications ne fonctionneront pas');
      console.warn('   Configurez FIREBASE_SERVICE_ACCOUNT_PATH ou les variables d\'environnement Firebase');
      return null;
    }

    return admin;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Firebase Admin SDK:', error);
    return null;
  }
};
