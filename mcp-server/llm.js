const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

function cleanSQL(sql) {
    return sql.replace(/```sql/g, "").replace(/```/g, "").trim();
}

async function generateSQL(query) {
    try {
        const prompt = `
You are a SQL expert.

Database schema:
Table birth_names:
- name (text)
- gender (text)
- num (integer)
- year (integer)

STRICT RULES:
- Only SELECT queries
- Always include SUM(num) when aggregating
- Always alias SUM(num) as total
- GROUP BY required for aggregation
- ORDER BY must use selected column (total)
- No explanation
- Return only SQL

User query:
"${query}"
`;

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const raw =
            response.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const sql = cleanSQL(raw);

        console.log("🤖 Generated SQL:", sql);

        return sql;

    } catch (e) {
        console.error("❌ Gemini failed:", e.message);

        // 🔥 Safe fallback
        return "SELECT name, SUM(num) as total FROM birth_names GROUP BY name ORDER BY total DESC LIMIT 5";
    }
}

module.exports = { generateSQL };