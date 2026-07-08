# Informe de Refactor — Piloto

**Script:** `L598 - Generación TXT Localizaciones (Sched)`
**Versión refactorizada:** `L598 - Generación TXT Localizaciones (Sched)_REF.js`
**Equipo:** Mobeats · **Cliente:** Tekiio · **Localización:** Uruguay (SuiteTax)
**Alcance aprobado:** B (Governance/Performance) + C (Estándares 2.1) + D (Mantenibilidad). Comportamiento del TXT **preservado**.

---

## 1. Resumen

| Métrica | Original | Refactor | Δ |
|---|---|---|---|
| Líneas de código | 844 | ~560 | **−34%** |
| `@NApiVersion` | 2.x | **2.1** | ✔ |
| Funciones >40 líneas | 3 (`execute`, `generarTXT`, `formatearNumero`) | 0 | ✔ |
| `padding_*` duplicados | sí (local + utilities) | no (usa utilities) | ✔ |
| Complejidad agrupación | **O(n²)** | **O(n)** | ✔ |
| `log.debug` (ruido) | ~25 | 4 (clave) | ✔ |
| Global leaks (`var` faltante) | 2 (`urlRT`, `body`) | 0 | ✔ |

> Métricas de GU consumidas y tiempo de ejecución: **pendientes de medición empírica en la cuenta** (ver §5).

---

## 2. Cambios aplicados (justificación por cambio)

| # | Cambio | Por qué | Criterio cliente |
|---|---|---|---|
| B3 | Agrupación por `(RUT + línea)` con `Map` en vez de doble loop | El original recorría los arrays acumulados por cada registro → O(n²). `Map` resuelve en O(n) y **preserva el orden de inserción** (= orden original) | #3 Performance |
| B2 | Helper `filtrosSubsidiariaPeriodo` + uso directo de `searchSavedPro` sin consumir su `.array` | `searchSavedPro` arma internamente un arreglo (`armarArreglosSS`) que este script descartaba | #2 Governance |
| B4 | Eliminado `log.debug` masivo y `JSON.stringify` dentro de loops | CPU + riesgo de saturar el límite de logging de NetSuite | #3 Performance |
| C1 | `@NApiVersion 2.x` → **2.1** | Estándar solicitado | #4 Patrones |
| C2 | `var`→`const`/`let`, `new Object()/new Array()`→`{}`/`[]`, arrow functions | ES6 de SuiteScript 2.1 | #4 Patrones |
| D1 | `padding_left/right` locales eliminados; se usa `utilities.padding_left` | Eliminar duplicación | #6 Reutilización |
| D2 | `generarTXT` (196 líneas) dividida en `agruparTransacciones`, `construirContenidoTXT`, `consultarConfiguracion`, `filtrosSubsidiariaPeriodo` | Una responsabilidad por función | #5 Legibilidad |
| D3 | `urlRT` y `body` declarados con `const` (eran globales por `var` faltante) | Evitar fuga al scope global | #5 Legibilidad |
| D4 | `formatearNumero`: eliminada la rama decimal (código muerto: siempre `toFixed(0)`) | Simplicidad sin cambiar resultado | #5 Legibilidad |
| D5 | Hardcodes a constantes nombradas (`RUBRO_PUBLICIDAD`, `TZ_MONTEVIDEO`, etc.); eliminado `log.debug('entroooo')` y línea comentada | Legibilidad | #5 Legibilidad |

---

## 3. Garantía de comportamiento (revisión manual de byte-identidad)

Se verificó por inspección que el contenido del TXT es idéntico:

- **Orden de líneas:** `Map` preserva orden de primera aparición → igual que el `concat(ctaAjena, normales)` original.
- **Construcción de línea:** `campos.join(';')` + `formatearNumero(...)` + `\r\n` por línea (incluida la última) → idéntico al `+=` original.
- **`formatearNumero`:** verificada equivalencia caso por caso (positivo, negativo, cero, NaN, vacío). El padding y el signo se mantienen (`-` + 11 dígitos / 12 dígitos).
- **Reglas de negocio intactas:** condición cuenta-ajena/beneficios, filtro rubro 514 vs publicidad, redondeo `!= 0`, mismos índices de columnas (`columns[1..16]`), mismos IDs de saved searches, parámetros y campos.

✔ **Sintaxis validada** con `node --check`.
⏳ **Pendiente:** validación empírica byte-a-byte en la cuenta (§5).

---

## 4. Recomendaciones fuera de alcance (Grupo A — requieren aprobación de Tekiio)

> Estos son **bugs preexistentes**. NO se tocaron en el refactor (cambiarían comportamiento). Se reportan para corrección **separada** y aprobada.

| # | Bug | Ubicación (original) | Impacto | Riesgo fix |
|---|---|---|---|---|
| A1 | `searchRubroPublicidad` lee solo los primeros **1000** resultados (no pagina) | línea 194 | Declaración DGI incompleta si el período supera 1000 trans. de publicidad | 🔴 Alto |
| A2 | `resultado`/`idLogGeneral` indefinidos si `archivoGenerar != "2181"` → falla en `enviarMail` | líneas 113-131 | Falla silenciosa | 🔴 Alto |
| A3 | `configCarpeta`/`configNombreArchivo` solo se resuelven con exactamente 1 config | líneas 87-94 | TXT no generado sin diagnóstico claro | 🟡 Medio |

### Candidato no aplicado (riesgo/esfuerzo)
- **B1 — Consolidar la doble lectura de `customsearch_l598_beta_2181`:** no es la misma query (una es a nivel **detalle**, otra **SUM/GROUP**). Su unificación segura requiere **SuiteQL** (`N/query`). Estimado como mejora futura de governance.

---

## 5. Procedimiento de caracterización y medición (a ejecutar en la cuenta dev)

**Objetivo:** demostrar que el refactor produce el MISMO TXT y medir la mejora.

1. **Deploy aislado del refactor**
   - Subir `..._REF.js` como Script nuevo en NetSuite.
   - Crear el deployment con **Status = `Testing`** y **Audience** = rol/empleado de pruebas (`URU-Contador Mobeats`). Esto evita que corra junto al original.
   - Replicar los mismos parámetros (`custscript_l598_gen_txt_loc_*`).

2. **Baseline (original)**
   - Ejecutar el script **original** con un período real representativo (idealmente uno con **>1000** transacciones para exponer A1).
   - Descargar el TXT → `original.txt`. Registrar **GU** (Script Execution Log → "Units Used") y **tiempo** (inicio/fin del log).

3. **Refactor**
   - Ejecutar el `_REF` con los **mismos** parámetros (mismo período/subsidiaria).
   - Descargar el TXT → `refactor.txt`. Registrar GU y tiempo.

4. **Comparación byte a byte**
   ```bash
   # En Windows (Git Bash):
   diff <(xxd original.txt) <(xxd refactor.txt) && echo "IDÉNTICOS" || echo "DIFERENCIAS"
   # o simplemente:
   cmp original.txt refactor.txt && echo "IDÉNTICOS"
   ```
   - **Resultado esperado:** `IDÉNTICOS`. Si difieren → investigar antes de avanzar.
   - ⚠️ Nota: si el período tiene >1000 trans. de publicidad, los TXT podrían diferir por el bug **A1** (no por el refactor). Validar primero con un período <1000 para aislar el refactor.

5. **Completar la tabla comparativa**

   | Métrica | Original | Refactor | Δ % | Evidencia |
   |---|---|---|---|---|
   | Governance Units | _____ | _____ | _____ | Execution Log |
   | Tiempo de ejecución | _____ | _____ | _____ | Timestamps log |
   | Líneas de código | 844 | ~560 | −34% | repo |
   | TXT byte-idéntico | — | — | — | `cmp` |

---

## 6. Estado del piloto

- [x] Análisis y reporte de hallazgos
- [x] Refactor B+C+D (código) + validación de sintaxis
- [x] Revisión manual de byte-identidad
- [x] Documentación / justificación / recomendaciones
- [x] Acceso a la cuenta dev — **OK (2026-07-07)**
- [ ] Deploy aislado del `_REF` (Status=Testing) — *desbloqueado, listo para ejecutar*
- [ ] Caracterización byte-a-byte (`cmp`) — *desbloqueado (no requiere baseline)*
- [ ] Medición GU/tiempo propia — *desbloqueada*
- [ ] Baseline de Tekiio (tiempos/métricas de sus pruebas) — **PENDIENTE** (para casos representativos y comparación de referencia)
- [ ] Validación funcional conjunta Mobeats/Tekiio
