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
You are an analytics AI.

Table: birth_names(name, gender, num, year)

Return ONLY VALID JSON:

{
  "sql": "...",
  "chartType": "bar | line | pie",
  "groupby": ["column"]
}

Rules:
- ALWAYS use SUM(num) as total
- ALWAYS alias as total
- Respect user LIMIT (top N)
- If no limit → use LIMIT 5
- pie → distribution
- line → time
- else → bar

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