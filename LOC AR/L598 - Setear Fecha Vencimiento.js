/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/error', 'N/record', 'N/search', 'N/format', '3K/utilities', 'N/runtime'],
    /**
     * @param {error} error
     * @param {record} record
     * @param {search} search
     */

    function (error, record, search, format, utilities, runtime) {

        var proceso = "Asignar URU-Fecha Vencimiento";

        /**
        * Function definition to be triggered before record is loaded.
        *
        * @param {Object} scriptContext
        * @param {Record} scriptContext.newRecord - New record
        * @param {Record} scriptContext.oldRecord - Old record
        * @param {string} scriptContext.type - Trigger type
        * @Since 2015.2
        */
        function beforeSubmit(scriptContext) {

            var procesoBefore = 'beforeSubmit';

            try {
                log.debug(procesoBefore, 'INICIO beforeSubmit');
                log.debug(procesoBefore, 'beforSubmit - TYPE: ' + scriptContext.newRecord.type + ' / EVENT: ' + scriptContext.type);

                if ((scriptContext.type == 'create' || scriptContext.type == 'edit') && (scriptContext.newRecord.type == 'vendorcredit')) {

                    let objRecord = scriptContext.newRecord;
                    let idVendor = objRecord.getValue('entity');
                    let trandate = objRecord.getValue('trandate');
                    let uruFechaVencimiento = '';
                    log.debug(procesoBefore, 'idVendor: ' + idVendor + ' - trandate: ' + trandate);

                    let fieldLookVendorTerms = search.lookupFields({
                        type: search.Type.VENDOR,
                        id: idVendor,
                        columns: ['terms']
                    });

                    log.debug(procesoBefore, 'terminos proveedor: ' + JSON.stringify(fieldLookVendorTerms));

                    if (!utilities.isEmpty(fieldLookVendorTerms) && !utilities.isEmpty(fieldLookVendorTerms.terms) && fieldLookVendorTerms.terms.length > 0) {

                        // Get Term Days
                        var fieldLookUpDaysUntil = search.lookupFields({
                            type: search.Type.TERM,
                            id: fieldLookVendorTerms.terms[0].value,
                            columns: ['daysuntilnetdue']
                        });

                        log.debug(proceso, 'fieldLookUpDaysUntil: ' + JSON.stringify(fieldLookUpDaysUntil));

                        if (!utilities.isEmpty(fieldLookUpDaysUntil) && !utilities.isEmpty(fieldLookUpDaysUntil.daysuntilnetdue)) {

                            // Parse trandate
                            var parsedDate = format.parse({
                                value: trandate,
                                type: format.Type.DATE,
                            });

                            log.debug(proceso, 'parsedDate: ' + parsedDate);

                            uruFechaVencimiento = applyTermdays(parsedDate, fieldLookUpDaysUntil.daysuntilnetdue);

                        } else {
                            // Set URU-Fecha Vencimiento = TranDate Since The Vendor Has Not Terms Set
                            uruFechaVencimiento = trandate;
                        }
                    } else {
                        // Set URU-Fecha Vencimiento = TranDate Since The Vendor Has Not Terms Set
                        uruFechaVencimiento = trandate;
                    }

                    log.debug(proceso, 'uruFechaVencimiento: ' + uruFechaVencimiento);

                    objRecord.setValue('custbody_l598_fecha_venc_retenc', uruFechaVencimiento);
                }

                log.debug(procesoBefore, 'FIN beforeSubmit');

            } catch (error) {
                log.error(procesoBefore, 'Error NetSuite Excepcion - Detalles error: ' + error.message);
            }
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

            log.audit(proceso, 'aftersubmit - INICIO');

            try {

                log.audit(proceso, 'TYPE: ' + scriptContext.newRecord.type + ' / ID: ' + scriptContext.newRecord.id + ' / EVENT: ' + scriptContext.type);

                if ((scriptContext.type == 'create' || scriptContext.type == 'edit') && (scriptContext.newRecord.type != 'vendorcredit')) {
                    /*
                    * ASSIGN DUEDATE TO TRANSACTION
                    */

                    // Get Field Values
                    var recObjet = scriptContext.newRecord;
                    var trandate = recObjet.getValue({ fieldId: 'trandate' });
                    var uruFechaVencimiento = '';

                    // Get Vendor Line
                    var vendorinfo = getTransactionVendor(recObjet.id, recObjet.type);
                    log.debug(proceso, "getTransactionVendor RESPONSE: " + JSON.stringify(vendorinfo));

                    if ((!utilities.isEmpty(vendorinfo) && vendorinfo.data.length == 1)) {
                        // Get Vendor Info

                        log.debug(proceso, 'trandate: ' + trandate);

                        if (!utilities.isEmpty(vendorinfo.data[0].vendorterms)) {

                            // Get Term Days
                            var fieldLookUp = search.lookupFields({
                                type: search.Type.TERM,
                                id: vendorinfo.data[0].vendorterms,
                                columns: ['daysuntilnetdue']
                            });

                            log.debug(proceso, 'fieldLookUp: ' + JSON.stringify(fieldLookUp));

                            if (!utilities.isEmpty(fieldLookUp) && !utilities.isEmpty(fieldLookUp.daysuntilnetdue)) {

                                // Parse trandate
                                var parsedDate = format.parse({
                                    value: trandate,
                                    type: format.Type.DATE,
                                });

                                log.debug(proceso, 'parsedDate: ' + parsedDate);

                                uruFechaVencimiento = applyTermdays(parsedDate, fieldLookUp.daysuntilnetdue);
                            } else {
                                // Set URU-Fecha Vencimiento = TranDate Since The Vendor Has Not Terms Set
                                uruFechaVencimiento = trandate;
                            }
                        } else {
                            // Set URU-Fecha Vencimiento = TranDate Since The Vendor Has Not Terms Set
                            uruFechaVencimiento = trandate;
                        }

                        log.debug(proceso, 'uruFechaVencimiento: ' + uruFechaVencimiento);

                        // Set Uru Due Date In Transaction
                        record.submitFields({
                            type: recObjet.type,
                            id: recObjet.id,
                            values: {
                                custbody_l598_fecha_venc_retenc: uruFechaVencimiento,
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    } else {
                        log.error(proceso, 'No existe proveedor de línea o existe más de un proveedor en la transaccion.');
                    }
                }
            } catch (e) {
                log.error(proceso, 'Netsuite Exception: ' + JSON.stringify(e.message));
            }

            log.audit(proceso, 'aftersubmit - END');
        }

        function getTransactionVendor(recId, recType) {
            var response = { error: false, mensaje: '', data: [] };

            try {
                var filtros = [];

                var filtro = {};
                filtro.name = 'internalid';
                filtro.operator = 'IS';
                filtro.values = recId;
                filtros.push(filtro);

                if (recType == 'vendorcredit') {
                    var objResultSet = utilities.searchSavedPro('customsearch_3k_buscar_prove_tran', filtros);
                } else {
                    var objResultSet = utilities.searchSavedPro('customsearch_3k_buscar_prove_linea', filtros);
                }

                if (!objResultSet.error) {

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {

                        // Loop Results 
                        for (var i = 0; !utilities.isEmpty(resultSet) && i < resultSet.length; i++) {

                            var data = {};
                            data.vendorname = resultSet[i].getValue({ name: resultSearch.columns[0] });
                            data.vendorid = resultSet[i].getValue({ name: resultSearch.columns[1] });
                            data.vendorterms = resultSet[i].getValue({ name: resultSearch.columns[2] });

                            response.data.push(data);
                        }

                        //Delete Duplicate
                        response.data = response.data.filter((v, i, a) => a.findIndex(t => (t.vendorid === v.vendorid)) === i);
                    }
                } else {
                    response.error = true;
                    response.mensaje = 'Error Consultando: ' + objResultSet.descripcion;
                }
            } catch (e) {
                response.error = true;
                response.mensaje = "Netsuite Excepción - " + e.message.toString();
            }

            return response;
        }

        function applyTermdays(date, termdays) {
            date.setDate(date.getDate() + parseInt(termdays));
            return new Date(date.getTime());
        }

        return {
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });