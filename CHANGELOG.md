# Changelog

Todos los cambios relevantes del proyecto de refactor **LOC URU SuiteTax** se documentan acá.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Convención del proyecto: las versiones refactorizadas de cada script se identifican con el sufijo **`_REF`** y el original **nunca** se sobreescribe.

Leyenda de grupos de hallazgos: **A** correctitud · **B** governance/performance · **C** estándares 2.1 · **D** mantenibilidad.

---

## [Sin publicar]

### Añadido
- Estructura de documentación del proyecto: `docs/` (plan maestro, metodología, pilotos) y este `CHANGELOG.md`.
- **Piloto** `L598 - Generación TXT Localizaciones (Sched)_REF.js` — refactor de gobierno/performance, estándares 2.1 y mantenibilidad (grupos B+C+D). Ver [informe](docs/pilotos/generacion-txt-dgi.md).

### Cambiado (refactor — comportamiento preservado)
- **Generación TXT Localizaciones (Sched):**
  - Agrupación de transacciones **O(n²) → O(n)** con `Map` preservando orden de salida *(B)*.
  - Eliminado `log.debug` masivo y `JSON.stringify` dentro de loops *(B)*.
  - `@NApiVersion 2.x → 2.1`; `var → const/let`; `new Object()/new Array() → {}/[]`; arrow functions *(C)*.
  - `padding_left/right` duplicados eliminados; se usa `utilities.padding_left` *(D)*.
  - `generarTXT` (196 líneas) dividida en `agruparTransacciones`, `construirContenidoTXT`, `consultarConfiguracion`, `filtrosSubsidiariaPeriodo` *(D)*.
  - Fuga a scope global corregida (`urlRT`, `body`) y rama muerta de `formatearNumero` eliminada *(D)*.
  - Resultado: **844 → ~560 líneas (−34%)**. Contenido del TXT verificado byte-idéntico por revisión manual; validación empírica pendiente.

### Pendiente de aprobación (bugs preexistentes — NO aplicados)
> No se corrigen dentro del refactor. Requieren cambio separado y aprobación explícita de Tekiio.
- **A1** — `searchRubroPublicidad` trunca a 1000 resultados (no pagina): riesgo de declaración DGI incompleta. 🔴 Alto.
- **A2** — `resultado`/`idLogGeneral` indefinidos si `archivoGenerar != "2181"`: falla en `enviarMail`. 🔴 Alto.
- **A3** — `configCarpeta`/`configNombreArchivo` solo se resuelven con exactamente 1 config. 🟡 Medio.

### Notas
- La consolidación de la doble lectura de `customsearch_l598_beta_2181` (candidato B1) queda diferida: requiere SuiteQL por ser dos niveles de agregación distintos.
