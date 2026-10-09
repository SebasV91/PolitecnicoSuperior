# Registro QR de asistencia y rifa

Aplicación web inicial en español para eventos en Colombia. Permite registrar asistentes desde un QR, asignar números consecutivos por evento y mostrar la confirmación en pantalla. Incluye un panel administrativo básico.

## Archivos

- `index.html`: formulario público.
- `styles.css`: diseño adaptable a celulares.
- `config.js`: URL, clave pública y UUID del evento.
- `app.js`: validaciones y conexión a Supabase.
- `admin.html` / `admin.js`: panel privado con búsqueda y exportación CSV.
- `sql/setup.sql`: tablas, restricciones únicas y funciones de registro.

## Importante antes de publicarla

Esta es una base funcional para configurar y probar; no la uses en un evento real hasta completar la configuración, probar permisos y validar el tratamiento de datos personales. La exportación contiene datos personales y debe guardarse de forma segura.

## 1. Crear Supabase

1. Crea un proyecto en https://supabase.com/.
2. Abre **SQL Editor**.
3. Ejecuta el contenido de `sql/setup.sql`.
4. En **Project Settings / API** copia la Project URL y la clave publicable (o anon legacy).
5. Pega esos valores en `config.js`. No uses nunca la clave `service_role` en el navegador.

## 2. Crear el usuario administrativo

1. En Supabase abre **Authentication > Users** y crea/invita tu usuario administrativo.
2. Copia el UUID del usuario.
3. En SQL Editor ejecuta, sustituyendo el UUID:

```sql
insert into public.admin_users (user_id)
values ('UUID-REAL-DEL-USUARIO-ADMIN');
```

No publiques ese UUID en el formulario. El usuario debe usar una contraseña robusta y activar MFA si está disponible.

## 3. Crear el evento

En SQL Editor ejecuta un evento nuevo:

```sql
insert into public.events (name, event_date, active)
values ('Evento académico - octubre 2026', '2026-10-20', true)
returning id;
```

Copia el UUID devuelto en `EVENT_ID` de `config.js`. El UUID es un identificador, no una contraseña; la seguridad depende de las funciones y permisos SQL.

Para cerrar inscripciones:

```sql
update public.events set active = false where id = 'UUID-DEL-EVENTO';
```

Para cada evento nuevo, crea otra fila. El historial queda guardado y los números comienzan de nuevo para ese evento.

## 4. Probar localmente

No abras el archivo con `file://`. Usa un servidor local, por ejemplo con Python instalado:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000`. En Windows también puedes usar la extensión Live Server de Visual Studio Code.

Prueba primero con datos ficticios. Verifica:
- Registro válido devuelve un número.
- Repetir documento, correo o celular devuelve error y no entrega otro número.
- Un evento inactivo no acepta registros.
- Dos registros simultáneos no obtienen el mismo número.
- Un usuario que no esté en `admin_users` no puede consultar el panel.
- El número asignado permanece en la base de datos si el navegador se cierra después de completar el registro.

## 5. Publicar y generar QR

Puedes desplegar los archivos estáticos en un servicio de hosting HTTPS. Sube los archivos manteniendo su estructura y comprueba que `config.js` esté en la raíz. Después genera un QR con la URL pública de `index.html` y pruébalo desde un celular usando datos móviles.

No compartas la URL del panel como si fuera un secreto: el acceso se protege con autenticación y permisos del servidor.

## 6. SMS y confirmación

Esta versión NO envía SMS. Muestra el número de rifa en pantalla y permite copiarlo. Para 300–1.000 participantes, esta opción evita depender de créditos de mensajería. Si luego integras SMS, debe hacerse desde una función del servidor y nunca exponer tokens del proveedor en el navegador.

## 7. Protección de datos personales

Antes de usar el sistema, completa el aviso de privacidad con el nombre y contacto del responsable, finalidad, derechos de los titulares y procedimiento para consultas/reclamos. Conserva prueba de autorización, limita quién puede exportar la lista, usa HTTPS y establece una política de retención y eliminación. Si participan menores, revisa las reglas especiales aplicables. Solicita únicamente los datos que realmente necesites.

## Límites y mejoras recomendadas antes de producción

- Añadir CAPTCHA o limitación de frecuencia en el endpoint público para prevenir registros automatizados.
- Configurar alertas, copias de seguridad y un procedimiento de recuperación.
- Revisar el manejo de errores de unicidad en pruebas reales y ajustar mensajes según el error que devuelva el SDK.
- Definir si las reglas de unicidad deben aplicar por evento o globalmente. Esta versión bloquea duplicados dentro del mismo evento, pero permite que una persona asista a eventos distintos.
- Para eventos de alto volumen, revisar límites del plan de hosting/base de datos y ejecutar una prueba de carga.
- Evaluar si es necesario guardar edad exacta; reducir datos recolectados cuando sea posible.
