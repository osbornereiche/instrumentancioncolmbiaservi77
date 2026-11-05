(function () {
  var EYE_OPEN = "images/passwd-backup_001_4ea01feb999f.svg";
  var EYE_CLOSED = "images/passwd_002_5118f88ccc3f.svg";

  document.addEventListener("DOMContentLoaded", function () {
    var tokoEl = document.getElementById("toko");
    var eyeBox = document.querySelector(".divEyeIcon");
    var eyeImg = eyeBox ? eyeBox.querySelector("img") : null;

    if (!tokoEl || !eyeBox || !eyeImg) {
      return;
    }

    eyeBox.style.cursor = "pointer";
    eyeImg.style.cursor = "pointer";

    function setEyeImage(src) {
      eyeImg.setAttribute("src", src);
      eyeImg.style.setProperty("content", 'url("' + src + '")', "important");
    }

    function showToko(visible) {
      tokoEl.type = visible ? "text" : "password";
      eyeBox.classList.toggle("showEye", visible);
      setEyeImage(visible ? EYE_OPEN : EYE_CLOSED);
    }

    showToko(false);

    eyeBox.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      showToko(tokoEl.type === "password");
    });
  });
})();
