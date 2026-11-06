# Auditoría funcional · Invitación de Lola · 4/11/2026

## Flujo acordado

Un mismo enlace para todos. La familia escribe en el mensaje de WhatsApp los nombres invitados. Quien responde completa su nombre y WhatsApp, indica asistencia y detalla las personas invitadas que asistirán y sus menús. Puede responder por otros sin sumarse como asistente. No hay carga previa de invitados ni enlaces individuales.

La respuesta llega al panel privado `/dashboard`, pendiente de revisión; no se envía automáticamente por WhatsApp o correo. La lista de asistentes y los menús se construyen con las respuestas aprobadas y pueden descargarse en CSV.

## Hallazgos corregidos

| Hallazgo                                                    | Efecto anterior                                                               | Corrección                                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Quien responde se agregaba automáticamente a los asistentes | Un padre que respondía por su hija podía contarse sin asistir                 | Opción explícita «Yo también voy a asistir» y separación entre contacto y personas invitadas                                |
| Reintento con el mismo identificador y datos diferentes     | Tras perder una respuesta de red se podía informar éxito con los datos viejos | Identificador por contenido del envío; conflicto explícito en el servidor; reintentos idénticos sin duplicar                |
| Nombres repetidos y teléfonos inválidos                     | Podían inflar los menús o identificar mal al contacto                         | Normalización de espacios y teléfono; rechazo de nombres repetidos con indicación para distinguir homónimos                 |
| Una respuesta vieja podía volver a aprobarse                | Se restauraban menús o asistencia obsoletos                                   | Bloqueo de reemplazadas y de aprobaciones anteriores a una respuesta pendiente/aprobada más reciente                        |
| Dos revisores podían actuar sobre una vista desactualizada  | Una decisión podía pisar otra                                                 | Verificación del estado esperado dentro de la transacción y aviso para actualizar                                           |
| Totales calculados sobre las últimas 1.000 respuestas       | Se omitían asistentes y menús anteriores                                      | Se consultan todas las respuestas; la paginación del panel no altera los totales ni el CSV                                  |
| El estado de la base solo comprobaba la tabla de RSVP       | Podían habilitarse funciones con canciones, sesiones o límites ausentes       | Verificación de las cuatro tablas sin leer datos de invitados                                                               |
| Error al refrescar el panel después de guardar              | Se podía informar un fracaso pese a una escritura completada                  | Se separó la actualización de caché del resultado de la transacción                                                         |
| No había corrección directa ni resumen de quién respondió   | Era difícil entender o corregir el envío                                      | Resumen con contacto, asistentes y menús; botón de corrección conservando datos                                             |
| El panel no se actualizaba ni permitía buscar/exportar      | Había trabajo manual adicional                                                | Actualización cada 30 segundos y manual, búsqueda por nombre/WhatsApp, fecha y hora del envío y CSV de asistentes aprobados |

La migración `202611040002_review_identity.sql` conserva las respuestas anteriores. Si hubiera dos aprobaciones del mismo contacto y teléfono que solo difieren por espacios o mayúsculas, mantiene la más reciente como aprobada y marca las demás como reemplazadas. Los archivos de migración anteriores no se modificaron.

## Privacidad y límites del formulario abierto

- Los nombres y el teléfono los declara quien responde. Sin una lista previa no se puede verificar automáticamente la identidad ni quién recibió una invitación. La organización conserva la revisión final.
- La instrucción pública pide anotar únicamente a las personas invitadas en el mensaje recibido. «Agregar persona invitada» no significa invitar a acompañantes adicionales.
- Cambiar nombre o WhatsApp genera otro contacto para la revisión. El panel avisa si un teléfono ya tiene una respuesta aprobada con otro nombre; no fusiona personas distintas automáticamente.
- Las respuestas reemplazadas y rechazadas permanecen como historial y no suman asistentes ni menús. Una respuesta de quien no asiste sigue identificando a quien respondió.
- El CSV contiene solo asistentes aprobados. Escapa comillas, saltos de línea y prefijos de fórmula para evitar ejecutar contenido al abrirlo en una planilla.
- Las sugerencias musicales quedan guardadas para la organización y no publican nombres de invitados en la landing.

## Verificación

- Pruebas de acciones reales con servicios de Next y base aislados: autorización, sesiones, cambio de contraseña, cierres de sesión, límites y fallos de escritura/caché.
- PostgreSQL embebido con todas las migraciones: guardado, rechazo de entradas inválidas, reintentos, conflictos, revisiones obsoletas, reemplazo de respuestas, rollback, permisos privados y reparación de aprobaciones duplicadas.
- Totales y CSV con más de 1.000 respuestas, incluyendo valores que podrían interpretarse como fórmulas.
- Componentes reales en navegador con PostgreSQL aislado: menú por persona, revisión, descarga, representante que no asiste, corrección y pérdida de respuesta después de guardar. Música probada con audio sintético, sin usar archivos personales ni contactos reales.
- Revisión de la aplicación real sin conexión en cuatro anchos, accesibilidad, calendario, Maps, compartir, recursos y ausencia de desbordes.

## Pendientes para activar en producción

1. Conectar la base PostgreSQL propia de Lola en Vercel y volver a desplegar para aplicar las migraciones. El usuario decidió conectarla más adelante; mientras tanto, los envíos están deshabilitados y la salud devuelve 503.
2. Configurar `ADMIN_PASSWORD` propio de Lola (12–256 caracteres) para que la organización acceda al panel.
3. Incorporar el archivo de **thank u, next — Ariana Grande**, o una URL HTTPS directa al audio, y configurar el reproductor. Sin fuente de audio el control se oculta. El navegador puede requerir un primer toque para permitir sonido.

La validación se realizó en entornos locales aislados. No se verificaron escrituras de producción, no se usaron conexiones de Barbi/Luz y no se enviaron mensajes a invitados.

## Actualización del 6/11/2026

El usuario entregó el MP3 de **thank u, next**. Está incluido en `public/audio/thank-u-next.mp3` y comienza desde el segundo **45**, con pausa/reanudación y primer toque cuando el navegador bloquea autoplay. El pendiente de audio del informe original queda resuelto.
