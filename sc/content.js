// Get's the input from that script to the left of me
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_SPANS') {
    const spans = document.querySelectorAll('span.M7eMe');
    const texts = spans.length
      ? Array.from(spans).map(s => s.textContent.trim())
      : ['(No span.M7eMe found on this page)'];

    sendResponse({ texts });
  }
});
// Pretty much checks for an alt + click
document.addEventListener('click', async (e) => {
  console.log('Click')
  let altClick = false;
  let ctrlClick = false;
  if (e.altKey) { altClick = true; }
  if (e.ctrlKey) { ctrlClick = true; }
  if (altClick && ctrlClick) { return; }

  if (altClick) {
    chrome.storage.sync.get('stealthMode', async ({ stealthMode }) => {
      if (!stealthMode) return;

      const questionSpan = e.target.closest('span.M7eMe');
      if (!questionSpan) return;

      if (questionSpan.nextElementSibling?.classList.contains('study-helper-answer')) {
        return;
      }
      let small = false;
      const fullQuestion = questionSpan.textContent.trim();
      if (!fullQuestion) return;
      if (/^[a-zA-Z]+$/.test(fullQuestion)) small = true;

      const answerBox = document.createElement('div');
      answerBox.className = 'study-helper-answer';
      answerBox.textContent = '...';

      answerBox.style.cssText = `
        background: rgba(0, 0, 0, 0.2);
        color: black;
        padding: 6px 8px;
        margin-top: 6px;
        font-size: 13px;
        border-radius: 6px;
        max-width: 600px;
        
        white-space: normal;
        word-break: normal;
        overflow-wrap: normal;

        line-height: 1.4;
      `;

      questionSpan.after(answerBox);
      if (!small) {
        chrome.storage.sync.get('token', async ({ token }) => {
          if (!token) {
            answerBox.textContent = 'Not logged in';
            return;
          }

          try {
            const res = await fetch(
              'https://study-helper-ugvc.onrender.com/api/ai',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ text: fullQuestion })
              }
            );

            if (!res.ok) {
              answerBox.textContent = `Error: (${res.status})`;
              return;
            }

            const data = await res.json();

            const cleaned = data.result
              .replace(/\s*\n\s*/g, ' ') // remove weird newlines
              .replace(/\s+/g, ' ')     // collapse extra spaces
              .trim();
            answerBox.textContent = cleaned;
          } catch (err) {
            answerBox.textContent = 'Network error';
          }
        });
      } else {
        try {
          const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${fullQuestion}`);
          const data = await res.json();
          if (!Array.isArray(data)) {
            answerBox.textContent = 'No definition found';
            return;
          }
          const firstDef = data[0].meanings[0].definitions[0].definition;
          answerBox.textContent = firstDef;
        } catch(err) {
          answerBox.textContent = 'Network error';
        }
      }
    });
  } else if (ctrlClick) {
    chrome.storage.sync.get('stealthMode', async ({ stealthMode }) => {
      if (!stealthMode) return;

      const questionSpan = e.target.closest('span.M7eMe');
      if (!questionSpan) return;

      if (questionSpan.nextElementSibling?.classList.contains('study-helper-answer')) {
        return;
      }
      const fullQuestion = questionSpan.textContent.trim();
      if (!fullQuestion) return;

      const answerBox = document.createElement('div');
      answerBox.className = 'study-helper-answer';
      answerBox.textContent = '...';

      answerBox.style.cssText = `
        background: rgba(0, 0, 0, 0.2);
        color: black;
        padding: 6px 8px;
        margin-top: 6px;
        font-size: 13px;
        border-radius: 6px;
        max-width: 600px;
        
        white-space: normal;
        word-break: normal;
        overflow-wrap: normal;

        line-height: 1.4;
      `;

      questionSpan.after(answerBox);
      try {
        const res = await fetch("https://study-helper-ugvc.onrender.com/api/datamuse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: fullQuestion })
        });
        const data = await res.json();
        if (!data.word) {
          answerBox.textContent = "No word found";
        } else {
          answerBox.textContent = data.word;
        }
      } catch (err) {
        console.error("Datamuse API failed: ", err);
        answerBox.textContent = 'Network error';
      }
    });
  }

});
// Gets the esc key being pressed
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  const answers = document.querySelectorAll('.study-helper-answer');
  answers.forEach(el => el.remove());
});