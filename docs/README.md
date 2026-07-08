# Documentación — Refactor LOC URU SuiteTax

Localización fiscal Uruguay para NetSuite (SuiteTax). Proyecto de refactor de SuiteScripts encarado por **Mobeats** para **Tekiio**.

## Índice

### Planificación y proceso
- [Plan de refactor](plan-refactor.md) — objetivo, alcance, fases, priorización, estado y descubrimientos.
- [Metodología de refactor](metodologia-refactor.md) — el proceso estándar por script (el "molde" que se replica en los 73 scripts).

### Pilotos
- [Generación TXT DGI (Sched)](pilotos/generacion-txt-dgi.md) — piloto end-to-end. Informe completo del primer refactor.

### Requerimientos del cliente
- [Criterios_Refactor_LOC_URU.md](requerimientos-cliente/Criterios_Refactor_LOC_URU.md) — criterios de análisis, refactor y medición.
- [Lineamientos_Refactor_Tekiio.md](requerimientos-cliente/Lineamientos_Refactor_Tekiio.md) — restricciones de entorno, roles y metodología de trabajo.

### Análisis previo
- [ANALISIS-LEGACY-SUITETAX.md](analisis/ANALISIS-LEGACY-SUITETAX.md) — mapa de coexistencia SuiteTax / Legacy en el tema impuestos.
- [PROJECT-OVERVIEW.md](analisis/PROJECT-OVERVIEW.md) — visión completa: 73 scripts, módulos, flujos, tabla maestra.

### Registro de cambios
- `../CHANGELOG.md` — cambios aplicados en esta versión del refactor.

---

## Cómo se organiza esto

| Carpeta / archivo | Para qué |
|---|---|
| `docs/plan-refactor.md` | El **qué** y el **cuándo**: fases, prioridades, estado. |
| `docs/metodologia-refactor.md` | El **cómo**: proceso, disciplinas y entregables por script. |
| `docs/requerimientos-cliente/` | Documentos que definen qué pide Tekiio (Criterios, Lineamientos). |
| `docs/analisis/` | Análisis propios del código (legacy, hallazgos transversales). |
| `docs/pilotos/` | Un informe por script piloto/refactorizado. |
| `CHANGELOG.md` | Bitácora cronológica de cambios aplicados. |
