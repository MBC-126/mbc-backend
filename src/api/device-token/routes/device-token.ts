export default {
  routes: [
    {
      method: 'POST',
      path: '/devices/register',
      handler: 'device-token.register',
      config: {
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/devices/unregister',
      handler: 'device-token.unregister',
      config: {
        policies: []
      }
    }
  ]
};
