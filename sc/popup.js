const API_URL = 'https://study-helper-ugvc.onrender.com/api/ai';
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
const authMsg = document.getElementById('authmsg');

const usageText = document.getElementById('usageText');
const toggleAccount = document.getElementById('toggleAccount');
const dropdown = document.getElementById('accountDropdown');

const passwordDetailsBtn = document.getElementById('passwordDetailsBtn');
const passwordDetails = document.getElementById('passwordDetails');

const stealthToggle = document.getElementById('stealthToggle');

function setAuthMsg(msg) {
  authMsg.textContent = msg;
}

passwordDetailsBtn.addEventListener('click', () => {
  passwordDetails.hidden = !passwordDetails.hidden;
});

toggleAccount.addEventListener('click', async () => {
  dropdown.hidden = !dropdown.hidden;
  toggleAccount.textContent = dropdown.hidden ? '▼' : '▲';
});

async function loadUsage() {
  chrome.storage.sync.get('token', async ({ token }) => {
    if (!token) {
      usageText.textContent = 'Not logged in';
      return;
    }

    try {
      console.log('Fetching usage with token:', token);
      const res = await fetch(
        'https://study-helper-ugvc.onrender.com/api/usage',
        {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        }
      );
      console.log('Usage fetch status:', res.status);

      if (!res.ok) {
        usageText.textContent = 'Usage unavailable';
        return;
      }

      const data = await res.json();
      console.log('Usage data:', data);
      console.log('Usage data:', data);

      if (data.limit === null) {
        usageText.textContent = `Usage: ${data.used} / ∞`;
      } else {
        usageText.textContent = `Usage: ${data.used} / ${data.limit}`;
      }
    } catch (err) {
      usageText.textContent = 'Usage unavailable';
    }
  });
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

    if (!res.ok) {
      setAuthMsg('Signup failed: ' + res.status);
      return;
    }

    const data = await res.json();

    chrome.storage.sync.set({ token: data.token }, () => {
      setAuthMsg('Successful!');
    });
    loadUsage();
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

    if (!res.ok) {
      setAuthMsg('Login failed: ' + res.status);
      return;
    }

    const data = await res.json();

    chrome.storage.sync.set({ token: data.token }, () => {
      setAuthMsg('Logged in!')
    });
    loadUsage();
  } catch (err) {
    console.error(err);
    setAuthMsg('Network error');
  }
});

logoutBtn.addEventListener('click', () => {
  chrome.storage.sync.remove('token', () => {
    setAuthMsg('Logged out');
  });
  loadUsage();
});

readBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]?.id) {
      responseEl.textContent = 'No active tab';
      return;
    }

    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: 'GET_SPANS' },
      response => {
        if (chrome.runtime.lastError) {
          responseEl.textContent =
            'This page does not support reading questions.';
          return;
        }

        if (!response || !response.texts) {
          responseEl.textContent = 'No questions found on this page.';
          return;
        }

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
      responseEl.textContent = data.result || '(No result from AI)';
      loadUsage();
    });
  } catch (err) {
    console.error(err);
    responseEl.textContent = 'Network Error';
  }
}

chrome.storage.sync.get('stealthMode', ({ stealthMode }) => {
  if (stealthMode) {
    stealthToggle.classList.add('active');
    stealthToggle.textContent = '🥷';
  } else {
    stealthToggle.textContent = '👁️';
  }
});

stealthToggle.addEventListener('click', () => {
  chrome.storage.sync.get('stealthMode', ({ stealthMode }) => {
    const newValue = !stealthMode;

    chrome.storage.sync.set({ stealthMode: newValue });

    if (newValue) {
      stealthToggle.classList.add('active');
      stealthToggle.textContent = '🥷';
    } else {
      stealthToggle.classList.remove('active');
      stealthToggle.textContent = '👁️';
    }
  });
});


loadUsage();