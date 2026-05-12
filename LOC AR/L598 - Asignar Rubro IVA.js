/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(
    [
        'N/record', 'N/error', 'N/search', 'L598/utilities', 'N/runtime'
    ],
    function (record, error, search, utilities, runtime) {

        /**
         * Function definition to be triggered before record is save.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

            var proceso = 'afterSubmit';
            var name = 'NOTICE (SuiteScript)';

            var recId = scriptContext.newRecord.id;
            var recType = scriptContext.newRecord.type;
            var script = runtime.getCurrentScript();
            var rubroPublicidad = script.getParameter("custscript_l598_rubro_publicidad");
            var jsonItemsRubros = [];
            var jsonExpenseRubros = [];
            log.debug(proceso, 'INICIO - function ' + proceso);

            try {

                if (scriptContext.type == 'create' || scriptContext.type == 'edit') {
                    var objRecord = record.load({ type: recType, id: recId });
                    var idFieldIVA = 'custcol_l598_rubro_iva';
                    var subsidiaria = null;
                    var isOneWorld = utilities.l598esOneworld();

                    if (isOneWorld) {
                        subsidiaria = objRecord.getValue({ fieldId: 'subsidiary' });
                    }

                    var idSavedSearchTaxCodes = 'customsearch_l598_rubros_iva_codigos_imp';
                    var resultsRubrosIVATaxCodes = getRubrosIVA(idSavedSearchTaxCodes, null); // Pasar el param subsidiaria en null

                    var idSavedSearchAccount = 'customsearch_l598_rubros_iva_cuentas_con';
                    var resultsRubrosIVAExpensas = getRubrosIVA(idSavedSearchAccount, subsidiaria);

                    log.audit(proceso, 'resultsRubrosIVATaxCodes: ' + JSON.stringify(resultsRubrosIVATaxCodes));
                    log.audit(proceso, 'resultsRubrosIVAExpensas: ' + JSON.stringify(resultsRubrosIVAExpensas));



                    /* const itemsQuantity = objRecord.getLineCount({
                        sublistId: 'item'
                    });

                    for (let i = 0; i < itemsQuantity; i++) {

                        log.debug(proceso, `indice: ${i} / codigo impuesto: ${objRecord.getSublistValue('item', 'custcol_l598_codigo_impuesto', i)} / tasa: ${objRecord.getSublistValue('item', 'custcol_l598_tasa_impuesto', i)}`);

                    } */


                    // ---------------------- INICIO - Verificación de sublista de ITEMS para setear Rubros IVA ---------------
                    var cantidadItems = objRecord.getLineCount({
                        sublistId: 'item'
                    });

                    log.audit(proceso, 'Cantidad de items: ' + cantidadItems);

                    if (!resultsRubrosIVATaxCodes.error && resultsRubrosIVATaxCodes.results.length > 0 && cantidadItems > 0) {
                        var seteoRubrosIVATaxcodes = setearRubrosIVA(cantidadItems, objRecord, 'item', idFieldIVA, '', resultsRubrosIVATaxCodes.results, recType);

                        if (!seteoRubrosIVATaxcodes.error) {
                            log.debug(proceso, 'Seteados con éxito los rubros de IVA en líneas de items');
                        } else {
                            log.error(proceso, seteoRubrosIVATaxcodes.mensaje);
                            // createError(name, seteoRubrosIVATaxcodes.mensaje, true);
                        }
                    }
                    // ---------------------- FIN - Verificación de sublista de ITEMS para setear Rubros IVA ---------------


                    // ---------------------- INICIO - Verificación de sublista de GASTOS para setear Rubros IVA ---------------
                    var cantidadExpensas = objRecord.getLineCount({
                        sublistId: 'expense'
                    });

                    log.audit(proceso, 'Cantidad de expensas: ' + cantidadExpensas);

                    if ((!resultsRubrosIVATaxCodes.error && resultsRubrosIVATaxCodes.results.length > 0 || !resultsRubrosIVAExpensas.error && resultsRubrosIVAExpensas.results.length > 0) && cantidadExpensas > 0) {
                        var seteoRubrosIVAExpenses = setearRubrosIVA(cantidadExpensas, objRecord, 'expense', idFieldIVA, resultsRubrosIVAExpensas.results, resultsRubrosIVATaxCodes.results, recType);

                        if (!seteoRubrosIVAExpenses.error) {
                            log.debug(proceso, 'Seteados con éxito los rubros de IVA en líneas de gastos');
                        } else {
                            log.error(proceso, seteoRubrosIVAExpenses.mensaje);
                            // createError(name, seteoRubrosIVAExpenses.mensaje, true);
                        }
                    }
                    // ---------------------- FIN - Verificación de sublista de GASTOS para setear Rubros IVA ---------------

                    _refreshApplyTranList(objRecord, recType);
                    /** Modificación Publicidad */
                    if(recType == 'vendorbill' || recType == 'vendorcredit'){
                        var transactionSearchObj = search.create({
                            type: "transaction",
                            filters:
                            [
                               ["mainline","is","F"], 
                               "AND", 
                               ["internalid","anyof",recId]
                            ],
                            columns:
                            [
                               search.createColumn({
                                  name: "item",
                                  summary: "GROUP",
                                  label: "Item"
                               }),
                               search.createColumn({
                                  name: "custitem_l598_aplica_publicidad",
                                  join: "item",
                                  summary: "GROUP",
                                  label: "UY - Aplica Concetos de Publicidad"
                               })
                            ]
                         });
                       
                        var searchResult = transactionSearchObj.run().getRange({
                                            start: 0,
                                            end: 1000
                                        });

                        searchResult.forEach(function(result){
                            jsonItemsRubros.push({
                                "internalID": result.getValue({name: "item", summary: "group"}),
                                "aplicaPublicidad": result.getValue({name: "custitem_l598_aplica_publicidad", join: "item", summary: "GROUP"}),
                            })
                        })

                        log.debug('Resultados de la busqueda', JSON.stringify(jsonItemsRubros))

                        var lineCount = objRecord.getLineCount({ sublistId: "item" });

                        for (var i = 0; i < lineCount; i++) {

                            var idItem = objRecord.getSublistValue({
                                sublistId: "item",
                                fieldId: "item",
                                line: i
                            });

                            var resultado = jsonItemsRubros.filter(function(obj) {return (obj.internalID == idItem);});
                            log.debug('resultado', resultado)
                            if(resultado[0].aplicaPublicidad){
                                objRecord.setSublistValue({
                                    sublistId: "item",
                                    fieldId: "custcol_l598_rubro_iva",
                                    line: i,
                                    value: rubroPublicidad
                                });
                            }

                        }

                        var lineCountExpense = objRecord.getLineCount({ sublistId: "expense" });
                        
                        if(lineCountExpense > 0){

                            var accountSearchObj = search.create({
                                type: "account",
                                filters:
                                [
                                   ["custrecord_l598_aplica_publicidad","is","T"]
                                ],
                                columns:
                                [
                                   search.createColumn({name: "internalid", label: "Internal ID"})
                                ]
                             });

                             var searchResult = accountSearchObj.run().getRange({
                                start: 0,
                                end: 1000
                            });

                            searchResult.forEach(function(result){
                                jsonExpenseRubros.push({
                                    "internalID": result.getValue({name: "internalid"})
                                })
                            })

                            for (var i = 0; i < lineCountExpense; i++) {

                                var idAccount = objRecord.getSublistValue({
                                    sublistId: "expense",
                                    fieldId: "account",
                                    line: i
                                });
    
                                var resultado = jsonExpenseRubros.filter(function(obj) {return (obj.internalID == idAccount);});
                                log.debug('resultado', resultado)
                                if(resultado.length > 0){
                                    objRecord.setSublistValue({
                                        sublistId: "expense",
                                        fieldId: "custcol_l598_rubro_iva",
                                        line: i,
                                        value: rubroPublicidad
                                    });
                                }
    
                            }


                        }
                    }

                    objRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });


                }
            } catch (error) {
                var mensajeError = 'Error NetSuite Excepción - Error en la función : ' + proceso + ' al setear Rubros de IVA - Detalles: ' + error.message;
                log.error(proceso, mensajeError);
                // createError(name, mensajeError, true);
            }

            log.debug(proceso, 'FIN - function ' + proceso);
            return true;
        }

        function _refreshApplyTranList(objRecord, recType) {
            try {
                var idTransApply = []
                if (recType == "creditmemo") {
                    var cantidadItems = objRecord.getLineCount({ sublistId: 'apply' });
                    for (var j = 0; j < cantidadItems; j++) {
                        var aplicado = objRecord.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: j });
                        if (aplicado == true || aplicado == 'T') {
                            var internalIdLine = objRecord.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: j });
                            idTransApply.push({
                                internalId: internalIdLine,
                                line: j
                            });
                            objRecord.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: j, value: false });
                        }
                    }

                    log.debug('idTransApply', JSON.stringify(idTransApply));
                    if (!utilities.isEmpty(idTransApply) && idTransApply.length > 0) {
                        for (var j = 0; j < idTransApply.length; j++) {
                            log.debug('idTransApply[j].internalId', idTransApply[j].internalId);
                            objRecord.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: idTransApply[j].line, value: true });
                        }
                    }
                }
            } catch (error) {
                var mensajeError = 'Error NetSuite Excepción - Error en la función : _refreshApplyTranList - Detalles: ' + error.message;
                log.error('Error', mensajeError);
            }
        }

        /**
         * Devuelve los resultados del seteo de Rubro IVA en las líneas de Gastos o Artículos
         * @param {int} cantidadLineas - Cantidad de líneas de Gastos o Artículos
         * @param {recordType} objRecord - Registro asociado a generar
         * @param {string} idSublist - Id sublista (item / expenses)
         * @param {string} idFieldKey - Id campo clave (account / taxcode)
         * @param {string} idFieldIVA - Id campo rubro IVA ()
         * @param {Array} savedSearchResults - Array con resultados del SS (account / taxcode)
         * 
         * @return {object} objetoRespuesta
         * @property {string} objetoRespuesta.mensaje - Mensaje de Respuesta.
         * @property {Boolean} objetoRespuesta.error - Verdadero si existe algún error en el proceso, falso si no existe ninguno.
         */
        function setearRubrosIVA(cantidadLineas, objRecord, idSublist, idFieldIVA, savedSearchResultsExpensas, savedSearchResultsTaxCode, recType) {

            var proceso = 'setearRubrosIVA';
            var objetoRespuesta = { mensaje: '', error: false };

            //log.debug(proceso, 'INICIO - function ' + proceso + ' - parámetros - cantidadLineas: ' + cantidadLineas + ' - objRecord: ' + objRecord + ' - idSublist: ' + idSublist + ' - idFieldKey: ' + idFieldKey + ' - idFieldIVA: ' + idFieldIVA + ' - savedSearchResults: ' + JSON.stringify(savedSearchResults));
            log.debug(proceso, 'INICIO - function ' + proceso + ' - parámetros - cantidadLineas: ' + cantidadLineas + ' - objRecord: ' + objRecord + ' - idSublist: ' + idSublist + ' - idFieldIVA: ' + idFieldIVA + ' - savedSearchResultsExpensas: ' + JSON.stringify(savedSearchResultsExpensas) + ' - savedSearchResultsTaxCode: ' + JSON.stringify(savedSearchResultsTaxCode));

            try {
                for (var i = 0; i < cantidadLineas; i++) {

                    var rubroIVA = objRecord.getSublistValue({ sublistId: idSublist, fieldId: idFieldIVA, line: i });
                    var rubroIVAEquivalente = objRecord.getSublistValue({ sublistId: idSublist, fieldId: 'custcol_l598_rubro_iva_equival_ventas', line: i });
                    var esFacturable = objRecord.getSublistValue(idSublist, 'isbillable', i);
                    var customer = objRecord.getSublistValue(idSublist, 'customer', i);
                    //var fieldKey = objRecord.getSublistValue({ sublistId: idSublist, fieldId: idFieldKey, line: i });

                    var fieldKey = '';
                    var savedSearchResults = '';

                    var fieldTaxCode = objRecord.getSublistValue({ sublistId: idSublist, fieldId: 'custcol_l598_codigo_impuesto', line: i }); // Cambiar este ID x el nuevo campo
                    var fieldAccount = objRecord.getSublistValue({ sublistId: idSublist, fieldId: 'account', line: i });

                    if (!utilities.isEmpty(fieldTaxCode) || !utilities.isEmpty(fieldAccount)) {

                        if (!utilities.isEmpty(fieldTaxCode)) {
                            fieldKey = fieldTaxCode;
                            savedSearchResults = savedSearchResultsTaxCode;
                        } else {
                            fieldKey = fieldAccount;
                            savedSearchResults = savedSearchResultsExpensas;
                        }

                        // if (utilities.isEmpty(rubroIVA) || (recType == 'vendorbill' && !utilities.isEmpty(esFacturable) && !utilities.isEmpty(customer) && (esFacturable == true || esFacturable == 'T'))) {

                        var rubroIVAFinal = savedSearchResults.filter(function (obj) {
                            return (obj.idFieldKey == fieldKey);
                        });

                        //Si es Expensas consultar si account tiene rubro asociado, el rubro asociado a la cuenta es el que predomina sobre el rubro asociado al taxcode
                        if (idSublist == 'expense') {
                            fieldKey = fieldAccount;
                            savedSearchResults = savedSearchResultsExpensas;

                            var rubroIVACuenta = savedSearchResults.filter(function (obj) {
                                return (obj.idFieldKey == fieldKey);
                            });

                            if (!utilities.isEmpty(rubroIVACuenta) && rubroIVACuenta.length > 0) {
                                rubroIVAFinal = rubroIVACuenta;
                            }
                        }

                        log.debug(proceso, 'rubroIVAFinal: ' + JSON.stringify(rubroIVAFinal));

                        if (!utilities.isEmpty(rubroIVAFinal) && rubroIVAFinal.length > 0) {
                            // if (utilities.isEmpty(rubroIVA)) {
                            if (!utilities.isEmpty(rubroIVAFinal[0].idRubroIVA)) {
                                let rubro = getRubro(recType, rubroIVAFinal, idSublist);
                                objRecord.setSublistValue({ sublistId: idSublist, fieldId: idFieldIVA, line: i, value: rubro });
                            }
                            // }

                            if (recType == 'vendorbill' && !utilities.isEmpty(rubroIVAFinal[0].rubroIVAEquivalente) && !utilities.isEmpty(esFacturable) && !utilities.isEmpty(customer) && (esFacturable == true || esFacturable == 'T')) {
                                objRecord.setSublistValue({ sublistId: idSublist, fieldId: 'custcol_l598_rubro_iva_equival_ventas', line: i, value: rubroIVAFinal[0].rubroIVAEquivalente });
                            }
                        } else {
                            objRecord.setSublistValue({ sublistId: idSublist, fieldId: idFieldIVA, line: i, value: '' });
                        }
                        //}
                    }
                }
            } catch (error) {
                objetoRespuesta.error = true;
                objetoRespuesta.mensaje = 'Error NetSuite Excepción - Error al setear valores de rubros de IVA en líneas de Artículos y Gastos - Detalles: ' + error.message;
                log.error(proceso, objetoRespuesta.mensaje);
            }

            log.debug(proceso, 'FIN - function ' + proceso);
            return objetoRespuesta;
        }

        function getRubro(paramType, paramJson, paramSublist) {
            var proceso = 'getRubro';
            try {
                if (paramType == 'vendorbill' || paramType == 'vendorcredit'){
                    return paramJson[0].idRubroIVA
                }else{
                    return paramJson[0].rubroIVAEquivalente
                }

            }catch(e){
                log.error(proceso, e)
            }
        }

        /**
         * Retorna los resultados de las búquedas guardadas de taxcodes/accounts
         * @param {string} idSavedSearch - ID del Saved Search a invocar
         * @param {string} subsidiaria - Subsidiaria de la transacción
         *
         * @return {object} objetoRespuesta
         * @property {string} objetoRespuesta.mensaje - Mensaje de Respuesta.
         * @property {Boolean} objetoRespuesta.error - Verdadero si existe algún error en el proceso, falso si no existe ninguno.
         * @property {Array} objetoRespuesta.results - Array de resultados obtenidos del SS
         */
        function getRubrosIVA(idSavedSearch, subsidiaria) {

            var proceso = 'getRubrosIVA';
            var objetoRespuesta = { mensaje: '', error: false, results: [] };

            log.debug(proceso, 'INICIO - function ' + proceso + ' - subsidiaria: ' + subsidiaria);

            try {

                var filtros = [];
                if (!utilities.isEmpty(subsidiaria)) {
                    var filtro = {};
                    filtro.name = 'subsidiary';
                    filtro.operator = 'IS';
                    filtro.values = subsidiaria;
                    filtros.push(filtro);
                }

                var objResultSet = utilities.searchSavedPro(idSavedSearch, filtros);

                if (objResultSet.error) {
                    objetoRespuesta.error = true;
                    objetoRespuesta.mensaje = 'Error Consultando searchSavedPro - ' + idSavedSearch + ' - Error: ' + objResultSet.descripcion;
                    log.error(proceso, objetoRespuesta.mensaje);
                } else {

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {
                        for (var i = 0; i < resultSet.length; i++) {

                            objetoRespuesta.results[i] = {};

                            objetoRespuesta.results[i].idFieldKey = resultSet[i].getValue({
                                name: resultSearch.columns[0]
                            }); // ID interno del código de impuesto o la cuenta contable

                            objetoRespuesta.results[i].nombre = resultSet[i].getValue({
                                name: resultSearch.columns[1]
                            }); // Nombre del código de impuesto o cuenta contable

                            objetoRespuesta.results[i].idRubroIVA = resultSet[i].getValue({
                                name: resultSearch.columns[2]
                            }); // ID interno del rubro IVA del código de impuesto o la cuenta contable

                            objetoRespuesta.results[i].rubroIVAEquivalente = resultSet[i].getValue({
                                name: resultSearch.columns[3]
                            }); // ID interno del rubro IVA equivalente en ventas/compras
                            
                        }
                    } else {
                        log.debug(proceso, 'No se encontró información para la búsqueda guardada invocada.');
                    }
                }
            } catch (error) {
                objetoRespuesta.error = true;
                objetoRespuesta.mensaje = 'Error NetSuite Excepción - Error al obtener valores de rubros de IVA en Códigos de Impuestos y Cuentas - Detalles: ' + error.message;
                log.error(proceso, objetoRespuesta.mensaje);
            }

            log.debug(proceso, 'FIN - function ' + proceso);
            return objetoRespuesta;
        }

        /**
         * Crear Error
         * @param {string} nameError - Título del error
         * @param {string} mensajeError - Detalle del error
         * @param {Boolean} notify - Notificar
         */
        function createError(nameError, mensajeError, notify) {

            throw (error.create({
                name: nameError,
                message: mensajeError,
                notifyOff: notify
            })
            );

        }

        return {
            afterSubmit: afterSubmit
        };
    });