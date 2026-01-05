export default {
  routes: [
    {
      method: 'GET',
      path: '/important-announcements',
      handler: 'important-announcement.find',
      // Authentification requise
    },
    {
      method: 'GET',
      path: '/important-announcements/:id',
      handler: 'important-announcement.findOne',
      // Authentification requise
    },
    {
      method: 'POST',
      path: '/important-announcements',
      handler: 'important-announcement.create',
      config: {
        policies: ['global::is-app-admin'],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/important-announcements/:id',
      handler: 'important-announcement.update',
      config: {
        policies: ['global::is-app-admin'],
        middlewares: []
      }
    },
    {
      method: 'DELETE',
      path: '/important-announcements/:id',
      handler: 'important-announcement.delete',
      config: {
        policies: ['global::is-app-admin'],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/important-announcements/expired',
      handler: 'important-announcement.findExpired',
      config: {
        policies: ['global::require-api-token']
      }
    },
    {
      method: 'POST',
      path: '/important-announcements/send-scheduled',
      handler: 'important-announcement.sendScheduledNotifications',
      config: {
        policies: ['global::require-api-token']
      }
    },
    // ========== Routes n8n (API token) ==========
    {
      method: 'POST',
      path: '/n8n/important-announcements',
      handler: 'important-announcement.create',
      config: {
        auth: false,
        policies: ['global::require-api-token']
      }
    },
    {
      method: 'PUT',
      path: '/n8n/important-announcements/:id',
      handler: 'important-announcement.update',
      config: {
        auth: false,
        policies: ['global::require-api-token']
      }
    },
    {
      method: 'DELETE',
      path: '/n8n/important-announcements/:id',
      handler: 'important-announcement.delete',
      config: {
        auth: false,
        policies: ['global::require-api-token']
      }
    }
  ]
};
