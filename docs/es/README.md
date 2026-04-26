# Documentación (Español)

Bienvenido. Esta carpeta es para cuando necesitas profundidad que el [README principal](../../README.es.md) no cubre.

Si solo estás probando, el README principal es suficiente — vuelve aquí cuando quieras saber *cómo* funciona algo, no solo *que* funciona.

> Original en inglés: [docs/README.md](../README.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Soy nuevo — ¿por dónde empiezo?

Léelos en orden. Cada uno asume que has leído el anterior.

1. **[Architecture](architecture.md)** — Cómo `init` funciona realmente por dentro. La pipeline de 4 pasadas, por qué se divide en pases, qué hace el scanner antes de que cualquier LLM se involucre. Empieza aquí para el modelo conceptual.

2. **[Diagrams](diagrams.md)** — La misma arquitectura explicada con imágenes Mermaid. Hojea junto con el documento de arquitectura.

3. **[Stacks](stacks.md)** — Los 12 stacks soportados (8 backend + 4 frontend), cómo se detecta cada uno, qué hechos extrae el scanner por stack.

4. **[Verification](verification.md)** — Los 5 validators que se ejecutan después de que Claude genera los docs. Qué comprueban, por qué existen y cómo leer su salida.

5. **[Commands](commands.md)** — Cada comando CLI y lo que hace. Úsalo como referencia una vez que conozcas los conceptos básicos.

Después del paso 5 tendrás el modelo mental. Todo lo demás en esta carpeta es para situaciones específicas.

---

## Tengo una pregunta concreta

| Pregunta | Lee |
|---|---|
| "¿Cómo instalo sin `npx`?" | [Manual Installation](manual-installation.md) |
| "¿Está soportada la estructura de mi proyecto?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "¿Re-ejecutar destruirá mis ediciones?" | [Safety](safety.md) |
| "Algo se rompió — ¿cómo me recupero?" | [Troubleshooting](troubleshooting.md) |
| "¿Por qué usar esto en vez de la herramienta X?" | [Comparison](comparison.md) |
| "¿Para qué sirve el memory layer?" | [Memory Layer](memory-layer.md) |
| "¿Cómo personalizo el scanner?" | [Advanced Config](advanced-config.md) |

---

## Todos los documentos

| Archivo | Tema |
|---|---|
| [architecture.md](architecture.md) | La pipeline de 4 pasadas + scanner + validators de extremo a extremo |
| [diagrams.md](diagrams.md) | Diagramas Mermaid del mismo flujo |
| [stacks.md](stacks.md) | Los 12 stacks soportados en detalle |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log, failure-patterns, compaction |
| [verification.md](verification.md) | Los 5 validators post-generación |
| [commands.md](commands.md) | Cada comando CLI, cada flag, exit codes |
| [manual-installation.md](manual-installation.md) | Instalar sin `npx` (corp / air-gapped / CI) |
| [advanced-config.md](advanced-config.md) | Overrides de `.claudeos-scan.json` |
| [safety.md](safety.md) | Qué se preserva al re-init |
| [comparison.md](comparison.md) | Comparación de scope con herramientas similares |
| [troubleshooting.md](troubleshooting.md) | Errores y recuperación |

---

## Cómo leer esta carpeta

Cada documento está escrito para ser **legible por sí solo** — no necesitas leerlos en orden a menos que estés siguiendo el camino para nuevos usuarios de arriba. Hay enlaces cruzados donde un concepto depende de otro.

Convenciones usadas en estos docs:

- **Los bloques de código** muestran lo que escribirías de verdad o lo que los archivos contienen. No están abreviados a menos que se indique explícitamente.
- **`✅` / `❌`** significan "sí" / "no" en tablas, nunca nada más matizado.
- **Las rutas de archivo** como `claudeos-core/standard/00.core/01.project-overview.md` son absolutas desde la raíz del proyecto.
- **Marcadores de versión** como *(v2.4.0)* en una característica significan "añadido en esta versión" — versiones anteriores no la tienen.

Si un documento dice que algo es cierto y encuentras evidencia de que no lo es, es un bug de documentación — por favor [abre un issue](https://github.com/claudeos-core/claudeos-core/issues).

---

## ¿Encontraste algo poco claro?

PRs bienvenidos en cualquier doc. Los docs siguen estas convenciones:

- **Inglés llano sobre jerga.** La mayoría de los lectores usan ClaudeOS-Core por primera vez.
- **Ejemplos sobre abstracciones.** Mostrar código real, rutas, salida de comandos.
- **Honestos sobre los límites.** Si algo no funciona o tiene matices, dilo.
- **Verificados contra el código fuente.** Nada de documentar características que no existen.

Ver [CONTRIBUTING.md](../../CONTRIBUTING.md) para el flujo de contribución.
