const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

function cleanSQL(sql) {
    return sql
        .replace(/```sql/g, "")
        .replace(/```/g, "")
        .trim();
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

Rules:
- Only use birth_names
- Only SELECT queries
- Use correct columns only
- Use GROUP BY when aggregating
- No explanation
- No markdown

User query:
"${query}"
`;

        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash-latest",
            contents: prompt
        });

        const rawSQL = response.text;
        const sql = cleanSQL(rawSQL);

        console.log("🤖 Generated SQL:", sql);

        return sql;

    } catch (err) {
        console.error("⚠️ Gemini failed, using fallback");

        // ✅ fallback SQL
        return "SELECT name, SUM(num) FROM birth_names GROUP BY name";
    }
}

module.exports = { generateSQL };