export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    console.log('📝 [STRAPI] Register phase...');
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    console.log('🚀 [STRAPI] Bootstrap phase - démarrage...');
    console.log('🚀 [STRAPI] Host:', strapi.config.get('server.host'));
    console.log('🚀 [STRAPI] Port:', strapi.config.get('server.port'));
    
    // Log when server is about to start
    strapi.server.httpServer.on('listening', () => {
      const { host, port } = strapi.config.get('server');
      console.log(`✅ [STRAPI] Serveur HTTP démarré sur ${host}:${port}`);
    });

    console.log('✅ [STRAPI] Bootstrap terminé');
  },
};
