chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_SPANS') {
    const spans = document.querySelectorAll('span.M7eMe');
    const texts = spans.length
      ? Array.from(spans).map(s => s.textContent.trim())
      : ['(No span.M7eMe found on this page)'];

    sendResponse({ texts });
  }
});