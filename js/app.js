/* Partes comunes a todas las páginas: colores, encabezado, pie y conexión con la planilla.
   No hace falta tocar este archivo para un local nuevo: todo sale de config.js */
(function () {
  var C = window.CONFIG;
  var raiz = document.documentElement.style;
  raiz.setProperty("--primario", C.colores.primario);
  raiz.setProperty("--acento", C.colores.acento);
  raiz.setProperty("--fondo", C.colores.fondo);
  raiz.setProperty("--tarjeta", C.colores.tarjeta);
  raiz.setProperty("--texto", C.colores.texto);

  var pagina = document.body.getAttribute("data-pagina");
  document.title = (document.title ? document.title + " · " : "") + C.nombre;

  // Encabezado
  var marca = C.logo
    ? '<img src="' + esc(C.logo) + '" alt="' + esc(C.nombre) + '">'
    : esc(C.nombre);
  var links = [
    ["index.html", "Inicio", "inicio"],
    ["carta.html", "Carta", "carta"],
    ["reserva.html", "Reservar", "reserva"]
  ].map(function (l) {
    return '<a href="' + l[0] + '"' + (pagina === l[2] ? ' class="activo"' : "") + ">" + l[1] + "</a>";
  }).join("");
  var header = document.createElement("header");
  header.className = "encabezado";
  header.innerHTML = '<div class="contenedor"><a class="marca" href="index.html">' + marca + '</a><nav class="nav">' + links + "</nav></div>";
  document.body.insertBefore(header, document.body.firstChild);

  if (!C.urlAppsScript) {
    var demo = document.createElement("div");
    demo.className = "demo";
    demo.textContent = "Modo demostración: los datos no se guardan todavía.";
    document.body.insertBefore(demo, header.nextSibling);
  }

  // Pie
  var footer = document.createElement("footer");
  footer.className = "pie";
  footer.innerHTML = esc(C.nombre) + " · " + esc(C.direccion) +
    (C.instagram ? ' · <a href="' + esc(C.instagram) + '" target="_blank" rel="noopener">Instagram</a>' : "");
  document.body.appendChild(footer);

  // ---------- Utilidades ----------
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function linkWhatsapp(texto) {
    return "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(texto || C.mensajeWhatsapp);
  }

  // Llama al Apps Script. Se usa text/plain para evitar bloqueos del navegador (CORS).
  function api(accion, datos) {
    if (!C.urlAppsScript) return Promise.resolve({ ok: true, demo: true });
    var opciones = datos
      ? { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ accion: accion }, datos)) }
      : { method: "GET" };
    var url = C.urlAppsScript + (datos ? "" : "?accion=" + encodeURIComponent(accion));
    return fetch(url, opciones).then(function (r) { return r.json(); });
  }

  function soloNumeros(t) { return String(t || "").replace(/\D/g, ""); }

  window.APP = { esc: esc, linkWhatsapp: linkWhatsapp, api: api, soloNumeros: soloNumeros };
})();
