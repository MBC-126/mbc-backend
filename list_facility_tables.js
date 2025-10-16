const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'mbc',
    user: 'mbc',
    password: 'mbc'
  });

  await client.connect();

  const res = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE '%facility%'
    ORDER BY tablename
  `);

  console.log(res.rows);

  await client.end();
})();
