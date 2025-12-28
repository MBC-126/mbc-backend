export default {
  routes: [
    {
      method: 'GET',
      path: '/daily-menus',
      handler: 'daily-menu.find',
      // Authentification requise
    },
    {
      method: 'GET',
      path: '/daily-menus/:id',
      handler: 'daily-menu.findOne',
      // Authentification requise
    },
    {
      method: 'POST',
      path: '/daily-menus',
      handler: 'daily-menu.create',
      config: {
        policies: ['global::is-app-admin'],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/daily-menus/:id',
      handler: 'daily-menu.update',
      config: {
        policies: ['global::is-app-admin'],
        middlewares: []
      }
    },
    {
      method: 'DELETE',
      path: '/daily-menus/:id',
      handler: 'daily-menu.delete',
      config: {
        policies: ['global::is-app-admin'],
        middlewares: []
      }
    }
  ]
};
