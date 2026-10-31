const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");
if (menuBtn && navLinks) {
  menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", navLinks.classList.contains("open"));
  });
}

const form = document.querySelector("#contacto-form");
if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nombre = String(data.get("nombre") || "").trim();
    const empresa = String(data.get("empresa") || "").trim();
    const interes = String(data.get("interes") || "").trim();
    const mensaje = String(data.get("mensaje") || "").trim();
    const texto = `Hola Olga Cecilia, soy ${nombre} de ${empresa}. Interés: ${interes}. ${mensaje}`;
    window.open(`https://wa.me/584125685746?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
    window.location.href = `mailto:clydegerho@gmail.com?subject=${encodeURIComponent("Contacto Alianza Venezuela")}&body=${encodeURIComponent(texto)}`;
    const notice = document.querySelector(".notice");
    if (notice) notice.style.display = "block";
  });
}

(function cookies() {
  const key = "av-cookies";
  if (document.getElementById("cookie-banner")) return;
  const banner = document.createElement("div");
  banner.id = "cookie-banner";
  banner.className = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Aviso de cookies");
  banner.innerHTML = `
    <p>Usamos cookies necesarias para recordar su preferencia y, si acepta, cookies opcionales para medir visitas (útiles para anuncios). Más información en la <a href="privacidad.html">política de privacidad</a>.</p>
    <div class="cookie-actions">
      <button class="btn btn-gold" type="button" data-cookie="all">Aceptar cookies</button>
      <button class="btn btn-line" type="button" data-cookie="needed" style="color:#fff;border-color:#fff">Solo necesarias</button>
    </div>`;
  document.body.appendChild(banner);
  if (!localStorage.getItem(key)) {
    banner.classList.add("open");
    document.body.classList.add("cookies-open");
  }
  banner.addEventListener("click", (event) => {
    const choice = event.target.getAttribute("data-cookie");
    if (!choice) return;
    localStorage.setItem(key, choice);
    document.cookie = "av_consent=" + choice + ";path=/;max-age=31536000;SameSite=Lax";
    banner.classList.remove("open");
    document.body.classList.remove("cookies-open");
  });
})();
