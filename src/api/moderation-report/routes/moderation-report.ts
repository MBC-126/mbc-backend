export default {
  routes: [
    {
      method: 'POST',
      path: '/moderation-reports',
      handler: 'api::moderation-report.moderation-report.create',
      // Tout utilisateur authentifié peut créer un signalement
    },
    {
      method: 'GET',
      path: '/moderation-reports',
      handler: 'api::moderation-report.moderation-report.find',
      config: {
        policies: ['global::is-moderator'],
      },
    },
    {
      method: 'GET',
      path: '/moderation-reports/:id',
      handler: 'api::moderation-report.moderation-report.findOne',
      config: {
        policies: ['global::is-moderator'],
      },
    },
    {
      method: 'PUT',
      path: '/moderation-reports/:id',
      handler: 'api::moderation-report.moderation-report.update',
      config: {
        policies: ['global::is-moderator'],
      },
    },
    {
      method: 'DELETE',
      path: '/moderation-reports/:id',
      handler: 'api::moderation-report.moderation-report.delete',
      config: {
        policies: ['global::is-moderator'],
      },
    },
  ],
};



