const BASE_URL = 'http://localhost:3000';

// POST /chat — unified entry point for all user queries.
// messages: prior conversation history [{ role: 'user'|'assistant', content }]
// Returns: { reply, data, url, chartType, groupby, sql, chartInfo }
export async function chatAI(query, messages = []) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, messages }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Something went wrong');
  }
  return res.json();
}

// POST /refresh-context — re-fetches databases/datasets from MCP without restart.
export async function refreshContext() {
  const res = await fetch(`${BASE_URL}/refresh-context`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh context');
  return res.json();
}

export async function askAI(query) {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(errorBody.error || 'Something went wrong');
  }

  return await res.json();
}

export async function publishToSuperset({ sql, chartType, groupby }) {
  const res = await fetch(`${BASE_URL}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, chartType, groupby })
  });

  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(errorBody.error || 'Failed to publish to Superset');
  }

  return await res.json();
}
