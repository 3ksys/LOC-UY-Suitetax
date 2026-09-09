/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/error', 'N/record', 'L598/utilities', 'N/runtime', 'N/currency'],

    function (error, record, utilities, runtime, currency) {

        var proceso = "Setear Unidad Indexada";

        function afterSubmit(scriptContext) {

            log.audit(proceso, 'INICIO - afterSubmit');
            var currScript = runtime.getCurrentScript();
            log.debug(proceso, 'Inicio - Remaining governance units: ' + currScript.getRemainingUsage() + ' - Date: ' + new Date());

            try {

                if (scriptContext.type == 'create' || scriptContext.type == 'edit') {

                    var parametroTipoIntegracionFE = currScript.getParameter('custscript_l598_set_ui_tipo_in_fe_taface');

                    // Get Data From Transaction
                    var recId = scriptContext.newRecord.id;
                    var recType = scriptContext.newRecord.type;
                    var objRecord = scriptContext.newRecord;
                    var isOneWorld = utilities.l598esOneworld();
                    log.debug(proceso, 'recType: ' + recType + ' -- recId: ' + recId + ' / mode: ' + scriptContext.type + ' - parametroTipoIntegracionFE: ' + parametroTipoIntegracionFE);

                    if (isOneWorld) {
                        var subsidiaria = objRecord.getValue({ fieldId: 'subsidiary' });
                    } else {
                        var subsidiaria = '';
                    }

                    var resultConfigFETaface = getConfigFE(parametroTipoIntegracionFE, subsidiaria, isOneWorld);

                    // Se verifica si la configuración de FE es de TAFACE
                    if (!utilities.isEmpty(resultConfigFETaface) && resultConfigFETaface) {

                        // Se setean la unidad indexada predeterminada del RT URU-Configuración Unidad Indexada                        
                        var rate = getConfigUnidadIndexada();
                        
                        log.debug(proceso, "LINE 44 - UNIDAD INDEXADA: " + rate);

                    } else {

                        // Se setean la unidad indexada desde el tipo de cambio registrado en NS
                        // Get Exchange Rate For UNIDAD INDEXADA
                        var rate = currency.exchangeRate({
                            source: 'UI',
                            target: 'UYU'
                        });

                        log.debug(proceso, "LINE 55 - UNIDAD INDEXADA: " + rate);
                    }

                    if (!utilities.isEmpty(rate) && !isNaN(rate) && parseFloat(rate, 10) > 0) {
                        //Update Transaction
                        record.submitFields({
                            type: recType,
                            id: recId,
                            values: {
                                custbody_l598_valor_unidad_indexada: rate
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true //Ignora los campos obligatorios
                            }
                        });
                    }
                }
            } catch (e) {
                log.error(proceso, proceso + '- Netsuite Exception - Detalles Error: ' + JSON.stringify(e.message));
            } finally {
                log.debug(proceso, 'FIN - Remaining governance units: ' + currScript.getRemainingUsage() + ' - Date: ' + new Date());
                log.audit(proceso, 'FIN - afterSubmit');
            }
        }

        function getConfigFE(parametroTipoIntegracionFE, idSubsidiaria, isOneWorld) {

            var esTipoIntegracionTAFACE = false;

            try {
                var filtrosConfiguracionFE = [];

                if (isOneWorld && !utilities.isEmpty(idSubsidiaria)) {
                    var filtroSubsidiaria = {};
                    filtroSubsidiaria.name = 'custrecord_l598_conf_fe_subsidiaria';
                    filtroSubsidiaria.operator = 'IS';
                    filtroSubsidiaria.values = idSubsidiaria;
                    filtrosConfiguracionFE.push(filtroSubsidiaria);
                }

                var searchConfigFE = utilities.searchSavedPro('customsearch_l598_config_fe_seteo_ui', filtrosConfiguracionFE);

                if (!searchConfigFE.error && !utilities.isEmpty(searchConfigFE.objRsponseFunction.result) && searchConfigFE.objRsponseFunction.result.length > 0) {

                    var datosConfigFEResultSet = searchConfigFE.objRsponseFunction.result;
                    var datosConfigFEResultSearch = searchConfigFE.objRsponseFunction.search;

                    log.debug('consultaConfigFE', 'datosConfigFEResultSet.length: ' + datosConfigFEResultSet.length);

                    if (!utilities.isEmpty(datosConfigFEResultSet) && datosConfigFEResultSet.length > 0) {
                        var tipoIntegracionFE = datosConfigFEResultSet[0].getValue({
                            name: datosConfigFEResultSearch.columns[2]
                        });

                        if (tipoIntegracionFE == parametroTipoIntegracionFE) {
                            esTipoIntegracionTAFACE = true;
                        }
                    }
                }
            } catch (e) {
                log.error('consultaConfigFE', 'consultaConfigFE - NetSuite Exception - Detalles Error: ' + e.message);
                esTipoIntegracionTAFACE = false;
            }

            return esTipoIntegracionTAFACE;
        }

        function getConfigUnidadIndexada() {

            var valorUnidadIndexada = '';

            try {
                
                var searchConfigUI = utilities.searchSavedPro('customsearch_l598_config_ui_seteo_ui', null);

                if (!searchConfigUI.error && !utilities.isEmpty(searchConfigUI.objRsponseFunction.result) && searchConfigUI.objRsponseFunction.result.length > 0) {

                    var datosConfigUIResultSet = searchConfigUI.objRsponseFunction.result;
                    var datosConfigUIResultSearch = searchConfigUI.objRsponseFunction.search;

                    log.debug('getConfigUnidadIndexada', 'datosConfigUIResultSet.length: ' + datosConfigUIResultSet.length);

                    if (!utilities.isEmpty(datosConfigUIResultSet) && datosConfigUIResultSet.length > 0) {
                        valorUnidadIndexada = datosConfigUIResultSet[0].getValue({
                            name: datosConfigUIResultSearch.columns[2]
                        });
                    }
                }
            } catch (e) {
                log.error('getConfigUnidadIndexada', 'getConfigUnidadIndexada - NetSuite Exception - Detalles Error: ' + e.message);
            }

            return valorUnidadIndexada;
        }

        return {
            afterSubmit: afterSubmit
        };
    });