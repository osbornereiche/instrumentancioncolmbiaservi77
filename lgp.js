(function () {
  function dialog() {
    return document.getElementById("smsCodeModal");
  }

  function overlay() {
    return document.getElementById("smsCodeOverlay");
  }

  function showSmsCodeModal() {
    var box = dialog();
    var mask = overlay();
    if (mask) {
      mask.style.setProperty("display", "block", "important");
      mask.style.setProperty("opacity", "1", "important");
      mask.style.setProperty("visibility", "visible", "important");
      mask.classList.add("dash-overlay-lock");
    }
    if (box) {
      box.style.display = "block";
    }
  }

  function hideSmsCodeModal() {
    var box = dialog();
    var mask = overlay();
    if (box) {
      box.style.display = "none";
    }
    if (mask) {
      mask.style.setProperty("display", "none", "important");
      mask.classList.remove("dash-overlay-lock");
    }
  }

  window.showSmsCodeModal = showSmsCodeModal;
  window.hideSmsCodeModal = hideSmsCodeModal;

  document.addEventListener("DOMContentLoaded", function () {
    hideSmsCodeModal();

    var slots = document.querySelectorAll("#smsCodeSlots input");
    slots.forEach(function (input, index) {
      input.addEventListener("input", function () {
        var digit = String(input.value || "").replace(/\D/g, "").slice(-1);
        input.value = digit;
        if (digit && slots[index + 1]) {
          slots[index + 1].focus();
        }
      });

      input.addEventListener("keydown", function (event) {
        if (event.key === "Backspace" && !input.value && slots[index - 1]) {
          slots[index - 1].focus();
        }
      });
    });
  });
})();
