const readBtn = document.getElementById('read');
const listEl = document.getElementById('list');
const responseEl = document.getElementById('response');

const API_URL = 'https://study-helper-ugvc.onrender.com';

button.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ['content.js']
      }
    );
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SPAN_TEXTS') {
    listEl.textContent = '';
    responseEl.textContent = '';

    msg.texts.forEach((text, index) => {
      const li = document.createElement('li');
      li.textContent = text || '(empty)';
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => sendToBackend(text));
      listEl.appendChild(li);
    });
  }
});

async function sendToApi(text) {
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