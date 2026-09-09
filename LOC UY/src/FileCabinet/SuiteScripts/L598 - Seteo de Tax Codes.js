/**
 * @format
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(["N/record", "N/search"], function (record, search) {
	/* global define log */
	/* eslint-disable quotes */
	/**
	 * @param {UserEventContext.afterSubmit} context
	 */
	const afterSubmit = (context) => {

		const proceso = "afterSubmit";

		try {
			if (context.type != context.UserEventType.DELETE) {

				log.debug(proceso, `INICIO - afterSubmit / id interno: ${context.newRecord.id} / type: ${context.newRecord.type}`);

				const objRecord = record.load({
					type: context.newRecord.type,
					id: context.newRecord.id,
				});

				const taxDetailsQuantity = objRecord.getLineCount({
					sublistId: "taxdetails"
				});

				const arrayTaxDetails = [];
				const arrayTaxCodes = [];

				// Obtencion de taxCodes por taxDetails
				for (let i = 0; i < taxDetailsQuantity; i++) {
					const infoTaxDetail = {};
					infoTaxDetail.taxDetailReference = objRecord.getSublistValue("taxdetails", "taxdetailsreference", i);
					infoTaxDetail.taxCode = objRecord.getSublistValue("taxdetails", "taxcode", i);
					infoTaxDetail.taxRate = objRecord.getSublistValue("taxdetails", "taxrate", i);
					arrayTaxCodes.push(infoTaxDetail.taxCode);
					arrayTaxDetails.push(infoTaxDetail);
				}

				log.debug(proceso, `arrayTaxDetails: ${JSON.stringify(arrayTaxDetails)}`);
				log.debug(proceso, `arrayTaxCodes: ${JSON.stringify(arrayTaxCodes)}`);

				setearColumnasConTaxDetails("item", objRecord, arrayTaxDetails, taxDetailsQuantity);
				setearColumnasConTaxDetails("expense", objRecord, arrayTaxDetails, taxDetailsQuantity);

				desaplicarYAplicarNC(context.newRecord.type, objRecord);

				const idRec = objRecord.save();

				log.debug(proceso, `FIN - afterSubmit / id interno: ${idRec} / type: ${context.newRecord.type}`);
			}
		} catch (error) {
			log.error(proceso, `Error NetSuite Excepcion - detalles: ${error.message}`);
		}
	};

	/**
	 *
	 * @param {"item" | "expense"} tipoLista
	 * @param {*} objRecord
	 * @param {*} arrayTaxDetails
	 */
	function setearColumnasConTaxDetails(tipoLista, objRecord, arrayTaxDetails, taxDetailsQuantity) {
		const proceso = "setearColumnasConTaxDetails";
		log.debug(proceso + " entrar", tipoLista);
		// Obtencion de taxCodes por items
		if (arrayTaxDetails.length > 0) {
			const listaQuantity = objRecord.getLineCount({
				sublistId: tipoLista
			});

			log.debug(proceso, `${tipoLista}Quantity: ${listaQuantity} / taxDetailsQuantity: ${taxDetailsQuantity}`);

			for (let i = 0; i < listaQuantity; i++) {

				const taxDetailReferenceItem = objRecord.getSublistValue(tipoLista, "taxdetailsreference", i);
				const itemInGroup = objRecord.getSublistValue(tipoLista, "ingroup", i);
				const taxCodeItemResult = arrayTaxDetails.filter(obj => { return (obj.taxDetailReference == taxDetailReferenceItem); });
				const itemType = objRecord.getSublistValue(tipoLista, "itemtype", i);

				log.debug(proceso, `line nro: ${i} / taxCodeItemResult: ${JSON.stringify(taxCodeItemResult)} / itemType: ${itemType} / itemInGroup: ${itemInGroup}`);

				if (!isEmpty(taxCodeItemResult) && taxCodeItemResult.length > 0) {

					objRecord.setSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i, taxCodeItemResult[0].taxCode);
					objRecord.setSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i, taxCodeItemResult[0].taxRate);

					if (!isEmpty(itemInGroup) && (itemInGroup == "T" || itemInGroup == true)) {

						const beforeLine = i - 1;
						const itemTypeItemBefore = objRecord.getSublistValue(tipoLista, "itemtype", beforeLine);
						log.debug(proceso, `beforeLine: ${beforeLine} / itemTypeItemBefore: ${itemTypeItemBefore}`);

						if (itemTypeItemBefore == "Group") {
							objRecord.setSublistValue(tipoLista, "custcol_l598_codigo_impuesto", beforeLine, taxCodeItemResult[0].taxCode);
							objRecord.setSublistValue(tipoLista, "custcol_l598_tasa_impuesto", beforeLine, taxCodeItemResult[0].taxRate);
						}
					}
				} else if (itemType == "Discount" && i > 0) {
					// Verificacion de si es mayor a la primera posicion para verificar si es descuento.
					// Esto se realiza porque el descuento no se refleja en el tax details.

					const taxCodeLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i - 1);
					const taxRateLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i - 1);

					objRecord.setSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i, taxCodeLineItemBefore);
					objRecord.setSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i, taxRateLineItemBefore);

				} else {
					log.error(proceso, `No se encuentra resultado de tax reference y tax code en la linea de articulos nro: ${i} / taxDetailsReference: ${taxDetailReferenceItem}, verifique por favor.`);
				}
			}

			for (let i = 0; i < listaQuantity; i++) {
				log.debug(proceso, `indice: ${i} / codigo impuesto: ${objRecord.getSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i)} / tasa: ${objRecord.getSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i)}`);
			}
		} else {
			log.error(proceso, `No se encuentra resultado de tax details en la transaccion, verifique por favor.`);
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

			log.debug("desaplicarYAplicarNC", "LINE 153 - idTransApply: " + JSON.stringify(idTransApply));
			if (idTransApply && idTransApply.length > 0) {
				for (let j = 0; j < idTransApply.length; j++) {
					log.debug("desaplicarYAplicarNC", "LINE 156 - INVOICE DATA APPLIED (T): " + idTransApply[j].internalId);
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
