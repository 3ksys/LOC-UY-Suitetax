/**
 * @format
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * ============================================================================
 * REFACTOR (Mobeats) de "L598 - Seteo de Tax Codes".
 * ----------------------------------------------------------------------------
 * Alcance: A1 (entry point, híbrido) + B (performance) + C (estándares 2.1) + D (mantenibilidad).
 * Comportamiento preservado (mismos custcol_l598_codigo_impuesto/tasa por línea).
 *
 * Cambios aplicados:
 *   A1  híbrido beforeSubmit/afterSubmit con guarda de completitud (ver bloque siguiente).
 *   B1  filter O(n×m) dentro del loop -> Map indexado O(1) (misma semántica "primer match gana").
 *   B2  eliminado el 2º loop de solo-logging y los log.debug de dump (ruido en cada transacción).
 *   C1  eliminado N/search del define (se importaba pero no se usaba).
 *   D1  eliminado arrayTaxCodes (sólo alimentaba un log).
 *
 * ----------------------------------------------------------------------------
 * STC-A1 — Guarda híbrida (aprobado por Tekiio, 2026-08-20)
 * ----------------------------------------------------------------------------
 * Problema: el original hacía record.load() + save() en afterSubmit para setear
 * 2 columnas por línea = 30 GU por transacción + un guardado extra.
 *
 * Solución: escribir las columnas en beforeSubmit sobre context.newRecord — los
 * cambios viajan en el guardado que el sistema ya va a hacer, costo 0 GU — PERO
 * sólo cuando se puede probar que la sublist "taxdetails" ya está poblada en ese
 * momento. La verificación es de datos, no de contexto: no hay lista de contextos
 * (UI / CSV / API / workflow / integración futura) que mantener.
 *
 *   beforeSubmit -> guarda completa   => escribe inline. 0 GU.
 *   beforeSubmit -> guarda incompleta => NO escribe nada (todo o nada) y
 *                                        afterSubmit ejecuta el load+save legacy. 30 GU,
 *                                        idéntico al comportamiento original.
 *
 * afterSubmit decide LEYENDO EL REGISTRO, nunca por estado compartido:
 * reconstruye el índice de taxdetails desde context.newRecord (0 GU, sin load) y
 * verifica que cada línea ya tenga en sus columnas EXACTAMENTE el valor que le
 * corresponde según ese índice. Si todo coincide, no hay nada que hacer y sale.
 * Si algo difiere -> load + save legacy, sin cambios respecto del original.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ POR QUÉ NO HAY UNA BANDERA DE MÓDULO (corrección 2026-08-20)
 * ----------------------------------------------------------------------------
 * La primera versión de este híbrido usaba una variable de módulo (`escrituraInline`)
 * que beforeSubmit ponía en true y afterSubmit leía para saltear el legacy.
 * **No funciona: el scope del módulo NO se comparte entre beforeSubmit y afterSubmit.**
 *
 * Medido en la cuenta (vendorcredit 15227, 2026-08-20, APM SuiteScript Analysis):
 * beforeSubmit logueó `rama=inline` y consumió 0 GU / 0 operaciones de registro,
 * pero afterSubmit consumió **30 GU y 2 operaciones** — el load+save legacy corrió
 * igual, porque leyó la bandera en false. El fail-safe hizo su trabajo (output
 * byte a byte idéntico, cero errores), pero el ahorro no se materializó.
 *
 * Verificar el RESULTADO en el registro es además estrictamente mejor que preguntar
 * quién lo escribió: cubre el caso de una edición cuyas columnas quedaron obsoletas
 * (valores viejos no coinciden con el índice actual -> dispara el legacy solo).
 *
 * OBSERVABILIDAD: ambos entry points loguean SIEMPRE la rama tomada. El camino
 * feliz silencioso de la primera versión fue justamente lo que ocultó el problema
 * de arriba hasta que se midió el governance.
 *
 * Casos que caen al legacy por diseño: DELETE (no aplica), XEDIT (newRecord es
 * parcial, la sublist no está disponible), y cualquier contexto donde SuiteTax
 * todavía no haya armado taxdetails al momento del beforeSubmit.
 *
 * LÍMITE CONOCIDO: la guarda detecta "vacío o incompleto", NO "poblado pero
 * obsoleto" al momento de escribir. Ese escenario se validó empíricamente con el
 * script de diagnóstico customscript_l598_diag_stc_a1 (9/9 snapshots beforeSubmit
 * idénticos a afterSubmit, incluyendo edición con cambio de artículo, transformaciones
 * y edición de vendorcredit). Mantener el diagnóstico desplegado en paralelo.
 *
 * PENDIENTE DE CARACTERIZACIÓN: en la rama inline NO se ejecuta desaplicarYAplicarNC
 * — es un workaround del segundo save, que en esa rama no existe. **Todavía sin probar:**
 * la corrida del 2026-08-20 sobre vendorcredit 15227 terminó ejecutando el legacy, así
 * que la sublist `apply` bajo la rama inline pura sigue sin caracterizar.
 *
 * NO incluido — requiere aprobación de Tekiio (ver docs/registro-aprobaciones.md):
 *   STC-A2  manejo de error del save (sólo aplica a la rama legacy).
 *   STC-A3  múltiples taxdetails por línea (se conserva el comportamiento actual: primer match).
 *
 * NO tocado (cambiaría comportamiento): isEmpty local (reglas propias sobre arrays/strings),
 *   desaplicarYAplicarNC (workaround de negocio en NC, se conserva en la rama legacy).
 * ============================================================================
 */
define(["N/record", "N/runtime"], function (record, runtime) {
	/* global define log */
	/* eslint-disable quotes */

	const SUBLISTS_DESTINO = ["item", "expense"];

	/**
	 * @param {UserEventContext.beforeSubmit} context
	 */
	const beforeSubmit = (context) => {

		const proceso = "beforeSubmit";

		try {
			if (context.type == context.UserEventType.DELETE) {
				return;
			}

			const objRecord = context.newRecord;
			const taxDetailsByRef = indexarTaxDetails(objRecord);
			const completitud = evaluarCompletitud(objRecord, taxDetailsByRef);

			if (!completitud.completo) {
				log.audit(proceso, `STC-A1 rama=legacy motivo=${completitud.motivo} ${contextoLog(context, objRecord)}`);
				return;
			}

			SUBLISTS_DESTINO.forEach((tipoLista) => setearColumnasConTaxDetails(tipoLista, objRecord, taxDetailsByRef));

			// desaplicarYAplicarNC NO se ejecuta acá: es un workaround del segundo save,
			// que en esta rama no existe (ver cabecera, PENDIENTE DE CARACTERIZACIÓN).

			log.audit(proceso, `STC-A1 rama=inline lineas=${completitud.lineasResueltas} ${contextoLog(context, objRecord)}`);

		} catch (error) {
			// Un fallo acá jamás debe romper el guardado del usuario: se cae al legacy.
			log.error(proceso, `STC-A1 rama=legacy motivo=excepcion - detalles: ${error.message}`);
		}
	};

	/**
	 * @param {UserEventContext.afterSubmit} context
	 */
	const afterSubmit = (context) => {

		const proceso = "afterSubmit";

		try {
			if (context.type == context.UserEventType.DELETE) {
				return;
			}

			// Decisión por lectura del registro (0 GU), nunca por estado de módulo.
			const verificacion = columnasYaCorrectas(context.newRecord);

			if (verificacion.correctas) {
				log.audit(proceso, `STC-A1 rama=inline-ok verificadas=${verificacion.verificadas} ${contextoLog(context, context.newRecord)}`);
				return;
			}

			log.audit(proceso, `STC-A1 rama=legacy motivo=${verificacion.motivo} ${contextoLog(context, context.newRecord)}`);

			// ----- Camino legacy: comportamiento original, sin cambios -----
			const objRecord = record.load({
				type: context.newRecord.type,
				id: context.newRecord.id,
			});

			const taxDetailsByRef = indexarTaxDetails(objRecord);

			SUBLISTS_DESTINO.forEach((tipoLista) => setearColumnasConTaxDetails(tipoLista, objRecord, taxDetailsByRef));

			desaplicarYAplicarNC(context.newRecord.type, objRecord);

			objRecord.save();

		} catch (error) {
			log.error(proceso, `Error NetSuite Excepcion - detalles: ${error.message}`);
		}
	};

	/**
	 * Índice taxdetailsreference -> { taxCode, taxRate }. "Primer match gana",
	 * misma semántica que el filter(...)[0] original, pero en O(1).
	 * @param {*} objRecord
	 * @returns {Map<string, {taxDetailReference:*, taxCode:*, taxRate:*}>}
	 */
	function indexarTaxDetails(objRecord) {

		const taxDetailsByRef = new Map();
		const taxDetailsQuantity = objRecord.getLineCount({ sublistId: "taxdetails" });

		for (let i = 0; i < taxDetailsQuantity; i++) {
			const ref = objRecord.getSublistValue("taxdetails", "taxdetailsreference", i);
			const key = String(ref);
			if (!taxDetailsByRef.has(key)) {
				taxDetailsByRef.set(key, {
					taxDetailReference: ref,
					taxCode: objRecord.getSublistValue("taxdetails", "taxcode", i),
					taxRate: objRecord.getSublistValue("taxdetails", "taxrate", i)
				});
			}
		}

		return taxDetailsByRef;
	}

	/**
	 * Guarda de completitud de STC-A1: ¿se puede resolver TODO lo que hay que resolver
	 * con la taxdetails que tenemos en la mano, ahora mismo?
	 *
	 * Criterio: toda línea de item/expense que trae un taxdetailsreference no vacío
	 * — es decir, a la que SuiteTax ya le asignó un detalle — debe tener su entrada en
	 * el índice, con taxCode no vacío. Las líneas sin referencia (encabezados de grupo,
	 * descripciones, descuentos) son exactamente las que el original tampoco resuelve
	 * por índice: no son evidencia de que la sublist no esté lista y no se exigen acá.
	 *
	 * @param {*} objRecord
	 * @param {Map<string, {taxCode:*, taxRate:*}>} taxDetailsByRef
	 * @returns {{completo:boolean, motivo:string, lineasResueltas:number}}
	 */
	function evaluarCompletitud(objRecord, taxDetailsByRef) {

		if (taxDetailsByRef.size === 0) {
			return { completo: false, motivo: "taxdetails-vacia", lineasResueltas: 0 };
		}

		let lineasEsperadas = 0;
		let lineasResueltas = 0;

		for (const tipoLista of SUBLISTS_DESTINO) {

			const listaQuantity = objRecord.getLineCount({ sublistId: tipoLista });

			for (let i = 0; i < listaQuantity; i++) {

				const ref = objRecord.getSublistValue(tipoLista, "taxdetailsreference", i);
				if (isEmpty(ref)) {
					continue;
				}

				lineasEsperadas++;
				const td = taxDetailsByRef.get(String(ref));

				if (!td || isEmpty(td.taxCode)) {
					return { completo: false, motivo: `linea-sin-taxdetail:${tipoLista}[${i}]`, lineasResueltas: lineasResueltas };
				}

				lineasResueltas++;
			}
		}

		if (lineasEsperadas === 0) {
			return { completo: false, motivo: "sin-lineas-con-referencia", lineasResueltas: 0 };
		}

		return { completo: true, motivo: "", lineasResueltas: lineasResueltas };
	}

	/**
	 * Verificación de resultado en afterSubmit: ¿el registro guardado YA tiene en sus
	 * columnas los valores que corresponden a su propia sublist taxdetails?
	 *
	 * Lee context.newRecord — sin load, 0 GU. Verifica el RESULTADO, no quién lo escribió:
	 * por eso también detecta columnas obsoletas de una edición anterior y las manda al
	 * camino legacy. Ante cualquier duda devuelve false (el legacy siempre es correcto).
	 *
	 * @param {*} objRecord
	 * @returns {{correctas:boolean, motivo:string, verificadas:number}}
	 */
	function columnasYaCorrectas(objRecord) {

		try {
			const taxDetailsByRef = indexarTaxDetails(objRecord);

			if (taxDetailsByRef.size === 0) {
				return { correctas: false, motivo: "taxdetails-vacia", verificadas: 0 };
			}

			let verificadas = 0;

			for (const tipoLista of SUBLISTS_DESTINO) {

				const listaQuantity = objRecord.getLineCount({ sublistId: tipoLista });

				for (let i = 0; i < listaQuantity; i++) {

					const ref = objRecord.getSublistValue(tipoLista, "taxdetailsreference", i);
					const codigo = objRecord.getSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i);
					const tasa = objRecord.getSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i);

					if (!isEmpty(ref)) {
						const td = taxDetailsByRef.get(String(ref));
						if (!td || isEmpty(td.taxCode)) {
							return { correctas: false, motivo: `linea-sin-taxdetail:${tipoLista}[${i}]`, verificadas: verificadas };
						}
						if (!mismoValor(codigo, td.taxCode) || !mismoValor(tasa, td.taxRate)) {
							return { correctas: false, motivo: `columna-difiere:${tipoLista}[${i}]`, verificadas: verificadas };
						}
						verificadas++;
						continue;
					}

					// Línea de descuento: hereda de la anterior, misma regla que la escritura.
					const itemType = objRecord.getSublistValue(tipoLista, "itemtype", i);
					if (itemType == "Discount" && i > 0) {
						const codigoPrevio = objRecord.getSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i - 1);
						const tasaPrevia = objRecord.getSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i - 1);
						if (!mismoValor(codigo, codigoPrevio) || !mismoValor(tasa, tasaPrevia)) {
							return { correctas: false, motivo: `descuento-difiere:${tipoLista}[${i}]`, verificadas: verificadas };
						}
					}
				}
			}

			if (verificadas === 0) {
				return { correctas: false, motivo: "sin-lineas-con-referencia", verificadas: 0 };
			}

			return { correctas: true, motivo: "", verificadas: verificadas };

		} catch (error) {
			log.error("columnasYaCorrectas", `No se pudo verificar, se ejecuta el legacy - detalles: ${error.message}`);
			return { correctas: false, motivo: "excepcion-verificacion", verificadas: 0 };
		}
	}

	/**
	 * Comparación tolerante al formato con que NetSuite devuelve cada campo
	 * (la tasa puede volver como 22, "22.0" o "22.0%" según el tipo de columna).
	 * Un falso negativo acá sólo cuesta el camino legacy, nunca corrección.
	 */
	function mismoValor(a, b) {
		if (isEmpty(a) && isEmpty(b)) {
			return true;
		}
		if (isEmpty(a) || isEmpty(b)) {
			return false;
		}
		const na = aNumero(a);
		const nb = aNumero(b);
		if (na !== null && nb !== null) {
			return Math.abs(na - nb) < 0.0001;
		}
		return String(a).trim() === String(b).trim();
	}

	function aNumero(valor) {
		const limpio = String(valor).replace("%", "").replace(",", ".").trim();
		if (limpio === "") {
			return null;
		}
		const numero = Number(limpio);
		return isNaN(numero) ? null : numero;
	}

	function contextoLog(context, objRecord) {
		let ejecucion = "desconocido";
		try {
			ejecucion = runtime.executionContext;
		} catch (error) {
			ejecucion = "desconocido";
		}
		return `eventType=${context.type} executionContext=${ejecucion} recordType=${objRecord.type}`;
	}

	/**
	 * Propaga taxCode/taxRate de los taxdetails a las columnas custom de la sublist indicada.
	 * @param {"item" | "expense"} tipoLista
	 * @param {*} objRecord
	 * @param {Map<string, {taxDetailReference:*, taxCode:*, taxRate:*}>} taxDetailsByRef
	 */
	function setearColumnasConTaxDetails(tipoLista, objRecord, taxDetailsByRef) {
		const proceso = "setearColumnasConTaxDetails";

		if (taxDetailsByRef.size === 0) {
			log.error(proceso, `No se encuentra resultado de tax details en la transaccion, verifique por favor.`);
			return;
		}

		const listaQuantity = objRecord.getLineCount({
			sublistId: tipoLista
		});

		for (let i = 0; i < listaQuantity; i++) {

			const taxDetailReferenceItem = objRecord.getSublistValue(tipoLista, "taxdetailsreference", i);
			const itemInGroup = objRecord.getSublistValue(tipoLista, "ingroup", i);
			const itemType = objRecord.getSublistValue(tipoLista, "itemtype", i);
			const td = taxDetailsByRef.get(String(taxDetailReferenceItem));

			if (td) {

				objRecord.setSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i, td.taxCode);
				objRecord.setSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i, td.taxRate);

				if (!isEmpty(itemInGroup) && (itemInGroup == "T" || itemInGroup == true)) {

					const beforeLine = i - 1;
					const itemTypeItemBefore = objRecord.getSublistValue(tipoLista, "itemtype", beforeLine);

					if (itemTypeItemBefore == "Group") {
						objRecord.setSublistValue(tipoLista, "custcol_l598_codigo_impuesto", beforeLine, td.taxCode);
						objRecord.setSublistValue(tipoLista, "custcol_l598_tasa_impuesto", beforeLine, td.taxRate);
					}
				}
			} else if (itemType == "Discount" && i > 0) {
				// El descuento no se refleja en los taxdetails: hereda código/tasa de la línea anterior.
				const taxCodeLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i - 1);
				const taxRateLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i - 1);

				objRecord.setSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i, taxCodeLineItemBefore);
				objRecord.setSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i, taxRateLineItemBefore);

			} else {
				log.error(proceso, `No se encuentra resultado de tax reference y tax code en la linea de articulos nro: ${i} / taxDetailsReference: ${taxDetailReferenceItem}, verifique por favor.`);
			}
		}
	}

	function isEmpty(val) {
		return val === "" || val === undefined || val === "undefined" || val === null || val === "null" || (val.length === 0) || (typeof val == "object" && Object.keys(val).length === 0);
	}

	function desaplicarYAplicarNC(recType, objRecord) {
		const idTransApply = [];
		if (recType == "creditmemo" || recType == "vendorcredit") {
			const cantidadItems = objRecord.getLineCount({ sublistId: "apply" });
			for (let j = 0; j < cantidadItems; j++) {
				const aplicado = objRecord.getSublistValue({ sublistId: "apply", fieldId: "apply", line: j });
				if (aplicado == "T" || aplicado == true) {
					const internalIdLine = objRecord.getSublistValue({ sublistId: "apply", fieldId: "internalid", line: j });
					idTransApply.push({
						internalId: internalIdLine,
						line: j
					});
					objRecord.setSublistValue({ sublistId: "apply", fieldId: "apply", line: j, value: false });
				}
			}

			if (idTransApply && idTransApply.length > 0) {
				for (let j = 0; j < idTransApply.length; j++) {
					objRecord.setSublistValue({ sublistId: "apply", fieldId: "apply", line: idTransApply[j].line, value: true });
				}
			}
		}
	}

	return {
		beforeSubmit: beforeSubmit,
		afterSubmit: afterSubmit
	};
});
