/* ============================================================
   수업마법사 — background.js (Service Worker)
   캡처(전체) / 캡처 저장·불러오기 / 커서 적용
============================================================ */
'use strict';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── 전체 화면 캡처 ──
  if (msg.type === 'CAPTURE_FULL') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        const tab = tabs[0];
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        // storage에 저장 (팝업 닫혀도 유지)
        await chrome.storage.local.set({
          lastCapture: { dataUrl, label: '🖥️ 전체 화면 캡처', time: Date.now() }
        });
        sendResponse({ ok: true, dataUrl });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    });
    return true;
  }

  // ── 저장된 캡처 불러오기 ──
  if (msg.type === 'CAPTURE_LOAD') {
    chrome.storage.local.get('lastCapture', (data) => {
      sendResponse({ ok: true, capture: data.lastCapture || null });
    });
    return true;
  }

  // ── 캡처 삭제 ──
  if (msg.type === 'CAPTURE_CLEAR') {
    chrome.storage.local.remove('lastCapture', () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  // ── 커서 적용 ──
  if (msg.type === 'CURSOR_APPLY') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        const tab = tabs[0];
        if (!tab.url || tab.url.startsWith('chrome://') ||
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')) {
          sendResponse({ ok: false, error: '이 페이지에는 적용할 수 없어요 (chrome:// 등)' });
          return;
        }
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: false },
          func: (cssValue) => {
            try {
              const old = document.getElementById('__sumabot_cursor__');
              if (old) old.remove();
              const style = document.createElement('style');
              style.id = '__sumabot_cursor__';
              style.textContent = `
                html { cursor: ${cssValue} !important; }
                body { cursor: ${cssValue} !important; }
                * { cursor: ${cssValue} !important; }
                *::before, *::after { cursor: ${cssValue} !important; }
                a, button, input, select, textarea, [role="button"] {
                  cursor: ${cssValue} !important;
                }
              `;
              (document.head || document.documentElement).appendChild(style);
              return { ok: true };
            } catch (e) {
              return { ok: false, error: e.message };
            }
          },
          args: [msg.cssValue]
        });
        const r = results?.[0]?.result;
        sendResponse(r || { ok: false, error: '결과 없음' });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    });
    return true;
  }

  // ── 커서 초기화 ──
  if (msg.type === 'CURSOR_RESET') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        const tab = tabs[0];
        if (!tab.url || tab.url.startsWith('chrome://')) {
          sendResponse({ ok: false, error: '적용 불가 페이지' });
          return;
        }
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const el = document.getElementById('__sumabot_cursor__');
            if (el) el.remove();
            return { ok: true };
          }
        });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    });
    return true;
  }
});
