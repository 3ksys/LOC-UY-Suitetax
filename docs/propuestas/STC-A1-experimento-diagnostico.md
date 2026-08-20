# STC-A1 — Diseño del experimento de diagnóstico

Ejecución concreta del [plan de validación (§4) de la propuesta STC-A1](STC-A1-entrypoint-seteo-tax-codes.md#4-plan-de-validación-obligatorio-antes-de-aplicar). Responde la pregunta que decide la viabilidad del cambio:

> **¿`taxdetails` está calculada y VIGENTE en `beforeSubmit`, en todos los contextos?**

**Estado:** 🔧 Instrumento desplegado (2026-08-07): script record `customscript_l598_diag_stc_a1` + 5 deployments creados y verificados · ⏳ Ejecución formal pendiente de OK de Tekiio (pedidos 1-2 de la [propuesta §7](STC-A1-entrypoint-seteo-tax-codes.md#7-qué-se-necesita-de-tekiio))
**Script:** [`LOC UY/L598 - Diag STC-A1 (UE).js`](../../LOC%20UY/L598%20-%20Diag%20STC-A1%20%28UE%29.js) · sintaxis `node --check` ✔

---

## 1. Diseño: ambos entry points en el mismo script

El script de diagnóstico registra `taxdetails` **dos veces por guardado**:

| Entry point | Qué fotografía | Rol en el experimento |
|---|---|---|
| `beforeSubmit` | `context.newRecord` (sin load) | **El candidato** — lo que vería el script si se muda |
| `afterSubmit` | `record.load()` post-guardado | **La verdad de referencia** — exactamente lo que hoy ve el original |

La comparación que pide la propuesta ("comparar contra lo que hoy ve afterSubmit") sale **apareada por guardado**, sobre la misma transacción y el mismo evento — sin corridas separadas ni alineación manual. Cada snapshot es un JSON en `log.audit` con: `fuente`, `eventType`, `executionContext`, `recordType/Id`, conteos de `taxdetails`/`item`/`expense` y el detalle por línea (`ref`, `taxcode`, `taxrate`, tope 50 líneas).

**Garantías de no-intrusión:** sin `setValue`, sin `save` (→ no re-dispara UserEvents), todo en try/catch (un diagnóstico jamás rompe un guardado). Costo declarado: ~10 GU por guardado (el load de afterSubmit) durante la ventana del experimento.

### El criterio es identidad, no presencia

No alcanza con que `taxdetails` esté **poblada** en `beforeSubmit` — tiene que ser **idéntica** a la de `afterSubmit` (misma cantidad, mismas refs, mismos `taxcode`/`taxrate`). La distinción importa por el caso de **edición con cambio fiscal**: si el usuario cambia un artículo o cantidad, en `beforeSubmit` la sublista podría reflejar el estado **anterior** (persistido) y no el recalculado. Una `taxdetails` obsoleta escribiría códigos incorrectos → mismo efecto que una vacía: CFE mal formado. Por eso la matriz incluye ediciones **con** cambio, no solo re-guardados.

### Señal previa a investigar

En la caracterización de `estimate` (15399, 2026-08-06) el formulario mostró `TAX TOTAL` **vacío hasta el momento de guardar** — el cálculo de SuiteTax en CREATE ocurre durante el guardado. Lo que el experimento decide es si ese cálculo corre **antes o después** del `beforeSubmit` del UserEvent. Es la incógnita central del contexto CREATE.

## 2. Registro y deployments (mismo aislamiento del proyecto)

| Ítem | Valor |
|---|---|
| Archivo | `L598 - Diag STC-A1 (UE).js` → `SuiteScripts > Refactor LOC URU - Mobeats` |
| Script → Name / ID | `REF - L598 - Diag STC-A1` / `customscript_l598_diag_stc_a1` |
| Deployments (5) | `_l598_diag_a1_salesorder` · `_estimate` · `_purchaseorder` · `_vendorbill` · `_vendorcredit` |
| Config | `Status = Testing` · Audience = solo `URU-Contador Suitetax (Mobeats)` · `Execute As Role = Administrador` · `Log Level = Audit` · Deployed ✓ |

Los 5 tipos son los mismos "seguros sin CFE" de la caracterización. El diagnóstico convive con el `_REF` (ambos disparan para el rol Mobeats): no interfiere — es solo lectura — y si el save del `_REF` re-disparara UserEvents, las entradas extra del diagnóstico se reconocen por su `executionContext` (dato útil gratis, no ruido).

## 3. Matriz de contextos

| # | Contexto (propuesta §3) | Caso concreto | `eventType` / `executionContext` esperados | ¿Ejecutable hoy? |
|---|---|---|---|:--:|
| 1 | UI — alta | Estimación nueva (artículos TK/QA, 2 tasas) | CREATE / USERINTERFACE | ✅ |
| 2 | UI — edición sin cambios | Re-guardar PO 15111 o Estimate 15399 | EDIT / USERINTERFACE | ✅ |
| 3 | UI — **edición con cambio fiscal** | En Estimate **15400/15401** (creadas para el experimento — la 15399 se preserva intacta como testigo de la caracterización): 3a cambiar cantidad de una línea; 3b cambiar un artículo por otro de distinta tasa | EDIT / USERINTERFACE | ✅ |
| 4 | Transformación | `Estimate 15399 → Sales Order` · `PO → Vendor Bill` · `Vendor Bill → Vendor Credit` (las tres sin CFE) | CREATE / USERINTERFACE | ✅ |
| 5 | Importación CSV | Import de una SO/Estimate de prueba | CREATE / CSVIMPORT | ⏳ confirmar con Tekiio si CSV se usa en producción (propuesta §7) y si el rol tiene permiso de import |
| 6 | Script / API / workflow | Según inventario de contextos que confirme Tekiio (§7) | — / SUITESCRIPT · WEBSERVICES | ⏳ |
| 7 | Tipos CFE (invoice, CM, cashsale, cashrefund, fulfillment) | — | — | ⛔ diferido hasta destrabar middleware CAE — misma restricción que la caracterización |

Los casos 1-4 cubren alta, edición limpia, edición con recálculo y transformación **sin tocar CFE** — suficiente para una primera respuesta sólida sobre el lado seguro. Los contextos 5-7 completan el 100% que exige el criterio de éxito de la propuesta.

## 4. Procedimiento

1. Subir el script y crear los 5 deployments (mecánica de [carga y deploy](../carga-y-deploy-de-scripts.md)).
2. Ejecutar los casos 1-4 con el rol Mobeats, **anotando id y hora de cada guardado**.
3. Extraer del Execution Log las parejas `DIAG-A1 beforeSubmit` / `DIAG-A1 afterSubmit` de cada guardado (aparean por `recordId`; en CREATE, el BS llega con id nulo → aparear con el AS inmediato del mismo usuario/minuto).
4. Volcar a la tabla de evidencia (§5): por caso, comparar `taxdetails` BS vs AS — cantidad y detalle por línea.
5. Con los casos 5-6 habilitados por Tekiio, repetir 2-4 para esos contextos.

## 5. Evidencia (llenar al ejecutar)

| # | Caso | Tipo / Id | eventType | executionContext | `taxdetails` BS | `taxdetails` AS | ¿BS ≡ AS? | Notas |
|---|---|---|---|---|:--:|:--:|:--:|---|
| 1 | Alta UI | Estimate / 15400 y **15401 (v2)** | `create` | `USERINTERFACE` | 2 → `[NEW1: 26@22] [NEW2: 25@10]` · itemRefs `["NEW1","NEW2"]` | 2 → `[15401_1: 26@22] [15401_2: 25@10]` · itemRefs espejo | ✅ **CERRADO** | 15400 (16:46, v1): `taxdetails` se calcula ANTES del beforeSubmit — el riesgo central no se materializó, pero las refs provisorias (`NEWn`) dejaban el join como suposición → instrumento v2. 15401 (17:01, v2): **`itemRefs` ≡ refs de `detalle` en BS** (ambos `NEWn`) y renumeración coherente de ambos lados en AS → el join item↔taxdetails es consistente en beforeSubmit; el Map matchearía idéntico. Caso cerrado sin suposiciones |
| 2 | Edición sin cambios | Estimate / 15399 | `edit` | `USERINTERFACE` | 2 → `[15399_1: 26@22] [15399_2: 25@10]` | 2 → idéntico línea por línea | ✅ | Smoke de plomería 07/08 15:48. Instrumento validado (JSON bien formado, apareo por recordId). Columnas del `_REF` intactas tras el re-guardado (regresión gratis) |
| 3a | Edición: cambio de cantidad | Estimate / 15400 | `edit` | `USERINTERFACE` | 2 → `[15400_1: 26@22] [15400_2: 25@10]` · itemRefs espejo | idéntico | ✅ | 10/08 17:11 (v2). Refs persistidas estables en ambos lados del join; códigos/tasas sin cambio (esperado: la cantidad no altera códigos) |
| 3b | Edición: cambio de artículo/tasa | Estimate / 15400 | `edit` | `USERINTERFACE` | 2 → `[15400_1: 26@22] [NEW1: 26@22]` · itemRefs `["15400_1","NEW1"]` | 2 → `[15400_1] [15400_11]` · espejo | ✅ **sin obsolescencia** | 10/08 17:15 (v2). La línea reemplazada (era 25@10) muestra en BS el taxcode **nuevo** → SuiteTax recalcula antes del beforeSubmit incluso ante cambio de artículo. Caso de **refs mixtas** (persistida + provisoria regenerada) con join consistente en ambos lados — el escenario más exigente para el Map, superado. Renumeración coherente NEW1→15400_11 (no reusa _2) |
| 4a | Estimate → SO | Estimate 15401 → **SO 15402** | `create` | `USERINTERFACE` | 2 → refs **heredadas de la fuente** `[15401_1: 26@22] [15401_2: 25@10]` · itemRefs espejo | 2 → renumeradas `15402_1/_2` · espejo | ✅ | 10/08 17:20 (v2). Tercera variante del ciclo de refs: la transformación llega al BS con taxdetails heredadas de la transacción origen, códigos correctos y join consistente. Con alta (NEWn), edición (persistidas/mixtas) y transformación (heredadas), **las 3 variantes de refs cierran el join en BS** |
| 1-C *(bonus)* | Alta UI — compra | PO / 15408 (#52, servicio) | `create` | `USERINTERFACE` | 1 → `[NEW1: 28@22]` · itemRefs `["NEW1"]` | 1 → `[15408_1]` · espejo | ✅ | 11/08 17:06 (v2). Mismo patrón que el alta de venta, con código de familia **compras** (28). Nota: PO 15403 (BIEN) quedó Pending Receipt — el rol no tiene permiso de Receive; cerrarla al final |
| 4b | PO → Bill | PO 15408 → **Bill 15409** (URU-00006) | `create` | `USERINTERFACE` | 1 → refs heredadas `[15408_1: 28@22]` · itemRefs espejo | 1 → renumerada `15409_1` · espejo | ✅ | 11/08 17:10 (v2). Mismo patrón de transformación que ventas, familia compras (28). Bonus semántico: `expense: 0` en Bill (sublista existente vacía) vs `-1` en ventas (ausente) |
| 4c | Bill → Bill Credit | Bill 15409 → **Bill Credit 15410** | `create` | `USERINTERFACE` | 1 → refs heredadas `[15409_1: 28@22]` · itemRefs espejo | 1 → renumerada `15410_1` · espejo | ✅ | 11/08 17:15 (v2). Cierra el bloque. La Bill quedó PAID IN FULL (crédito auto-aplicado por la transformación) — 15410 queda como candidata apply futura |

### Veredicto del bloque ejecutable (11/08/2026) — 8/8 contextos en verde

En **todos** los contextos ejecutables sin Tekiio (alta venta y compra, edición limpia, edición con cambio de cantidad y de artículo, y las 3 transformaciones), `taxdetails` llegó al `beforeSubmit` **completa, vigente y con el join item↔taxdetails consistente**. Las tres variantes del ciclo de refs (provisorias `NEWn` en alta, persistidas/mixtas en edición, heredadas de la fuente en transformación) renumeran coherentemente ambos lados — el `Map` del script es agnóstico del esquema y matchearía idéntico en cualquiera.

**Lectura para la propuesta:** el escenario ✅ de la [tabla de decisión (§6)](#6-mapeo-a-la-decisión-propuesta-5) se sostiene en todo lo relevado. El criterio de éxito de la propuesta exige el **100% de los contextos** → faltan los gated: CSV/API (inventario de contextos de producción, pedido a Tekiio) y los tipos CFE (middleware). Con esos cubiertos —o descartados como inexistentes en producción— la recomendación pasa a **aplicar STC-A1** (elimina el 100% de las 30 GU medidas por guardado + el evento de guardado extra).

**Transacciones creadas por el experimento** (todas del rol Mobeats, sin CFE): Estimates 15400/15401, SO 15402, PO 15403 (BIEN — ✅ cerrada con `Close` el 11/08, el rol no tenía permiso de Receive), PO 15408 (servicio, facturada), Bill 15409 (URU-00006, paid in full), Bill Credit 15410.

### Observaciones del instrumento (smoke 07/08)

- `taxcode` llega como **internal id** en string (`"26"`, `"25"` — consistentes con el inventario: Tasa Básica 22% Ventas / Tasa Mínima 10% Ventas); `taxrate` numérico.
- `"expense": -1` — **confirmación empírica**: `getLineCount` sobre una sublista ausente devuelve `-1` sin lanzar excepción (cierra formalmente la inferencia del [informe §4](../refactors/1-seteo-de-tax-codes.md#4-alcance-real-9-deployments)).
- El par BS/AS se aparea por `recordId` + minuto; en CREATE el BS llegará con id nulo (aparear con el AS inmediato).

## 6. Mapeo a la decisión (propuesta §5)

| Resultado observado | Decisión |
|---|---|
| BS ≡ AS en el 100% de los contextos relevados | ✅ Aplicar STC-A1 sobre el `_REF` (elimina el 100% de las 30 GU medidas) y caracterizar según [propuesta §6](STC-A1-entrypoint-seteo-tax-codes.md#6-caracterización-cuando-se-aplique) |
| BS ≡ AS solo en algunos contextos | ⚠️ Híbrido: `beforeSubmit` + fallback `afterSubmit` — diseñar el discriminador con los `executionContext` reales capturados |
| BS ≠ AS en UI (vacía u obsoleta) | ❌ No mover. Alternativas: reducir alcance del save / `submitFields` (ensayado y comentado en `Transacción (Servidor)` L1872-1882) |

## 7. Qué espera de Tekiio (sin cambios vs. propuesta §7)

1. OK para ejecutar el experimento (este documento es el detalle del "experimento de diagnóstico" del resumen enviado el 05/08).
2. Inventario de contextos reales de producción (¿se usa CSV? ¿API/integraciones? ¿workflows que creen transacciones?).
3. (Ya pedido) Confirmación sobre múltiples `taxdetails` por línea (STC-A3).
