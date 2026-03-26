require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { generateAIConfig } = require('./llm');
const {
  runSQL,
  createChart,
  createDashboard,
  addChartToDashboard
} = require('./superset');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/ask', async (req, res) => {
  try {
    const query = req.body.query;

    const config = await generateAIConfig(query);

    console.log("🤖 AI CONFIG:", config);

    let sql = config.sql;

    // 🔥 FIX: enforce LIMIT from user query
    const match = query.match(/(top|limit)\s+(\d+)/i);
    if (match) {
      const limit = parseInt(match[2]);
      sql = sql.replace(/limit\s+\d+/i, `LIMIT ${limit}`);
    } else if (!sql.toLowerCase().includes("limit")) {
      sql += " LIMIT 5";
    }

    const { data, token, csrfToken } = await runSQL(sql);

    const chartId = await createChart(token, csrfToken, {
      ...config,
      sql
    });

    const dashboardId = await createDashboard(token, csrfToken);

    await addChartToDashboard(dashboardId, chartId, token, csrfToken);

    res.json({
      sql,
      chartType: config.chartType,
      data,
      dashboardUrl: `http://localhost:8088/superset/dashboard/${dashboardId}/?standalone=1`
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 MCP Server running on port 3000");
});