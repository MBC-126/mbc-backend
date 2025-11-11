export default ({ env }) => {
  console.log('🔧 [SERVER CONFIG] Initialisation...');
  console.log('🔧 [SERVER CONFIG] HOST:', env('HOST', '0.0.0.0'));
  console.log('🔧 [SERVER CONFIG] PORT:', env.int('PORT') || env.int('CC_DOCKER_EXPOSED_HTTP_PORT') || 1337);
  
  return {
    host: env('HOST', '0.0.0.0'),
    // Utilise PORT (Clever Cloud, Heroku, etc.) ou CC_DOCKER_EXPOSED_HTTP_PORT, sinon 1337
    port: env.int('PORT') || env.int('CC_DOCKER_EXPOSED_HTTP_PORT') || 1337,
    app: {
      keys: env.array('APP_KEYS'),
    },
    cron: {
      // Désactiver temporairement les cron tasks pour le debug
      enabled: env.bool('CRON_ENABLED', false),
      tasks: require('../src/cron-tasks').default,
    },
  };
};
