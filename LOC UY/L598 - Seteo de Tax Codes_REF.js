/**
 * @format
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * ============================================================================
 * REFACTOR (Mobeats) de "L598 - Seteo de Tax Codes".
 * ----------------------------------------------------------------------------
 * Alcance: B (performance) + C (estándares 2.1) + D (mantenibilidad).
 * Comportamiento preservado (mismos custcol_l598_codigo_impuesto/tasa por línea).
 *
 * Cambios aplicados:
 *   B1  filter O(n×m) dentro del loop -> Map indexado O(1) (misma semántica "primer match gana").
 *   B2  eliminado el 2º loop de solo-logging y los log.debug de dump (ruido en cada transacción).
 *   C1  eliminado N/search del define (se importaba pero no se usaba).
 *   D1  eliminado arrayTaxCodes (sólo alimentaba un log).
 *
 * NO incluido — requiere aprobación de Tekiio (ver docs/registro-aprobaciones.md):
 *   STC-A1  mover afterSubmit -> beforeSubmit para eliminar record.load()+save() (criterio #8, ~30 GU/trans.).
 *   STC-A2  manejo de error del save.
 *   STC-A3  múltiples taxdetails por línea (se conserva el comportamiento actual: primer match).
 *
 * NO tocado (cambiaría comportamiento): isEmpty local (reglas propias sobre arrays/strings),
 *   desaplicarYAplicarNC (workaround de negocio en NC), beforeSubmit ("NO ELIMINAR").
 * ============================================================================
 */
define(["N/record"], function (record) {
	/* global define log */
	/* eslint-disable quotes */
	/**
	 * @param {UserEventContext.afterSubmit} context
	 */
	const afterSubmit = (context) => {

		const proceso = "afterSubmit";

		try {
			if (context.type != context.UserEventType.DELETE) {

				const objRecord = record.load({
					type: context.newRecord.type,
					id: context.newRecord.id,
				});

				const taxDetailsQuantity = objRecord.getLineCount({
					sublistId: "taxdetails"
				});

				// Índice taxdetailsreference -> { taxCode, taxRate }. "Primer match gana",
				// misma semántica que el filter(...)[0] original, pero en O(1).
				const taxDetailsByRef = new Map();
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

				setearColumnasConTaxDetails("item", objRecord, taxDetailsByRef);
				setearColumnasConTaxDetails("expense", objRecord, taxDetailsByRef);

				desaplicarYAplicarNC(context.newRecord.type, objRecord);

				objRecord.save();
			}
		} catch (error) {
			log.error(proceso, `Error NetSuite Excepcion - detalles: ${error.message}`);
		}
	};

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

	// ! NO ELIMINAR FUNCION
	function beforeSubmit() {
		// si no existo, no ando c:
		log.audit("beforeSubmit", "ingreso beforeSubmit NO ELIMINAR");
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
		afterSubmit: afterSubmit,
		beforeSubmit: beforeSubmit
	};
});
