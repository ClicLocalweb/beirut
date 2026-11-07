# App de reservas para bares y restaurantes (plantilla)

Página para el celular con: inicio, carta, formulario de reservas y tarjeta de visitas (NFC o QR).
Los datos se guardan en una planilla de Google y cada reserva crea un evento en Google Calendar.

Local: **Beirut** (Villa Los Aromos, Córdoba). Hecho con la plantilla bar_demo.

## Qué hay en cada archivo

| Archivo | Para qué sirve |
|---|---|
| `config.js` | **El único archivo que se cambia por local**: nombre, colores, logo, horarios, dirección, WhatsApp, link de reseñas, visitas para el beneficio y URL del Apps Script. |
| `apps-script/Codigo.gs` | Código que se pega en la planilla (Extensiones > Apps Script). Arriba tiene `AJUSTES`. |
| `index.html`, `carta.html`, `reserva.html`, `visita.html` | Las páginas. No hace falta tocarlas. |
| `js/carta-demo.js` | Carta de ejemplo que se ve mientras no está conectada la planilla. |
| `qr/` | QR que apunta a la página principal. |

## Dar de alta un restaurante nuevo (resumen)

1. **Copiar la plantilla:** en GitHub, botón *Use this template* > *Create a new repository* (nombre corto, ej. `bar-pepe`, público).
2. **Planilla:** crear una planilla de Google nueva en la cuenta del local (o la tuya) con el nombre del local.
3. **Apps Script:** en la planilla, *Extensiones > Apps Script*. Borrar lo que haya, pegar todo `apps-script/Codigo.gs`, completar `AJUSTES` y guardar.
4. **Configurar:** arriba elegir la función `configurarPlanilla` y tocar *Ejecutar*. Aceptar los permisos (*Configuración avanzada > Ir a … (no seguro)* es normal porque el script es tuyo). Se crean las pestañas Reservas, Clientes, Carta y Cumpleaños del mes.
5. **Publicar el script:** *Implementar > Nueva implementación > tipo Aplicación web*. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**. Copiar la URL que termina en `/exec`.
6. **Editar `config.js`** en GitHub (lápiz ✏️): datos del local y pegar la URL en `urlAppsScript`. *Commit changes*.
7. **Publicar la página:** *Settings > Pages > Branch: main / root > Save*. En 1 o 2 minutos queda en `https://USUARIO.github.io/NOMBRE-REPO/`.
8. **Carta:** cargarla en la pestaña *Carta* de la planilla (columna Disponible: "Sí" o "No").
9. **NFC y QR:** grabar en el chip el link de la página principal `https://USUARIO.github.io/NOMBRE-REPO/` (desde ahí el cliente toca "Sumar mi visita") y generar el QR de ese mismo link.
10. **Probar:** hacer una reserva y sumar una visita con tu teléfono. Revisar planilla y calendario.

> Si cambiás el código del script después, hay que hacer *Implementar > Gestionar implementaciones > editar (lápiz) > Versión: nueva*, si no, sigue andando la versión vieja.

## Cómo funciona

- **Reservas:** se aceptan todas y quedan "Pendiente". El dueño confirma por WhatsApp y cambia el estado en la planilla.
- **Visitas:** el cliente escanea el NFC/QR, entra al inicio, toca "Sumar mi visita", pone su teléfono y suma 1 visita (máximo 1 por día por teléfono). Al llegar al número de visitas ve el beneficio en pantalla y queda anotado en "Beneficios ganados".
- **Cumpleaños del mes:** pestaña que se actualiza sola con quienes cumplen ese mes.
- **Promociones:** solo se les escribe a quienes tienen "Sí" en "Acepta promos".
