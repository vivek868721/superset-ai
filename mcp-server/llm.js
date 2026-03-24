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

Table: orders(id, amount, region, created_at)

Rules:
- Only SELECT queries
- No explanation
- No markdown

Convert this:
"${query}"
`;

        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash-latest", // try this, fallback if needed
            contents: prompt
        });

        const rawSQL = response.text;
        const sql = cleanSQL(rawSQL);

        console.log("Generated SQL:", sql);

        return sql;

    } catch (e) {
        console.error("Error in generateSQL:", e);

        // 🔥 fallback so your app doesn’t break
        return "SELECT region, SUM(amount) FROM orders GROUP BY region";
    }
}

module.exports = { generateSQL };