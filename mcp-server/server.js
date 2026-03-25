const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const { generateAIConfig } = require('./llm');
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

    // 🧠 AI decides everything
    const config = await generateAIConfig(query);

    let sql = config.sql;

    console.log("🤖 SQL:", sql);
    console.log("🤖 Chart:", config.chartType);

    if (!sql.toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT allowed");
    }

    if (!sql.toLowerCase().includes("limit")) {
      sql += " LIMIT 1000";
    }

    // 🧠 Run SQL
    const { data, token } = await runSQL(sql);

    // 🚀 Create chart using AI config
    const chartId = await createChart(token, config);

    // 🚀 Dashboard
    const dashboardId = await createDashboard(token);

    await addChartToDashboard(dashboardId, chartId, token);

    const dashboardUrl = `http://localhost:8088/superset/dashboard/${dashboardId}/`;

    res.json({
      sql,
      chartType: config.chartType,
      data,
      dashboardUrl
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);

    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 MCP Server running on port 3000");
});