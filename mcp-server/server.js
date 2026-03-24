const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const { generateSQL } = require('./llm');
const { runSQL } = require('./superset');

app.post('/ask', async (req, res) => {
  try {
    const query = req.body.query;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    // 🧠 1. Generate SQL
    let sql = await generateSQL(query);

    console.log("🤖 Raw SQL:", sql);

    // 🔥 2. VALIDATION LAYER (VERY IMPORTANT)

    // Only SELECT allowed
    if (!sql.toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT queries allowed");
    }

    // Fix common Gemini mistake
    if (sql.includes("SUM(") && !sql.toLowerCase().includes("sum(num)")) {
      console.log("⚠️ Fixing invalid SUM usage...");
      sql = "SELECT name, SUM(num) as total FROM birth_names GROUP BY name ORDER BY total DESC LIMIT 5";
    }

    // Ensure SUM present for aggregation queries
    if (!sql.toLowerCase().includes("sum(num)")) {
      console.log("⚠️ Forcing safe SQL...");
      sql = "SELECT name, SUM(num) as total FROM birth_names GROUP BY name ORDER BY total DESC LIMIT 5";
    }

    // Add LIMIT if missing
    if (!sql.toLowerCase().includes("limit")) {
      sql += " LIMIT 1000";
    }

    console.log("📌 Final SQL:", sql);

    // 🧠 3. Execute in Superset
    const data = await runSQL(sql);

    // 📊 4. Chart type detection
    let chartType = "bar";
    if (sql.toLowerCase().includes("year")) chartType = "line";

    res.json({
      sql,
      data,
      chartType
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