/* =========================================================
   APPS SCRIPT DEL LOCAL (se pega en la planilla de Google)
   Extensiones > Apps Script > pegar todo este código.
   Solo hace falta revisar los valores de AJUSTES.
   ========================================================= */
var AJUSTES = {
  NOMBRE_LOCAL: "Beirut",
  UMBRAL_VISITAS: 5,            // igual que visitasParaBeneficio en config.js
  DURACION_RESERVA_HORAS: 2,    // largo del evento en el calendario
  ID_CALENDARIO: "",            // vacío = calendario principal de la cuenta
  EMAIL_AVISO: ""               // opcional: mail que recibe aviso de cada reserva
};

var HOJAS = {
  Reservas: ["Fecha de pedido", "Nombre", "Teléfono", "Día", "Hora", "Personas", "Cumpleaños", "Acepta promos", "Estado", "ID evento"],
  Clientes: ["Teléfono", "Nombre", "Visitas", "Última visita", "Cumpleaños", "Acepta promos", "Beneficios ganados", "Alta"],
  Carta: ["Categoría", "Nombre", "Descripción", "Precio", "Disponible"]
};

/* ---------- 1) CONFIGURACIÓN INICIAL ----------
   Elegí "configurarPlanilla" arriba y tocá "Ejecutar" una sola vez.
   Crea las pestañas, los títulos, la carta de ejemplo y la lista de cumpleaños. */
function configurarPlanilla() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HOJAS).forEach(function (nombre) {
    var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    if (hoja.getLastRow() === 0) {
      hoja.appendRow(HOJAS[nombre]);
      hoja.getRange(1, 1, 1, HOJAS[nombre].length).setFontWeight("bold").setBackground("#eeeeee");
      hoja.setFrozenRows(1);
    }
  });

  // Teléfonos y cumpleaños como texto (para que no se conviertan en números o fechas)
  ss.getSheetByName("Clientes").getRange("A:A").setNumberFormat("@");
  ss.getSheetByName("Clientes").getRange("D:E").setNumberFormat("@");
  ss.getSheetByName("Reservas").getRange("C:C").setNumberFormat("@");
  ss.getSheetByName("Reservas").getRange("G:G").setNumberFormat("@");

  // Estado de la reserva con lista desplegable
  var reglaEstado = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pendiente", "Confirmada", "Cancelada"], true).build();
  ss.getSheetByName("Reservas").getRange("I2:I").setDataValidation(reglaEstado);

  // Carta de ejemplo (solo si está vacía)
  var carta = ss.getSheetByName("Carta");
  if (carta.getLastRow() < 2) {
    carta.getRange(2, 1, CARTA_EJEMPLO.length, 5).setValues(CARTA_EJEMPLO);
  }

  // Cumpleaños del mes (se actualiza solo)
  var cumple = ss.getSheetByName("Cumpleaños del mes") || ss.insertSheet("Cumpleaños del mes");
  cumple.clear();
  cumple.getRange("A1").setValue("Clientes que cumplen años este mes (se actualiza solo)").setFontWeight("bold");
  cumple.getRange("A2:D2").setValues([["Nombre", "Teléfono", "Cumpleaños", "Acepta promos"]]).setFontWeight("bold").setBackground("#eeeeee");
  cumple.getRange("A3").setFormula(
    '=IFERROR(SORT(FILTER({Clientes!B2:B, Clientes!A2:A, Clientes!E2:E, Clientes!F2:F}, ' +
    'Clientes!E2:E<>"", VALUE(RIGHT(Clientes!E2:E,2))=MONTH(TODAY())), 3, TRUE), "Nadie cumple años este mes")'
  );

  // Borrar la "Hoja 1" vacía si existe
  ["Hoja 1", "Sheet1", "Hoja1"].forEach(function (n) {
    var h = ss.getSheetByName(n);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h);
  });

  // Pedir permiso de calendario ahora (así no falla la primera reserva)
  calendario_();
}

/* ---------- 2) ENTRADAS DESDE LA PÁGINA ---------- */
function doGet(e) {
  var accion = (e && e.parameter && e.parameter.accion) || "";
  if (accion === "carta") return responder_({ ok: true, carta: leerCarta_() });
  return responder_({ ok: true, mensaje: "Funcionando: " + AJUSTES.NOMBRE_LOCAL });
}

function doPost(e) {
  var datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder_({ ok: false, error: "Datos inválidos" });
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    if (datos.accion === "reserva") return responder_(guardarReserva_(datos));
    if (datos.accion === "visita") return responder_(sumarVisita_(datos));
    return responder_({ ok: false, error: "Acción desconocida" });
  } catch (err) {
    return responder_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Carta ---------- */
function leerCarta_() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Carta");
  if (!hoja || hoja.getLastRow() < 2) return [];
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, 5).getValues()
    .filter(function (f) { return f[1] !== ""; })
    .map(function (f) {
      return { categoria: f[0], nombre: f[1], descripcion: f[2], precio: f[3], disponible: f[4] };
    });
}

/* ---------- Reservas ---------- */
function guardarReserva_(d) {
  var nombre = limpiar_(d.nombre, 80);
  var tel = telefono_(d.telefono);
  var personas = parseInt(d.personas, 10);
  if (!nombre || tel.length < 8 || !/^\d{4}-\d{2}-\d{2}$/.test(d.dia) || !/^\d{2}:\d{2}$/.test(d.hora) || !(personas > 0 && personas <= 50)) {
    return { ok: false, error: "Faltan datos" };
  }
  var cumple = /^\d{2}\/\d{2}$/.test(d.cumpleanos || "") ? d.cumpleanos : "";
  var promos = d.promos === true;

  // Evento en el calendario
  var inicio = Utilities.parseDate(d.dia + " " + d.hora, zona_(), "yyyy-MM-dd HH:mm");
  var fin = new Date(inicio.getTime() + AJUSTES.DURACION_RESERVA_HORAS * 3600 * 1000);
  var idEvento = "";
  try {
    var evento = calendario_().createEvent(
      "Reserva: " + nombre + " (" + personas + " pers.)",
      inicio, fin,
      { description: "Teléfono: " + tel + "\nWhatsApp: https://wa.me/" + telefonoWhatsapp_(tel) +
          (cumple ? "\nCumpleaños: " + cumple : "") + "\nEstado: Pendiente (confirmar en la planilla)" }
    );
    idEvento = evento.getId();
  } catch (err) {
    idEvento = "Error calendario: " + err;
  }

  SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reservas").appendRow([
    new Date(), nombre, tel, d.dia, d.hora, personas, cumple, promos ? "Sí" : "No", "Pendiente", idEvento
  ]);

  actualizarCliente_(tel, nombre, cumple, promos, false);

  if (AJUSTES.EMAIL_AVISO) {
    try {
      MailApp.sendEmail(AJUSTES.EMAIL_AVISO, "Nueva reserva: " + nombre,
        nombre + " pidió mesa para " + personas + " el " + d.dia + " a las " + d.hora + " h.\nTeléfono: " + tel);
    } catch (err) { /* sin aviso por mail, la reserva igual quedó guardada */ }
  }
  return { ok: true };
}

/* ---------- Visitas ---------- */
function sumarVisita_(d) {
  var tel = telefono_(d.telefono);
  if (tel.length < 8) return { ok: false, error: "Teléfono inválido" };
  var r = actualizarCliente_(tel, limpiar_(d.nombre, 60), "", d.promos === true, true);
  return { ok: true, visitas: r.visitas, yaSumoHoy: r.yaSumoHoy, nombre: r.nombre, umbral: AJUSTES.UMBRAL_VISITAS };
}

/* Busca al cliente por teléfono; si no existe lo crea. Si sumarVisita es true,
   suma 1 visita como máximo una vez por día. */
function actualizarCliente_(tel, nombre, cumple, promos, sumarVisita) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Clientes");
  var hoy = Utilities.formatDate(new Date(), zona_(), "yyyy-MM-dd");
  var filas = hoja.getLastRow() > 1 ? hoja.getRange(2, 1, hoja.getLastRow() - 1, 8).getValues() : [];
  var idx = -1;
  for (var i = 0; i < filas.length; i++) {
    if (telefono_(filas[i][0]) === tel) { idx = i; break; }
  }

  if (idx === -1) {
    var visitas = sumarVisita ? 1 : 0;
    hoja.appendRow([tel, nombre, visitas, sumarVisita ? hoy : "", cumple, promos ? "Sí" : "No", 0, new Date()]);
    return { visitas: visitas, yaSumoHoy: false, nombre: nombre };
  }

  var f = filas[idx], fila = idx + 2;
  var ultima = f[3] instanceof Date ? Utilities.formatDate(f[3], zona_(), "yyyy-MM-dd") : String(f[3]);
  var visitasActuales = Number(f[2]) || 0;
  var yaSumoHoy = false;

  if (nombre && !f[1]) hoja.getRange(fila, 2).setValue(nombre);
  if (cumple) hoja.getRange(fila, 5).setValue(cumple);
  if (promos) hoja.getRange(fila, 6).setValue("Sí");

  if (sumarVisita) {
    if (ultima === hoy) {
      yaSumoHoy = true;
    } else {
      visitasActuales++;
      hoja.getRange(fila, 3).setValue(visitasActuales);
      hoja.getRange(fila, 4).setValue(hoy);
      if (visitasActuales % AJUSTES.UMBRAL_VISITAS === 0) {
        hoja.getRange(fila, 7).setValue((Number(f[6]) || 0) + 1);
      }
    }
  }
  return { visitas: visitasActuales, yaSumoHoy: yaSumoHoy, nombre: f[1] || nombre };
}

/* ---------- Ayudas ---------- */
function zona_() { return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(); }

function calendario_() {
  return AJUSTES.ID_CALENDARIO ? CalendarApp.getCalendarById(AJUSTES.ID_CALENDARIO) : CalendarApp.getDefaultCalendar();
}

// Deja solo números y se queda con los últimos 10 (código de área + número, sin 0 ni 15 adelante)
function telefono_(t) {
  var n = String(t || "").replace(/\D/g, "");
  if (n.indexOf("549") === 0) n = n.slice(3);
  else if (n.indexOf("54") === 0 && n.length > 10) n = n.slice(2);
  if (n.charAt(0) === "0") n = n.slice(1);
  // Saca el 15 después del código de área (ej: 351 15 1234567 -> 351 1234567)
  if (n.length === 12) n = n.replace(/^(\d{2,4})15/, "$1");
  return n.slice(-10);
}

function telefonoWhatsapp_(tel) { return "549" + tel; }

function limpiar_(t, max) {
  return String(t || "").replace(/[<>]/g, "").replace(/^[=+\-@]+/, "").trim().slice(0, max);
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

var CARTA_EJEMPLO = [
  ["Entradas", "Papas fritas", "", 5000, "Sí"],
  ["Entradas", "Papas fritas con cheddar", "", "", "Sí"],
  ["Entradas", "Empanadas árabes / criollas / dulces y saladas", "Precio por unidad", 1500, "Sí"],
  ["Entradas", "Empanadas de verdura", "Precio por unidad", 1500, "Sí"],
  ["Hamburguesas y sándwiches", "Hamburguesa completa", "Pan de papa, medallón de carne, jamón, queso, lechuga, tomate y mayonesa casera", 8000, "Sí"],
  ["Hamburguesas y sándwiches", "Lomo completo", "Pan de lomo, bife de lomo, jamón, queso, huevo, lechuga, tomate y mayonesa casera", 10000, "Sí"],
  ["Hamburguesas y sándwiches", "Milanesa", "Pan, milanesa, huevo, lechuga, tomate y mayonesa casera", "", "Sí"],
  ["Hamburguesas y sándwiches", "Bondiola", "Pan baguette, bondiola desmechada con barbacoa, lechuga y tomate", 16000, "Sí"],
  ["Hamburguesas y sándwiches", "Osobuco", "Pan baguette, osobuco desmechado al malbec, lechuga y tomate", 16000, "Sí"],
  ["Hamburguesas y sándwiches", "Tapa de asado", "Pan baguette, tapa de asado desmechada con mostaza y pepinillos", 16000, "Sí"],
  ["Pizzas", "Muzzarella", "Masa casera, salsa, muzzarella y aceitunas verdes", 12000, "Sí"],
  ["Pizzas", "Especial", "Masa casera, salsa, jamón cocido, morrón rojo asado y aceitunas", 15000, "Sí"],
  ["Pizzas", "Fugazzeta caramelizada", "Masa casera, salsa, muzzarella, cebolla caramelizada y aceitunas verdes", 16000, "Sí"],
  ["Pizzas", "Rúcula", "Masa casera, salsa, muzzarella, rúcula, jamón crudo y aceitunas negras", 16000, "Sí"],
  ["Pizzas", "Roquefort", "Masa casera, salsa, muzzarella, queso azul y aceitunas verdes", 16000, "Sí"],
  ["Pastas", "Ñoquis de albahaca", "Con crema y queso parmesano", 14000, "Sí"],
  ["Pastas", "Ñoquis rellenos de roquefort", "Con crema de verdeo", 14000, "Sí"],
  ["Pastas", "Sorrentinos de calabaza, ricota y verdeo", "Con crema y queso roquefort", 14000, "Sí"],
  ["Pastas", "Pansotti de verdura y carne", "Con salsa pomodoro", 14000, "Sí"],
  ["Cervezas", "Andes", "", 8000, "Sí"],
  ["Cervezas", "Quilmes Stout", "", 6000, "Sí"],
  ["Cervezas", "Stella Artois", "", 9000, "Sí"],
  ["Cervezas", "Corona", "", 9000, "Sí"],
  ["Vinos", "Vinos", "Consultar variedades", 8000, "Sí"],
  ["Tragos", "Tragos", "Consultar variedades", 8000, "Sí"],
  ["Sin alcohol", "Agua saborizada 500 ml", "Pomelo, manzana, naranja y pera", 4000, "Sí"],
  ["Sin alcohol", "Agua mineral 500 ml", "", 3000, "Sí"],
  ["Sin alcohol", "Soda 500 ml", "", 3000, "Sí"],
  ["Sin alcohol", "Coca-Cola 1¼ L", "", 8000, "Sí"],
  ["Sin alcohol", "Sprite 1¼ L", "", 8000, "Sí"],
  ["Sin alcohol", "Fanta 1¼ L", "", 8000, "Sí"],
  ["Postres", "Cheesecake de frutilla", "", 8000, "Sí"],
  ["Postres", "Lemon pie", "", "", "Sí"],
  ["Postres", "Tiramisú", "", 8000, "Sí"],
  ["Postres", "Flan casero", "", 8000, "Sí"]
];
