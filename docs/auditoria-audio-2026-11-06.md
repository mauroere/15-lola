# Auditoría de audio · Lola · 6/11/2026

## Resultado

El MP3 carga y puede reproducirse desde 0:45. Cuando Chrome exige activación del usuario, abrir la página y desplazar no autorizan sonido: `play()` rechaza con `NotAllowedError`. Se reprodujo con una política restrictiva en escritorio y emulación táctil Android.

La prueba anterior era insuficiente: verificaba un intento de reproducción al desplazar y después permitía un clic para continuar. Además, las observaciones de Playwright mediante `evaluate` pueden usar CDP con activación de usuario; eso puede desbloquear el audio durante el propio test. No demostraba que un invitado escuchara sonido al entrar o al desplazar.

La prueba corregida observa el reproductor mediante CDP `Runtime.evaluate` con `userGesture:false`, registra los rechazos y los eventos reales `playing` por separado y no permite un clic de rescate mientras comprueba el scroll. Usa entradas nativas de mouse y táctiles. En el perfil restrictivo, entrada y scroll quedan bloqueados; un toque o pulsación real inicia la canción desde 0:45.

## Correcciones

- Detección de `pointerdown` de mouse, `pointerup` táctil, `touchend`, clic y teclas válidas. Android puede finalizar un gesto sin emitir el clic esperado por la versión anterior.
- Un gesto válido puede reintentar una solicitud automática aún pendiente; se evita ignorar el primer toque mientras espera la carga.
- Estado explícito de reproducción bloqueada: «Activar música» y «Tu navegador necesita un toque para activar el sonido». No se presenta un intento fallido como música sonando.
- La posición inicial sigue siendo 45 segundos. Se conserva la posición al reanudar y se respeta una pausa manual ante otros gestos.
- El intento automático al entrar y el intento al desplazar continúan para navegadores que ya conceden permiso. No se usa reproducción muda como sustituto de sonido audible.

## Límites de la verificación

Las pruebas son locales con el MP3 real y Chrome, incluyendo emulación táctil; no se afirma una prueba en un dispositivo Android físico ni dentro de WhatsApp. La política aplicada en este entorno no permite consultar `los15delola.vercel.app`, por lo que no se comprobó la versión desplegada en vivo.

La aplicación no puede garantizar sonido al entrar o solo al desplazar cuando el navegador o el visor de WhatsApp exige interacción. Un toque permitido sigue siendo necesario en ese caso. El aviso aparece únicamente cuando se detecta ese bloqueo.

## Referencias consultadas

- [Política oficial de autoplay de Chrome](https://developer.chrome.com/blog/autoplay/): el sonido automático depende de interacción previa, permisos y otras condiciones del navegador. Se leyó la fuente oficial desde el repositorio GoogleChrome/developer.chrome.com.
- [Activación de usuario en MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/User_activation): distingue los eventos que otorgan activación, como ciertos eventos de puntero, teclado y `touchend`; un `scroll` por sí mismo no está en esa lista. Se leyó la fuente de mdn/content.
