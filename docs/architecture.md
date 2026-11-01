# Decisiones de arquitectura

Pages sirve exclusivamente archivos estáticos. Railway mantiene las credenciales y consulta la API oficial. No hay rutas de escritura MAL ni URLs de proveedor elegibles por el cliente. Los usernames admiten 2–16 letras, números, guion y guion bajo; los parámetros se validan con Zod.

CORS permite orígenes explícitos, Helmet añade cabeceras, JSON se limita a 128 KB, hay 30 peticiones/minuto por IP y como máximo cuatro cálculos concurrentes. Se confía en el salto de proxy de Railway existente.

Las listas se leen completamente mediante offsets reconstruidos. Nunca se siguen URLs arbitrarias de `paging.next`. El proveedor establece timeout de 15 segundos, hasta dos reintentos y 150 ms entre peticiones. Los 429 respetan Retry-After hasta cinco segundos.

La caché de perfiles expira en cinco minutos y admite hasta 50 perfiles; el catálogo dura una hora y los detalles 24 horas. Los resultados personales llevan `Cache-Control: no-store`. No se escriben historiales en disco ni en base de datos. Las peticiones idénticas en curso comparten promesa. El navegador recuerda solo el nombre del último perfil.

El motor aprende de notas explícitas de completados. Combina afinidad suavizada, preferencias negativas, similitud de sinopsis, formato, media pública, filtros y diversidad. Los filtros son reglas obligatorias; ningún peso puede reintroducir un completado. Se verifica una selección de candidatos con un límite de 100 consultas por ronda, descartando los que no puedan comprobarse.

El perfil con pocas muestras recibe una advertencia de confianza baja. La capa opcional de IA redacta evidencia ya calculada y nunca modifica IDs ni filtros. Los fallos generativos conservan la explicación determinista.

Se conserva el commit original mediante una rama de respaldo. GitHub Actions valida antes de publicar dist/frontend. Railway reutiliza servicio y dominio y verifica que el proceso arranque mediante healthcheck. El rollback puede desplegar un commit o imagen anteriores sin borrar recursos remotos.
