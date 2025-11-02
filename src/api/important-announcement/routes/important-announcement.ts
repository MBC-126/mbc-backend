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
    }
  ]
};
