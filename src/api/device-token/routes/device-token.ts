export default {
  routes: [
    {
      method: 'POST',
      path: '/devices/register',
      handler: 'device-token.register',
      // Authentification requise par défaut
    },
    {
      method: 'POST',
      path: '/devices/unregister',
      handler: 'device-token.unregister',
      // Authentification requise par défaut
    }
  ]
};
