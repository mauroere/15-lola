# Los XV de Lola

Invitación formal e independiente para **Lola · 7 de febrero de 2027 · 21:00 hs de Argentina · La Quinta Eventos**. [Ubicación confirmada](https://maps.app.goo.gl/f5aZKBZheer29YDGA?g_st=ac). Diseño medieval beige y bordó, flores y detalles plateados. Dress code elegante; evitar bordó, plateado y blanco.

La portada invita a la fiesta y presenta fecha, horario y salón; no funciona como un anuncio previo.

## Funciones

- Formulario abierto de asistencia y hasta 11 acompañantes: nombre, WhatsApp, respuesta y menú por persona. Opciones: sin restricciones, sin TACC, vegetariano, vegano y otra necesidad; alergias/notas opcionales, con descripción requerida para «Otra necesidad».
- Los envíos quedan **pendientes de revisión**. `/dashboard` permite aprobar/rechazar y consultar asistentes y menús aprobados. Aprobar otro envío del mismo nombre y WhatsApp reemplaza el anterior en los totales; mantiene ambas respuestas. No se publican datos de invitados.
- Sugerencias de canción y artista, guardadas en la base y consultables en el panel.
- Validación del servidor, cupos de frecuencia y protección contra doble envío mediante UUID. Los errores conservan los formularios; no se informa éxito si falla la escritura.
- Calendario con inicio a las **21:00 de Argentina (00:00 UTC del 8/2)**, sin inventar una hora de finalización. Enlace discreto a Google Maps y compartir/copiar la invitación.
- Reproductor preparado para **thank u, next — Ariana Grande**, desde el comienzo. Volumen inicial 25%, repetición, pausa y reintento. Intenta autoplay; si el navegador lo bloquea, usa el primer clic/toque o Enter/Espacio. Una pausa manual se respeta. **Falta el archivo de audio o una URL HTTPS directa al archivo**; el título y un enlace a Spotify no contienen audio para el reproductor.

Los datos están en `lib/event.ts`. No hay invitados, claves, fotos, audio ni conexiones de Barbi o Luz.

## Estado de la conexión

Por decisión del usuario, **la base se conectará después**. Mientras falte la conexión o el esquema, los formularios muestran aviso y mantienen el envío deshabilitado. `/api/health` devuelve 503 sin exponer credenciales ni invitados. La landing, la ubicación y el calendario funcionan sin base.

### Configurar la base de Lola en Vercel

1. Conectar una base **propia de Lola**, Supabase o Neon, al proyecto `15-lola`. No usar las conexiones de Barbi o Luz.
2. La integración debe inyectar `DATABASE_URL` o `POSTGRES_URL`. El migrador prefiere `POSTGRES_URL_NON_POOLING` cuando exista; las escrituras del servidor usan la conexión normal. Los valores se cargan en el gestor seguro de Vercel, nunca en Git o en el chat.
3. Crear `ADMIN_PASSWORD` para el panel: entre 12 y 256 caracteres. No hay contraseña predeterminada ni heredada de otra invitación.
4. Volver a desplegar. `npm run build` aplica las migraciones versionadas y verifica sus checksums antes de compilar. Si hay conexión y falla una migración, el build falla para conservar el despliegue anterior. Si no hay conexión, se compila la landing con los envíos deshabilitados.
5. Comprobar `/api/health` (HTTP 200) y entrar a `/dashboard`.

Se utiliza el esquema privado `lola15` con RLS y permisos cerrados a visitantes. No requiere claves públicas de Supabase. La conexión TLS verifica certificados y hostname; acepta las CA públicas oficiales de Supabase y las raíces del sistema. Los certificados de `scripts/certs` no son claves privadas. Los tests usan PostgreSQL embebido y credenciales ficticias.

Las sesiones administrativas son aleatorias, guardan su hash en la base, vencen a las ocho horas, usan cookies HttpOnly y se revocan al salir o cambiar la contraseña. No se incluyen contraseñas en cookies ni respuestas públicas.

### Incorporar la canción

Cargar el archivo proporcionado por la familia en `public/audio/` o en su almacenamiento de medios. Configurar `NEXT_PUBLIC_BACKGROUND_MUSIC_URL` con una URL HTTPS directa o con una ruta `/audio/…` del proyecto y desplegar. Sin archivo/URL, el control de música se oculta. No se descarga ni sustituye la canción por otra.

## Logotipo

`public/brand/lola-escudo.svg` es el original vectorial de escudo, corona y L en trazos. `BrandLogo` lo reutiliza en cabecera, celebración, cierre y pie; se usa también en favicon e imagen social. En la vista inicial hay un solo escudo. `/icon.svg` sirve ese mismo archivo por compatibilidad. El castillo y el estandarte se retiraron.

## Desarrollo y pruebas

Node.js 24 y npm 11. Fuentes y decoración locales.

```sh
npm ci
npm run dev
npm test
npm run build
npm start -- --port 3030
```

Con Chromium del sistema:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check:browser
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check:forms
```

`check:browser` revisa la aplicación real sin base: cuatro anchos, imágenes, acceso al menú/formularios, envío deshabilitado, ubicación, calendario, compartir y accesibilidad. Puede usarse `INVITATION_TEST_URL` si el servidor usa otro puerto.

`check:forms` inicia una base PGlite aislada y renderiza los componentes reales con un adaptador local de las acciones: guardado y revisión, menús por persona, reintentos, errores, sugerencias, accesibilidad y reproducción de un audio sintético. No usa cuentas, invitados, mensajes ni archivos de música reales. El puerto 3041 se cierra al terminar.

`npm test` prueba las acciones reales con servicios de Next/base aislados, permisos administrativos, sesiones, errores, transacciones PostgreSQL, validación, límites, doble envío, reemplazo de respuestas y calendario.
