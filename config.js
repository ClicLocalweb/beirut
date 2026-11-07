/* =========================================================
   CONFIGURACIÓN DEL LOCAL
   Este es el ÚNICO archivo que hay que cambiar para un
   restaurante nuevo. Cambiá solo lo que está entre comillas
   o los números. No borres comas ni llaves.
   ========================================================= */
window.CONFIG = {
  // --- Datos del local ---
  nombre: "Beirut",
  bajada: "Sabores y buenos momentos en Villa Los Aromos.",
  logo: "", // ruta a la imagen, ej: "img/logo.png". Vacío = muestra el nombre en texto.

  direccion: "Los Pinos 8, Villa Los Aromos, Córdoba",
  linkMapa: "https://maps.app.goo.gl/GrQ22SQWXVvoK4X77",
  horarioTexto: [
    "Todos los días",
    "Mediodía: 12 a 16 h",
    "Noche: 19 a 24 h"
  ],

  // --- Contacto ---
  // WhatsApp del dueño: solo números, con código de país y sin el 15.
  // Ej. Córdoba: 549 + 351 + número  ->  "5493511234567"
  whatsapp: "5493547563504",
  mensajeWhatsapp: "Hola Beirut, quería hacer una consulta:",
  instagram: "", // ej: "https://instagram.com/bardemo" (vacío = no se muestra)

  // --- Reseñas de Google ---
  // Link "pedir reseñas" de la ficha de Google Business Profile.
  linkResenaGoogle: "",

  // --- Reservas ---
  reservas: {
    // Turnos: desde = primer horario, hasta = último horario que se puede elegir.
    // Para dos turnos (mediodía y noche) agregá otra línea igual, separada por coma.
    turnos: [
      { desde: "12:00", hasta: "14:30" },
      { desde: "19:00", hasta: "22:30" }
    ],
    intervaloMinutos: 30,
    diasCerrado: [],          // 0=domingo, 1=lunes, ... 6=sábado
    maxPersonas: 20,
    diasAnticipacionMax: 60
  },

  // --- Tarjeta de visitas ---
  visitasParaBeneficio: 5,     // tiene que coincidir con UMBRAL_VISITAS del Apps Script
  textoBeneficio: "un postre de regalo",

  // --- Colores ---
  colores: {
    primario: "#2f6b34",       // botones y títulos
    acento: "#8a5a2b",         // detalles
    fondo: "#f7efdc",
    tarjeta: "#fffaf0",
    texto: "#2b2118"
  },

  // --- Conexión con la planilla (Apps Script) ---
  // Pegá acá la URL que termina en /exec. Vacío = modo demo (carta de ejemplo, sin guardar datos).
  urlAppsScript: ""
};
