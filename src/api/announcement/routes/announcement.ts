export default {
  routes: [
    {
      method: 'GET',
      path: '/announcements',
      handler: 'announcement.find',
    },
    {
      method: 'GET',
      path: '/announcements/:id',
      handler: 'announcement.findOne',
    },
    {
      method: 'POST',
      path: '/announcements',
      handler: 'announcement.create',
    },
    {
      method: 'PUT',
      path: '/announcements/:id',
      handler: 'announcement.update',
    },
    {
      method: 'DELETE',
      path: '/announcements/:id',
      handler: 'announcement.delete',
    },
    // ========== Routes n8n (API token) ==========
    {
      method: 'GET',
      path: '/announcements/expiring',
      handler: 'announcement.findExpiring',
      config: { auth: false, policies: ['global::require-api-token'] }
    },
    {
      method: 'PUT',
      path: '/n8n/announcements/:id',
      handler: 'announcement.update',
      config: {
        auth: false,
        policies: ['global::require-api-token']
      }
    }
  ]
};
