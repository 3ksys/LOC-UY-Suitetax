# Metodología de Refactor — el proceso por script

Este documento define **cómo** se refactoriza cada uno de los 73 scripts. Es el molde que se replica. Nació del piloto [Generación TXT DGI](pilotos/generacion-txt-dgi.md).

---

## 1. Principios innegociables

1. **REFACTOR ≠ BUGFIX.** Un refactor NO cambia el comportamiento observable. Si aparece un bug, se documenta y se corrige **aparte**, con aprobación. Mezclarlos destruye la trazabilidad: si algo falla, no sabés qué lo rompió.
2. **Comportamiento intacto, y se PRUEBA.** No alcanza con "lo revisé". Se valida con caracterización byte-a-byte.
3. **Verificar antes de afirmar.** Leer la implementación real (incluidos los wrappers) antes de declarar un hallazgo o dar algo por hecho.
4. **El original nunca se toca.** Se crea una versión `_REF`.

## 2. Clasificación de hallazgos

| Grupo | Qué agrupa | ¿Entra al refactor? |
|---|---|---|
| **A — Correctitud** | Bugs que cambian comportamiento (truncamientos, undefined, cálculos) | ❌ No. Recomendación separada + aprobación. |
| **B — Governance / Performance** | GU, búsquedas redundantes, loops O(n²), queries no optimizadas | ✅ Sí (corazón del pedido). |
| **C — Estándares 2.1** | `@NApiVersion`, `const/let`, literales, APIs deprecadas | ✅ Sí. |
| **D — Mantenibilidad** | Duplicación, funciones largas, dead code, naming, global leaks | ✅ Sí. |

## 3. Clasificación de riesgo (por cambio)

| Riesgo | Qué incluye | Aprobación |
|---|---|---|
| 🟢 **Bajo** | Estilo, formato, dedup, quitar logs, naming | No |
| 🟡 **Medio** | Reestructuración de lógica sin cambiar salida (O(n²)→O(n), dividir funciones) | Revisión conjunta |
| 🔴 **Alto** | Cambios que afectan comportamiento / procesos completos | **Explícita de Tekiio** |

## 4. Flujo por script

```
1. ANÁLISIS      → leer script + dependencias → reporte de hallazgos (grupos A/B/C/D + riesgo)
2. ACUERDO       → definir alcance del refactor (qué grupos, qué queda como recomendación)
3. REFACTOR      → crear <script>_REF.js (original intacto) → aplicar B/C/D
4. VERIF. LOCAL  → node --check (sintaxis) + revisión manual de identidad de comportamiento
5. DEPLOY AISLADO→ subir _REF a la cuenta con Status=Testing + Audience del rol de pruebas
6. CARACTERIZAR  → ejecutar original vs _REF (mismo caso) → comparar output byte-a-byte
7. MEDIR         → registrar GU y tiempo de ambas versiones
8. VALIDAR       → revisión funcional conjunta Mobeats/Tekiio
9. DOCUMENTAR    → informe del script + entrada en CHANGELOG
```

## 5. Convención de nomenclatura

- Archivo: `<nombre original>_REF.js` (el original **no** se modifica).
- En logs, la constante de proceso lleva sufijo `[REF]` para distinguir qué versión corrió.
- Módulos compartidos que se refactoricen se versionan igual (`utilities_REF`) para no contaminar a los scripts que aún usan el original.
- ⚠️ No confundir con el sufijo `V2` preexistente: en este proyecto `V2` es otra cosa (segunda versión histórica).

## 6. Aislamiento en la cuenta

El **rol** aísla lo que se invoca explícitamente (Suitelets, Scheduled). Pero un **UserEvent se dispara por evento del registro**, no por rol → correría junto al original.

**Mecanismo correcto:** el Script Deployment del `_REF` se crea con:
- **Status = `Testing`** → solo se ejecuta para usuarios con permiso, no en el flujo normal.
- **Audience** = rol/empleado de pruebas (`URU-Contador Mobeats`).

## 7. Caracterización byte-a-byte

La red de seguridad ante la ausencia de tests. Aplica sobre todo a scripts que producen un **output tangible** (TXT DGI, archivos de pago, XML de FE, registros creados).

```bash
# Ejecutar original y refactor con el MISMO caso, descargar ambos outputs y comparar:
cmp original.txt refactor.txt && echo "IDÉNTICOS" || echo "DIFERENCIAS"
# Comparación hexadecimal detallada si hay diferencias:
diff <(xxd original.txt) <(xxd refactor.txt)
```

- **Resultado esperado:** `IDÉNTICOS`. Cualquier diferencia se investiga **antes** de avanzar.
- Aislar variables: usar un caso donde los bugs del Grupo A **no** se disparen, para no confundir un bug preexistente con un efecto del refactor.

## 8. Entregables por script (el molde)

Cada script refactorizado produce un informe (ver [ejemplo](pilotos/generacion-txt-dgi.md)) con:

1. **Resumen** (métricas antes/después).
2. **Reporte de hallazgos** priorizado (grupos + riesgo).
3. **Cambios aplicados**: justificación por cambio, mapeada al criterio del cliente.
4. **Garantía de comportamiento**: cómo se preservó la identidad.
5. **Procedimiento de caracterización y medición**.
6. **Tabla comparativa** de métricas (GU, tiempo, LOC, byte-identidad).
7. **Recomendaciones fuera de alcance** (Grupo A) con su riesgo.
