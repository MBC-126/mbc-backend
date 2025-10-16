// /src/middlewares/proconnect-auth.js
'use strict';

console.log('✅ Fichier proconnect-auth.js est en cours de chargement...');

module.exports = (config, { strapi }) => {
  console.log('🚀 Initialisation du middleware proconnect-auth...');

  return async (ctx, next) => {
    console.log(`➡️ Requête reçue sur la route : ${ctx.request.url}`);

    // SIMULATION D'UTILISATEUR EN DEV
    // Si pas d'utilisateur authentifié ET en dev, on simule un utilisateur
    if (!ctx.state.user && process.env.NODE_ENV !== 'production') {
      try {
        // Récupérer le premier utilisateur de la base
        const users = await strapi.db.query('plugin::users-permissions.user').findMany({
          limit: 1,
        });

        if (users && users.length > 0) {
          ctx.state.user = users[0];
          console.log('👤 Utilisateur simulé:', users[0].username, '(ID:', users[0].id, 'documentId:', users[0].documentId, ')');
        }
      } catch (error) {
        console.error('❌ Erreur simulation utilisateur:', error);
      }
    }

    await next();
  };
};