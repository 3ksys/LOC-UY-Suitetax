/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */
define(['N/error', 'N/search', 'N/record', 'N/query', 'N/format', 'N/runtime', 'L598/utilities'],
    function(error, search, record, query, format, runtime, utilities) {

        var proceso = "Completar y Validar Campos";
        var defaultvalues = {
            hasreference: false
        }

        function pageInit(context) {

            log.audit(proceso, "PageInit - INICIO");
            log.debug(proceso, 'Runtime checkGovernance: ' + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());
            var paramIntegracion = runtime.getCurrentScript().getParameter('custscript_l598_nc_cs_ref_tipo_sige');
            log.debug(proceso, 'Parametros: ' + 'paramIntegracion  ' + paramIntegracion);
            try{
            
                log.debug(proceso, "mode: " + context.mode + " / type: " + context.currentRecord.type);

                if ( context.currentRecord.type == ('creditmemo' || 'cashrefund' ) && (context.mode == 'create' || context.mode == 'copy' || context.mode == 'edit')
                   ){
                    // Get
                    var currentRecord = context.currentRecord;
                    var createdfrom = currentRecord.getValue({fieldId: "createdfrom"});
                    var invoiceid = null;

                    log.debug(proceso, "createdform field value: " + createdfrom);

                    // Check createdfrom transaction
                    if(!utilities.isEmpty(createdfrom)){

                        //Get recordtype of createdfrom transaction (should be Invoice or Return Auth)
                        var searchfields = search.lookupFields({
                            type: search.Type.TRANSACTION,
                            id: createdfrom,
                            columns:['internalid', 'recordtype', 'createdfrom']
                        });

                        log.debug(proceso, "Created From Info: " + JSON.stringify(searchfields));

                        if( !utilities.isEmpty(searchfields) ){
                            
                            //Check Reference Transactiion Type
                            if((searchfields.recordtype == 'invoice') || (searchfields.recordtype == 'cashsale') ){
                                invoiceid = createdfrom;
                            }else if(searchfields.recordtype == 'returnauthorization' && searchfields.createdfrom.length > 0) {
                                invoiceid = searchfields.createdfrom[0].value;
                            }

                            if(!utilities.isEmpty(invoiceid)){

                                //Get Invoice 
                                var facturareferencia = getTransaction(invoiceid);
                                log.debug(proceso, "getTransaction RESPONSE: " + JSON.stringify(facturareferencia));
                                
                                if( facturareferencia.data.length > 0){

                                    defaultvalues.hasreference = true;

                                    log.debug(proceso, "Transaction has reference. Seting Default Values in Transaction Fields From Reference...");

                                    if(!utilities.isEmpty(facturareferencia.data[0].custbodyl598tipocomprefr)){
                                        currentRecord.setValue({
                                            fieldId: "custbody_l598_tipo_comp_ref", 
                                            value: facturareferencia.data[0].custbodyl598tipocomprefr
                                        });
                                    }

                                    if(!utilities.isEmpty(facturareferencia.data[0].custbodyl598seriecompref)){
                                        currentRecord.setValue({
                                            fieldId: "custbody_l598_serie_comp_ref", 
                                            value: facturareferencia.data[0].custbodyl598seriecompref
                                        });
                                    }

                                    if(!utilities.isEmpty(facturareferencia.data[0].custbody_l598_cae)){
                                        var tipoIntegracion = encontrarTipoIntegracion();
                                        if(paramIntegracion == tipoIntegracion){
                                            currentRecord.setValue({
                                                fieldId: "custbody_l598_nro_comp_ref",
                                                value: facturareferencia.data[0].id
                                            });
                                        }else{
                                            currentRecord.setValue({
                                                fieldId: "custbody_l598_nro_comp_ref",
                                                value: facturareferencia.data[0].custbody_l598_cae
                                            });
                                        }
                                        
                                    }
                                    
                                    if(!utilities.isEmpty(facturareferencia.data[0].exchangerate)){
                                        currentRecord.setValue({
                                            fieldId: "exchangerate", 
                                            value: facturareferencia.data[0].exchangerate
                                        });
                                    }

                                    if(!utilities.isEmpty(facturareferencia.data[0].custbodyl598fechacompref)){
                                        // Date Format
                                        var fechaRAW = format.parse({
                                            value: facturareferencia.data[0].custbodyl598fechacompref, 
                                            type: format.Type.DATE
                                        });

                                        currentRecord.setValue({
                                            fieldId: "custbody_l598_fecha_comp_ref", 
                                            value: fechaRAW
                                        });
                                    }

                                    var totalActual = currentRecord.getValue({ fieldId: 'total' });
                                    if(!utilities.isEmpty(totalActual)){
                                        currentRecord.setValue({
                                            fieldId: "custbody_l598_monto_comp_ref", 
                                            value: totalActual
                                        });
                                    }

                                    if(!utilities.isEmpty(facturareferencia.data[0].currency)){
                                        currentRecord.setValue({
                                            fieldId: "custbody_l598_moneda_comp_ref", 
                                            value: facturareferencia.data[0].currency
                                        });
                                    }

                                    if(!utilities.isEmpty(facturareferencia.data[0].exchangerate)){
                                        currentRecord.setValue({
                                            fieldId: "custbody_l598_tipocambio_comp_ref", 
                                            value: facturareferencia.data[0].exchangerate
                                        });
                                    }
                                }else{
                                    log.debug(proceso, "Transaction has no reference.");
                                }
                            }else{
                                log.debug(proceso, "Transaction has no reference.");
                            }
                        }
                    }
                }
            }catch(e){
                log.error(proceso, "Netsuite Exception - PageInit: " + JSON.stringify(e.message));
            }

            log.debug(proceso, 'Runtime checkGovernance: ' + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());
            log.audit(proceso, "PageInit - FIN");
        }

        function getTransaction(id){
            var response = {error: false, mensaje: '', data: [], id:id};

            try{
                var strSQL = "SELECT \n \"TRANSACTION\".\"ID\" AS id, \n \"TRANSACTION\".custbody_l598_tipo_comprobante AS custbodyl598tipocomprefR, \n \"TRANSACTION\".custbody_l598_serie_comprobante AS custbodyl598seriecompref, \n \"TRANSACTION\".custbody_l598_cae AS custbody_l598_cae, \n \"TRANSACTION\".trandate AS custbodyl598fechacompref, \n \"TRANSACTION\".foreignTotal AS custbodyl598montocompref, \n \"TRANSACTION\".currency AS currency, \n \"TRANSACTION\".exchangerate AS exchangerate, \n BUILTIN.CURRENCY(\"TRANSACTION\".exchangerate) AS exchangerateRAW_C, \n \"TRANSACTION\".recordtype AS recordtype \nFROM \n \"TRANSACTION\", \n transactionLine\nWHERE \n \"TRANSACTION\".\"ID\" = transactionLine.\"TRANSACTION\"\n AND ((UPPER(\"TRANSACTION\".\"RECORDTYPE\") IN ('INVOICE', 'RETURNAUTHORIZATION','CASHSALE') AND transactionLine.mainline = 'T' AND \"TRANSACTION\".\"ID\" = '"+id+"'))\n";

                // Page Execution 
                var objPagedData = query.runSuiteQLPaged({ 
                    query: strSQL, 
                    pageSize: 1000 
                });
                // Paging 
                var arrResults = []; 
                objPagedData.pageRanges.forEach(function(pageRange){ 
                    var objPage = objPagedData.fetch({index: pageRange.index}).data; 
                    // Map Results To Columns 
                    arrResults.push.apply(arrResults, objPage.asMappedResults()); 
                });

                response.data = arrResults;
                return response;
            }catch(e){
                response.error = true;
                response.mensaje = "Netsuite Exception: " + e.message;
                return response;
            }
        }
        
        function encontrarTipoIntegracion(){
            var respuesta = null;
            try {
                log.debug("Inicio envioEmail", "Se inicia el envioEmail");
                var filtroConf = [];
                filtroConf.push({
                    name: "isinactive",
                    operator: "is",
                    values: false
                });

                var configuracionSaveSearch = search.create({
                    type: "customrecord_l598_conf_factura_elec",
                    columns: ["custrecord_l598_conf_factura_elec_integr"],
                    filters: filtroConf
                  });

                var resultadoConf = configuracionSaveSearch.run().getRange({
                    start: 0,
                    end: 1
                });
                if (!utilities.isEmpty(resultadoConf) && resultadoConf.length > 0) {
                    var tipoIntegracion = resultadoConf[0].getValue("custrecord_l598_conf_factura_elec_integr");
                    respuesta = tipoIntegracion;
                }
                return respuesta;
            }catch (e){
                log.error("Error",e);
            }
        }

        function saveRecord(context) {

            log.audit(proceso, "saveRecord - INICIO"); 

            var currentRecord = context.currentRecord;
            var type = context.currentRecord.type;
            var createdfrom = currentRecord.getValue({fieldId: "createdfrom"});
            var es_nd = currentRecord.getValue({fieldId: "custbody_l598_nd"});
            var errors = [];

            log.debug(proceso, "type: " + type + " / createdfrom: " + createdfrom + " / es_nd: " + es_nd)

            if( (type == 'creditmemo')
                ||
                (type == 'cashrefund')
                ||
                (type == 'invoice' && (es_nd == true || es_nd == 'T'))
              ) {

                var totalActual = currentRecord.getValue({ fieldId: 'total' });
                if(!utilities.isEmpty(totalActual)){
                    currentRecord.setValue({
                        fieldId: "custbody_l598_monto_comp_ref", 
                        value: totalActual
                    });
                }

                var custbody_l598_referencia_global = currentRecord.getValue({fieldId: "custbody_l598_referencia_global"});

                if (!utilities.isEmpty(custbody_l598_referencia_global) && (custbody_l598_referencia_global == true || custbody_l598_referencia_global == 'T')) {
                    currentRecord.setValue({fieldId: "custbody_l598_tipo_comp_ref", value: ''});
                    currentRecord.setValue({fieldId: "custbody_l598_serie_comp_ref", value: ''});
                    currentRecord.setValue({fieldId: "custbody_l598_nro_comp_ref", value: ''});
                    currentRecord.setValue({fieldId: "custbody_l598_fecha_comp_ref", value: ''});
                    currentRecord.setValue({fieldId: "custbody_l598_monto_comp_ref", value: ''});
                    currentRecord.setValue({fieldId: "custbody_l598_moneda_comp_ref", value: ''});
                    currentRecord.setValue({fieldId: "custbody_l598_tipocambio_comp_ref", value: ''});

                    var custbody_l598_razon_comp_ref = currentRecord.getValue({fieldId: "custbody_l598_razon_comp_ref"});
                    if(utilities.isEmpty(custbody_l598_razon_comp_ref)) {
                        errors.push("URU-RAZÓN DE REFERENCIA");
                    }
                } else {
                    currentRecord.setValue({fieldId: "custbody_l598_razon_comp_ref", value: ''});

                    // Nota de Credito con Referencia (createdfrom)
                    var custbody_l598_tipo_comp_ref = currentRecord.getValue({fieldId: "custbody_l598_tipo_comp_ref"});
                    if(utilities.isEmpty(custbody_l598_tipo_comp_ref))
                        errors.push("URU-TIPO COMPROBANTE DE REFERENCIA");
                                    
                    var custbody_l598_serie_comp_ref = currentRecord.getValue({fieldId: "custbody_l598_serie_comp_ref"});
                    if(utilities.isEmpty(custbody_l598_serie_comp_ref))
                        errors.push("URU-SERIE COMPROBANTE DE REFERENCIA");
                                    
                    var custbody_l598_nro_comp_ref = currentRecord.getValue({fieldId: "custbody_l598_nro_comp_ref"});
                    if(utilities.isEmpty(custbody_l598_nro_comp_ref))
                        errors.push("URU-NÚMERO COMPROBANTE DE REFERENCIA");
                                    
                    var custbody_l598_fecha_comp_ref = currentRecord.getValue({fieldId: "custbody_l598_fecha_comp_ref"});
                    if(utilities.isEmpty(custbody_l598_fecha_comp_ref))
                        errors.push("URU-FECHA COMPROBANTE DE REFERENCIA");

                    var custbody_l598_monto_comp_ref = currentRecord.getValue({fieldId: "custbody_l598_monto_comp_ref"});
                    if(utilities.isEmpty(custbody_l598_monto_comp_ref))
                        errors.push("URU-MONTO COMPROBANTE DE REFERENCIA");
                    
                    var custbody_l598_moneda_comp_ref = currentRecord.getValue({fieldId: "custbody_l598_moneda_comp_ref"});
                    if(utilities.isEmpty(custbody_l598_moneda_comp_ref))
                        errors.push("URU-MONEDA COMPROBANTE DE REFERENCIA");
                    
                    var custbody_l598_tipocambio_comp_ref = currentRecord.getValue({fieldId: "custbody_l598_tipocambio_comp_ref"});
                    if(utilities.isEmpty(custbody_l598_tipocambio_comp_ref))
                        errors.push("URU-TIPO CAMBIO COMPROBANTE DE REFERENCIA");
                }

                if( errors.length > 0 ) {
                    if (!utilities.isEmpty(custbody_l598_referencia_global) && (custbody_l598_referencia_global == true || custbody_l598_referencia_global == 'T')) {
                        alert("El comprobante es de referencia global, debe completar los siguientes campos: " + errors.join(", ") );
                    } else {
                        alert("El comprobante NO es de referencia global, debe completar los siguientes campos: " + errors.join(", ") );
                    }
                    
                    return false;
                }
            }

            log.audit(proceso, "saveRecord - FIN");

            return true;
        }

        function fieldChanged(context) {
            var currentRecord = context.currentRecord;
            var type = context.currentRecord.type;
            var sublistFieldName = context.fieldId;

            if(sublistFieldName == 'custbody_l598_razon_comp_ref' && (type == 'invoice' ||  type == 'creditmemo' || type == 'cashrefund' || type == 'cashsale')){
                // If URU-RAZÓN DE REFERENCIA is has value, set URU-REFERENCIA GLOBAL to true.
                var custbody_l598_razon_comp_ref = currentRecord.getValue({fieldId: 'custbody_l598_razon_comp_ref'});

                if(!utilities.isEmpty(custbody_l598_razon_comp_ref)){
                    log.debug(proceso, "URU-RAZÓN DE REFERENCIA has a value. Set URU-REFERENCIA GLOBAL to true");
                    currentRecord.setValue({
                        fieldId: 'custbody_l598_referencia_global',
                        value: true
                    });
                }else{
                    log.debug(proceso, "URU-RAZÓN DE REFERENCIA does not hava a value. Set URU-REFERENCIA GLOBAL to false");
                    currentRecord.setValue({
                        fieldId: 'custbody_l598_referencia_global',
                        value: false
                    });
                }
            }
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord,
            fieldChanged: fieldChanged
        };
    });