# Notas Cortas PWA
Listo para subir. Requisitos:
- Servir por HTTPS (o `localhost`).
- Asegurate de que `manifest.webmanifest` tenga MIME type `application/manifest+json` (o `application/json`).

## Archivos
- index.html (incluye botón 📲 Instalar y 🔔 Probar notificación)
- manifest.webmanifest (con iconos maskable y orientación)
- service-worker.js (cache + notificaciones + push handler)
- offline.html (fallback sin conexión)
- icons/icon-192.png, icons/icon-512.png

## Prueba local rápida
1) Abre una terminal en esta carpeta.
2) Python 3: `python -m http.server 8080`
3) Visita http://localhost:8080/
4) Aceptá el permiso de notificaciones y probá el botón 🔔.
5) Si el navegador muestra el prompt, instalala; o usa el botón 📲 Instalar app.

## Push real (opcional)
- Reemplazá `REEMPLAZA_CON_TU_VAPID_PUBLIC_KEY_BASE64URL` en index.html por tu clave pública.
- Enviá la suscripción que aparece en consola a tu backend y mandá Web Push.
