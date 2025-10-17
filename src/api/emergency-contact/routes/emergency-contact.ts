export default {
  routes: [
    {
      method: 'GET',
      path: '/emergency-contacts',
      handler: 'emergency-contact.find',
      config: {
        auth: false
      }
    },
    {
      method: 'GET',
      path: '/emergency-contacts/:id',
      handler: 'emergency-contact.findOne',
      config: {
        auth: false
      }
    }
  ]
};
