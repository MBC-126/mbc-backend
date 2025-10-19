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
    },
    {
      method: 'POST',
      path: '/important-announcements',
      handler: 'important-announcement.create',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/important-announcements/:id',
      handler: 'important-announcement.update',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'DELETE',
      path: '/important-announcements/:id',
      handler: 'important-announcement.delete',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};
