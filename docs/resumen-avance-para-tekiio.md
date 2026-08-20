# Refactor LOC Uruguay — Resumen de avance

**De:** Mobeats · **Para:** Tekiio · **Fecha:** 05/08/2026
**Alcance de este resumen:** primer script refactorizado (`L598 - Seteo de Tax Codes`), medición de performance con APM, y una clave de lectura importante sobre las planillas de tiempos.

> 📌 **Documento de fecha — superado en parte.** STC-A1 fue **aprobado por Tekiio el 20/08/2026**, aplicado en su variante híbrida y medido en la cuenta: **las 30 GU pasaron a 0**. Lo que acá figura como "pendiente de aprobación" ya está resuelto. Ver [Resultados de la implementación](propuestas/STC-A1-resultados-implementacion.md). Este resumen se conserva como registro del estado al 05/08, no se reescribe.

---

## 1. Lo esencial en cuatro puntos

1. **El primer script refactorizado ya está probado: produce exactamente los mismos resultados que el original.** Lo verificamos re-guardando transacciones reales de la cuenta y comparando el resultado campo por campo, en los tres tipos de transacción que cubren todas las ramas del código. Cero diferencias.
2. **Medimos su consumo real:** 30 unidades de governance por cada guardado, y el 100% proviene de un solo patrón (recargar y volver a guardar el documento). La propuesta STC-A1, pendiente de aprobación de ustedes, elimina ese consumo por completo.
3. **Las planillas APM de tiempos tienen una clave de lectura que cambia las conclusiones:** los valores del desglose por script son **sumas acumuladas de varios guardados**, no el costo de un guardado individual. Abajo está la prueba aritmética.
4. **Tres pedidos concretos** para destrabar lo que falta (sección 5).

---

## 2. El refactor se comporta idéntico al original — evidencia

**Método:** para cada tipo de transacción, tomamos una transacción real con los valores que dejó escritos el código actual, la re-guardamos sin cambiar ningún dato para que la versión refactorizada recalculara todo, y comparamos el antes y el después línea por línea (exportaciones CSV + `diff`).

| Transacción | Por qué se eligió | Fecha de prueba | Resultado |
|---|---|---|---|
| Orden de venta 47 (id 15260) | Caso base de ventas | 30/07/2026 | ✅ Idéntico |
| Factura de proveedor FACTURA-101 (id 14990) | 3 líneas con **3 tasas distintas** (22% / Exento / 10%) — el caso donde un error del refactor sería más visible | 03/08/2026 | ✅ Idéntico, línea por línea |
| Crédito de proveedor URU-00005 (id 15227) | Tiene una factura **aplicada** — ejercita la lógica de desaplicar/re-aplicar | 05/08/2026 | ✅ Idéntico; la aplicación quedó intacta (1.220.000,00 aplicado / 0,00 sin aplicar) |

**Cómo garantizamos que medimos solo al refactor:** en cada prueba verificamos por dos vías independientes (logs de ejecución de NetSuite y el desglose de scripts de APM) que corrió únicamente la versión refactorizada — ni el script original ni `Transacción (Servidor)` participaron del guardado.

**Una precisión que preferimos declarar nosotros:** al revisar las audiencias de los deployments encontramos que, en compras, los valores históricos de las columnas de impuestos los escribió `Transacción (Servidor)` (que corre para el rol `URU - Contador`), no `Seteo de Tax Codes` (que corre solo para `Administrador`). Ambos scripts tienen la misma lógica duplicada, así que la comparación sigue siendo válida — pero el detalle importa para la conversación pendiente sobre **cuál de los dos debería ser el dueño único** de esa lógica.

**Qué falta probar:** dos casos que hoy no existen en la cuenta (ver pedidos): líneas con artículo de **grupo**, y facturas de proveedor que usen la solapa **Gastos**.

---

## 3. Cuánto consume el script — medición APM

Medimos las tres pruebas con APM (`Page Time Summary` + `SuiteScript Analysis`), según el manual que nos compartieron:

| Prueba | Tiempo del script | Governance | Operaciones de registro | Búsquedas | Errores |
|---|:--:|:--:|:--:|:--:|:--:|
| Orden de venta 15260 | 1,9 s | **30 GU** | 2 | 0 | 0 |
| Factura proveedor 14990 | 2,3 s | **30 GU** | 2 | 0 | 0 |
| Crédito proveedor 15227 | 2,2 s | **30 GU** | 2 | 0 | 0 |

**La lectura importante:** las 30 GU provienen íntegramente de las 2 operaciones de registro — el script **recarga el documento completo y lo vuelve a guardar** justo después de que NetSuite ya lo guardó. No hay ningún otro consumo (cero búsquedas, cero llamadas externas).

**Por eso la propuesta STC-A1 es donde está el ahorro real:** mover la lógica a *antes* del guardado elimina el 100% del governance del script (30 GU × cada guardado × los 9 tipos de transacción donde corre) y además elimina un evento de guardado extra que hoy vuelve a disparar el resto de los scripts de la cuenta.

**Sobre tiempos:** preferimos no publicar un porcentaje de mejora de velocidad. El script original promedia 1,6–1,7s por guardado y el refactorizado 1,9–2,3s en transacciones distintas y días distintos — con la variabilidad de la cuenta compartida y los guardados "en frío", esa diferencia está dentro del ruido de medición. Lo defendible con evidencia es: **comportamiento idéntico + governance medido**.

---

## 4. Clave de lectura de las planillas APM (esto cambia conclusiones)

Al reproducir las mediciones encontramos tres cosas que conviene tener presentes al usar el Excel de tiempos:

### 4.1 Los valores del desglose por script son sumas, no guardados individuales

El panel "Desglose de tiempos por script" de APM acumula **todos los guardados del rango de fechas filtrado**. La prueba está en los propios números de las planillas:

| Cifra de la planilla | Composición | Guardados en el rango | Por guardado |
|---|---|:--:|:--:|
| Transacción (Servidor) en Remito: **9,6s** | 9,18 + 0,38 + 0,06 | 6 | **~1,6 s** |
| Transacción (Servidor) en NC Venta: **6,6s** | 5,23 + 1,33 + 0,06 | 4 | **~1,7 s** |
| Transacción (Servidor) en F. Venta: **4,1s** | 2,25 + 1,78 + 0,06 | 7 | **~0,6 s** |
| Seteo de Tax Codes en F. Venta: **11,0s** | 11,03 + extras | 7 | **~1,6 s** |

Consecuencia práctica: los números resaltados en rojo en las planillas no son "lo que tarda el script en un guardado" — son 4 a 7 guardados sumados. Y al normalizar por guardado, **el orden de prioridades cambia**: para `Transacción (Servidor)`, Nota de Crédito y Remito pesan más por guardado que Factura de Venta.

### 4.2 Los promedios incluyen guardados "en frío"

Cada lote de pruebas arranca con 1–2 guardados de 51–62 segundos (la primera ejecución compila y cachea) promediados con guardados de 4 segundos. La **mediana** representa mejor un guardado típico que la media.

### 4.3 La hoja "Pago de Venta" tiene el desglose incompleto

Sus guardados acumulan ~24,6s de scripts, pero el desglose muestra solo "Sistema NetSuite" — el detalle por script había expirado en APM al momento de capturarla (APM retiene el detalle del profiler menos tiempo que los totales de página). Los tiempos de página de esa hoja sirven; su desglose por script no.

### 4.4 Un dato valioso que sale de la lectura correcta

Normalizado por guardado, el script con mayor costo de tiempo real en los flujos de facturación electrónica es **`Conexión Directa FE (SS)`** (~3,0–3,6s por guardado en Remito y NC), consistente con las esperas de comunicación con el middleware de CFE. Está en nuestra lista de refactor (script #5) y estas planillas son su baseline.

---

## 5. Pedidos para destrabar lo que falta

| # | Pedido | Qué destraba |
|---|---|---|
| 1 | **Decisión sobre STC-A1/A2/A3** (con el dato nuevo: 30 GU medidos = 100% del consumo del script) | El ahorro real de governance del script #1 |
| 2 | Un **artículo de tipo Grupo** y una transacción de prueba que lo use | El único borde de lógica que no pudimos probar (no existe ningún grupo en la cuenta) |
| 3 | Una **factura de proveedor de prueba con líneas en la solapa Gastos** | La rama de gastos: verificamos que ninguna factura de la cuenta la usó nunca |
| 4 | *(Opcional)* Un guardado de orden de venta con rol `Administrador` | Baseline directo del script original para la comparación de tiempos en igualdad de condiciones |

---

## 6. Estado general del script #1

- [x] Refactor aplicado (versión `_REF` separada; el original intacto)
- [x] Comportamiento idéntico probado en los 3 tipos que cubren todas las ramas alcanzables
- [x] Aislamiento verificado en cada prueba (doble vía: logs + APM)
- [x] Consumo medido: 30 GU/guardado, 100% eliminable con STC-A1
- [ ] 6 deployments de regresión (tipos restantes) — en curso
- [ ] Bordes pendientes de los pedidos 2 y 3
- [ ] Decisión STC-A1/A2/A3

*Los detalles técnicos completos, con capturas y CSVs, están en la documentación del proyecto: caracterización (`docs/caracterizacion/1-seteo-de-tax-codes.md`), medición (`docs/medicion-apm.md`) e informe del refactor (`docs/refactors/1-seteo-de-tax-codes.md`).*
