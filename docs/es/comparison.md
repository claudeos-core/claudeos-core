# Comparación con herramientas similares

Esta página compara ClaudeOS-Core con otras herramientas de Claude Code que trabajan en el mismo espacio general (configuración de Claude Code consciente del proyecto).

**Esto es una comparación de scope, no un juicio de calidad.** La mayoría de las herramientas de abajo son excelentes en lo que hacen. El punto es ayudarte a entender si ClaudeOS-Core encaja en tu problema, o si una de ellas encaja mejor.

> Original en inglés: [docs/comparison.md](../comparison.md). La traducción al español se mantiene sincronizada con el inglés.

---

## TL;DR

Si quieres **generar automáticamente `.claude/rules/` basado en lo que está realmente en tu código**, esa es la especialidad de ClaudeOS-Core.

Si quieres algo más (bundles preset amplios, flujos de planificación, orquestación de agentes, sync de configuración multi-herramienta), otras herramientas en el ecosistema de Claude Code probablemente sean un mejor encaje.

---

## Cómo difiere ClaudeOS-Core de otras herramientas

Rasgos definitorios de ClaudeOS-Core:

- **Lee tu código fuente real** (scanner Node.js determinístico — sin LLM adivinando el stack).
- **Pipeline Claude de 4 pasadas** con prompts inyectados con hechos (paths/convenciones se extraen una vez y se reutilizan).
- **5 validators post-generación** (`claude-md-validator` para estructura, `content-validator` para path-claim y contenido, `pass-json-validator` para JSON intermedio, `plan-validator` para archivos de plan legacy, `sync-checker` para consistencia disco ↔ sync-map).
- **10 idiomas de salida** con validación language-invariant.
- **Salida por proyecto**: CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer — todo derivado de tu código, no de un bundle preset.

Otras herramientas Claude Code en este espacio general (puede que quieras combinarlas o elegir una distinta dependiendo de tu necesidad):

- **Claude `/init`** — built-in en Claude Code; escribe un único `CLAUDE.md` en una llamada LLM. Mejor para setup rápido de un solo archivo en proyectos pequeños.
- **Herramientas preset/bundle** — distribuyen agentes, skills o reglas curadas que funcionan para "la mayoría de los proyectos". Mejores cuando tus convenciones coinciden con los defaults del bundle.
- **Herramientas de planning/workflow** — proporcionan metodologías estructuradas para el desarrollo de features (specs, fases, etc.). Mejores cuando quieres una capa de proceso encima de Claude Code.
- **Herramientas de hook/DX** — añaden auto-save, hooks de calidad de código, o mejoras de developer experience a sesiones de Claude Code.
- **Conversores de reglas cross-agent** — mantienen tus reglas sincronizadas a través de Claude Code, Cursor, etc.

Estas herramientas son mayormente **complementarias, no competitivas**. ClaudeOS-Core maneja el trabajo de "generar reglas por proyecto desde tu código"; las otras manejan trabajos diferentes. La mayoría pueden usarse juntas.

---

## Cuándo ClaudeOS-Core es el encaje correcto

✅ Quieres que Claude Code siga las convenciones de TU proyecto, no genéricas.
✅ Estás empezando un proyecto nuevo (o haciendo onboarding a un equipo) y quieres setup rápido.
✅ Estás cansado de mantener manualmente `.claude/rules/` mientras tu codebase evoluciona.
✅ Trabajas en uno de los [12 stacks soportados](stacks.md).
✅ Quieres salida determinística, repetible (mismo código → mismas reglas cada vez).
✅ Necesitas salida en un idioma no-inglés (10 idiomas built-in).

## Cuándo ClaudeOS-Core NO es el encaje correcto

❌ Quieres un bundle preset curado de agentes/skills/reglas que funciona el primer día sin paso de escaneo.
❌ Tu stack no está soportado y no estás interesado en contribuir uno.
❌ Quieres orquestación de agentes, flujos de planning, o metodología de coding — usa una herramienta especializada en eso.
❌ Solo necesitas un único `CLAUDE.md`, no el set completo standards/rules/skills — `claude /init` es suficiente.

---

## Qué es más estrecho vs. más amplio en scope

ClaudeOS-Core es **más estrecho** que bundles de cobertura amplia (no envía agentes preset, hooks, o metodología — solo las reglas de tu proyecto). Es **más amplio** que herramientas que se enfocan en un único artefacto (genera CLAUDE.md más un árbol multi-directorio de standards, skills, guides y memory). Elige basándote en qué eje importa para tu proyecto.

---

## "¿Por qué no usar Claude /init?"

Pregunta justa. `claude /init` está built-in en Claude Code y escribe un único `CLAUDE.md` en una llamada LLM. Es rápido y zero-config.

**Funciona bien cuando:**

- Tu proyecto es pequeño (≤30 archivos).
- Estás de acuerdo con que Claude adivine tu stack desde un vistazo rápido al árbol de archivos.
- Solo necesitas un `CLAUDE.md`, no un set `.claude/rules/` completo.

**Le cuesta cuando:**

- Tu proyecto tiene una convención personalizada que Claude no reconoce desde un vistazo rápido (p. ej., MyBatis en lugar de JPA, wrapper de respuesta personalizado, layout de package inusual).
- Quieres salida que sea reproducible entre miembros del equipo.
- Tu proyecto es lo bastante grande para que una llamada Claude golpee la ventana de contexto antes de terminar el análisis.

ClaudeOS-Core está construido para los casos donde a `/init` le cuesta. Si `/init` te funciona, probablemente no necesitas ClaudeOS-Core.

---

## "¿Por qué no escribir las reglas a mano?"

También justo. Escribir a mano `.claude/rules/` es la opción más exacta — tú conoces tu proyecto mejor.

**Funciona bien cuando:**

- Tienes un proyecto, eres el único developer, estás de acuerdo con gastar tiempo significativo escribiendo reglas desde cero.
- Tus convenciones son estables y bien documentadas.

**Le cuesta cuando:**

- Empiezas proyectos nuevos a menudo (cada uno necesita el tiempo de escritura de reglas).
- Tu equipo crece y la gente olvida lo que está en las reglas.
- Tus convenciones evolucionan, y las reglas se quedan atrás.

ClaudeOS-Core te lleva la mayor parte del camino a un set de reglas usable en una sola ejecución. El resto es ajuste a mano — y muchos usuarios encuentran que ese es un mejor uso de su tiempo que partir de un archivo en blanco.

---

## "¿Cuál es la diferencia con simplemente usar un bundle preset?"

Bundles como Everything Claude Code te dan un set curado de reglas / skills / agentes que funcionan para "la mayoría de los proyectos". Son geniales para adopción rápida cuando tu proyecto encaja en los supuestos del bundle.

**Los bundles funcionan bien cuando:**

- Las convenciones de tu proyecto coinciden con los defaults del bundle (p. ej., Spring Boot estándar o Next.js estándar).
- No tienes elecciones inusuales de stack (p. ej., MyBatis en lugar de JPA).
- Quieres un punto de partida y estás contento con personalizar desde ahí.

**A los bundles les cuesta cuando:**

- Tu stack usa tooling no-default (las reglas "Spring Boot" del bundle asumen JPA).
- Tienes una convención específica del proyecto fuerte que el bundle no conoce.
- Quieres que las reglas se actualicen mientras tu código evoluciona.

ClaudeOS-Core puede complementar bundles: usa ClaudeOS-Core para reglas específicas del proyecto; superpón un bundle para reglas generales de workflow.

---

## Eligiendo entre herramientas similares

Si estás eligiendo entre ClaudeOS-Core y otra herramienta de Claude Code consciente del proyecto, pregúntate:

1. **¿Quiero que la herramienta lea mi código, o quiero describir mi proyecto?**
   Lectura de código → ClaudeOS-Core. Descripción → la mayoría de las otras.

2. **¿Necesito la misma salida cada vez?**
   Sí → ClaudeOS-Core (determinístico). No → cualquiera de ellas.

3. **¿Quiero el set completo standards/rules/skills/guides, o solo un CLAUDE.md?**
   Set completo → ClaudeOS-Core. Solo CLAUDE.md → Claude `/init`.

4. **¿Mi idioma de salida es inglés, u otro idioma?**
   Solo inglés → muchas herramientas encajan. Otros idiomas → ClaudeOS-Core (10 idiomas built-in).

5. **¿Necesito orquestación de agentes, flujos de planning, o hooks?**
   Sí → usa la herramienta dedicada apropiada. ClaudeOS-Core no hace esos.

Si has usado ClaudeOS-Core y otra herramienta lado a lado, [abre un issue](https://github.com/claudeos-core/claudeos-core/issues) con tu experiencia — ayuda a hacer esta comparación más exacta.

---

## Ver también

- [architecture.md](architecture.md) — qué hace a ClaudeOS-Core determinístico
- [stacks.md](stacks.md) — los 12 stacks que ClaudeOS-Core soporta
- [verification.md](verification.md) — la red de seguridad post-generación que otras herramientas no tienen
