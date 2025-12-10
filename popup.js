const readBtn = document.getElementById('read');
const listEl = document.getElementById('list');
const responseEl = document.getElementById('response');

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
      li.addEventListener('click', () => sendToApi(text));
      listEl.appendChild(li);
    });
  }
});

async function sendToApi(text) {
  responseEl.textContent = 'Sending...';

  try {
    const res = await fetch(/*AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA*/), {
      method: 'POST',
      headers: { 'Content-type': 'text/plain'},
      body: text
    };
    
  }
}