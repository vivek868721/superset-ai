const axios = require('axios');

const SUPERSET_URL = process.env.SUPERSET_URL || 'http://localhost:8088';
const USERNAME = process.env.SUPERSET_USERNAME || 'admin';
const PASSWORD = process.env.SUPERSET_PASSWORD || 'admin';
const DATABASE_ID = process.env.SUPERSET_DATABASE_ID || 1;

// 🔐 Login
async function login() {
    const res = await axios.post(`${SUPERSET_URL}/api/v1/security/login`, {
        username: USERNAME,
        password: PASSWORD,
        provider: "db",
        refresh: true
    });

    return res.data.access_token;
}

// 🧠 Execute SQL
async function runSQL(sql) {
    try {
        const token = await login();

        const res = await axios.post(
            `${SUPERSET_URL}/api/v1/sqllab/execute/`,
            {
                database_id: parseInt(DATABASE_ID),
                sql: sql,
                schema: "public",     // 🔥 required
                runAsync: false,
                expand_data: true,
                queryLimit: 1000
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return res.data.data || res.data.result;

    } catch (error) {
        console.error("❌ QUERY ERROR:", error.response?.data || error.message);
        throw new Error("Query failed");
    }
}

module.exports = { runSQL };