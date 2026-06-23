const BASE_URL = 'http://localhost:3000';

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
