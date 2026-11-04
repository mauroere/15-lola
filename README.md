# Invitación XV · Medieval

Landing independiente con estética antigua/medieval: beige, bordó y detalles plateados, rosas, letras góticas UnifrakturMaguntia, arco ojival, corona, escudo con inicial, estandarte, flecha ornamental y castillo. No contiene datos, claves, fotografías ni conexiones de Barbi o Luz.

## Datos y alcance

- **Confirmados por el usuario a partir de la tarjeta:** Lola, 7 de febrero de 2027. Lugar y horario permanecen pendientes.
- **Confirmado en el pedido:** dress code elegante. Evitar bordó, plateado y blanco.
- Lugar y horario pendientes. No se inventaron datos ni se publicó el teléfono de la madre.
- Incluye tarjeta adaptable a móviles, navegación, calendario descargable para el 7 de febrero de 2027, compartir/copiar el enlace, metadatos para redes y accesibilidad. No incluye RSVP, panel, música ni una base de datos; se pueden definir cuando la familia confirme el alcance.

La configuración está en `lib/event.ts`. Sin fecha, el botón de calendario se oculta y su endpoint devuelve 404; no se inventa un día. Al tener horario definitivo debe actualizarse también el calendario, que por ahora guarda la fecha completa sin un horario inventado. La imagen de referencia se utilizó solo como guía visual; la decoración floral del sitio es un recurso nuevo.

## Desarrollo

Node.js 24 y npm 11.

```sh
npm ci
npm run dev
npm run build
npm start
```

Verificación de navegador con Chromium instalado:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check:browser
```

El chequeo requiere el servidor local en el puerto 3030 (`npm start -- --port 3030`); valida tamaños de pantalla, carga de recursos, calendario, copia del enlace y accesibilidad. No contacta invitados.

## Vercel

Importar como proyecto independiente con framework Next.js. Build: `npm run build`. No requiere variables de entorno ni Supabase. Fuentes y decoración se sirven desde el mismo proyecto. No publicar la landing en el proyecto de Barbi.
