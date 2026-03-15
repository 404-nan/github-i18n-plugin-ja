(() => {
  'use strict';

  const TARGET_LANG = 'ja';
  let locales = { css: [], dict: {} };

  init();

  async function init() {
    locales = await getLocales();
    translateByCssSelector();
    translateTime();
    traverseElement(document.body);
    watchUpdate();

    if (window.location.pathname.split('/').length === 3) {
      addTranslateDescButton('.repository-content .f4');
    }
  }

  async function getLocales() {
    const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (!lang.startsWith(TARGET_LANG)) {
      return { css: [], dict: {} };
    }

    try {
      const url = chrome.runtime.getURL('locales/ja.json');
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Failed to load ja locale:', error);
      return { css: [], dict: {} };
    }
  }

  function translateRelativeTimeEl(el) {
    const datetime = el.getAttribute('datetime');
    if (!datetime) return;

    const target = new Date(datetime).getTime();
    const now = Date.now();
    const diffSec = Math.round((target - now) / 1000);
    const rtf = new Intl.RelativeTimeFormat('ja', { numeric: 'auto' });

    const units = [
      ['year', 31536000],
      ['month', 2592000],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1]
    ];

    for (const [unit, sec] of units) {
      if (Math.abs(diffSec) >= sec || unit === 'second') {
        const value = Math.round(diffSec / sec);
        const humanTime = rtf.format(value, unit);
        if (el.shadowRoot) {
          el.shadowRoot.textContent = humanTime;
        } else {
          el.textContent = humanTime;
        }
        break;
      }
    }
  }

  function translateElement(el) {
    let keyName;
    if (el.tagName === 'INPUT') {
      keyName = (el.type === 'button' || el.type === 'submit') ? 'value' : 'placeholder';
    } else {
      keyName = 'data';
    }

    if (isNaN(el[keyName])) {
      const txtSrc = (el[keyName] || '').trim();
      const key = txtSrc.toLowerCase().replace(/\xa0/g, ' ').replace(/\s{2,}/g, ' ');
      if (locales.dict[key]) {
        el[keyName] = el[keyName].replace(txtSrc, locales.dict[key]);
      }
    }
    translateElementAriaLabel(el);
  }

  function translateElementAriaLabel(el) {
    if (el.ariaLabel) {
      const txtSrc = el.ariaLabel.trim();
      const key = txtSrc.toLowerCase().replace(/\xa0/g, ' ').replace(/\s{2,}/g, ' ');
      if (locales.dict[key]) {
        el.ariaLabel = el.ariaLabel.replace(txtSrc, locales.dict[key]);
      }
    }
  }

  function shouldTranslateEl(el) {
    const blockIds = ['readme', 'file-name-editor-breadcrumb', 'StickyHeader', 'sticky-file-name-id', 'sticky-breadcrumb'];
    const blockClass = [
      'CodeMirror', 'js-navigation-container', 'blob-code', 'topic-tag', 'repo-list',
      'js-path-segment', 'final-path', 'react-tree-show-tree-items', 'markdown-body',
      'search-input-container', 'search-match', 'cm-editor', 'react-code-lines',
      'PRIVATE_TreeView-item', 'repo'
    ];
    const blockTags = ['CODE', 'SCRIPT', 'LINK', 'IMG', 'svg', 'TABLE', 'PRE'];
    const blockItemprops = ['name'];

    if (blockTags.includes(el.tagName)) return false;
    if (el.id && blockIds.includes(el.id)) return false;

    if (el.classList) {
      for (const clazz of blockClass) {
        if (el.classList.contains(clazz)) return false;
      }
    }

    if (el.getAttribute) {
      const itempropsText = el.getAttribute('itemprop');
      if (itempropsText) {
        for (const itemprop of itempropsText.split(' ')) {
          if (blockItemprops.includes(itemprop)) return false;
        }
      }
    }

    return true;
  }

  function traverseElement(el) {
    translateElementAriaLabel(el);
    if (!shouldTranslateEl(el)) return;

    if (el.childNodes.length === 0) {
      if (el.nodeType === Node.TEXT_NODE) {
        translateElement(el);
        return;
      }
      if (el.nodeType === Node.ELEMENT_NODE && el.tagName === 'INPUT') {
        translateElement(el);
        return;
      }
    }

    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        translateElement(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === 'INPUT') {
          translateElement(child);
        } else {
          traverseElement(child);
        }
      }
    }
  }

  function watchUpdate() {
    const observer = new MutationObserver((mutations) => {
      let reTrans = false;
      for (const mutationRecord of mutations) {
        if (mutationRecord.addedNodes || mutationRecord.type === 'attributes') {
          reTrans = true;
        }
      }
      if (reTrans) {
        traverseElement(document.body);
        translateTime();
      }
    });

    observer.observe(document.body, {
      subtree: true,
      characterData: true,
      childList: true,
      attributeFilter: ['value', 'placeholder', 'aria-label', 'data', 'data-confirm']
    });
  }

  function addTranslateDescButton(selector) {
    const container = document.querySelector(selector);
    if (!container || container.querySelector('#translate-me')) return;

    container.append(document.createElement('br'));

    const link = document.createElement('a');
    link.id = 'translate-me';
    link.href = '#';
    link.textContent = '翻訳';
    link.style.color = 'rgb(27, 149, 224)';
    link.style.fontSize = 'small';
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const desc = container.cloneNode(true);
      desc.querySelectorAll('*').forEach((node) => node.remove());
      const text = (desc.textContent || '').trim();
      if (!text) return;

      try {
        const translated = await translateText(text);
        if (!translated) return;
        link.style.display = 'none';

        const credit = document.createElement('span');
        credit.style.fontSize = 'small';
        credit.textContent = 'Google 翻訳👇';

        container.append(credit);
        container.append(document.createElement('br'));
        container.append(translated);
      } catch (error) {
        console.error('説明文の翻訳に失敗:', error);
        alert('翻訳に失敗しました');
      }
    });

    container.append(link);
  }

  async function translateText(text) {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', 'auto');
    url.searchParams.set('tl', 'ja');
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', text);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return '';
    return data[0].map((part) => part[0]).join('');
  }

  function translateByCssSelector() {
    if (!locales.css) return;
    for (const css of locales.css) {
      const target = document.querySelector(css.selector);
      if (!target) continue;
      if (css.key === '!html') {
        target.innerHTML = css.replacement;
      } else {
        target.setAttribute(css.key, css.replacement);
      }
    }
  }

  function translateTime() {
    document.querySelectorAll('relative-time').forEach((el) => translateRelativeTimeEl(el));
  }
})();
