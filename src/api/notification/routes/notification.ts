export default {
  routes: [
    {
      method: 'GET',
      path: '/notifications',
      handler: 'notification.find',
    },
    {
      method: 'GET',
      path: '/notifications/unread-count',
      handler: 'notification.getUnreadCount',
    },
    {
      method: 'PUT',
      path: '/notifications/:id/read',
      handler: 'notification.markAsRead',
    },
    {
      method: 'PUT',
      path: '/notifications/mark-all-read',
      handler: 'notification.markAllAsRead',
    },
    {
      method: 'DELETE',
      path: '/notifications/:id',
      handler: 'notification.delete',
    },
    {
      method: 'POST',
      path: '/notifications/broadcast',
      handler: 'notification.broadcast',
    },
    // Routes pour n8n
    {
      method: 'POST',
      path: '/notifications/send',
      handler: 'notification.sendPush',
      config: { auth: false, policies: ['global::require-api-token'] }
    },
    {
      method: 'DELETE',
      path: '/notifications/cleanup',
      handler: 'notification.cleanup',
      config: { auth: false, policies: ['global::require-api-token'] }
    }
  ]
};
