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
    // Route pour n8n
    {
      method: 'GET',
      path: '/announcements/expiring',
      handler: 'announcement.findExpiring',
      config: { auth: false, policies: ['global::require-api-token'] }
    }
  ]
};
