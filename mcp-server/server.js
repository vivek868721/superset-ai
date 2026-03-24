const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const { generateSQL } = require('./llm');
const { login, runSQL } = require('./superset');

app.post('/ask', async (req, res) => {
  try {
    const userQuery = req.body.query;

    if (!userQuery) {
      return res.status(400).json({ error: "Query is required" });
    }

    // 1. Generate SQL (AI or fallback)
    let sql = await generateSQL(userQuery);

    // 2. Safety check
    if (!sql.toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT queries allowed");
    }

    // 3. Add LIMIT if missing
    if (!sql.toLowerCase().includes("limit")) {
      sql += " LIMIT 1000";
    }

    // 4. Login to Superset
    const token = await login();

    // 5. Execute SQL
    const data = await runSQL(sql, token);

    // 6. Chart detection
    let chartType = "bar";
    if (sql.toLowerCase().includes("year")) chartType = "line";

    res.json({
      sql,
      data,
      chartType
    });

  } catch (err) {
    console.error("❌ Error:", err.message);

    res.status(400).json({
      error: "Something went wrong",
      details: err.message
    });
  }
});

app.listen(3000, () => {
  console.log('🚀 MCP Server running on port 3000');
});