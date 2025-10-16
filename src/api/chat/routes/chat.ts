export default {
  routes: [
    {
      method: 'POST',
      path: '/chat/conversations',
      handler: 'chat.createConversation',
    },
    {
      method: 'GET',
      path: '/chat/conversations',
      handler: 'chat.getConversations',
    },
    {
      method: 'GET',
      path: '/chat/conversations/:id/messages',
      handler: 'chat.getMessages',
    },
    {
      method: 'POST',
      path: '/chat/conversations/:id/messages',
      handler: 'chat.sendMessage',
    },
    {
      method: 'PUT',
      path: '/chat/conversations/:id/read',
      handler: 'chat.markAsRead',
    }
  ]
};
