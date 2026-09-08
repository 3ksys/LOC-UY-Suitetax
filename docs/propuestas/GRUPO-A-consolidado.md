# Grupo A — Documento único de decisión

**De:** Mobeats · **Para:** Tekiio · **Fecha:** 2026-08-20
**Qué es:** los **13 cambios de correctitud** que el refactor detectó y que, por la metodología acordada, no se aplican sin su aprobación. Consolidados en un solo lugar para que se puedan responder de una vez.

---

## 0. Cómo usar este documento

Están ordenados por **cuánto cuesta responderlos**, no por importancia. Los tres primeros se contestan en una línea y destraban trabajo que hoy está detenido.

| Nivel | Qué pedimos | Cuántos |
|---|---|:--:|
| **§1** | Tres respuestas de una línea | 3 |
| **§2** | Autorizar correcciones de bugs con efecto observable | 5 |
| **§3** | Autorizar los dos cambios de performance | 2 |
| **§4** | Definir tres reglas de negocio | 3 |

**Nada de esto frena el refactor seguro**, que avanza en paralelo: `Seteo de Tax Codes` ya está aplicado y medido (30 GU → 0), y `Transacción (Servidor)` tiene sus cuatro unidades de refactor aplicadas y pendientes de caracterización.

---

## 1. Tres respuestas de una línea

Si sólo pueden contestar una parte de este documento, que sea esta.

### 1.1 ¿Puede haber más de un registro de datos impositivos activo por subsidiaria?

`customrecord_l598_datos_impositivos_emp`. Hoy `Transacción (Servidor)` lo consulta **dos veces por cada guardado** de forma redundante. Si hay un único registro activo por subsidiaria, las dos consultas se unifican en una y el cambio es equivalente. Si puede haber varios, no lo es.

> **Destraba:** TRS-B3 (una búsqueda menos por guardado, sin aprobación adicional).

### 1.2 ¿En Uruguay una línea de transacción puede estar alcanzada por más de un impuesto?

Hoy, cuando una línea tiene varios detalles de impuesto, el script **toma el primero y descarta el resto sin aviso**. Si eso no ocurre en Uruguay, el hallazgo se cierra sin tocar código. Si ocurre, hay que definir qué informar en las columnas del CFE.

*Esta consulta ya figuraba en la propuesta STC-A1 del 09/07 y quedó sin responder.*

> **Destraba:** STC-A3.

### 1.3 ¿Aprueban el *early return* para Orden de venta y Orden de transferencia?

Para esos dos tipos, `Transacción (Servidor)` **recarga y vuelve a guardar la transacción completa sin escribir ni un campo**. Toda la lógica del paso posterior al guardado los saltea, pero la recarga y el guardado extra se ejecutan igual. El retorno propuesto va en ese paso — el llenado de sucursal vacía durante el guardado sí les aplica y no se toca.

Son pocas líneas, el output no cambia (no se escribía nada) y es el mejor esfuerzo/impacto de todo el script.

> **Destraba:** TRS-A2.

---

## 2. Correcciones de bugs con efecto observable

Los cinco son errores verificados en el código. Requieren aprobación porque **corregirlos cambia algo que hoy se ve**.

### 2.1 TRS-A3 — Retenciones que quedan huérfanas 🔴

Al borrar una NC de compra o un Resguardo, el script intenta eliminar las retenciones asociadas invocando un método que **no existe** en la API de NetSuite. El error cae en un bloque que sólo escribe en el log: **el borrado falla sin que nadie se entere** y las retenciones quedan referenciando documentos que ya no existen.

**Por qué necesita decisión:** corregirlo hace que **empiecen a borrarse registros que hoy sobreviven**. Y queda el pasivo histórico.

**Pedimos:** (a) confirmar en los logs de la cuenta que el error ocurre — buscar `"Ocurrio un error al borrar…"`; (b) definir qué hacer con los huérfanos que ya existen.

### 2.2 y 2.3 TRS-A5 y TRS-A6 — El monto en letras impreso 🔴

Dos defectos en `custbody_l598_monto_escrito`, que es **el importe en letras que se imprime en el documento fiscal**:

- **A6:** la parte decimal no se normaliza a dos dígitos. Un total de `10.50` imprime **"CON 5/100"** en lugar de "50/100". Con tres decimales, "CON 567/100".
- **A5:** ante un valor no numérico el código llama a `alert()`, una función de navegador que no existe en el servidor. El error termina grabando el texto **`"NO DISPONIBLE"`** en el campo.

**Por qué necesita decisión:** cambia un texto que ya se emitió así en documentos existentes.

**Pedimos:** (a) aprobar las dos correcciones; (b) definir qué debe pasar cuando el importe no es numérico — ¿`"NO DISPONIBLE"` es aceptable, o debería impedirse el guardado?; (c) indicar si hay documentos ya emitidos con centavos mal formados que requieran alguna acción.

### 2.4 TRS-A7 — Truncamiento silencioso sobre 1.000 filas 🔴

Las tres búsquedas que completan nombre de artículo, unidad de medida, indicador de facturación y código de percepción/retención por línea leen **como máximo 1.000 resultados, sin paginar**. Superado ese volumen, las líneas restantes quedan sin esos datos, sin aviso.

**Pedimos:** confirmar si una transacción puede superar las 1.000 líneas / artículos / códigos de impuesto en la operación real. Si nunca ocurre, esto baja de prioridad; si puede ocurrir, aprobar la paginación (las funciones paginadas ya existen en el módulo compartido del proyecto).

### 2.5 GTX-A1 — Declaración DGI potencialmente incompleta 🔴

**Es el hallazgo más antiguo del proyecto: pedido el 07/07/2026, sin respuesta.**

En `Generación TXT Localizaciones (Sched)`, la búsqueda `searchRubroPublicidad` **trunca a 1.000 resultados sin paginar**. Si un período supera las 1.000 transacciones de publicidad, **el TXT que se declara a DGI sale incompleto**, y nada lo indica.

**Pedimos:** aprobar la paginación. Es el mismo tipo de corrección que TRS-A7 y, por su destino —una declaración fiscal—, el de mayor consecuencia de toda la lista.

### 2.6 GTX-A2 — Falla al enviar el mail 🔴

Si `archivoGenerar != "2181"`, las variables `resultado` e `idLogGeneral` quedan indefinidas y el proceso **falla en `enviarMail`**. Pedido el 07/07/2026.

**Pedimos:** aprobar la corrección (garantizar valores definidos en todos los caminos).

---

## 3. Los dos cambios de performance

Ambos entran por el **criterio #8** de los lineamientos: un cambio de entry point no se aplica automáticamente.

### 3.1 TRS-A2 — El guardado vacío

Ya está en §1.3, porque se responde en una línea.

### 3.2 TRS-A1 — El patrón de recargar y volver a guardar 🔴

`Transacción (Servidor)` recarga el documento completo y lo guarda otra vez, después de que NetSuite ya lo guardó, para escribir campos calculados. Es **el mismo patrón que ya resolvimos en `Seteo de Tax Codes`**, donde el ahorro medido fue de **30 unidades de governance por guardado — el 100% del consumo de aquel script**.

Este script corre en casi todas las transacciones de la localización.

**Cómo lo resolveríamos:** con el mismo diseño híbrido ya probado y medido — escribir durante el guardado del sistema cuando los datos estén disponibles, con verificación previa y retorno automático al mecanismo actual cuando no lo estén. Más dos particularidades propias, ya resueltas en el diseño:

| Obstáculo | Solución |
|---|---|
| El número de comprobante guarda el id interno, que no existe antes de guardar | Se sigue escribiendo después, pero con actualización de campo puntual en vez de recargar todo el documento. **El propio código ya tiene esa alternativa escrita y comentada** |
| El toggle de aplicaciones en NC opera sobre el estado posterior al guardado | En `Seteo de Tax Codes` quedó probado que ese mecanismo era un workaround del guardado extra: sin guardado extra, no hace falta. Se validaría igual acá |

**Pedimos:** aprobar el paso a **fase de validación** — extender a este script el mismo experimento de diagnóstico de solo lectura que ya se usó en `Seteo de Tax Codes`. No modifica ninguna transacción.

> **Nota de método:** antes de cuantificar el ahorro vamos a **medirlo con APM en este script**, como hicimos con el otro. No proyectamos por analogía. Esa medición es de sólo lectura y no requiere aprobación.

---

## 4. Tres reglas de negocio que sólo Tekiio puede definir

No son propuestas: son preguntas cuya respuesta no está en el código.

### 4.1 TRS-A8 — ¿Cuándo debe recalcularse la sucursal?

La condición que dispara el cálculo de sucursal incluye un término que lo hace correr en **casi el 100% de los guardados**, incluso con los campos ya completos.

Verificado contra el código (2026-08-27): ese disparo de más **no sobreescribe datos** — el único campo que se escribe es la sucursal, y sólo cuando está vacía; la serie y la caja nunca se escriben en el camino ejecutable. El costo real es consumo: búsquedas cuyo resultado se descarta. Esa parte se corrige como refactor seguro, sin decisión de negocio.

Lo que sí es regla de negocio es lo inverso a lo que aparentaba: **hoy una sucursal ya cargada nunca se recalcula ni se sobreescribe, aunque cambie la ubicación de la transacción.**

**Pregunta:** ¿está bien así (comportamiento actual), o debería recalcularse cuando cambia la ubicación?

### 4.2 TRS-A4 — Un bloque que parece estar apagado a propósito

Al abrir una Factura de venta nueva, un bloque precargaría sucursal, serie y caja por defecto. Está condicionado a una comparación que **probablemente nunca se cumple** (compara el contexto de ejecución en minúsculas contra un valor que NetSuite devuelve en mayúsculas), así que sería código muerto.

Un comentario en el propio archivo dice: *"Se comenta esta funcionalidad porque está repetida… el script de cliente también la posee"* — lo que sugiere que la desactivación fue deliberada y se hizo por esa vía.

**Pregunta:** ¿fue deliberado? Si sí, lo removemos como limpieza. Si debía funcionar, reactivarlo es un cambio de comportamiento a evaluar.

### 4.3 GTX-A3 — Configuración con 0 o 2+ resultados 🟡

`Generación TXT Localizaciones (Sched)` sólo resuelve la carpeta y el nombre del archivo cuando la búsqueda de configuración devuelve **exactamente un** resultado. Con cero o con varios, el TXT no se genera y no queda un diagnóstico claro. Pedido el 07/07/2026.

**Pregunta:** ¿qué debe pasar en cada caso? ¿Cuál config gana si hay varias? ¿Y si no hay ninguna, debe fallar con mensaje explícito?

---

## 5. La lista completa

| ID | Script | Qué es | Riesgo | Qué pedimos | Desde |
|---|---|---|:--:|---|---|
| **GTX-A1** | Generación TXT DGI | Truncamiento a 1.000 → declaración DGI incompleta | 🔴 | Aprobar paginación | 07/07 |
| **GTX-A2** | Generación TXT DGI | Variables indefinidas → falla al enviar el mail | 🔴 | Aprobar corrección | 07/07 |
| **GTX-A3** | Generación TXT DGI | Config con 0 o 2+ resultados | 🟡 | Definir comportamiento | 07/07 |
| **STC-A2** | Seteo de Tax Codes | Fallo silencioso del guardado (rama de fallback) | 🔴 | Elegir alternativa de manejo | 09/07 |
| **STC-A3** | Seteo de Tax Codes | Múltiples impuestos por línea → toma el primero | 🔴 | **Respuesta fiscal (§1.2)** | 09/07 |
| **TRS-A1** | Transacción (Servidor) | Recargar + volver a guardar | 🔴 | Aprobar fase de validación | 20/08 |
| **TRS-A2** | Transacción (Servidor) | Guardado vacío en Orden de venta | 🔴 | **Aprobar (§1.3)** | 20/08 |
| **TRS-A3** | Transacción (Servidor) | Retenciones huérfanas | 🔴 | Logs + definir pasivo | 20/08 |
| **TRS-A4** | Transacción (Servidor) | Bloque `beforeLoad` muerto | 🔴 | ¿Fue deliberado? | 20/08 |
| **TRS-A5** | Transacción (Servidor) | `alert()` → `"NO DISPONIBLE"` impreso | 🔴 | Aprobar + criterio | 20/08 |
| **TRS-A6** | Transacción (Servidor) | Centavos mal formados en el monto en letras | 🔴 | Aprobar corrección | 20/08 |
| **TRS-A7** | Transacción (Servidor) | Truncamiento a 1.000 en 3 búsquedas | 🔴 | ¿Se alcanza ese volumen? | 20/08 |
| **TRS-A8** | Transacción (Servidor) | Sucursal ya cargada: nunca se recalcula al cambiar la ubicación | 🔴 | Confirmar comportamiento (§4.1) | 20/08 |

**Aprobado y cerrado:** STC-A1 (guarda híbrida, aplicada y medida el 20/08 — 30 GU → 0). Es el único de la serie que ya pasó por este circuito, y sirve de referencia de cómo funciona: propuesta → validación de solo lectura → aprobación → implementación → medición → informe.

---

## 6. Qué pasa si no se responden

Lo decimos sin dramatismo, porque es información que les corresponde tener:

- **Ninguno de estos bugs es nuestro** — todos preexisten al refactor. No los introdujimos y no los estamos corrigiendo por cuenta propia.
- **Mientras no se decidan, siguen vigentes en producción.** Las retenciones siguen quedando huérfanas, los centavos siguen imprimiéndose mal, y si un período supera las 1.000 transacciones de publicidad, el TXT a DGI sigue saliendo incompleto.
- **El refactor no los tapa ni los agrava:** las versiones `_REF` preservan el comportamiento original en todos estos puntos, deliberadamente y documentado línea por línea.
- **Tres de ellos llevan más de seis semanas** (los GTX, desde el 07/07). El más consecuente de la lista está entre esos tres.

Nuestra recomendación de orden, si hay que priorizar: **GTX-A1** (declaración fiscal), luego los tres de §1 (cuestan una línea cada uno), luego TRS-A3 y TRS-A5/A6.

---

*Detalle técnico con evidencia línea por línea: [Grupo A de Transacción (Servidor)](TRS-A-transaccion-servidor.md) · [STC-A2 y STC-A3](STC-A2-A3-manejo-error-y-multiples-taxdetails.md) · [informes de análisis por script](../README.md#informes-por-script-analisis-y-refactor). Estado siempre actualizado en el [registro de aprobaciones](../registro-aprobaciones.md).*
