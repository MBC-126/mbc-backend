export default {
  routes: [
    {
      method: 'GET',
      path: '/moderation/queue',
      handler: 'api::moderation.moderation.queue',
      config: {
        policies: ['global::is-moderator'],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/moderation/:reportId/keep',
      handler: 'api::moderation.moderation.keep',
      config: {
        policies: ['global::is-moderator'],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/moderation/:reportId/remove',
      handler: 'api::moderation.moderation.remove',
      config: {
        policies: ['global::is-moderator'],
        middlewares: []
      }
    }
  ]
};