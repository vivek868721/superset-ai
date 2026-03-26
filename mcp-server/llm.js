const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

function cleanJSON(text) {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

async function generateAIConfig(query) {
    try {
        const prompt = `
You are an AI analytics engine.

Table: birth_names(name, gender, num, year)

Return ONLY JSON:

{
  "sql": "...",
  "chartType": "bar | line | pie",
  "groupby": ["column"],
  "metric": "sum__num"
}

Rules:
- Use SUM(num)
- Alias as total
- pie → distribution
- line → time
- else → bar

User Query:
"${query}"
`;

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const raw =
            response.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const cleaned = cleanJSON(raw);
        return JSON.parse(cleaned);

    } catch (e) {
        console.error("❌ AI fallback");

        return {
            sql: "SELECT name, SUM(num) AS total FROM birth_names GROUP BY name LIMIT 5",
            chartType: "bar",
            groupby: ["name"]
        };
    }
}

module.exports = { generateAIConfig };