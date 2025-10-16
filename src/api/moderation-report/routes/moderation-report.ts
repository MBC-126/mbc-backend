export default {
  routes: [
    {
      method: 'POST',
      path: '/moderation-reports',
      handler: 'api::moderation-report.moderation-report.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/moderation-reports',
      handler: 'api::moderation-report.moderation-report.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/moderation-reports/:id',
      handler: 'api::moderation-report.moderation-report.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/moderation-reports/:id',
      handler: 'api::moderation-report.moderation-report.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/moderation-reports/:id',
      handler: 'api::moderation-report.moderation-report.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};


