export default {
  routes: [
    {
      method: 'GET',
      path: '/emergency-contacts',
      handler: 'emergency-contact.find',
      // Authentification requise - données sensibles
    },
    {
      method: 'GET',
      path: '/emergency-contacts/:id',
      handler: 'emergency-contact.findOne',
      // Authentification requise - données sensibles
    }
  ]
};
