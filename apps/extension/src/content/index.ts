let maskedElements: Array<{ element: HTMLElement; style: string | null }> = [];
let lastUrl = location.href;
let lastClick: Record<string, string | undefined> | undefined;
let debounce: number | undefined;

function selectorFor(element: Element): string {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const name = element.getAttribute('name');
  return `${element.tagName.toLowerCase()}${name ? `[name="${CSS.escape(name)}"]` : ''}`;
}

function notifyNavigation(
  actionType: 'click' | 'route-change' | 'back' | 'forward' | 'unknown' = 'route-change',
) {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    void chrome.runtime
      .sendMessage({
        type: 'NAVIGATION',
        url: location.href,
        title: document.title,
        context: lastClick,
        actionType,
      })
      .catch(() => undefined);
    lastClick = undefined;
  }, 250);
}

document.addEventListener(
  'click',
  (event) => {
    const element = (event.target as Element | null)?.closest('a,button,[role="button"]');
    if (!element) return;
    lastClick = {
      text: element.textContent?.trim().slice(0, 120),
      tagName: element.tagName,
      ariaLabel: element.getAttribute('aria-label') ?? undefined,
      href: element.getAttribute('href') ?? undefined,
      selector: selectorFor(element),
    };
  },
  true,
);

const patchHistory = (method: 'pushState' | 'replaceState') => {
  const original = history[method];
  history[method] = function (...args) {
    const result = original.apply(this, args);
    notifyNavigation(lastClick ? 'click' : 'route-change');
    return result;
  };
};
patchHistory('pushState');
patchHistory('replaceState');
window.addEventListener('popstate', () => notifyNavigation('back'));
window.addEventListener('hashchange', () => notifyNavigation('route-change'));

function showBadge() {
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', showBadge, { once: true });
    return;
  }
  if (document.getElementById('flowlens-recording-badge')) return;
  const badge = document.createElement('div');
  badge.id = 'flowlens-recording-badge';
  badge.textContent = '● FlowLens recording';
  badge.style.cssText =
    'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#991b1b;color:white;padding:8px 12px;border-radius:999px;font:600 12px system-ui;box-shadow:0 4px 16px #0004;pointer-events:none';
  document.body.append(badge);
}

function hideBadge() {
  document.getElementById('flowlens-recording-badge')?.remove();
}

void chrome.runtime
  .sendMessage({ type: 'GET_STATE' })
  .then((response) => {
    if (response?.active) showBadge();
  })
  .catch(() => undefined);
chrome.storage.onChanged.addListener((changes) => {
  const state = changes['flowlens:recording']?.newValue;
  if (state?.active) showBadge();
  else hideBadge();
});

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type === 'MASK_FOR_CAPTURE') {
    maskedElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'input[type="password"], [data-flowlens-mask], [data-flowlens-ignore], #flowlens-recording-badge',
      ),
    ).map((element) => ({ element, style: element.getAttribute('style') }));
    for (const { element } of maskedElements)
      element.style.setProperty(
        element.matches('[data-flowlens-ignore], #flowlens-recording-badge')
          ? 'visibility'
          : 'filter',
        element.matches('[data-flowlens-ignore], #flowlens-recording-badge')
          ? 'hidden'
          : 'blur(14px)',
        'important',
      );
    respond({ ok: true });
  }
  if (message.type === 'RESTORE_AFTER_CAPTURE') {
    for (const { element, style } of maskedElements) {
      if (style === null) element.removeAttribute('style');
      else element.setAttribute('style', style);
    }
    maskedElements = [];
    respond({ ok: true });
  }
});
