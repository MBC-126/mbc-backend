export default {
  routes: [
    {
      method: 'GET',
      path: '/important-announcements',
      handler: 'important-announcement.find',
      config: {
        auth: false
      }
    },
    {
      method: 'GET',
      path: '/important-announcements/:id',
      handler: 'important-announcement.findOne',
      config: {
        auth: false
      }
    }
  ]
};
