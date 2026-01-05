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
    },
    // ========== Routes n8n (API token) ==========
    {
      method: 'POST',
      path: '/n8n/daily-menus',
      handler: 'daily-menu.create',
      config: {
        auth: false,
        policies: ['global::require-api-token']
      }
    },
    {
      method: 'PUT',
      path: '/n8n/daily-menus/:id',
      handler: 'daily-menu.update',
      config: {
        auth: false,
        policies: ['global::require-api-token']
      }
    },
    {
      method: 'DELETE',
      path: '/n8n/daily-menus/:id',
      handler: 'daily-menu.delete',
      config: {
        auth: false,
        policies: ['global::require-api-token']
      }
    }
  ]
};
