const API_URL = 'https://study-helper-ugvc.onrender.com/api/gemini';
const SIGNUP_URL = 'https://study-helper-ugvc.onrender.com/api/signup'
const LOGIN_URL = 'https://study-helper-ugvc.onrender.com/api/login';

const readBtn = document.getElementById('read');
const listEl = document.getElementById('list');
const responseEl = document.getElementById('response');

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authMsg = document.getElementById('authMsg');

function setAuthMsg(msg) {
  authMsg.textContent = msg;
}

signupBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password)
    return setAuthMsg('Enter username + password');

  try {
    const res = await fetch(SIGNUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      setAuthMsg(data.error || 'Signup failed');
      return;
    }

    chrome.storage.sync.set({ token: data.token }, () => {
      setAuthMsg('Successful!');
    })
  } catch (err) {
    console.error(err);
    setAuthMsg('Network error');
  }
});

loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password)
    return setAuthMsg('Enter username + password');

  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      setAuthMsg(data.error || 'Login failed');
      return;
    }

    chrome.storage.sync.set({ token: data.token }, () => {
      setAuthMsg('Logged in!')
    });
  } catch (err) {
    console.error(err);
    setAuthMsg('Network error');
  }
});

logoutBtn.addEventListener('click', () => {
  chrome.storage.sync.remove('token', () => {
    setAuthMsg('Logged out');
  });
});

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
    chrome.storage.sync.get('token', async ({ token }) => {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
      responseEl.textContent = 'Backend error: ' + res.status;
      return;
    }

    const data = await res.json();
    responseEl.textContent = data.result || '(No result from Gemini)';
    });
  } catch (err) {
    console.error(err);
    responseEl.textContent = 'Network Error';
  }
}