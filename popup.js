const readBtn = document.getElementById('read');
const listEl = document.getElementById('list');
const responseEl = document.getElementById('response');

const API_URL = 'https://study-helper-ugvc.onrender.com/api/gemini';

readBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: 'GET_SPANS' },
      response => {
        if (!response) return;
        const { texts } = response;
        listEl.innerHTML = '';
        responseEl.textContent = '';
        texts.forEach(text => {
          const li = document.createElement('li');
          li.textContent = text || '(empty)';
          li.style.cursor = 'pointer';
          li.addEventListener('click', () => sendToBackend(text));
          listEl.appendChild(li);
        });
      }
    );
  });
});

async function sendToBackend(text) {
  responseEl.textContent = 'Working...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      responseEl.textContent = 'Backend error: ' + res.status;
      return;
    }

    const data = await res.json();
    responseEl.textContent = data.result || '(No result from Gemini)';
  } catch (err) {
    console.error(err);
    responseEl.textContent = 'Network Error';
  }
}