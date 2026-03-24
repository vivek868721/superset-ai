const express = require('express');
const axios = require('axios');
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

    // 1. Generate SQL
    const sql = await generateSQL(userQuery);

    // SQL Safety
    if (!sql.toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT allowed");
    }

    // Add LIMIT
    const finalSql = sql + " LIMIT 1000";

    // 2. Login Superset
    const token = await login();

    // 3. Run SQL
    let data;
    try {
        data = await runSQL(finalSql, token);
    } catch (error) {
        console.error("Error running SQL:", error.response ? error.response.data : error.message);
        return res.status(400).json({ error: "Error executing SQL query.", details: error.response ? error.response.data : null });
    }


    // 4. Decide Chart Type
    let chartType = "bar";
    if (sql.toLowerCase().includes("date") || sql.toLowerCase().includes("created_at")) {
        chartType = "line";
    }

    res.json({
      sql: finalSql,
      data,
      chartType
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(3000, () => {
  console.log('MCP Server running on port 3000');
});