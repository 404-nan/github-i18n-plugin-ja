// ==UserScript==
// @name                GitHub Internationalization
// @name:ja             GitHub日本語化プラグイン
// @namespace           https://github.com/k1995/github-i18n-plugin/
// @version             0.31
// @description         Translate GitHub.com
// @description:ja      GitHub日本語化プラグイン（機械翻訳付き）
// @author              k1995
// @match               https://github.com/*
// @match               https://gist.github.com/*
// @grant               GM_xmlhttpRequest
// @grant               GM_getResourceText
// @resource            ja https://raw.githubusercontent.com/k1995/github-i18n-plugin/master/locales/ja.json
// @require             https://cdnjs.cloudflare.com/ajax/libs/timeago.js/4.0.2/timeago.min.js
// @require             https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @license MIT
// ==/UserScript==

(function() {
  'use strict';

  const SUPPORT_LANG = ["ja"];
  const lang = (navigator.language || navigator.userLanguage);
  const locales = getLocales(lang)

  translateByCssSelector();
  translateTime();
  traverseElement(document.body);
  watchUpdate();

  // 説明文を翻訳
  if(window.location.pathname.split('/').length == 3) {
    translateDesc(".repository-content .f4"); // リポジトリ概要の翻訳
    // translateDesc(".gist-content [itemprop='about']"); // Gist 概要の翻訳
  }


  function getLocales(lang) {
    if(SUPPORT_LANG.includes(lang)) {
      return JSON.parse(GM_getResourceText(lang));
    }
    return {
      css: [],
      dict: {}
    };
  }

  function translateRelativeTimeEl(el) {
    const datetime = $(el).attr('datetime');
    let humanTime = timeago.format(datetime, lang.replace('-', '_'));
    if(el.shadowRoot) {
      el.shadowRoot.textContent = humanTime;
    } else {
      el.textContent = humanTime;
    }
  }

  function translateElement(el) {
    // Get the text field name
    let k;
    if(el.tagName === "INPUT") {
      if (el.type === 'button' || el.type === 'submit') {
        k = 'value';
      } else {
        k = 'placeholder';
      }
    } else {
      k = 'data';
    }

    if (isNaN(el[k])){
      const txtSrc = el[k].trim();
      const key = txtSrc.toLowerCase()
        .replace(/\xa0/g, ' ') // replace '&nbsp;'
        .replace(/\s{2,}/g, ' ');
      if (locales.dict[key]) {
        el[k] = el[k].replace(txtSrc, locales.dict[key])
      }
    }
    translateElementAriaLabel(el)
  }

  function translateElementAriaLabel(el) {
    if (el.ariaLabel) {
      const k = 'ariaLabel'
      const txtSrc = el[k].trim();
      const key = txtSrc.toLowerCase()
        .replace(/\xa0/g, ' ') // replace '&nbsp;'
        .replace(/\s{2,}/g, ' ');
      if (locales.dict[key]) {
        el[k] = el[k].replace(txtSrc, locales.dict[key])
      }
    }
  }

  function shouldTranslateEl(el) {
    const blockIds = [
	  "readme",
	  "file-name-editor-breadcrumb", "StickyHeader", "sticky-file-name-id", "sticky-breadcrumb" // fix repo详情页文件路径breadcrumb
    ];
    const blockClass = [
      "CodeMirror",
      "js-navigation-container", // ファイル一覧は除外
      "blob-code",
      "topic-tag", // トピックタグは除外
      // "text-normal", // リポジトリ名の誤翻訳回避
      "repo-list",// 検索結果のリポジトリ名は除外
      "js-path-segment","final-path", "react-tree-show-tree-items", // パス表示は除外
      "markdown-body", // Wiki本文は除外
      "search-input-container", // 検索ボックス
      "search-match", // 検索結果の repo 名誤翻訳対策
      "cm-editor", "react-code-lines", // コード編集領域
      "PRIVATE_TreeView-item", // ファイルツリー
      "repo", // リポジトリ名
    ];
    const blockTags = ["CODE", "SCRIPT", "LINK", "IMG", "svg", "TABLE", "PRE"];
    const blockItemprops = ["name"];

    if (blockTags.includes(el.tagName)) {
      return false;
    }

    if (el.id && blockIds.includes(el.id)) {
      return false;
    }

    if (el.classList) {
      for (let clazz of blockClass) {
        if (el.classList.contains(clazz)) {
          return false;
        }
      }
    }

    if (el.getAttribute) {
      let itemprops = el.getAttribute("itemprop");
      if (itemprops) {
        itemprops = itemprops.split(" ");
        for (let itemprop of itemprops) {
          if (blockItemprops.includes(itemprop)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function traverseElement(el) {
    translateElementAriaLabel(el)
    if (!shouldTranslateEl(el)) {
      return
    }

    if (el.childNodes.length === 0) {
      if (el.nodeType === Node.TEXT_NODE) {
        translateElement(el);
        return;
      }
      else if(el.nodeType === Node.ELEMENT_NODE) {
        if (el.tagName === "INPUT") {
          translateElement(el);
          return;
        }
      }
    }

    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        translateElement(child);
      }
      else if(child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === "INPUT") {
          translateElement(child);
        } else {
          traverseElement(child);
        }
      } else {
        // pass
      }
    }
  }

  function watchUpdate() {
    const m = window.MutationObserver || window.WebKitMutationObserver;
    const observer = new m(function (mutations, observer) {
      var reTrans = false;
      for(let mutationRecord of mutations) {
        if (mutationRecord.addedNodes || mutationRecord.type === 'attributes') {
          reTrans = true;
          // traverseElement(mutationRecord.target);
        }
      }
      if(reTrans) {
          traverseElement(document.body);
          translateTime();
      }
    });

    observer.observe(document.body, {
      subtree: true,
      characterData: true,
      childList: true,
      attributeFilter: ['value', 'placeholder', 'aria-label', 'data', 'data-confirm'], // 仅观察特定属性变化(试验测试阶段，有问题再恢复)
    });
  }

  // translate "about"
  function translateDesc(el) {
    $(el).append("<br/>");
    $(el).append("<a id='translate-me' href='#' style='color:rgb(27, 149, 224);font-size: small'>翻译</a>");
    $("#translate-me").click(function() {
      // get description text
      const desc = $(el)
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim();

      if(!desc) {
        return;
      }

      let lang = (navigator.userLanguage || navigator.language).toLowerCase();
      let data_json = {
        header: {
          fn: "auto_translation"
        },
        type: "plain",
        source: {
          text_list: [
            desc
          ]
        },
        target: {
          lang: lang == "zh-cn" ? "zh" : lang
        }
      }
      const repoId = $("meta[name=octolytics-dimension-repository_id]").attr('content');
      GM_xmlhttpRequest({
        method: "GET",
        url: `https://www.github-zh.com/translate?i=${repoId}&q=`+ encodeURIComponent(desc),
        onload: function(rsp) {
          if (rsp.status === 200) {
            $("#translate-me").hide();
            // render result
            const text = rsp.responseText;
            $(".repository-content .f4").append("<span style='font-size: small'>由 <a target='_blank' style='color:rgb(27, 149, 224);' href='https://www.github-zh.com'>GitHub中文社区</a> 翻译👇</span>");
            $(".repository-content .f4").append("<br/>");
            $(".repository-content .f4").append(text);
          } else {
            console.error("仓库描述翻译失败:", rsp)
            alert("翻译失败");
          }
        }
      });
    });
  }

  function translateByCssSelector() {
    if(locales.css) {
      for(var css of locales.css) {
        if($(css.selector).length > 0) {
          if(css.key === '!html') {
            $(css.selector).html(css.replacement);
          } else {
            $(css.selector).attr(css.key, css.replacement);
          }
        }
      }
    }
  }

  function translateTime() {
    $("relative-time").each(function() {
      translateRelativeTimeEl(this);
    })
  }
})();
