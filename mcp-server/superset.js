const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const tough = require('tough-cookie');

const jar = new tough.CookieJar();
const client = wrapper(axios.create({ jar }));

const SUPERSET_URL = process.env.SUPERSET_URL || 'http://localhost:8088';
const SUPERSET_USERNAME = process.env.SUPERSET_USERNAME || 'admin';
const SUPERSET_PASSWORD = process.env.SUPERSET_PASSWORD || 'admin';
const SUPERSET_DATABASE_ID = process.env.SUPERSET_DATABASE_ID || 1;

// 🔐 Login (with cookies)
async function login() {
  const res = await client.post(`${SUPERSET_URL}/api/v1/security/login`, {
    username: SUPERSET_USERNAME,
    password: SUPERSET_PASSWORD,
    provider: "db",
    refresh: true
  });

  return res.data.access_token;
}

// 🔐 Get CSRF token
async function getCSRFToken(token) {
  const res = await client.get(`${SUPERSET_URL}/api/v1/security/csrf_token/`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return res.data.result;
}

// 🧠 Execute SQL
async function runSQL(sql, token) {
  try {
    const csrfToken = await getCSRFToken(token);

    const res = await client.post(
        `${SUPERSET_URL}/api/v1/sqllab/execute/`,
        {
          database_id: parseInt(SUPERSET_DATABASE_ID),
          sql: sql,
          runAsync: false,
          queryLimit: 1000
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRFToken": csrfToken,
            "Content-Type": "application/json"
          }
        }
    );

    console.log("✅ Superset success");

    return res.data.data || res.data.result;

  } catch (error) {
    console.error("❌ FULL ERROR:", error.response?.data || error.message);
    throw new Error("Superset query failed");
  }
}

module.exports = { login, runSQL };