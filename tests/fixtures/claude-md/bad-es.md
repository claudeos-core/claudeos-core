# CLAUDE.md — sample-project

> Muestra válida de CLAUDE.md en español para pruebas del validator.

## 1. Role Definition (Definición de Rol)

Como desarrollador senior de este repositorio, eres responsable de escribir, modificar y revisar el código. Las respuestas deben estar en español.
Servidor REST API Node.js Express sobre un almacén relacional PostgreSQL.

## 2. Project Overview (Resumen del Proyecto)

| Ítem | Valor |
|---|---|
| Lenguaje | TypeScript 5.4 |
| Framework | Express 4.19 |
| Herramienta de construcción | tsc |
| Gestor de paquetes | npm |
| Puerto del servidor | 3000 |
| Base de datos | PostgreSQL 15 |
| ORM | Prisma 5 |
| Ejecutor de pruebas | Vitest |

## 3. Build & Run Commands (Comandos de Construcción y Ejecución)

```bash
npm install
npm run dev
npm run build
npm test
```

Trata los scripts de `package.json` como la única fuente de verdad.

## 4. Core Architecture (Arquitectura Central)

### Estructura General

```
Client → Express Router → Service → Prisma → PostgreSQL
```

### Flujo de Datos

1. La solicitud llega al router.
2. El middleware valida la autenticación.
3. El servicio ejecuta la lógica de negocio.
4. Prisma lee/escribe la BD.
5. La respuesta se serializa.

### Patrones Centrales

- **En capas**: router → service → repository.
- **Validación DTO**: esquemas zod en el límite del router.
- **Middleware de errores**: manejo centralizado de errores.

## 5. Directory Structure (Estructura de Directorios)

```
sample-project/
├─ src/
└─ tests/
```

**Auto-generado**: ninguno.
**Alcance de pruebas**: `tests/` refleja `src/`.
**Salida de construcción**: `dist/`.

## 6. Standard / Rules / Skills Reference (Referencia Standard / Rules / Skills)

### Standard (Única Fuente de Verdad)

| Ruta | Descripción |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | Resumen del proyecto |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | Guía de escritura de documentos |

### Rules (Guardarraíles auto-cargados)

| Ruta | Descripción |
|---|---|
| `.claude/rules/00.core/*` | Reglas centrales |
| `.claude/rules/60.memory/*` | Guardarraíles de memoria L4 |

### Skills (Procedimientos Automatizados)

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read (NO Leer)

| Ruta | Razón |
|---|---|
| `claudeos-core/guide/` | Documentación para humanos |
| `dist/` | Salida de construcción |
| `node_modules/` | Dependencias |

## 8. Common Rules & Memory (L4) (Reglas Comunes y Memoria (L4))

### Reglas Comunes (auto-cargadas en cada edición)

| Archivo de Regla | Rol | Aplicación Central |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | Reglas de escritura de documentos | paths requeridos, sin hardcoding |
| `.claude/rules/00.core/52.ai-work-rules.md` | Reglas de trabajo IA | basadas en hechos, Read antes de editar |

Para guía detallada, lee `claudeos-core/standard/00.core/04.doc-writing-guide.md`.

### Memoria L4 (referencia bajo demanda)

El contexto a largo plazo (decisiones · fallos · compactación · auto-propuestas) se almacena en `claudeos-core/memory/`.
A diferencia de las reglas que se auto-cargan vía glob `paths`, esta capa se consulta **bajo demanda**.

#### Archivos de Memoria L4

| Archivo | Propósito | Comportamiento |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | Por qué de las decisiones de diseño | Solo-anexar. Repasar al inicio de sesión. |
| `claudeos-core/memory/failure-patterns.md` | Errores repetidos | Buscar al inicio de sesión. |
| `claudeos-core/memory/compaction.md` | Política de compactación de 4 etapas | Modificar solo cuando cambia la política. |
| `claudeos-core/memory/auto-rule-update.md` | Propuestas de cambio de reglas | Revisar y aceptar. |

#### Flujo de Trabajo de Memoria

1. Escanear failure-patterns al inicio de sesión.
2. Repasar decisiones recientes.
3. Registrar nuevas decisiones como anexo.
4. Registrar errores repetidos con pattern-id.
5. Ejecutar compact cuando los archivos se acerquen a 400 líneas.
6. Revisar propuestas de rule-update.

## 9. Memoria (L4)

> Guardarraíles comunes auto-cargados y archivos de memoria a largo plazo bajo demanda.

### Reglas Comunes (auto-cargadas en cada edición)

| Archivo de Regla | Rol |
|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | Reglas de escritura |
| `.claude/rules/00.core/52.ai-work-rules.md` | Reglas IA |

### Archivos de Memoria L4

| Archivo | Propósito | Comportamiento |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | Razón de decisiones | Solo-anexar. |
| `claudeos-core/memory/failure-patterns.md` | Errores repetidos | Buscar. |
| `claudeos-core/memory/compaction.md` | Política 4 etapas | Solo cambio. |
| `claudeos-core/memory/auto-rule-update.md` | Propuestas | Revisar. |
