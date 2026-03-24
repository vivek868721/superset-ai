const axios = require('axios');

const SUPERSET_URL = process.env.SUPERSET_URL || 'http://localhost:8088';
const SUPERSET_USERNAME = process.env.SUPERSET_USERNAME || 'admin';
const SUPERSET_PASSWORD = process.env.SUPERSET_PASSWORD || 'admin';
const SUPERSET_DATABASE_ID = process.env.SUPERSET_DATABASE_ID || 1;


async function login() {
  const res = await axios.post(`${SUPERSET_URL}/api/v1/security/login`, {
    username: SUPERSET_USERNAME,
    password: SUPERSET_PASSWORD,
    provider: "db"
  });

  return res.data.access_token;
}

async function runSQL(sql, token) {
  const res = await axios.post(
    `${SUPERSET_URL}/api/v1/sql_lab/execute/`,
    {
      database_id: parseInt(SUPERSET_DATABASE_ID),
      sql: sql,
      run_async: false
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return res.data.data;
}

module.exports = { login, runSQL };