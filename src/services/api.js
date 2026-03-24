export async function askAI(query) {
  const res = await fetch('http://localhost:3000/ask', {
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
