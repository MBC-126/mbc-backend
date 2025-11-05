export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  // Utilise PORT (Clever Cloud, Heroku, etc.) ou CC_DOCKER_EXPOSED_HTTP_PORT, sinon 1337
  port: env.int('PORT') || env.int('CC_DOCKER_EXPOSED_HTTP_PORT') || 1337,
  app: {
    keys: env.array('APP_KEYS'),
  },
  cron: {
    enabled: true,
    tasks: require('../src/cron-tasks').default,
  },
});