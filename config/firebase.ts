// /config/firebase.ts

import admin from 'firebase-admin';

export default ({ env }) => {
  // On utilise l'objet 'env' fourni par Strapi, qui a déjà lu votre .env
  const projectId = env('FIREBASE_PROJECT_ID');
  const clientEmail = env('FIREBASE_CLIENT_EMAIL');
  const privateKey = env('FIREBASE_PRIVATE_KEY');

  // --- C'EST LA CORRECTION CLÉ ---
  // On vérifie si les variables nécessaires sont bien présentes.
  // Pendant le 'build', elles seront 'undefined'.
  if (projectId && clientEmail && privateKey) {
    
    // On ne tente d'initialiser Firebase que si les secrets existent.
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'), // On garde votre astuce pour les sauts de ligne
          }),
        });
        console.log('✅ SDK Admin Firebase initialisé avec succès.');
      } catch (e) {
        console.error('❌ Erreur d\'initialisation du SDK Admin Firebase:', e.message);
      }
    }
    
    // Si tout est bon, on exporte l'instance initialisée.
    return {
      messaging: admin.messaging(),
      firestore: admin.firestore(),
      admin,
    };
  }

  // Si les variables manquent (pendant le build), on exporte un objet vide.
  // Cela permet au build de réussir sans planter.
  console.warn('⚠️ Variables Firebase manquantes, SDK Admin non initialisé. (Normal pendant le build)');
  return {};
};