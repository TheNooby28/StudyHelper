document.addEventListener('dblclick', async (e) => {
  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (!text || text.length < 5) return;

  chrome.storage.sync.get('stealthMode', async ({ stealthMode }) => {
    if (!stealthMode) return;

    if (e.target.closest('.study-helper-answer')) return;

    const answerBox = document.createElement('div');
    answerBox.className = 'study-helper-answer';
    answerBox.textContent = 'Thinking…';
    answerBox.style.cssText = `
      background: #111;
      color: #0f0;
      padding: 6px 8px;
      margin-top: 6px;
      font-size: 13px;
      border-radius: 6px;
      max-width: 600px;
      font-family: monospace;
    `;

    const targetEl = e.target.closest('span, p, div');
    if (!targetEl) return;

    targetEl.after(answerBox);

    try {
      const tokenData = await chrome.storage.sync.get('token');
      const token = tokenData.token;

      if (!token) {
        answerBox.textContent = 'Not logged in';
        return;
      }

      const res = await fetch(
        'https://study-helper-ugvc.onrender.com/api/gemini',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ text })
        }
      );

      const data = await res.json();
      answerBox.textContent = data.result || 'No response';
    } catch (err) {
      answerBox.textContent = 'Error';
    }
  });
});
