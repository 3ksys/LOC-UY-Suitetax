/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
 define(['N/runtime'],

    (runtime) => {

        // *@NAmdConfig /SuiteScripts/configuration_taxcode_itemgroup.json


        /**
        * Function definition to be triggered after record is submit.
        *
        * @param {Object} scriptContext
        * @param {Record} scriptContext.newRecord - New record
        * @param {Record} scriptContext.oldRecord - Old record
        * @param {string} scriptContext.type - Trigger type
        * @Since 2015.2
        */
        let beforeSubmit = (scriptContext) => {

            let proceso = 'beforeSubmit';
            let mensajeError = '';

            try {
                let currentScript = runtime.getCurrentScript();

                if (scriptContext.type != scriptContext.UserEventType.DELETE) {

                    log.debug(proceso, `INICIO - beforeSubmit - validacion de codigos de impuestos - unidades disponibles: ${currentScript.getRemainingUsage()}`);
                    let objRecord = scriptContext.newRecord;
                    let type = objRecord.type;
                    let cantidadItems = objRecord.getLineCount('item');
                    let taxCodeHeaderGroup = null;
                    let check_item_group = objRecord.getValue('custbody_l598_desactiv_item_group'); // campos para Desactivar la activación de artículos de grupo
                    log.debug(proceso, `check para Desactivar item group: ${check_item_group}`);

                    if (!check_item_group) {
                        for (let i = 0; i < cantidadItems; i++) {
                            let tipoItem = objRecord.getSublistValue('item', 'itemtype', i);
                            let itemInGroup = convertToBoolean(objRecord.getSublistValue('item', 'ingroup', i));
    
                            if (tipoItem == 'Group') {
                                taxCodeHeaderGroup = objRecord.getSublistValue('item', 'custcol_l598_codigo_impuesto', i);
                                log.debug(proceso, `taxcode header item group: ${taxCodeHeaderGroup} - linea n: ${i}`);
    
                            } else if (itemInGroup == true && tipoItem != 'EndGroup') {
                                let taxCodeLineGroup = objRecord.getSublistValue('item', 'custcol_l598_codigo_impuesto', i);
                                log.debug(proceso, `taxcode header item group: ${taxCodeHeaderGroup} - taxcode line item group: ${taxCodeLineGroup} - linea n: ${i}`);
                                let amount = objRecord.getSublistValue('item', 'amount', i);
    
                                if (!isEmpty(taxCodeLineGroup)) {
                                    objRecord.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'amount',
                                        line: i,
                                        value: amount
                                    });
                                    objRecord.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_l598_codigo_impuesto',
                                        line: i,
                                        value: taxCodeHeaderGroup
                                    });
                                }
                            } else if (tipoItem == 'EndGroup') {
                                taxCodeHeaderGroup = null;
                            }
                        }
                    }
                    

                    log.debug(proceso, `FIN - beforeSubmit - validacion de codigos de impuestos - unidades disponibles: ${currentScript.getRemainingUsage()}`);
                }
            } catch (error) {
                if (!isEmpty(mensajeError)) {
                    log.error(proceso, mensajeError);
                    throw mensajeError;
                } else {
                    log.error(proceso, 'Ocurrió un error inesperado en el proceso, detalles: ' + error.message);
                }
            }
        }

        let convertToBoolean = (string) => {

            // let newBoolean = (string == 'F' || string == false) ? false : true;

            return ((isEmpty(string) || string == 'F' || string == false) ? false : true);
        }

        let isEmpty = (value) => {

            return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
        }

        return {
            beforeSubmit: beforeSubmit,
        };
    });