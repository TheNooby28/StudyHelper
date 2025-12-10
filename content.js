const spans = document.querySelectorAll('span.M7eMe');

let texts;

if (spans.length === 0) {
  texts = ['(No span.M7eMe found on this page)'];
} else {
  texts = Array.from(spans).map(span => span.textContent.trim());
}

chrome.runtime.sendMessage({ type: 'SPAN_TEXTS', texts });
