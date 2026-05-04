# Comparación con herramientas similares

Esta página compara ClaudeOS-Core con otras herramientas de Claude Code que trabajan en el mismo espacio (configuración de Claude Code consciente del proyecto).

**Es una comparación de scope, no un juicio de calidad.** La mayoría de las herramientas de abajo son excelentes en lo suyo. La idea es ayudarte a entender si ClaudeOS-Core encaja en tu problema, o si alguna otra te sirve mejor.

> Original en inglés: [docs/comparison.md](../comparison.md). La traducción al español se mantiene sincronizada con el inglés.

---

## TL;DR

Si quieres **generar automáticamente `.claude/rules/` a partir de lo que hay en tu código**, esa es la especialidad de ClaudeOS-Core.

Si buscas otra cosa (bundles preset amplios, flujos de planificación, orquestación de agentes, sync de config multi-herramienta), otras herramientas del ecosistema Claude Code probablemente encajen mejor.

---

## Cómo difiere ClaudeOS-Core de otras herramientas

Rasgos definitorios de ClaudeOS-Core:

- **Lee tu código fuente real** (scanner Node.js determinístico, sin LLM adivinando el stack).
- **Pipeline Claude de 4 pasadas** con prompts inyectados con hechos: paths y convenciones se extraen una vez y se reutilizan.
- **5 validators post-generación**: `claude-md-validator` para estructura, `content-validator` para path-claim y contenido, `pass-json-validator` para JSON intermedio, `plan-validator` para archivos de plan legacy, `sync-checker` para consistencia disco ↔ sync-map.
- **10 idiomas de salida** con validación language-invariant.
- **Salida por proyecto**: CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer. Todo deriva de tu código, no de un bundle preset.

Otras herramientas Claude Code en este espacio (puedes combinarlas o elegir una distinta según tu necesidad):

- **Claude `/init`**: built-in en Claude Code; escribe un único `CLAUDE.md` en una llamada LLM. Ideal para setup rápido de un solo archivo en proyectos pequeños.
- **Herramientas preset/bundle**: distribuyen agentes, skills o reglas curadas que funcionan para "la mayoría de los proyectos". Mejores cuando tus convenciones coinciden con los defaults del bundle.
- **Herramientas de planning/workflow**: aportan metodologías estructuradas para el desarrollo de features (specs, fases, etc.). Mejores si quieres una capa de proceso encima de Claude Code.
- **Herramientas de hook/DX**: añaden auto-save, hooks de calidad de código o mejoras de developer experience a las sesiones de Claude Code.
- **Conversores de reglas cross-agent**: mantienen tus reglas sincronizadas entre Claude Code, Cursor, etc.

Estas herramientas son sobre todo **complementarias, no competitivas**. ClaudeOS-Core se encarga de "generar reglas por proyecto desde tu código"; las otras se ocupan de tareas distintas. La mayoría se pueden usar juntas.

---

## Cuándo ClaudeOS-Core es el encaje correcto

✅ Quieres que Claude Code siga las convenciones de TU proyecto, no las genéricas.
✅ Empiezas un proyecto nuevo (o haces onboarding a un equipo) y quieres setup rápido.
✅ Estás harto de mantener `.claude/rules/` a mano mientras el codebase evoluciona.
✅ Trabajas en uno de los [12 stacks soportados](stacks.md).
✅ Quieres salida determinística y repetible: mismo código, mismas reglas cada vez.
✅ Necesitas salida en un idioma no inglés (10 idiomas built-in).

## Cuándo ClaudeOS-Core NO es el encaje correcto

❌ Quieres un bundle preset curado de agentes/skills/reglas que funcione el primer día sin paso de escaneo.
❌ Tu stack no está soportado y no te interesa contribuir uno.
❌ Quieres orquestación de agentes, flujos de planning o metodología de coding. Para eso, usa una herramienta especializada.
❌ Solo necesitas un único `CLAUDE.md`, no el set completo standards/rules/skills. Con `claude /init` te basta.

---

## Qué es más estrecho vs. más amplio en scope

ClaudeOS-Core es **más estrecho** que los bundles de cobertura amplia: no envía agentes preset, hooks ni metodología, solo las reglas de tu proyecto. Y es **más amplio** que las herramientas centradas en un único artefacto: genera CLAUDE.md más un árbol multi-directorio de standards, skills, guides y memory. Elige según qué eje importe en tu proyecto.

---

## "¿Por qué no usar Claude /init?"

Pregunta justa. `claude /init` viene built-in con Claude Code y escribe un único `CLAUDE.md` en una llamada LLM. Es rápido y zero-config.

**Funciona bien cuando:**

- Tu proyecto es pequeño (≤30 archivos).
- Te vale con que Claude adivine el stack mirando el árbol de archivos por encima.
- Solo necesitas un `CLAUDE.md`, no un set `.claude/rules/` completo.

**Le cuesta cuando:**

- Tu proyecto usa una convención personalizada que Claude no detecta de un vistazo (por ejemplo, MyBatis en lugar de JPA, wrapper de respuesta propio, layout de package inusual).
- Quieres salida reproducible entre miembros del equipo.
- El proyecto es lo bastante grande como para que una llamada a Claude agote la ventana de contexto antes de terminar el análisis.

ClaudeOS-Core está pensado para esos casos donde `/init` se queda corto. Si `/init` ya te sirve, probablemente no necesitas ClaudeOS-Core.

---

## "¿Por qué no escribir las reglas a mano?"

También vale. Escribir a mano `.claude/rules/` es la opción más exacta: nadie conoce tu proyecto mejor que tú.

**Funciona bien cuando:**

- Tienes un único proyecto, eres el único developer y te vale gastar tiempo escribiendo reglas desde cero.
- Las convenciones son estables y están bien documentadas.

**Le cuesta cuando:**

- Arrancas proyectos nuevos a menudo (cada uno exige tiempo de escritura).
- El equipo crece y la gente olvida qué hay en las reglas.
- Las convenciones evolucionan y las reglas se quedan atrás.

Con ClaudeOS-Core llegas casi al final del camino con un set de reglas usable en una sola ejecución. El resto es ajuste a mano. Muchos usuarios sienten que ese tiempo rinde mejor así que partiendo de un archivo en blanco.

---

## "¿Cuál es la diferencia con simplemente usar un bundle preset?"

Bundles como Everything Claude Code te dan un set curado de reglas, skills y agentes que funcionan para "la mayoría de los proyectos". Son geniales para adopción rápida cuando el proyecto encaja en los supuestos del bundle.

**Los bundles funcionan bien cuando:**

- Las convenciones de tu proyecto coinciden con los defaults del bundle (por ejemplo, Spring Boot estándar o Next.js estándar).
- No tienes decisiones de stack raras (por ejemplo, MyBatis en lugar de JPA).
- Quieres un punto de partida y te vale ir personalizando desde ahí.

**A los bundles les cuesta cuando:**

- El stack usa tooling no-default (las reglas "Spring Boot" del bundle asumen JPA).
- Tienes una convención específica del proyecto fuerte que el bundle desconoce.
- Quieres que las reglas se actualicen a medida que el código evoluciona.

ClaudeOS-Core complementa bundles: úsalo para reglas específicas del proyecto y superpón un bundle para las reglas generales de workflow.

---

## Eligiendo entre herramientas similares

Si estás eligiendo entre ClaudeOS-Core y otra herramienta consciente del proyecto, pregúntate:

1. **¿Quiero que lea mi código, o prefiero describir el proyecto?**
   Lectura de código → ClaudeOS-Core. Descripción → la mayoría de las otras.

2. **¿Necesito la misma salida cada vez?**
   Sí → ClaudeOS-Core (determinístico). No → cualquiera vale.

3. **¿Quiero el set completo standards/rules/skills/guides, o solo un CLAUDE.md?**
   Set completo → ClaudeOS-Core. Solo CLAUDE.md → Claude `/init`.

4. **¿La salida es en inglés u otro idioma?**
   Solo inglés → muchas herramientas encajan. Otros idiomas → ClaudeOS-Core (10 idiomas built-in).

5. **¿Necesito orquestación de agentes, flujos de planning o hooks?**
   Sí → usa la herramienta especializada. ClaudeOS-Core no hace nada de eso.

Si has usado ClaudeOS-Core y otra herramienta en paralelo, [abre un issue](https://github.com/claudeos-core/claudeos-core/issues) con tu experiencia. Ayuda a afinar esta comparación.

---

## Ver también

- [architecture.md](architecture.md): qué hace determinístico a ClaudeOS-Core
- [stacks.md](stacks.md): los 12 stacks que soporta ClaudeOS-Core
- [verification.md](verification.md): la red de seguridad post-generación que otras herramientas no tienen
