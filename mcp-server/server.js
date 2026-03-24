const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const { generateSQL } = require('./llm');
const {
  runSQL,
  createChart,
  createDashboard,
  addChartToDashboard
} = require('./superset');

app.post('/ask', async (req, res) => {
  try {
    const query = req.body.query;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    // 🧠 Generate SQL
    let sql = await generateSQL(query);

    console.log("🤖 SQL:", sql);

    // 🔒 Safety
    if (!sql.toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT allowed");
    }

    if (!sql.toLowerCase().includes("limit")) {
      sql += " LIMIT 1000";
    }

    console.log("📌 Final SQL:", sql);

    // 📊 Chart type detection (FIX for Vue)
    let chartType = "bar";
    if (sql.toLowerCase().includes("year")) {
      chartType = "line";
    }

    // 🧠 Run SQL
    const { data, token } = await runSQL(sql);

// 1. Create chart
    const chartId = await createChart(token, query);

// 2. Create dashboard
    const dashboardId = await createDashboard(token);

// 3. Attach chart (THIS DOES EVERYTHING NOW)
    await addChartToDashboard(dashboardId, chartId, token);

    const dashboardUrl = `http://localhost:8088/superset/dashboard/${dashboardId}/`;

    res.json({
      sql,
      data,
      chartType,
      chartId,
      dashboardId,
      dashboardUrl
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);

    res.status(500).json({
      error: err.message
    });
  }
});

app.listen(3000, () => {
  console.log("🚀 MCP Server running on port 3000");
});