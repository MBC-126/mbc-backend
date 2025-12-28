export default {
  routes: [
    {
      method: 'GET',
      path: '/events',
      handler: 'event.find',
      // Authentification requise
    },
    {
      method: 'GET',
      path: '/events/:id',
      handler: 'event.findOne',
      // Authentification requise
    },
    {
      method: 'POST',
      path: '/events',
      handler: 'event.create',
      config: {
        policies: ['global::is-app-admin'],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/events/:id',
      handler: 'event.update',
      config: {
        policies: ['global::is-app-admin'],
        middlewares: []
      }
    },
    {
      method: 'DELETE',
      path: '/events/:id',
      handler: 'event.delete',
      config: {
        policies: ['global::is-app-admin'],
        middlewares: []
      }
    }
  ]
};