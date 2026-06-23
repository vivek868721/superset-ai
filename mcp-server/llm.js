const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

function cleanJSON(text) {
    return text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
}

function fallback() {
    return {
        sql: "SELECT name, SUM(num) AS total FROM birth_names GROUP BY name ORDER BY total DESC LIMIT 5",
        chartType: "bar",
        groupby: ["name"]
    };
}

async function generateAIConfig(query) {
    try {
        const prompt = `
You are an analytics AI generating SQLite SQL.

Table: birth_names
Columns:
- ds (DATETIME)   -- the date; extract the year with strftime('%Y', ds)
- gender (TEXT)   -- 'boy' or 'girl'
- name (TEXT)     -- the baby name
- num (BIGINT)    -- count of births
- state (TEXT)    -- US state code
- num_boys (BIGINT)
- num_girls (BIGINT)

Return ONLY VALID JSON:

{
  "sql": "...",
  "chartType": "bar | line | pie",
  "groupby": ["column"]
}

Rules:
- ALWAYS use SUM(num) AS total
- This is SQLite. There is NO "year" column — for year use: CAST(strftime('%Y', ds) AS INTEGER) AS year
- When grouping/ordering by year, use the SAME expression (or its alias "year")
- Respect user LIMIT (top N); if none → LIMIT 5
- pie → distribution (e.g. by gender or name)
- line → over time (group by year from ds)
- else → bar
- groupby must list the SELECTed dimension alias(es), e.g. ["name"] or ["year"]

User Query:
${query}
`;

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const raw = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleaned = cleanJSON(raw);
        const parsed = JSON.parse(cleaned);

        return {
            sql: parsed.sql || fallback().sql,
            chartType: parsed.chartType || "bar",
            groupby: parsed.groupby || ["name"]
        };

    } catch (e) {
        console.error("❌ AI ERROR:", e.message);
        return fallback();
    }
}

module.exports = { generateAIConfig };