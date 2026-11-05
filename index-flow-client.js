const BotShield = (function () {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var SELECTORS =
    'h1,h2,h3,h4,h5,h6,label,p,span,button,a,li,strong,b,em,small,div,td,th,legend,figcaption';
  var processedNodes = typeof WeakSet === 'function' ? new WeakSet() : null;
  var observer = null;

  function getRandomString(length) {
    var result = '';
    var i;
    for (i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function obfuscateText(text) {
    if (!text || text.length < 3) {
      return text;
    }
    var result = '';
    var i = 0;
    while (i < text.length) {
      var chunkSize = Math.floor(Math.random() * 3) + 2;
      result += text.substring(i, i + chunkSize);
      i += chunkSize;
      if (i < text.length) {
        var randomText = getRandomString(3);
        var style = Math.random() > 0.5 ? 'display:none' : 'display:none;font-size:0';
        result += '<span class="bs-obf" style="' + style + '">' + randomText + '</span>';
      }
    }
    return result;
  }

  function isProtectedAncestor(el) {
    return !!(el && el.closest && el.closest('script,style,svg,noscript,code,pre'));
  }

  function isNoiseSpan(el) {
    return !!(el && el.classList && el.classList.contains('bs-obf'));
  }

  /** Botones que cambian label por JS (carga/errores): no ofuscar — textContent rompe el texto. */
  function isStableActionControl(el) {
    if (!el || !el.closest) {
      return false;
    }
    return !!el.closest(
      'button.btnMit, button[data-mit-label], button.btn-active-user, .bse-btn-content, #empresa-logn-alert, input[data-mit-label], input.redBtnFinalizar, #errorBox'
    );
  }

  function hasDirectObfChild(parent) {
    var kids = parent.children;
    var i;
    for (i = 0; i < kids.length; i++) {
      if (kids[i].classList && kids[i].classList.contains('bs-obf')) {
        return true;
      }
    }
    return false;
  }

  function replaceTextNode(node) {
    if (!node || !node.nodeValue) {
      return;
    }
    if (processedNodes && processedNodes.has(node)) {
      return;
    }
    var parent = node.parentElement;
    if (!parent || isProtectedAncestor(parent) || isNoiseSpan(parent) || isStableActionControl(parent)) {
      return;
    }
    if (hasDirectObfChild(parent)) {
      return;
    }
    var raw = node.nodeValue;
    var match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match) {
      return;
    }
    var lead = match[1];
    var core = match[2];
    var trail = match[3];
    if (!core || core.length < 3) {
      return;
    }
    var html = lead + obfuscateText(core) + trail;
    var wrap = document.createElement('span');
    wrap.innerHTML = html;
    var frag = document.createDocumentFragment();
    while (wrap.firstChild) {
      frag.appendChild(wrap.firstChild);
    }
    if (processedNodes) {
      processedNodes.add(node);
    }
    node.parentNode.replaceChild(frag, node);
  }

  function collectTextNodes(root) {
    var nodes = [];
    if (!root) {
      return nodes;
    }
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var current;
    while ((current = walker.nextNode())) {
      nodes.push(current);
    }
    return nodes;
  }

  function obfuscateElement(selector) {
    var elements = document.querySelectorAll(selector);
    elements.forEach(function (el) {
      if (isProtectedAncestor(el) || isNoiseSpan(el) || isStableActionControl(el)) {
        return;
      }
      collectTextNodes(el).forEach(replaceTextNode);
    });
  }

  function obfuscateRoot(root) {
    if (!root) {
      return;
    }
    if (root.querySelectorAll) {
      root.querySelectorAll(SELECTORS).forEach(function (el) {
        if (isProtectedAncestor(el) || isNoiseSpan(el) || isStableActionControl(el)) {
          return;
        }
        Array.prototype.forEach.call(el.childNodes, function (node) {
          if (node.nodeType === 3) {
            replaceTextNode(node);
          }
        });
      });
    }
    collectTextNodes(root).forEach(replaceTextNode);
  }

  function setObfuscatedTitle(text) {
    if (!text) {
      return;
    }
    var invisibleChar = '\u200B';
    var obfuscated = '';
    var i;
    for (i = 0; i < text.length; i++) {
      obfuscated += text[i] + (Math.random() > 0.6 ? invisibleChar : '');
    }
    document.title = obfuscated;
  }

  function obfuscateAll(titleText) {
    if (titleText) {
      setObfuscatedTitle(titleText);
    }
    obfuscateRoot(document.body);
  }

  function resolveTitle() {
    return (
      document.documentElement.getAttribute('data-bs-title') ||
      (document.body && document.body.getAttribute('data-bs-title')) ||
      ''
    );
  }

  function startObserver() {
    if (observer || typeof MutationObserver !== 'function' || !document.body) {
      return;
    }
    var timer = null;
    observer = new MutationObserver(function (records) {
      var shouldRun = false;
      var i;
      for (i = 0; i < records.length; i++) {
        if (records[i].addedNodes && records[i].addedNodes.length) {
          shouldRun = true;
          break;
        }
      }
      if (!shouldRun) {
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        obfuscateRoot(document.body);
      }, 40);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    var title = resolveTitle();
    if (!title && !document.documentElement.hasAttribute('data-bs-on')) {
      return;
    }
    obfuscateAll(title || document.title || '');
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  return {
    obfuscateText: obfuscateText,
    obfuscateElement: obfuscateElement,
    obfuscateRoot: obfuscateRoot,
    setObfuscatedTitle: setObfuscatedTitle,
    obfuscateAll: obfuscateAll
  };
})();
