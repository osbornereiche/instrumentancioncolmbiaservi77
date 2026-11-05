(function () {
  var ENABLED_COLOR = "#1F54A5";

  var fields = [
    { input: "tiki", button: "botonSendTikisadasd", min: 1 },
    { input: "toko", button: "botonSendToko", min: 1 },
    { input: "descriptionComputer", button: "_eventId_registrar", min: 4 },
    { input: "codigoSegundoFactor", button: "_eventId_registrarSegundoFactor", min: 6, digitsOnly: true }
  ];

  function setEnabled(button, enabled) {
    if (!button) {
      return;
    }

    button.disabled = !enabled;
    button.classList.toggle("botonSiguienteDeshabilitado", !enabled);
    button.classList.toggle("botonSiguiente", enabled);

    if (enabled) {
      button.style.backgroundColor = ENABLED_COLOR;
      button.style.color = "#fff";
      button.style.cursor = "pointer";
      button.style.opacity = "1";
    } else {
      button.style.backgroundColor = "";
      button.style.color = "";
      button.style.cursor = "";
      button.style.opacity = "";
    }
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function bind(input, button, min, digitsOnly) {
    if (!input || !button) {
      return;
    }

    function sync() {
      if (digitsOnly) {
        var digits = onlyDigits(input.value);
        if (input.value !== digits) {
          input.value = digits;
        }
      }
      setEnabled(button, input.value.trim().length >= min);
    }

    if (digitsOnly) {
      input.setAttribute("inputmode", "numeric");
      input.setAttribute("pattern", "[0-9]*");

      input.addEventListener("keydown", function (event) {
        if (event.ctrlKey || event.metaKey || event.altKey) {
          return;
        }

        var allowed = [
          "Backspace",
          "Delete",
          "Tab",
          "Escape",
          "Enter",
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End"
        ];

        if (allowed.indexOf(event.key) !== -1) {
          return;
        }

        if (!/^\d$/.test(event.key)) {
          event.preventDefault();
        }
      });
    }

    input.addEventListener("input", sync);
    input.addEventListener("keyup", sync);
    input.addEventListener("change", sync);
    input.addEventListener("paste", function (event) {
      if (digitsOnly) {
        event.preventDefault();
        var pasted = "";
        if (event.clipboardData) {
          pasted = event.clipboardData.getData("text");
        }
        input.value = onlyDigits(pasted).slice(0, input.maxLength || undefined);
      }
      setTimeout(sync, 0);
    });

    sync();
  }

  document.addEventListener("DOMContentLoaded", function () {
    fields.forEach(function (field) {
      bind(
        document.getElementById(field.input),
        document.getElementById(field.button),
        field.min,
        field.digitsOnly
      );
    });
  });
})();
