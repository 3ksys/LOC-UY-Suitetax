/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NModuleScope Public
 */
 define(["N/log", "N/currency", "N/search", "N/format"],
 /* global define */
 function (log, currency, search, format) {

   // eslint-disable-next-line no-extend-native
   Number.prototype.toFixedOK = function (decimals) {
     const sign = this >= 0 ? 1 : -1;
     return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
   };

   function esOneworld() {
    const filters = [search.createFilter({
      name: "isinactive",
      operator: search.Operator.IS,
      values: false
    }),
    search.createFilter({
      name: "custrecord_l598_dat_imp_es_oneworld",
      operator: search.Operator.IS,
      values: true
    })
    ];

    const searchresults = search.create({
      type: "customrecord_l598_datos_impositivos_emp",
      filters: filters
    }).run().getRange({
      start: 0,
      end: 1000
    });

    if (searchresults != null && searchresults.length > 0)
      return true;
    else
      return false;
  }

   function getUnidadIndexadaValue(trandate) {
     //16/10/2018: Se realizan cambios para que la fecha en la cual se consulta el tipo de cambio sea 
     // el primer dia del mes de a factura y y no el ultimo dia del mes anterior a la fecha de la factura.
     let unidadIndexadaValue = parseFloat(1, 10);
     try {
       if (!isEmpty(trandate)) {
         const trandateObj = new Date(trandate);
         const dateDayFirstMonth = new Date(trandateObj.getFullYear(), trandateObj.getMonth(), 1);
         //SE DETERMINA EL VALOR DE LA UNIDAD INDEXADA EN PESOS URUGUAYOS
         unidadIndexadaValue = currency.exchangeRate({
           source: "UI",
           target: "UYU",
           date: dateDayFirstMonth
         });
       }
     }
     catch (e) {
       log.debug("getUnidadIndexadaValue", "Error mientras se consultaba el valor de la Unidad Indexada. Detalle: " + e.message);
     }
     return unidadIndexadaValue;
   }

   function obtenerMontoNetTransaction(entidad, idTransaction, subsidiaria) {
    log.debug('alex', entidad + '->> '  + idTransaction + '->>' + subsidiaria)
     let impNetTransac = 0.00;
     const filters = new Array();
     filters[0] = search.createFilter({
       name: "entity",
       operator: search.Operator.IS,
       values: entidad
     });
     filters[1] = search.createFilter({
       name: "internalid",
       operator: search.Operator.IS,
       values: idTransaction
     });

     if (!isEmpty(subsidiaria)) {
       filters[2] = search.createFilter({
         name: "subsidiary",
         operator: search.Operator.IS,
         values: subsidiaria
       });
     }

     const resultsNetosLoad = search.load({
       id: "customsearch_l598_transaction_net_amt",
     });
     //resultsNetosLoad.filters.push(...filters);
     resultsNetosLoad.filters.push(...filters);
     const resultsNetosRun = resultsNetosLoad.run();

     const resultsNetos = resultsNetosRun.getRange({
       start: 0,
       end: 1000
     });

     if (!isEmpty(resultsNetos) && resultsNetos.length > 0) {
       const result = resultsNetos[0];
       const columns = result.columns;
       impNetTransac = result.getValue(columns[2]);//IMPORTE NETO TRANSACCION
     }
     log.debug('alex 2', impNetTransac)
     return impNetTransac;
   }

   function retAplicaMontoAcumulativo(idRetencion) {
     /*
                         CODIGOS DE RETENCION:
                             1-Retención IRPF
                             2-Retención IRNR
                             3-Retención IVA
                             4-Retención IRAE    
                         */
     let montoAcumulativo = false;
     const filters = [search.createFilter({
       name: "custrecord_l598_codigo_ret",
       operator: search.Operator.EQUALTO,
       values: idRetencion
     })];

     const columns = new Array();
     columns[0] = search.createColumn("custrecord_l598_importe_neto_acumul_mens");

     const searchresults = search.create({
       type: "customrecord_l598_agentes_retencion",
       filters: filters,
       columns: columns
     }).run().getRange({
       start: 0,
       end: 1000
     });

     if (!isEmpty(searchresults) && searchresults.length > 0) {
       montoAcumulativo = searchresults[0].getValue("custrecord_l598_importe_neto_acumul_mens");
     }
     return montoAcumulativo;
   }

   function obtenerCodigosRetTransaction(entity, idTransaction, subsidiaria) {

     const filters = new Array();
     filters[0] = search.createFilter({
       name: "entity",
       operator: search.Operator.IS,
       values: entity
     });
     filters[1] = search.createFilter({
       name: "internalid",
       operator: search.Operator.IS,
       values: idTransaction
     });

     if (!isEmpty(subsidiaria)) {
       filters[2] = search.createFilter({
         name: "subsidiary",
         operator: search.Operator.IS,
         values: subsidiaria
       });
     }

     const resultsCodigosLoad = search.load({
       id: "customsearch_l598_transaction_cod_ret",
     });
     resultsCodigosLoad.filters.push(...filters);

     const resultsCodigosRun = resultsCodigosLoad.run();

     const resultsCodigos = resultsCodigosRun.getRange(0, 1000);

     const informacionCodigos = new Array();

     if (!isEmpty(resultsCodigos) && resultsCodigos.length > 0) {
       for (let i = 0; i < resultsCodigos.length; i++) {
         const result = resultsCodigos[i];
         const columns = result.columns;
         informacionCodigos[i] = {};
         informacionCodigos[i].idInterno = result.getValue(columns[1]);//ID Interno
         informacionCodigos[i].importeTotal = ((parseFloat(result.getValue(columns[2]), 10)));// Importe Total
         informacionCodigos[i].codigoRetIRPF = result.getValue(columns[3]);// Código Rentención IRPF
         informacionCodigos[i].codigoRetIRNR = result.getValue(columns[4]);// Código Rentención IRNR
         informacionCodigos[i].codigoRetIVA = result.getValue(columns[5]);// Código Rentención IVA
         informacionCodigos[i].codigoRetIRAE = result.getValue(columns[6]);// Código Rentención IRAE
         informacionCodigos[i].calSobreIVA = result.getValue(columns[7]);// Calcular Sobre IVA?
         informacionCodigos[i].mniIRPF = result.getValue(columns[8]);// MNI IRPF
         informacionCodigos[i].mniIRNR = result.getValue(columns[9]);// MNI IRNR
         informacionCodigos[i].mniIRAE = result.getValue(columns[10]);// MNI IRAE
         informacionCodigos[i].mniIVA = result.getValue(columns[11]);// MNI IVA
         informacionCodigos[i].mniIRPFUI = result.getValue(columns[12]);// MNI IRAE EN UI?
         informacionCodigos[i].mniIRNRUI = result.getValue(columns[13]);// MNI IRNR EN UI?
         informacionCodigos[i].mniIRAEUI = result.getValue(columns[14]);// MNI IRAE EN UI?
         informacionCodigos[i].mniIVAUI = result.getValue(columns[15]);// MNI IVA EN UI?
         informacionCodigos[i].IVATaxCodes = result.getValue(columns[16]);// IVA TAXCODES
         informacionCodigos[i].apGrossingUp = result.getValue(columns[17]);// APLICA GROSSING UP (IRNR)
         informacionCodigos[i].aplicaAcumIRNR = result.getValue(columns[18]); // ACUMULADO IRNR Agregado
         informacionCodigos[i].aplicaAcumIRAE = result.getValue(columns[19]); // ACUMULADO IRAE Agregado
         informacionCodigos[i].aplicaAcumIVA = result.getValue(columns[20]); // ACUMULADO IVA Agregado
       }
     }

     return informacionCodigos;
   }

   function obtener_codigos_transaccion(arregloCodigosTransaction, idTransaction) {

     const resultadoCodigos = {
       importeTotal: 0.00,
       codigoRetIRPF: "",
       codigoRetIRNR: "",
       codigoRetIVA: "",
       codigoRetIRAE: "",
       calSobreIVA: "F",
       mniIRPF: 0.00,
       mniIRNR: 0.00,
       mniIRAE: 0.00,
       mniIVA: 0.00,
       mniIRPFUI: "F",
       mniIRNRUI: "F",
       mniIRAEUI: "F",
       mniIVAUI: "F",
     };

     if (!isEmpty(arregloCodigosTransaction) && arregloCodigosTransaction.length > 0 && !isEmpty(idTransaction)) {
       const resultadoCodigosRetencion = arregloCodigosTransaction.filter(function (obj) {
         return obj.idInterno == idTransaction;
       });

       if (!isEmpty(resultadoCodigosRetencion) && resultadoCodigosRetencion.length > 0) {
         resultadoCodigos.importeTotal = resultadoCodigosRetencion[0].importeTotal;
         resultadoCodigos.codigoRetIRPF = resultadoCodigosRetencion[0].codigoRetIRPF;//COD RET IRPF
         resultadoCodigos.codigoRetIRNR = resultadoCodigosRetencion[0].codigoRetIRNR;//COD RET IRNR
         resultadoCodigos.codigoRetIVA = resultadoCodigosRetencion[0].codigoRetIVA;//COD RET IVA
         resultadoCodigos.codigoRetIRAE = resultadoCodigosRetencion[0].codigoRetIRAE;//COD RET IRAE
         resultadoCodigos.calSobreIVA = resultadoCodigosRetencion[0].calSobreIVA;//CALCULAR SOBRE IVA?
         resultadoCodigos.mniIRPF = resultadoCodigosRetencion[0].mniIRPF;// MNI IRAE
         resultadoCodigos.mniIRNR = resultadoCodigosRetencion[0].mniIRNR;// MNI IRNR
         resultadoCodigos.mniIRAE = resultadoCodigosRetencion[0].mniIRAE;// MNI IRAE
         resultadoCodigos.mniIVA = resultadoCodigosRetencion[0].mniIVA; // MNI IVA
         resultadoCodigos.mniIRPFUI = resultadoCodigosRetencion[0].mniIRPFUI;// MNI IRAE EN UI?
         resultadoCodigos.mniIRNRUI = resultadoCodigosRetencion[0].mniIRNRUI;// MNI IRNR EN UI?
         resultadoCodigos.mniIRAEUI = resultadoCodigosRetencion[0].mniIRAEUI;// MNI IRAE EN UI?
         resultadoCodigos.mniIVAUI = resultadoCodigosRetencion[0].mniIVAUI; // MNI IVA EN UI?
         resultadoCodigos.IVATaxCodes = resultadoCodigosRetencion[0].IVATaxCodes;//IVA TAXCODES
         resultadoCodigos.apGrossingUp = resultadoCodigosRetencion[0].apGrossingUp;// APLICA GROSSING UP (IRNR)
         resultadoCodigos.aplicaAcumIRNR = resultadoCodigosRetencion[0].aplicaAcumIRNR; // ACUMULADO IRNR Agregado
         resultadoCodigos.aplicaAcumIRAE = resultadoCodigosRetencion[0].aplicaAcumIRAE; // ACUMULADO IRAE Agregado 
         resultadoCodigos.aplicaAcumIVA = resultadoCodigosRetencion[0].aplicaAcumIVA; // ACUMULADO IVA Agregado
       }
     }
     return resultadoCodigos;
   }

   function isEmpty(value) {

     return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
   }

   function wNotaCreditoIRPF(idProveedor, idPeriodo, subsidiaria, idCodRetIRPF, fechaTransac) {
     const filters = new Array();

     const objWNotaCreditoIRPF = {
       poseeRetNC: false,
       idTransacciones: [],
     };


     filters.push(search.createFilter({
       name: "entity",
       operator: search.Operator.IS,
       values: idProveedor
     }));

     filters.push(search.createFilter({
       name: "postingperiod",
       operator: search.Operator.IS,
       values: idPeriodo
     }));

     filters.push(search.createFilter({
       name: "custbody_l598_codigo_ret_irpf",
       operator: search.Operator.IS,
       values: idCodRetIRPF
     }));

     if (!isEmpty(subsidiaria)) {
       filters.push(search.createFilter({
         name: "subsidiary",
         operator: search.Operator.IS,
         values: subsidiaria
       }));
     }

     if (!isEmpty(fechaTransac)) {
       filters.push(search.createFilter({
         name: "trandate",
         operator: search.Operator.ONORBEFORE,
         values: format.format({ value: fechaTransac, type: format.Type.DATE })
       }));
     }

     const searchResultsLoad = search.load({
       id: "customsearch_l598_nc_w_cod_ret_irpf",
     });
     searchResultsLoad.filters.push(...filters);

     const searchResultsRun = searchResultsLoad.run();

     const searchresults = searchResultsRun.getRange({
       start: 0,
       end: 1000
     });


     if (!isEmpty(searchresults) && searchresults.length > 0) {
       objWNotaCreditoIRPF.poseeRetNC = true;

       for (let i = 0; i < searchresults.length; i++) {
         const result = searchresults[i];
         const columns = result.columns;
         objWNotaCreditoIRPF.idTransacciones.push(result.getValue(columns[3]));
       }
     }
     return objWNotaCreditoIRPF;
   }

   function wRetencion(id_proveedor, id_periodo, subsidiaria, idTransaction, tipoRet) {
     let poseeRet = false;
     const filters = new Array();


     filters.push(search.createFilter({
       name: "entity",
       operator: search.Operator.IS,
       values: id_proveedor
     }));
     filters.push(search.createFilter({
       name: "postingperiod",
       operator: search.Operator.IS,
       values: id_periodo
     }));
     filters.push(search.createFilter({
       name: "custrecord__l598_ret_detalle_transaccion",
       join: "custrecord_l598_ret_detalle_transaccion",
       operator: search.Operator.IS,
       values: idTransaction
     }));
     filters.push(search.createFilter({
       name: "custrecord_l598_ret_detalle_tipo_ret",
       join: "custrecord_l598_ret_detalle_transaccion",
       operator: search.Operator.IS,
       values: tipoRet
     }));
     if (!isEmpty(subsidiaria)) {
       filters.push(search.createFilter({
         name: "subsidiary",
         operator: search.Operator.IS,
         values: subsidiaria
       }));
     }

     const searchResultsLoad = search.load({
       id: "customsearch_l598_ret_mni_irpf_ppr",
     });
     searchResultsLoad.filters.push(...filters);

     const searchResultsRun = searchResultsLoad.run();

     const searchresults = searchResultsRun.getRange({
       start: 0,
       end: 1000
     });

     if (!isEmpty(searchresults) && searchresults.length > 0) {
       poseeRet = true;
     }

     return poseeRet;
   }

   function wRetencionNew(id_proveedor, id_periodo, subsidiaria, tipoRet) {
    let poseeRet = false;
     const filters = new Array();


     filters.push(search.createFilter({
       name: "custbody_l598_resguardo_proveedor",
       operator: search.Operator.ANYOF,
       values: id_proveedor
     }));
     filters.push(search.createFilter({
       name: "postingperiod",
       operator: search.Operator.IS,
       values: id_periodo
     }));
     filters.push(search.createFilter({
       name: "custrecord_l598_ret_detalle_tipo_ret",
       join: "custrecord_l598_ret_detalle_transaccion",
       operator: search.Operator.IS,
       values: tipoRet
     }));
     if (!isEmpty(subsidiaria)) {
       filters.push(search.createFilter({
         name: "subsidiary",
         operator: search.Operator.IS,
         values: subsidiaria
       }));
     }

     const searchResultsLoad = search.load({
       id: "customsearch_l598_ret_mni_irpf_ppr",
     });
     searchResultsLoad.filters.push(...filters);

     const searchResultsRun = searchResultsLoad.run();

     const searchresults = searchResultsRun.getRange({
       start: 0,
       end: 1000
     });

    if (!isEmpty(searchresults) && searchresults.length > 0) {
      poseeRet = true;
    } else {
      poseeRet = false;
    }
    return poseeRet;
  }

   function esAgenteRetencion(tipo_ret, subsidiaria) {

     let es_agente_retencion = false;
     const filters = new Array();
     filters.push(
       search.createFilter({
         name: "isinactive",
         operator: search.Operator.IS,
         values: false
       })
     );


     if (!isEmpty(subsidiaria)) {
       filters.push(
         search.createFilter({
           name: "custrecord_l598_conf_proc_ret_subsidiari",
           operator: search.Operator.IS,
           values: subsidiaria
         })
       );
     }
     const columns = [search.createColumn("custrecord_l598_conf_proc_ret_" + tipo_ret + "_aplic")];
     const searchresults = search.create({
       type: "customrecord_l598_conf_proc_ret",
       filters: filters,
       columns: columns
     }).run().getRange({
       start: 0,
       end: 1000
     });

     for (let i = 0; !isEmpty(searchresults) && i < searchresults.length; i++) {
       es_agente_retencion = searchresults[i].getValue("custrecord_l598_conf_proc_ret_" + tipo_ret + "_aplic");
     }

     if (!isEmpty(es_agente_retencion) && es_agente_retencion == true)
       return true;
     else
       return false;
   }

   function getTransacIdsMinimoIRPFInversa(id_proveedor, id_periodo, subsidiaria, rectype, fechaTransac, idRetIRPF, excluir) {

     log.debug("getTransacIdsMinimoIRPFInversa", `id_proveedor: ${id_proveedor} / id_periodo: ${id_periodo} / subsidiaria: ${subsidiaria} / rectype: ${rectype} / fechaTransa: ${fechaTransac} / idRetIRPF: ${idRetIRPF} / excluir: ${excluir}`);

     const searchResultsLoad = search.load({
       type: rectype,
       id: "customsearch_l598_ids_trans_w_ret_irpf",
     });

     const filters = new Array();

     searchResultsLoad.filters.push(search.createFilter({
       name: "entity",
       operator: search.Operator.IS,
       values: id_proveedor
     }));
     searchResultsLoad.filters.push(search.createFilter({
       name: "postingperiod",
       operator: search.Operator.IS,
       values: id_periodo
     }));

     searchResultsLoad.filters.push(search.createFilter({
       name: "custbody_l598_codigo_ret_irpf",
       operator: search.Operator.ANYOF,
       values: idRetIRPF
     }));
     /* searchResultsLoad.filters.push(search.createFilter({
         name: 'formulatext',
         formula: '{recordtype}',
         operator: search.Operator.IS,
         values: rectype
     })); */
     searchResultsLoad.filters.push(search.createFilter({
       name: "recordtype",
       operator: search.Operator.IS,
       values: rectype
     }));

     if (!isEmpty(subsidiaria)) {
       searchResultsLoad.filters.push(search.createFilter({
         name: "subsidiary",
         operator: search.Operator.ANYOF,
         values: subsidiaria
       }));

     }

     if (!isEmpty(fechaTransac)) {
       searchResultsLoad.filters.push(search.createFilter({
         name: "trandate",
         operator: search.Operator.ONORBEFORE,
         values: format.format({ value: fechaTransac, type: format.Type.DATE })
       }));

     }

     if (!isEmpty(excluir) && excluir == true && rectype == "vendorbill") {
       //CON ESTO SOLO DEVUELVE LOS ID DE LAS FACTURAS QUE TIENEN RETENCIONES DE NOTAS DE RCEDITO ANTERIORES
       searchResultsLoad.filters.push(search.createFilter({
         name: "custrecord_l598_ret_detalle_rectype",
         join: "custrecord__l598_ret_detalle_transaccion",
         operator: search.Operator.IS,
         values: "vendorcredit"
       }));
     }


     //searchResultsLoad.filters.push(...filters);

     log.debug("getTransacIdsMinimoIRPFInversa", "log e control 438 searchResultsLoad: " + JSON.stringify(searchResultsLoad));

     const searchResultsRun = searchResultsLoad.run();

     const searchresults = searchResultsRun.getRange({
       start: 0,
       end: 1000
     });


     const infoMinIRPF = {
       idInternos: ""
     };

     log.debug("getTransacIdsMinimoIRPFInversa", `LINE 462 - searchresults: ${JSON.stringify(searchresults)} / filters: ${JSON.stringify(filters)}`);

     if (!isEmpty(searchresults) && searchresults.length > 0) {
       const result = searchresults[0];
       const columns = result.columns;
       infoMinIRPF.idInternos = result.getValue(columns[3]);
     }
     return infoMinIRPF;
     //return {idInternos:''};
   }

   function getTransacIdsMinimoIRPF(id_proveedor, id_periodo, subsidiaria, rectype, fechaTransac, idRetIRPF) {

     const filters = new Array();


     filters.push(search.createFilter({
       name: "entity",
       operator: search.Operator.IS,
       values: id_proveedor
     }));
     filters.push(search.createFilter({
       name: "postingperiod",
       operator: search.Operator.IS,
       values: id_periodo
     }));
     filters.push(search.createFilter({
       name: "custbody_l598_codigo_ret_irpf",
       operator: search.Operator.IS,
       values: idRetIRPF
     }));
     filters.push(search.createFilter({
       name: "recordtype",
       operator: search.Operator.IS,
       values: rectype
     }));

     if (!isEmpty(subsidiaria)) {
       filters.push(search.createFilter({
         name: "subsidiary",
         operator: search.Operator.IS,
         values: subsidiaria
       }));
     }

     if (!isEmpty(fechaTransac)) {
       filters.push(search.createFilter({
         name: "trandate",
         operator: search.Operator.ONORBEFORE,
         values: format.format({ value: fechaTransac, type: format.Type.DATE })
       }));
     }

     const searchResultsLoad = search.load({
       id: "customsearch_l598_trans_ids_cod_ret_irpf",
     });
     searchResultsLoad.filters.push(...filters);

     const searchResultsRun = searchResultsLoad.run();

     const searchresults = searchResultsRun.getRange({
       start: 0,
       end: 1000
     });
     const infoMinIRPF = {
       idInternos: ""
     };

     if (!isEmpty(searchresults) && searchresults.length > 0) {
       const result = searchresults[0];
       const columns = result.columns;
       infoMinIRPF.idInternos = result.getValue(columns[3]);
     }

     return infoMinIRPF;
   }

   function wRetencionIRPF(id_proveedor, id_periodo, subsidiaria, idRetIRPF) {
     const filters = new Array();
     const infwRetencionIRPF = {
       poseeRetIRPF: false,
       idRetenciones: new Array()
     };


     filters.push(search.createFilter({
       name: "entity",
       operator: search.Operator.IS,
       values: id_proveedor
     }));
     filters.push(search.createFilter({
       name: "postingperiod",
       operator: search.Operator.IS,
       values: id_periodo
     }));
     filters.push(search.createFilter({
       name: "custbody_l598_codigo_ret_irpf",
       operator: search.Operator.IS,
       values: idRetIRPF
     }));

     if (!isEmpty(subsidiaria)) {
       filters.push(search.createFilter({
         name: "subsidiary",
         operator: search.Operator.IS,
         values: subsidiaria
       }));
     }

     const searchResultsLoad = search.load({
       id: "customsearch_l598_ret_irpf_prov_per",
     });
     searchResultsLoad.filters.push(...filters);

     const searchResultsRun = searchResultsLoad.run();

     const searchresults = searchResultsRun.getRange({
       start: 0,
       end: 1000
     });


     if (!isEmpty(searchresults) && searchresults.length > 0) {
       infwRetencionIRPF.poseeRetIRPF = true;

       for (let i = 0; i < searchresults.length; i++) {
         const result = searchresults[i];
         const columns = result.columns;
         infwRetencionIRPF.idRetenciones.push(result.getValue(columns[0]));
       }
     }
     return infwRetencionIRPF;
   }

   function transactionDetailsNet(arrayTransacciones) {
     const filtro = search.createFilter({
       name: "internalid",
       operator: search.Operator.ANYOF,
       values: arrayTransacciones
     });

     const searchResultsLoad = search.load({
       id: "customsearch_l598_transaction_det_net"
     });

     searchResultsLoad.filters.push(filtro);

     const searchResults = searchResultsLoad.run().getRange({ start: 0, end: 1000 });

     let montoNeto = 0;
     let result;
     let columns;
     //nlapiLogExecution('DEBUG','LINE 1565','searchResults.length: '+searchResults.length);
     for (let i = 0; !isEmpty(searchResults) && i < searchResults.length; i++) {
       result = searchResults[i];
       columns = result.columns;
       //nlapiLogExecution('DEBUG','LINE 1570','parseFloat(result.getValue(columns[7]),10): '+parseFloat(result.getValue(columns[7]),10));
       montoNeto = parseFloat(montoNeto, 10) + parseFloat(result.getValue(columns[7]), 10);
     }
     return montoNeto;
   }

   function getParametrosMatriz(codigo_retencion, valor) {
     let minimo_retencion = 0;
     let excedente = 0;
     let porcentaje = 100;
     let idCuentaCont = null;

     const resultado = new Array();
     resultado.detalle_encontrado = false;

     if (!isEmpty(codigo_retencion)) {

       const filters = new Array();
       filters[0] = search.createFilter({
         name: "internalid",
         join: "custrecord_l598_param_ret_det_padre",
         operator: search.Operator.IS,
         values: codigo_retencion
       });
       filters[1] = search.createFilter({
         name: "custrecord_l598_param_ret_det_imp_desde",
         operator: search.Operator.LESSTHANOREQUALTO,
         values: valor
       });
       filters[2] = search.createFilter({
         name: "custrecord_l598_param_ret_det_imp_hasta",
         operator: search.Operator.GREATERTHAN,
         values: valor
       });
       filters[3] = search.createFilter({
         name: "isinactive",
         operator: search.Operator.IS,
         values: false
       });

       const columns = [
         search.createColumn("custrecord_l598_param_ret_det_excedente"),//EXCEDENTE
         search.createColumn({ name: "custrecord_l598_param_ret_tipo_ret", join: "custrecord_l598_param_ret_det_padre" }),//TIPO DE RETENCION
         search.createColumn({ name: "custrecord_l598_param_ret_cod_ret", join: "custrecord_l598_param_ret_det_padre" }),//CODIGO DE RETENCION
         search.createColumn({ name: "custrecord_l598_param_ret_min_ret", join: "custrecord_l598_param_ret_det_padre" }),//MONTO MINIMO DE RETENCION
         search.createColumn("custrecord_l598_param_ret_det_porc"),//PORCENTAJE
         search.createColumn({ name: "custrecord_l598_param_ret_cuenta_cont", join: "custrecord_l598_param_ret_det_padre" })];//CUENTA CONTABLE

       const searchresults = search.create({
         type: "customrecord_l598_param_ret_det",
         filters: filters,
         columns: columns
       }).run().getRange({
         start: 0,
         end: 1000
       });

       if (!isEmpty(searchresults) && searchresults.length > 0) {
         minimo_retencion = searchresults[0].getValue({ name: "custrecord_l598_param_ret_min_ret", join: "custrecord_l598_param_ret_det_padre" });//MONTO MINIMO DE RETENCION
         excedente = searchresults[0].getValue("custrecord_l598_param_ret_det_excedente");//EXCEDENTE
         porcentaje = searchresults[0].getValue("custrecord_l598_param_ret_det_porc");//PORCENTAJE
         idCuentaCont = searchresults[0].getValue({ name: "custrecord_l598_param_ret_cuenta_cont", join: "custrecord_l598_param_ret_det_padre" });//CUENTA CONTABLE
         resultado.detalle_encontrado = true;
       } else {
         resultado.detalle_encontrado = false;
       }

       resultado.minimo_retencion = parseFloat(minimo_retencion);
       resultado.excedente = parseFloat(excedente);
       resultado.cuenta_contable = idCuentaCont;

       if (porcentaje != null && porcentaje != 100 && porcentaje.substring(porcentaje.length - 1) == "%")
         resultado.porcentaje = porcentaje.substring(0, porcentaje.length - 1);
       else
         resultado.porcentaje = porcentaje;

     }
     return resultado;
   }

   function getRetencion(id_tipo_ret, codigo_retencion, base_calculo, apGrossingUpIRNR, base_calculo_MO, apGrossingUpAlicuotaRetIRNR) {

     const objRetencion = {
       importeRetencion: 0,
       alicuotaRetencion: 0,
       warning: false,
       mensaje: "",
     };

     let porcentajeRetencion = 1;
     let excedente = 0.00;
     let minRetencion = 0.00;
     let retencion = 0.00;
     let retencionMO = 0.00;
     const errorAlicuotaRetencion = false;
     let errorDetalle = false;
     let valores = new Array();
     let cuentaContable;

     if (parseFloat(base_calculo, 10) <= 0) {
       objRetencion.importeRetencion = 0;
       objRetencion.alicuotaRetencion = 0;
       return objRetencion;
     }

     valores = getParametrosMatriz(codigo_retencion, parseFloat(base_calculo, 10).toFixedOK(2));

     if (valores.detalle_encontrado == true) {
       if (!isEmpty(valores.porcentaje))
         porcentajeRetencion = valores.porcentaje;

       if (!isEmpty(valores.excedente))
         excedente = valores["excedente"];

       if (!isEmpty(valores.minimo_retencion))
         minRetencion = valores.minimo_retencion;

       if (!isEmpty(valores.cuenta_contable))
         cuentaContable = valores.cuenta_contable;
     }
     else {
       errorDetalle = true;
     }

     if (errorDetalle == false && errorAlicuotaRetencion == false && !isEmpty(porcentajeRetencion) && !isNaN(porcentajeRetencion)) {

       //nlapiLogExecution('DEBUG','LINE 1282','id_tipo_ret: '+id_tipo_ret+' - codigo_retencion: '+codigo_retencion+' - base_calculo: '+ base_calculo+' - apGrossingUpIRNR:'+ apGrossingUpIRNR+' - base_calculo_MO: '+base_calculo_MO+' - apGrossingUpAlicuotaRetIRNR: '+apGrossingUpAlicuotaRetIRNR);

       if (!isEmpty(apGrossingUpIRNR) && (apGrossingUpIRNR == "T" || apGrossingUpIRNR === true) && id_tipo_ret == "irnr") {
         const divisor = ((100 - porcentajeRetencion) / 100);
         base_calculo = (base_calculo / divisor);
         base_calculo_MO = (base_calculo_MO / divisor);
       }
       else {
         if (!isEmpty(apGrossingUpIRNR) && (apGrossingUpIRNR == "T" || apGrossingUpIRNR === true) && id_tipo_ret != "irnr" && !isEmpty(apGrossingUpAlicuotaRetIRNR)) {
           const divisor = ((100 - apGrossingUpAlicuotaRetIRNR) / 100);
           base_calculo = (base_calculo / divisor);
           base_calculo_MO = (base_calculo_MO / divisor);
         }
       }

       //nlapiLogExecution('DEBUG','LINE 1300','base_calculo (nueva): '+ base_calculo+' - base_calculo_MO (nueva): '+base_calculo_MO);
       retencion = base_calculo - parseFloat(excedente, 10);
       retencion = (retencion * porcentajeRetencion) / 100;
       retencion = retencion + parseFloat(excedente, 10);

       retencionMO = base_calculo_MO - parseFloat(excedente, 10);
       retencionMO = (retencionMO * porcentajeRetencion) / 100;
       retencionMO = retencionMO + parseFloat(excedente, 10);

       if (retencion > parseFloat(minRetencion, 10)) {
         objRetencion.importeRetencion = parseFloat(retencion, 10);
         objRetencion.alicuotaRetencion = parseFloat(porcentajeRetencion, 10);
         objRetencion.cuenta_contable = cuentaContable;
         objRetencion.base_calculo = base_calculo;
         objRetencion.base_calculo_MO = base_calculo_MO;
         objRetencion.importeRetencionMO = parseFloat(retencionMO, 10);
         //nlapiLogExecution('DEBUG','LINE 1351','objRetencion: '+ JSON.stringify(objRetencion));
         return objRetencion;
       }
       else {
         objRetencion.importeRetencion = 0.00;
         objRetencion.alicuotaRetencion = 0;
         return objRetencion;
       }
     }
     else {
       let textoRetencion = "";
       if (id_tipo_ret == "irpf") {
         textoRetencion = "IRPF";
       }
       else {
         if (id_tipo_ret == "irnr") {
           textoRetencion = "IRNR";
         }
         else {
           if (id_tipo_ret == "irae") {
             textoRetencion = "IRAE";
           }
           else {
             textoRetencion = "IVAE";
           }
         }
       }

       let nombreRetencion = "";
       //OBTENGO NOMBRE DE LA RETENCION
       if (!isEmpty(codigo_retencion)) {
         const filters = [
           search.createFilter({
             name: "internalid",
             operator: search.Operator.IS,
             values: codigo_retencion
           }),

           search.createFilter({
             name: "isinactive",
             operator: search.Operator.IS,
             values: false
           })
         ];
         const columns = new Array();
         columns[0] = search.createColumn("name");

         const searchresults = search.create({
           type: "customrecord_l598_param_ret",
           filters: filters,
           columns: columns
         }).run().getRange({
           start: 0,
           end: 1000
         });

         if (!isEmpty(searchresults) && searchresults.length > 0) {
           nombreRetencion = searchresults[0].getValue("name");
         }
       }

       objRetencion.warning = true;
       let mensajeInformar = "no se encuentra configurado el Detalle de Parametrización de Retencion";
       if (errorDetalle == false) {
         mensajeInformar = "no se encuentra configurada la Alicuota de Retencion";
       }
       objRetencion.mensaje = "No se calculará la Retencion " + nombreRetencion + " de " + textoRetencion + " Debido a que " + mensajeInformar;
       objRetencion.importeRetencion = 0;
       objRetencion.alicuotaRetencion = 0;
       log.debug("Calculo Retencion", "Error calculando importe de retención - funcion getRetencion - Mensaje : " + objRetencion.mensaje);

       return objRetencion;
     }
   }

   function transactionDetails(arrayTransacciones) {
     const filtro = search.createFilter({
       name: "internalid",
       operator: search.Operator.ANYOF,
       values: arrayTransacciones
     });

     const searchResultsLoad = search.load({
       id: "customsearch_l598_transaction_det_net",
     });
     searchResultsLoad.filters.push(filtro);

     const searchResultsRun = searchResultsLoad.run();

     const searchResults = searchResultsRun.getRange({
       start: 0,
       end: 1000
     });
     const transactionDet = new Array();
     let result;
     let columns;

     for (let i = 0; !isEmpty(searchResults) && i < searchResults.length; i++) {
       result = searchResults[i];
       columns = result.columns;
       transactionDet[i] = {};
       transactionDet[i].transacId = result.getValue(columns[1]);
       transactionDet[i].transacFecha = result.getValue(columns[2]);
       transactionDet[i].transacTranid = result.getValue(columns[3]);
       transactionDet[i].transacImporte = result.getValue(columns[4]);
       transactionDet[i].transacMoneda = result.getValue(columns[5]);
       transactionDet[i].transacTipoCambio = result.getValue(columns[6]);
       transactionDet[i].transacImporteXTP = result.getValue(columns[7]);
       transactionDet[i].idCuentaContable = result.getValue(columns[8]);
     }
     return transactionDet;
   }

   function transactionNewDetails(proveedor, period, subsidiary, fechaTransac, idCodRetIRNR, idCodRetIRAE) {
    var filters = new Array();
    
    filters.push(search.createFilter({
      name: "entity",
      operator: search.Operator.IS,
      values: proveedor
    }));
    filters.push(search.createFilter({
      name: "postingperiod",
      operator: search.Operator.IS,
      values: period
    }));
    if(!isEmpty(idCodRetIRNR)){
      filters.push(search.createFilter({
        name: "custbody_l598_codigo_ret_irnr",
        operator: search.Operator.IS,
        values: idCodRetIRNR
      }));
    } else if(!isEmpty(idCodRetIRAE)){
      filters.push(search.createFilter({
        name: "custbody_l598_codigo_ret_irae",
        operator: search.Operator.IS,
        values: idCodRetIRAE
      }));
    }
    
    if (!isEmpty(subsidiary)) {
      filters.push(search.createFilter({
        name: "subsidiary",
        operator: search.Operator.IS,
        values: subsidiary
      }));
    }

    if (!isEmpty(fechaTransac)) {
      filters.push(search.createFilter({
        name: "trandate",
        operator: search.Operator.ONORBEFORE,
        values: format.format({ value: fechaTransac, type: format.Type.DATE })
      }));
    }

    const searchResultsLoad = search.load({
      id: "customsearch_l598_transaction_det_net_3",
    });
    searchResultsLoad.filters.push(filtro);

    const searchResultsRun = searchResultsLoad.run();

    const searchResults = searchResultsRun.getRange({
      start: 0,
      end: 1000
    });
    const transactionDet = new Array();
    let result;
    let columns;

    for (i = 0; !isEmpty(searchResults) && i < searchResults.length; i++) {
      result = searchResults[i];
      columns = result.getAllColumns();
      transactionDet[i] = new Object();
      transactionDet[i].transacId = result.getValue(columns[1]);
      transactionDet[i].transacFecha = result.getValue(columns[2]);
      transactionDet[i].transacTranid = result.getValue(columns[3]);
      transactionDet[i].transacImporte = result.getValue(columns[4]);
      transactionDet[i].transacMoneda = result.getValue(columns[5]);
      transactionDet[i].transacTipoCambio = result.getValue(columns[6]);
      transactionDet[i].transacImporteXTP = result.getValue(columns[7]);
      transactionDet[i].idCuentaContable = result.getValue(columns[8]);
    }
    return transactionDet;
  }

  function transactionDetailsIVA(arrayTransacciones, arrayIVATaxCodes, proveedor, period, subsidiary, fechaTransac, idCodRetIVA) { 
    log.debug("inicio transactionDetailsIVA", "LINE 901 PARAMS= " + JSON.stringify({arrayTransacciones:arrayTransacciones, arrayIVATaxCodes:arrayIVATaxCodes}));
     const filters = new Array();
     if (arrayTransacciones.length > 0){
      filters.push(search.createFilter({
        name: "internalid",
        operator: search.Operator.ANYOF,
        values: arrayTransacciones
      }));
     }

     if (arrayTransacciones.length == 0){
      filters.push(search.createFilter({
        name: "entity",
        operator: search.Operator.IS,
        values: proveedor
      }));
      filters.push(search.createFilter({
        name: "postingperiod",
        operator: search.Operator.IS,
        values: period
      }));
      if (!isEmpty(idCodRetIVA)) {
        filters.push(search.createFilter({
          name: "custbody_l598_codigo_ret_iva",
          operator: search.Operator.IS,
          values: idCodRetIVA
        }));
      }
      if (!isEmpty(subsidiary)) {
        filters.push(search.createFilter({
          name: "subsidiary",
          operator: search.Operator.IS,
          values: subsidiary
        }));
      }
      if (!isEmpty(fechaTransac)) {
        filters.push(search.createFilter({
          name: "trandate",
          operator: search.Operator.IS,
          values:  format.format({ value: fechaTransac, type: format.Type.DATE })
        }));
      }
     }

     if (!isEmpty(arrayIVATaxCodes) && arrayIVATaxCodes.length > 0)
      filters.push(search.createFilter({
        //name: "taxitem",
        name: "custcol_l598_codigo_impuesto",
        operator: search.Operator.ANYOF,
        values: arrayIVATaxCodes
      }));

     const searchResultsLoad = search.load({
       id: "customsearch_l598_imp_iva_transaction_2",
     });
     searchResultsLoad.filters.push(...filters);

     const searchResultsRun = searchResultsLoad.run();

     const searchResults = searchResultsRun.getRange({
       start: 0,
       end: 1000
     });
     const transactionDet = new Array();
     let result;
     let columns;

     for (let i = 0; !isEmpty(searchResults) && i < searchResults.length; i++) {
       result = searchResults[i];
       columns = result.columns;
       transactionDet[i] = {};
       transactionDet[i].transacId = result.getValue(columns[1]);
       transactionDet[i].transacImporteXTP = result.getValue(columns[2]);//IMPORTE IVA * TC
       transactionDet[i].transacTranid = result.getValue(columns[3]);
       transactionDet[i].transacFecha = result.getValue(columns[4]);
       transactionDet[i].transacMoneda = result.getValue(columns[5]);
       transactionDet[i].transacTipoCambio = result.getValue(columns[6]);
       transactionDet[i].transacImporte = result.getValue(columns[7]);//IMPORTE IVA MONEDA ORIGINA
       transactionDet[i].idCuentaContable = result.getValue(columns[8]);
       //transactionDet[i].transacImporteNet    = result.getValue(columns[9]);//IMPORTE TOTAL TRANSACCION
       //transactionDet[i].transacImporteNetXTP = result.getValue(columns[10]);//IMPORTE TOTAL TRANSACCION * TC
       const importeTotalTransac = result.getValue(columns[9]);
       const importeTotalIVATransac = result.getValue(columns[7]);
       const importeTotalTransacXTP = result.getValue(columns[10]);
       const importeTotalIVATransacXTP = result.getValue(columns[2]);
       //nlapiLogExecution('DEBUG','LINE 1730','importeTotalTransac: '+importeTotalTransac+' - importeTotalIVATransac: '+importeTotalIVATransac+' - importeTotalTransacXTP: '+importeTotalTransacXTP+' - importeTotalIVATransacXTP: '+importeTotalIVATransacXTP);
       transactionDet[i].transacImporteNet = parseFloat(importeTotalTransac, 10) - parseFloat(importeTotalIVATransac, 10);//IMPORTE TOTAL TRANSACCION
       transactionDet[i].transacImporteNetXTP = parseFloat(importeTotalTransacXTP, 10) - parseFloat(importeTotalIVATransacXTP, 10);//IMPORTE TOTAL TRANSACCION * TC
     }
     log.debug("fin transactionDetailsIVA", "LINE 953 RETURN= " + JSON.stringify(transactionDet));
     return transactionDet;
   }

   function getDate(fecha, zonaHoraria) { //Toma una fecha ubicada en otra zona horaria y la mueve a GMT0. Con zonaHoraria se puede cambiar por otra diferente a GMT0
     let utc = new Date(fecha); //GMT 0   
     zonaHoraria = isEmpty(zonaHoraria) ? 0 : zonaHoraria;
     utc = utc.getTime() + (utc.getTimezoneOffset() * 60000);
     return new Date(utc + (3600000 * zonaHoraria));
   }

   function getInformacionRetencion(codRetencion) {
     if (!isEmpty(codRetencion)) {

       const filters = [search.createFilter({
         name: "internalid",
         operator: "is",
         values: codRetencion
       }), search.createFilter({
         name: "isinactive",
         operator: "is",
         values: false
       })];

       const columns = [
         "custrecord_l598_param_ret_cod_ret",
         "custrecord_l598_param_ret_tipo_ret",
         "custrecord_l598_param_ret_desc"
       ];

       const results = search.create({
         type: "customrecord_l598_param_ret",
         filters: filters,
         columns: columns
       }).run().getRange({
         start: 0,
         end: 1,
       });

       if (!isEmpty(results) && results.length > 0) {
         const retencion = {};
         retencion.codigo = results[0].getValue("custrecord_l598_param_ret_cod_ret");
         retencion.tipo = results[0].getValue("custrecord_l598_param_ret_tipo_ret");
         retencion.descripcion = results[0].getValue("custrecord_l598_param_ret_desc");
         return retencion;
       }
     }
     return null;
   }
   /**
   * Migrar función calcularRetencionesSuiteLet()
   */
   function onRequest(context) {
     const respuestaRetenciones = {
       warning: false,
       error: false,
       mensajeError: [],
       mensajeWarning: [],
       mensajeOk: "",
       esAgenteRetencionIVA: false,
       esAgenteRetencionIRPF: false,
       esAgenteRetencionIRNR: false,
       esAgenteRetencionIRAE: false,
       retencion_IVA: [],
       retencion_IRPF: [],
       retencion_IRNR: [],
       retencion_IRAE: [],
       total_retenciones: 0.0,
       imp_retencion_IRNR: 0.0,
       importe_total_retencion: 0.0,
       importe_iva: 0.0,
       version_calc_ret: ""
     };

     let idTransaccionOriginal;
     let tipoTransaccionOriginal;
     let informacionPago;
     let entity;
     let monedaTransaccionOriginal;
     let tasa_cambio_transac;
     let montoTotalTransaccion;
     let estadoTransac;
     let subsidiariaTransaccion;
     let transacTranid;
     let cuentaContable;
     let fechaExRate;
     let valueUI;
     let noCumpleMinimoIRPF = false;
     let noCumpleMinimoIRNR = false;
     let noCumpleMinimoIRAE = false;
     let noCumpleMinimoIVA = false;
     let retAcumIRPF = "F";
     let codRetencionIRPF = "";
     let codRetencionIRNR = "";
     let codRetencionIRAE = "";
     let codRetencionIVA = "";
     let idInternosFacturaIRPF;
     let direccion;
     let ciudad;
     let pais;
     let codPostal;
     let uruTipoDoc;
     let uruNroDoc;
     let uruRazonSoc;
     let poseeRetencionIRPF = false;
     let poseeRetencionIRNR = false;
     let poseeRetencionIRAE = false;
     let poseeRetencionIVA = false;
     try {
       log.audit("TIEMPOS", "INICIO SUITELET: " + new Date());
       const infoPago = context.request.parameters.informacionPago;
       informacionPago = JSON.parse(infoPago);

       if (!isEmpty(informacionPago)) {
         log.audit("calcularRetencionesSuiteLet", "informacionPago: " + JSON.stringify(informacionPago));

         let errorGeneral = false;
         let total_retenciones = 0.0;
         //INICIO - OBTENGO INFORMACION DEL PAGO QUE VIENE DESDE EL SCRIPT EVENTO DE USUARIO
         idTransaccionOriginal = informacionPago.recId;
         tipoTransaccionOriginal = informacionPago.recType;
         var tranid = informacionPago.tranid;
         const trandate = getDate(informacionPago.fecha);

         log.audit("calcularRetencionesSuiteLet", "Trandate: " + trandate);
         trandate.setHours(0, 0, 0, 0);
         log.audit("calcularRetencionesSuiteLet", "Trandate final: " + trandate + " - typeof trandate: " + typeof trandate + " - format.format(trandate): " + format.format({ value: trandate, type: format.Type.DATE }));
         /* var fechaPPDate = new Date(trandate);
                                             var fechaPPString = nlapiDateToString(fechaPPDate, 'date');
                                             trandate = fechaPPString; */
         const id_posting_period = informacionPago.periodo;
         subsidiariaTransaccion = informacionPago.subsidiaria;
         entity = informacionPago.entity;
         monedaTransaccionOriginal = informacionPago.moneda;
         tasa_cambio_transac = informacionPago.tipoCambio;
         montoTotalTransaccion = informacionPago.importeTotal;
         estadoTransac = informacionPago.estado;
         cuentaContable = informacionPago.cuentaCont;
         direccion = informacionPago.direccion;
         ciudad = informacionPago.ciudad;
         pais = informacionPago.pais;
         codPostal = informacionPago.codPostal;
         noCumpleMinimoIRPF = false;
        noCumpleMinimoIRNR = false;
        noCumpleMinimoIRAE = false;
          noCumpleMinimoIVA = false;
         uruTipoDoc = informacionPago.uruTipoDoc;
         uruNroDoc = informacionPago.uruNroDoc;
         uruRazonSoc = informacionPago.uruRazonSoc;
         fechaExRate = informacionPago.fechaExRate;//FORMATO -> MM/DD/YYYY
         let mensajeAgenteRetencion = "";
         //var fechaVenci = informacionPago.fechaVenci;

         //FIN - OBTENGO INFORMACION DEL PAGO QUE VIENE DESDE EL SCRIPT EVENTO DE USUARIO
         let esAgenteRetencionIRPF = esAgenteRetencion("irpf", subsidiariaTransaccion);
         respuestaRetenciones.esAgenteRetencionIRPF = esAgenteRetencionIRPF;

         let esAgenteRetencionIRNR = esAgenteRetencion("irnr", subsidiariaTransaccion);
         respuestaRetenciones.esAgenteRetencionIRNR = esAgenteRetencionIRNR;

         let esAgenteRetencionIVA = esAgenteRetencion("iva", subsidiariaTransaccion);
         respuestaRetenciones.esAgenteRetencionIVA = esAgenteRetencionIVA;

         let esAgenteRetencionIRAE = esAgenteRetencion("irae", subsidiariaTransaccion);
         respuestaRetenciones.esAgenteRetencionIRAE = esAgenteRetencionIRAE;

         if (esAgenteRetencionIRPF || esAgenteRetencionIRNR || esAgenteRetencionIVA || esAgenteRetencionIRAE) {

           log.audit("calcularRetencionesSuiteLet", "LINE 299 - Log de Control 1 - TRANDATE: " + trandate);

           //SE RECUPERAN LOS CODIGOS DE RETENCION DE LA TRANSACCION ACTUAL
           const resultCodRetTransac = obtenerCodigosRetTransaction(entity, idTransaccionOriginal, subsidiariaTransaccion);

           log.debug('LINE 294 alex','resultCodRetTransac: '+JSON.stringify(resultCodRetTransac));
           if (!isEmpty(resultCodRetTransac) && resultCodRetTransac.length <= 0) {
             errorGeneral = true;
             respuestaRetenciones.error = true;
             respuestaRetenciones.mensajeError.push("No se pudo obtener los codigos de retencion asociados a la transacción, verifique el estado general de la transacción.");
             log.debug('LINE 300','OK');
           }

           if (!errorGeneral) {
             log.debug("LINE 305", "resultCodRetTransac: " + JSON.stringify(resultCodRetTransac));
             const objCodigos = obtener_codigos_transaccion(resultCodRetTransac, idTransaccionOriginal);
             log.debug("LINE 312", "objCodigos: " + JSON.stringify(objCodigos));
             const importe_neto_transaction = obtenerMontoNetTransaction(entity, idTransaccionOriginal, subsidiariaTransaccion);
             //var resultsImpIVATransac = obtenerIvaTransactionArray(entity, idTransaccionOriginal, subsidiariaTransaccion);
             let importe_neto_factura_proveedor_a_pagar_total = 0.0;
             let calSobreIVA = false;
             let importe_bruto_transaccion_proveedor = 0.0;
             let importe_bruto_transaccion_proveedor_a_pagar = 0.0;
             let importe_neto_transaccion_proveedor_a_pagar = 0.0;

             let mniIRPF = 0.00;
             let mniIRNR = 0.00;
             let mniIRAE = 0.00;
             let mniIVA = 0.00;
             let mImponibleIRPF = 0.00;
             let mImponiblemniIRNR = 0.00;
             let mImponiblemniIRAE = 0.00;
             let mImponiblemniIVA = 0.00;
             let mniEnUiIRPF = "F";
             let mniEnUiIRNR = "F";
             let mniEnUiIRAE = "F";
             let mniEnUiIVA = "F";

             let IVATaxCodes = "";
             let apGrossingUpIRNR = "F";
             var aplicaAcumIRNR = "F"; 
            var aplicaAcumIRAE = "F"; 
            var aplicaAcumIVA = "F";
             let guIRNR_base_calculo_MO = 0.00;
             let guIRNR_base_calculo_XTP = 0.00;
             let guIRNR_alicuotaRet = null;
             let arrayIVATaxCodes = new Array();

             //log.audit('calcularRetencionesSuiteLet', "LINE 348 - Log de Control 2");

             // INICIO - SE EXTRAE DATOS DEL OBJETO QUE CONTIENE LOS CODIGOS DE RETENCION DE LA TRANSACCION
             if (!isEmpty(objCodigos)) {
               if (!isEmpty(objCodigos.codigoRetIRPF)) {
                 codRetencionIRPF = objCodigos.codigoRetIRPF;
                 mniIRPF = parseFloat(objCodigos.mniIRPF, 10);
                 mniEnUiIRPF = objCodigos.mniIRPFUI;
               }

               if (!isEmpty(objCodigos.codigoRetIRNR)) {
                 codRetencionIRNR = objCodigos.codigoRetIRNR;
                 mniIRNR = parseFloat(objCodigos.mniIRNR, 10);
                 mniEnUiIRNR = objCodigos.mniIRNRUI;

                if (!isEmpty(objCodigos.apGrossingUp) && objCodigos.apGrossingUp != "F" ) apGrossingUpIRNR = objCodigos.apGrossingUp;
              	if (!isEmpty(objCodigos.aplicaAcumIRNR) && objCodigos.aplicaAcumIRNR != "F" ) aplicaAcumIRNR = objCodigos.aplicaAcumIRNR;
						}

               if (!isEmpty(objCodigos.codigoRetIVA)) {
                 codRetencionIVA = objCodigos.codigoRetIVA;
                 mniIVA = parseFloat(objCodigos.mniIVA, 10);
                 mniEnUiIVA = objCodigos.mniIVAUI;
                 IVATaxCodes = objCodigos.IVATaxCodes;

                 if (!isEmpty(IVATaxCodes))
                   arrayIVATaxCodes = IVATaxCodes.split(",");

                 if (!isEmpty(objCodigos.calSobreIVA) && objCodigos.calSobreIVA === true)
                   calSobreIVA = true;
                  if (!isEmpty(objCodigos.aplicaAcumIVA) && objCodigos.aplicaAcumIVA != "F" ) aplicaAcumIVA = objCodigos.aplicaAcumIVA; // Agregado
							
                 log.debug("LINE 366", "codRetencionIVA: " + codRetencionIVA + " - mniIVA: " + mniIVA + " - mniEnUiIVA: " + mniEnUiIVA + " - IVATaxCodes: " + IVATaxCodes + " - calSobreIVA: " + calSobreIVA + "arrayIVATaxCodes: " + JSON.stringify(arrayIVATaxCodes));
               }

               if (!isEmpty(objCodigos.codigoRetIRAE)) {
                 codRetencionIRAE = objCodigos.codigoRetIRAE;
                 mniIRAE = parseFloat(objCodigos.mniIRAE, 10);
                 mniEnUiIRAE = objCodigos.mniIRAEUI;
                if (!isEmpty(objCodigos.aplicaAcumIRAE) && objCodigos.aplicaAcumIRAE != "F" ) aplicaAcumIRAE = objCodigos.aplicaAcumIRAE; // Agregado
						
               }

               importe_bruto_transaccion_proveedor = parseFloat(objCodigos.importeTotal, 10);
             }
             // FIN - SE EXTRAE DATOS DEL OBJETO QUE CONTIENE LOS CODIGOS DE RETENCION DE LA TRANSACCION

             //log.audit('calcularRetencionesSuiteLet', "LINE 399 - Log de Control 3");

             //INICIO - COMPROBAR SI LAS RETENCIONES SON ACUMULATIVAS   
             //log.debug('LINE 392','codRetencionIRPF: '+codRetencionIRPF+' - esAgenteRetencionIRPF: '+esAgenteRetencionIRPF);                                    
             if (!isEmpty(codRetencionIRPF) && esAgenteRetencionIRPF)
               retAcumIRPF = retAplicaMontoAcumulativo(1);//1-RETENCIÓN IRPF

             log.debug("LINE 396", "retAcumIRPF: " + retAcumIRPF);
             importe_bruto_transaccion_proveedor_a_pagar = montoTotalTransaccion;
             if (!isEmpty(importe_neto_transaction) && parseFloat(importe_neto_transaction, 10) > 0) {
               const coeficiente = parseFloat(Math.abs(parseFloat(importe_bruto_transaccion_proveedor, 10) / parseFloat(importe_neto_transaction, 10)), 10);
               importe_neto_transaccion_proveedor_a_pagar = importe_bruto_transaccion_proveedor_a_pagar / coeficiente;
               importe_neto_transaccion_proveedor_a_pagar = parseFloat(parseFloat(importe_neto_transaccion_proveedor_a_pagar, 10) * parseFloat(tasa_cambio_transac, 10), 10).toFixedOK(2);
               importe_neto_factura_proveedor_a_pagar_total = parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) + parseFloat(importe_neto_transaccion_proveedor_a_pagar, 10);
             }

             //OBTENGO EL PORCENTAJE DEL PAGO
             /*var porcentajePago = 1;
                                                                 porcentajePago = parseFloat(Math.abs(parseFloat(importe_bruto_transaccion_proveedor_a_pagar, 10) / parseFloat(importe_bruto_transaccion_proveedor, 10)),10);
                                                                 
                                                                 //OBTENGO EL IVA DEL PAGO
                                                                 var objIVA = obtener_iva_transaction(resultsImpIVATransac, idTransaccionOriginal);
                                                                 var ivaAux = 0.00;
                                             
                                                                 if(!isEmpty(objIVA))
                                                                     ivaAux = parseFloat(objIVA.importeIVA,10);
                                             
                                                                 var importeIVAPagoParcial = parseFloat(ivaAux, 10) * parseFloat(porcentajePago, 10);
                                                                 importeIVAPago = parseFloat(importeIVAPago, 10) + parseFloat(importeIVAPagoParcial, 10);*/

             //log.audit('calcularRetencionesSuiteLet', "LINE 426 - Log de Control 4");

             //SE OBTIENE EL VALOR DE LA UNIDAD INDEXADA - ESTO SE DEBE CAMBIAR PARA CONSULTAR EL TIPO DE CAMBIO ACTUAL DE LA UI
             valueUI = getUnidadIndexadaValue(fechaExRate);
             log.debug("LINE 419", "valueUI: " + valueUI);

             //log.audit('calcularRetencionesSuiteLet', "LINE 430 - Log de Control 5");


             let impNetMensIdInternosSRetIRPF = "";
             let arrayTransacIRPF = new Array();
             let arrayTransacDetailsIRPF = new Array();
             const arrayTransacIRNR = new Array();
             let arrayTransacDetailsIRNR = new Array();
             var arrayTransacDetailsAUXIRNR = new Array();
             const arrayTransacIRAE = new Array();
             let arrayTransacDetailsIRAE = new Array();
             var arrayTransacDetailsAUXIRAE = new Array();
             const arrayTransacIVA = new Array();
             let arrayTransacDetailsIVA = new Array();
             var arrayTransacDetailsAUXIVA = new Array();
             let impNetMensualProvIRPF = 0.00;
             let impNetMensualProvIRPF2 = 0.00;
             let poseeRetencionIRPFEnPeriodo = false;
             let poseeNCIRPFEnPeriodo = false;

             let arrayTransacIRPFInversa = new Array();
             let importeIvaValidarMinimo = 0.00;

             var ACUMULADO_IRNR = 0.0;
              var ACUMULADO_IRAE = 0.0; 
              var ACUMULADO_IVA = 0.0;
              var ACUMULADO_AUX_IRNR = 0.0;
              var ACUMULADO_AUX_IRAE = 0.0;
              var ACUMULADO_AUX_IVA = 0.0;

             if (tipoTransaccionOriginal == "vendorbill") {
               poseeRetencionIRPF = wRetencion(entity, id_posting_period, subsidiariaTransaccion, idTransaccionOriginal, 1);
               poseeRetencionIRNR = wRetencionNew(entity, id_posting_period, subsidiariaTransaccion, 2);
               poseeRetencionIVA = wRetencionNew(entity, id_posting_period, subsidiariaTransaccion, 3);
               poseeRetencionIRAE = wRetencionNew(entity, id_posting_period, subsidiariaTransaccion, 4);
             }

             log.audit("calcularRetencionesSuiteLet", "LINE 461 - poseeRetencionIRPF: " + poseeRetencionIRPF + " - poseeRetencionIRNR: " + poseeRetencionIRNR + " - poseeRetencionIVA: " + poseeRetencionIVA + " - poseeRetencionIRAE: " + poseeRetencionIRAE);

             if (poseeRetencionIRPF)
               esAgenteRetencionIRPF = false;

            /* if (poseeRetencionIRNR)
               esAgenteRetencionIRNR = false;

             if (poseeRetencionIRAE)
               esAgenteRetencionIRAE = false;

             if (poseeRetencionIVA)
               esAgenteRetencionIVA = false;*/

             let objInfwRetencionIRPF;
             //log.audit('calcularRetencionesSuiteLet', "LINE 475 - Log de Control 7");
             if (!poseeRetencionIRPF && !isEmpty(codRetencionIRPF)) {
               let impNetMensualProvIRPFNC = 0.00;
               let impTotNotaCredito;
               //SI LA TRANSACCION ES UNA FACTURA
               if (tipoTransaccionOriginal == "vendorbill") {
                 //SE VERIFICA SI EL PROVEEDOR TIENE NOTAS DE CREDITO EN EL PERIODO EN CUESTION
                 const objwNotaCreditoIRPF = wNotaCreditoIRPF(entity, id_posting_period, subsidiariaTransaccion, codRetencionIRPF, trandate);

                 log.debug("calcularRetencionesSuitelet", "objwNotaCreditoIRPF: " + JSON.stringify(objwNotaCreditoIRPF));

                 poseeNCIRPFEnPeriodo = objwNotaCreditoIRPF.poseeRetNC;

                 if (!isEmpty(objwNotaCreditoIRPF) && poseeNCIRPFEnPeriodo) {

                   log.audit("calcularRetencionesSuiteLet", "LINE 497 - log de control");

                   //ARREGLO CON LAS NOTAS DE CREDITO DEL PROVEEDOR EN EL PERIODO EN CUESTION
                   const arrayNCwIRPF = objwNotaCreditoIRPF.idTransacciones.toString().split(",");
                   //log.debug('LINE 450','ProveedorPoseeRetIRPF (NC): '+JSON.stringify(arrayNCwIRPF)+' - arrayNCwIRPF.length: '+arrayNCwIRPF.length);

                   if (!isEmpty(arrayNCwIRPF) && arrayNCwIRPF.length > 0) {
                     //SE OBTIENE EL IMPORTE NETO DE LAS NOTAS DE CREDITO DEL PROVEEDOR PARA EL PERIODO EN CUESTION
                     impTotNotaCredito = transactionDetailsNet(arrayNCwIRPF);

                     //SE VERIFICA SI EL PROVEEDOR POSEE UNA RETENCION SOBRE FACTURAS CON EL MISMO CODIGO DE RETENCION IRPF DE LA TRANSACCION Y PERIODO EN CUESTION
                     objInfwRetencionIRPF = wRetencionIRPF(entity, id_posting_period, subsidiariaTransaccion, codRetencionIRPF);
                     poseeRetencionIRPFEnPeriodo = objInfwRetencionIRPF.poseeRetIRPF;
                     log.debug("calcularRetencionesSuitelet", "LINE 1291 - ProveedorPoseeRetIRPF (FC): " + JSON.stringify(objInfwRetencionIRPF));

                     //SI EL PROVEEDOR POSEE RETENCION SOBRE FACTURAS CON EL MISMO CODIGO DE RETENCION IRPF Y PERIODO EN CUESTION, ENTONCES:
                     if (poseeRetencionIRPFEnPeriodo) {

                       //SE OBTIENE LA BASE DE CALCULO DE LAS RETENCIONES SOBRE FACTURAS CON EL MISMO CODIGO IRPF Y PERIODO EN CUESTION
                       const infoImpPagosMensualSResIRPFInversa = getTransacIdsMinimoIRPFInversa(entity, id_posting_period, subsidiariaTransaccion, tipoTransaccionOriginal, trandate, codRetencionIRPF);
                       log.audit("calcularRetencionesSuiteLet despues de getTransacIdsMinimoIRPFInversa", "infoImpPagosMensualSResIRPFInversa = " + JSON.stringify(infoImpPagosMensualSResIRPFInversa));
                       const impNetMensIdInternosSRetIRPFInversa = infoImpPagosMensualSResIRPFInversa.idInternos;
                       //let arrayTransacIRPFInversa = new Array();
                       arrayTransacIRPFInversa = impNetMensIdInternosSRetIRPFInversa.split(",");
                       const arrayTransacIRPFInversaAUX = arrayTransacIRPFInversa.filter(function (elem, index, self) {
                         return index == self.indexOf(elem);
                       });

                       //ARRAY CON ID'S DE FACTURAS DEL PROVEEDOR CON RETENCION IRPF PARA EL CODIGO Y PERIODO EN CUESTION 
                       arrayTransacIRPFInversa = arrayTransacIRPFInversaAUX;

                       if (!isEmpty(arrayTransacIRPFInversa) && arrayTransacIRPFInversa.length > 0) {
                         log.audit("calcularRetencionesSuiteLet", "LINE 1326 - arrayTransacIRPFInversa = " + JSON.stringify(arrayTransacIRPFInversa));
                         //SE OBTIENE LA BASE DE CALCULO DE LAS RETENCIONES SOBRE FACTURAS DE PROVEEDOR QUE SE TIENE PARA LA FECHA
                         const baseCalculoRetenidoHastaAhora = transactionDetailsNet(arrayTransacIRPFInversa);
                         //log.debug('LINE 481','IDTransaccionesConRetIRPF (FC): '+JSON.stringify(arrayTransacIRPFInversa)+' - BaseCalculoRetenidoHastaAhora (FC): '+baseCalculoRetenidoHastaAhora+ ' - ImporteTotalNotasCredito (NC): '+impTotNotaCredito+' - ImporteNetoTransaccionActual (FC): '+importe_neto_transaccion_proveedor_a_pagar);
                         impNetMensualProvIRPF = parseFloat(baseCalculoRetenidoHastaAhora, 10) + parseFloat(importe_neto_transaccion_proveedor_a_pagar, 10) - parseFloat(impTotNotaCredito, 10);
                         impNetMensualProvIRPF2 = parseFloat(baseCalculoRetenidoHastaAhora, 10) - parseFloat(impTotNotaCredito, 10);
                         log.debug("LINE 484", "LINE 1332 - impNetMensualProvIRPF: " + impNetMensualProvIRPF + " - impNetMensualProvIRPF2: " + impNetMensualProvIRPF2);

                         if (impNetMensualProvIRPF >= mImponibleIRPF && impNetMensualProvIRPF2 >= mImponibleIRPF)
                           arrayTransacIRPF.push(idTransaccionOriginal);
                       }

                     }
                   }
                 }
                 else {
                   //SE VERIFICA SI EL PROVEEDOR POSEE UNA RETENCION SOBRE FACTURAS CON EL MISMO CODIGO DE RETENCION IRPF DE LA TRANSACCION Y PERIODO EN CUESTION
                   objInfwRetencionIRPF = wRetencionIRPF(entity, id_posting_period, subsidiariaTransaccion, codRetencionIRPF);
                   poseeRetencionIRPFEnPeriodo = objInfwRetencionIRPF.poseeRetIRPF;
                   log.debug("LINE 522", "objInfwRetencionIRPF: " + JSON.stringify(objInfwRetencionIRPF));

                   //SE INDICA QUE L RET NO ES ACUMULATIVA PARA QUE EL CALCULO SE HAGA CONSIDERANDO SOLO EL IMPORTE NETO DE LA TRANSACCION ACTUAL
                   if (poseeRetencionIRPFEnPeriodo)
                     retAcumIRPF = false;
                 }
               }
               else//SI LA TRANSACCION ES UNA NOTA DE CREDITO
               {
                 log.audit("calcularRetencionesSuiteLet", "LINE 559 - es NC");
                 //log.debug('LINE 506','SI');
                 //SE VERIFICA SI EL PROVEEDOR POSEE UNA RETENCION SOBRE FACTURAS CON EL MISMO CODIGO DE RETENCION IRPF DE LA TRANSACCION Y PERIODO EN CUESTION
                 objInfwRetencionIRPF = wRetencionIRPF(entity, id_posting_period, subsidiariaTransaccion, codRetencionIRPF);
                 poseeRetencionIRPFEnPeriodo = objInfwRetencionIRPF.poseeRetIRPF;
                 //log.debug('LINE 510','SI');

                 if (poseeRetencionIRPFEnPeriodo) {
                   //SE OBTIENE LA BASE DE CALCULO DE LAS RETENCIONES SOBRE FACTURAS CON EL MISMO CODIGO IRPF Y PERIODO EN CUESTION
                   const infoImpPagosMensualSResIRPFInversa = getTransacIdsMinimoIRPFInversa(entity, id_posting_period, subsidiariaTransaccion, "vendorbill", trandate, codRetencionIRPF);
                   const impNetMensIdInternosSRetIRPFInversa = infoImpPagosMensualSResIRPFInversa.idInternos;
                   arrayTransacIRPFInversa = impNetMensIdInternosSRetIRPFInversa.split(",");
                   const arrayTransacIRPFInversaAUX = arrayTransacIRPFInversa.filter(function (elem, index, self) {
                     return index == self.indexOf(elem);
                   });

                   //ARRAY CON ID'S DE FACTURAS DEL PROVEEDOR CON RETENCION IRPF PARA EL CODIGO Y PERIODO EN CUESTION 
                   arrayTransacIRPFInversa = arrayTransacIRPFInversaAUX;

                   //SE OBTIENE LA BASE DE CALCULO DE LAS RETENCIONES SOBRE NOTAS DE CREDITO CON EL MISMO CODIGO IRPF Y PERIODO EN CUESTION
                   const infoImpPagosMensualSResIRPFInversaNC = getTransacIdsMinimoIRPFInversa(entity, id_posting_period, subsidiariaTransaccion, tipoTransaccionOriginal, trandate, codRetencionIRPF);
                   //log.debug('LINE 526','infoImpPagosMensualSResIRPFInversaNC: '+JSON.stringify(infoImpPagosMensualSResIRPFInversaNC));

                   const impNetMensIdInternosSRetIRPFInversaNC = infoImpPagosMensualSResIRPFInversaNC.idInternos;
                   let arrayTransacIRPFInversaNC = new Array();
                   if (!isEmpty(impNetMensIdInternosSRetIRPFInversaNC)) {
                     arrayTransacIRPFInversaNC = impNetMensIdInternosSRetIRPFInversaNC.split(",");
                     const arrayTransacIRPFInversaAUXNC = arrayTransacIRPFInversaNC.filter(function (elem, index, self) {
                       return index == self.indexOf(elem);
                     });
                     arrayTransacIRPFInversaNC = arrayTransacIRPFInversaAUXNC;
                   }
                   //log.debug('LINE 538','arrayTransacIRPFInversaNC: '+JSON.stringify(arrayTransacIRPFInversaNC)+' - arrayTransacIRPFInversaNC.length: '+arrayTransacIRPFInversaNC.length);


                   if (!isEmpty(arrayTransacIRPFInversaNC) && arrayTransacIRPFInversaNC.length > 0 && !isEmpty(arrayTransacIRPFInversaNC[0])) {
                     impNetMensualProvIRPFNC = transactionDetailsNet(arrayTransacIRPFInversaNC);
                   }
                   //log.debug('LINE 545','IDTransaccionesConRetIRPF (NC): '+JSON.stringify(arrayTransacIRPFInversaNC)+' - BaseCalculoRetenidoHastaAhora (NC): '+impNetMensualProvIRPFNC+' - ImporteNetoTransaccionActual (NC): '+importe_neto_transaccion_proveedor_a_pagar);
                   const infoImpPagosMensualSResIRPFInversaFCwNC = getTransacIdsMinimoIRPFInversa(entity, id_posting_period, subsidiariaTransaccion, "vendorbill", trandate, codRetencionIRPF, true);
                   const impNetMensIdInternosSRetIRPFInversaFCwNC = infoImpPagosMensualSResIRPFInversaFCwNC.idInternos;
                   let arrayTransacIRPFInversaFCwNC = new Array();
                   if (!isEmpty(impNetMensIdInternosSRetIRPFInversaFCwNC)) {
                     arrayTransacIRPFInversaFCwNC = impNetMensIdInternosSRetIRPFInversaFCwNC.split(",");
                     const arrayTransacIRPFInversaAUXFCwNC = arrayTransacIRPFInversaFCwNC.filter(function (elem, index, self) {
                       return index == self.indexOf(elem);
                     });
                     arrayTransacIRPFInversaFCwNC = arrayTransacIRPFInversaAUXFCwNC;
                     //log.debug('LINE 556','arrayTransacIRPFInversaFCwNC: '+JSON.stringify(arrayTransacIRPFInversaFCwNC));
                   }

                   const arrayAUX = new Array();
                   if (!isEmpty(arrayTransacIRPFInversaFCwNC) && arrayTransacIRPFInversaFCwNC.length > 0) {
                     for (let i = 0; !isEmpty(arrayTransacIRPFInversa) && i < arrayTransacIRPFInversa.length; i++) {
                       const filtro = arrayTransacIRPFInversaFCwNC.filter(function (element) {
                         return element == arrayTransacIRPFInversa[i];
                       });
                       if (isEmpty(filtro[0])) {
                         arrayAUX.push(arrayTransacIRPFInversa[i]);
                       }
                     }
                   }
                   //log.debug('LINE 573','arrayAUX: '+JSON.stringify(arrayAUX));
                 }
               }

               if (tipoTransaccionOriginal == "vendorbill") {
                 if (!poseeNCIRPFEnPeriodo || !poseeRetencionIRPFEnPeriodo) {
                   //INICIO - OBTENER EL IMPORTE NETO DE TRANSACCIONES DEL MES POR RETENCION IRPF

                   log.debug("calcularRetencionesSuitelet", "LINE 1408 - poseeNCIRPFEnPeriodo: " + poseeNCIRPFEnPeriodo + " / poseeRetencionIRPFEnPeriodo: " + poseeRetencionIRPFEnPeriodo + " / retAcumIRPF: " + retAcumIRPF);

                   if (retAcumIRPF == "T" || retAcumIRPF === true) {
                     const infoImpPagosMensualSResIRPF = getTransacIdsMinimoIRPF(entity, id_posting_period, subsidiariaTransaccion, tipoTransaccionOriginal, trandate, codRetencionIRPF);
                     impNetMensIdInternosSRetIRPF = infoImpPagosMensualSResIRPF.idInternos;
                     arrayTransacIRPF = impNetMensIdInternosSRetIRPF.split(",");
                     const arrayTransacIRPF_AUX = arrayTransacIRPF.filter(function (elem, index, self) {
                       return index == self.indexOf(elem);
                     });
                     arrayTransacIRPF = arrayTransacIRPF_AUX;
                     log.debug("LINE 591", "IDSTransacIRPFaCalcularRET (FC): " + JSON.stringify(arrayTransacIRPF));
                   }
                   else {
                     arrayTransacIRPF.push(idTransaccionOriginal);
                   }
                 }
               }

               log.debug("calcularRetencionesSuitelet", "LINE 1418 - arrayTransacIRPF: " + JSON.stringify(arrayTransacIRPF) + " / codRetencionIRPF: " + codRetencionIRPF + " / poseeNCIRPFEnPeriodo: " + poseeNCIRPFEnPeriodo + " / tipoTransaccionOriginal: " + tipoTransaccionOriginal + " / impNetMensualProvIRPF: " + impNetMensualProvIRPF);

               //ARREGLO CON ID DE TRANSACCIONES QUE APLICAN RET IRPF SIN RETENCION CALCULADA
               if (!isEmpty(codRetencionIRPF)) {
                 if (tipoTransaccionOriginal == "vendorbill" && !poseeNCIRPFEnPeriodo) {
                   arrayTransacDetailsIRPF = transactionDetails(arrayTransacIRPF);
                   impNetMensualProvIRPF = transactionDetailsNet(arrayTransacIRPF);
                   log.debug("calcularRetencionesSuitelet", "LINE 1423 - arrayTransacDetailsIRPF: " + JSON.stringify(arrayTransacDetailsIRPF) + ". impNetMensualProvIRPF: " + JSON.stringify(impNetMensualProvIRPF));
                 }
                 else {
                   if (tipoTransaccionOriginal == "vendorcredit") {
                     if (!isEmpty(arrayTransacIRPFInversa) && arrayTransacIRPFInversa.length > 0) {
                       //log.debug('LINE 615','SI');
                       impNetMensualProvIRPF = transactionDetailsNet(arrayTransacIRPFInversa);
                       //log.debug('LINE 617','SI');
                       //log.debug('LINE 618','BaseCalculoRetenidoHastaAhora (FC): '+impNetMensualProvIRPF+' - ImporteNetoTransaccionActual (NC): '+importe_neto_transaccion_proveedor_a_pagar+' - BaseCalculoRetenidoHastaAhora (NC): '+impNetMensualProvIRPFNC);
                       impNetMensualProvIRPF = parseFloat(impNetMensualProvIRPF, 10) - parseFloat(importe_neto_transaccion_proveedor_a_pagar, 10) - parseFloat(impNetMensualProvIRPFNC, 10);
                       //log.debug('LINE 620','BaseCalculoRetenidoHastaAhora (FC) + ImporteNetoTransaccionActual (NC) + BaseCalculoRetenidoHastaAhora (NC): '+impNetMensualProvIRPF);
                     }
                     else {
                       arrayTransacIRPFInversa.push(idTransaccionOriginal);
                     }
                   }


                   //ESTE CASO SE DA PARA CUANDO NO EXISTE RETENCION IRPF PARA EL PROVEEDOR CON EL MISMO CODIGO DE RET IRPF Y PERIODO
                   if (tipoTransaccionOriginal == "vendorbill" && poseeNCIRPFEnPeriodo && arrayTransacIRPFInversa.length == 0) {
                     arrayTransacDetailsIRPF = transactionDetails(arrayTransacIRPF);
                     impNetMensualProvIRPF = transactionDetailsNet(arrayTransacIRPF);
                     impNetMensualProvIRPF = parseFloat(impNetMensualProvIRPF, 10) - parseFloat(impTotNotaCredito, 10);
                     log.debug("calcularRetencionesSuitelet", "line 1473 - ImpNetMensualProvIRPF: " + impNetMensualProvIRPF + " - ImpTotNotaCredito: " + impTotNotaCredito + " - arrayTransacDetailsIRPF: " + JSON.stringify(arrayTransacDetailsIRPF));
                   }
                 }
               }
             }

             log.debug("calcularRetencionesSuitelet", "LINE 1453 - / poseeNCIRPFEnPeriodo: " + poseeNCIRPFEnPeriodo + " / impNetMensualProvIRPF: " + impNetMensualProvIRPF);

             //log.audit('calcularRetencionesSuiteLet', "LINE 680 - Log de Control 8");
             if (!poseeRetencionIRNR && !isEmpty(codRetencionIRNR) ) {
              if(aplicaAcumIRNR == "T"){
                if (!isEmpty(codRetencionIRNR)) arrayTransacDetailsIRNR = transactionNewDetails(entity, id_posting_period, subsidiariaTransaccion, trandate, codRetencionIRNR);
                ACUMULADO_IRNR = calcularAcumulado(arrayTransacDetailsIRNR);
                
              } else {
                //INICIO - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IRNR
                arrayTransacIRNR.push(idTransaccionOriginal);
                //ARREGLO CON ID DE TRANSACCIONES QUE APLICAN RET IRNR SIN RETENCION CALCULADA
                if (!isEmpty(codRetencionIRNR)) arrayTransacDetailsIRNR = transactionDetails(arrayTransacIRNR);
                ACUMULADO_IRNR = importe_neto_transaccion_proveedor_a_pagar;
                //log.debug('LINE 664','arrayTransacDetailsIRNR: '+JSON.stringify(arrayTransacDetailsIRNR));
                //FIN - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IRNR
              }
               
             }else{

              if(aplicaAcumIRNR == "T"){
                if (!isEmpty(codRetencionIRNR)) arrayTransacDetailsAUXIRNR = transactionNewDetails(entity, id_posting_period, subsidiariaTransaccion, trandate, codRetencionIRNR);
                ACUMULADO_AUX_IRNR = calcularAcumulado(arrayTransacDetailsAUXIRNR);
              }
              //INICIO - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IRNR
              arrayTransacIRNR.push(idTransaccionOriginal);
              //ARREGLO CON ID DE TRANSACCIONES QUE APLICAN RET IRNR SIN RETENCION CALCULADA
              if (!isEmpty(codRetencionIRNR)) arrayTransacDetailsIRNR = transactionDetails(arrayTransacIRNR);
              ACUMULADO_IRNR = importe_neto_transaccion_proveedor_a_pagar;
              //nlapiLogExecution('DEBUG','LINE 664','arrayTransacDetailsIRNR: '+JSON.stringify(arrayTransacDetailsIRNR));
              //FIN - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IRNR
					  }

             //log.audit('calcularRetencionesSuiteLet', "LINE 693 - Log de Control 9");
             if (!poseeRetencionIRAE && !isEmpty(codRetencionIRAE)) {

              if(aplicaAcumIRAE == "T"){
                if (!isEmpty(codRetencionIRNR)) arrayTransacDetailsIRAE = transactionNewDetails(entity, id_posting_period, subsidiariaTransaccion, trandate, "", codRetencionIRAE);
                ACUMULADO_IRAE = calcularAcumulado(arrayTransacDetailsIRAE)
              } else{
                //INICIO - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IRAE
                arrayTransacIRAE.push(idTransaccionOriginal);
                //ARREGLO CON ID DE TRANSACCIONES QUE APLICAN RET IRAE SIN RETENCION CALCULADA
                if (!isEmpty(codRetencionIRAE)) arrayTransacDetailsIRAE = transactionDetails(arrayTransacIRAE);
                ACUMULADO_IRAE = importe_neto_transaccion_proveedor_a_pagar;
                //FIN - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IRAE
              }
               
             }else{

              if(aplicaAcumIRAE == "T"){
                if (!isEmpty(codRetencionIRAE)) arrayTransacDetailsAUXIRAE = transactionNewDetails(entity, id_posting_period, subsidiariaTransaccion, trandate, codRetencionIRAE);
                ACUMULADO_AUX_IRAE = calcularAcumulado(arrayTransacDetailsAUXIRAE);
              }
                //INICIO - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IRAE
                arrayTransacIRAE.push(idTransaccionOriginal);
                //ARREGLO CON ID DE TRANSACCIONES QUE APLICAN RET IRAE SIN RETENCION CALCULADA
                if (!isEmpty(codRetencionIRAE)) arrayTransacDetailsIRAE = transactionDetails(arrayTransacIRAE);
                ACUMULADO_IRAE = importe_neto_transaccion_proveedor_a_pagar;
                //FIN - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IRAE
					 }

             //log.audit('calcularRetencionesSuiteLet', "LINE 704 - Log de Control 10");
             if (!poseeRetencionIVA && !isEmpty(codRetencionIVA)) {
               //INICIO - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IVA
               if(aplicaAcumIVA  == "T"){
                  if (!isEmpty(codRetencionIVA)) arrayTransacDetailsIVA = transactionDetailsIVA([], arrayIVATaxCodes, entity, id_posting_period, subsidiariaTransaccion, trandate, codRetencionIVA);
                  ACUMULADO_IVA = calcularAcumuladoIVA(arrayTransacDetailsIVA, calSobreIVA);
                } else{
                  arrayTransacIVA.push(idTransaccionOriginal);
                  //ARREGLO CON ID DE TRANSACCIONES QUE APLICAN RET IVA SIN RETENCION CALCULADA
                  //log.debug('LINE 688','SI');
                  if (!isEmpty(codRetencionIVA))
                    arrayTransacDetailsIVA = transactionDetailsIVA(arrayTransacIVA, arrayIVATaxCodes);
                  if (arrayTransacDetailsIVA.length > 0) {
                    if (calSobreIVA) {
                      ACUMULADO_IVA = arrayTransacDetailsIVA[0].transacImporteXTP;
                    } else {
                      ACUMULADO_IVA = arrayTransacDetailsIVA[0].transacImporteNetXTP;
                    }
                  }
                  //FIN - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IVA
                  //log.debug('LINE 692','SI');
                  //log.debug('LINE 699','arrayTransacDetailsIVA: '+JSON.stringify(arrayTransacDetailsIVA));
                }
             }else{
                if(aplicaAcumIVA == "T"){
                  if (!isEmpty(codRetencionIVA)) arrayTransacDetailsAUXIVA = transactionDetailsIVA([], arrayIVATaxCodes, entity, id_posting_period, subsidiariaTransaccion, trandate, codRetencionIVA);
                  ACUMULADO_AUX_IVA = calcularAcumuladoIVA(arrayTransacDetailsAUXIVA, calSobreIVA);
                }
                arrayTransacIVA.push(idTransaccionOriginal);
                //ARREGLO CON ID DE TRANSACCIONES QUE APLICAN RET IVA SIN RETENCION CALCULADA
                //nlapiLogExecution('DEBUG','LINE 688','SI');
                if (!isEmpty(codRetencionIVA)) arrayTransacDetailsIVA = transactionDetailsIVA(arrayTransacIVA, arrayIVATaxCodes);
                if (arrayTransacDetailsIVA.length > 0) {
                  if (calSobreIVA) {
                    ACUMULADO_IVA = arrayTransacDetailsIVA[0].transacImporteXTP;
                  } else {
                    ACUMULADO_IVA = arrayTransacDetailsIVA[0].transacImporteNetXTP;
                  }
                }
                //FIN - OBTENER EL IMPORTE NETO DE LA TRANSACCION QUE APLICACA RETENCION IVA
                //nlapiLogExecution('DEBUG','LINE 692','SI');
                //nlapiLogExecution('DEBUG','LINE 699','arrayTransacDetailsIVA: '+JSON.stringify(arrayTransacDetailsIVA));
            
             }

             log.audit("calcularRetencionesSuiteLet", "LINE 1486 - valueUI: " + valueUI + " / mniIRPF: " + mniIRPF + " / esAgenteRetencionIRPF: " + esAgenteRetencionIRPF);

             if (tipoTransaccionOriginal == "vendorbill") {
               //log.debug('LINE 701','SI');
               if (!isEmpty(valueUI)) {
                 //log.debug('LINE 704','valueUI: '+valueUI);
                 if (!isEmpty(mniIRPF) && esAgenteRetencionIRPF) {
                   if (mniEnUiIRPF == "T" || mniEnUiIRPF === true) {
                     mImponibleIRPF = parseFloat(parseFloat(mniIRPF, 10) * parseFloat(valueUI, 10), 10);
                     log.debug("LINE 713", "mniIRPF: " + mniIRPF + " - valueUI: " + valueUI + " - mImponibleIRPF: " + mImponibleIRPF);
                   }
                   else {
                     mImponibleIRPF = parseFloat(mniIRPF, 10);
                   }

                   log.debug("LINE 715", "LINE 715 - mImponibleIRPF: " + mImponibleIRPF + " - retAcumIRPF: " + retAcumIRPF + " - poseeNCIRPFEnPeriodo: " + poseeNCIRPFEnPeriodo + " - impNetMensualProvIRPF: " + impNetMensualProvIRPF + " - mImponibleIRPF: " + mImponibleIRPF);

                   if (retAcumIRPF) {                                                                                  
                     log.debug("calcularRetencionesSuitelet", "LINE 1506 - PoseeNCIRPFEnPeriodo: " + poseeNCIRPFEnPeriodo);
                     if (!poseeNCIRPFEnPeriodo) {
                       //SI EL IMPORTE NETO DE LAS FACTURA NO ES MAYOR O IGUAL AL MONTO NO IMPONIBLE DEL CODIGO DE RETENCION RESPECTIVO
                       if (impNetMensualProvIRPF < mImponibleIRPF) {
                         codRetencionIRPF = null;
                         esAgenteRetencionIRPF = false;
                         noCumpleMinimoIRPF = true;
                       }
                     }
                     else {
                       log.debug("calcularRetencionesSuitelet", "LINE 1516 - PoseeNCIRPFEnPeriodo: " + poseeNCIRPFEnPeriodo + " - impNetMensualProvIRPF: " + impNetMensualProvIRPF + " - mImponibleIRPF: " + mImponibleIRPF + " - (objInfwRetencionIRPF: " + JSON.stringify(objInfwRetencionIRPF) + " - arrayTransacIRPF: " + JSON.stringify(arrayTransacIRPF));
                       log.debug("calcularRetencionesSuitelet", "LINE 1517 - ImpNetMensualProvIRPF2: " + impNetMensualProvIRPF2 + " - impNetMensualProvIRPF: " + impNetMensualProvIRPF + " - mImponibleIRPF: " + mImponibleIRPF);
                       let validado = false;
                       if (impNetMensualProvIRPF >= mImponibleIRPF && impNetMensualProvIRPF2 >= mImponibleIRPF && arrayTransacIRPF.length > 0 && !isEmpty(arrayTransacIRPF[0]) && validado == false) {
                         //arrayTransacIRPF.push(idTransaccionOriginal);
                         arrayTransacDetailsIRPF = transactionDetails(arrayTransacIRPF);
                         validado = true;
                         log.debug("LINE 739", "arrayTransacIRPF: " + JSON.stringify(arrayTransacIRPF) + " - arrayTransacDetailsIRPF: " + arrayTransacDetailsIRPF);
                       }

                       if (impNetMensualProvIRPF >= mImponibleIRPF && impNetMensualProvIRPF2 < mImponibleIRPF && arrayTransacIRPFInversa.length > 0 && !isEmpty(arrayTransacIRPFInversa[0]) && validado == false) {
                         arrayTransacIRPFInversa.push(idTransaccionOriginal);
                         arrayTransacDetailsIRPF = transactionDetails(arrayTransacIRPFInversa);
                         validado = true;
                         log.debug("LINE 747", "arrayTransacIRPFInversa: " + JSON.stringify(arrayTransacIRPFInversa) + " - arrayTransacDetailsIRPF: " + JSON.stringify(arrayTransacDetailsIRPF));
                       }

                       log.debug("calcularRetencionesSuitelet", "LINE 1530 - impNetMensualProvIRPF: " + impNetMensualProvIRPF + " / mImponibleIRPF: " + mImponibleIRPF + " / validado: " + validado);

                       if (impNetMensualProvIRPF < mImponibleIRPF && validado == false) {
                         codRetencionIRPF = null;
                         esAgenteRetencionIRPF = false;
                         noCumpleMinimoIRPF = true;
                         validado = true;
                       }

                       log.debug("calcularRetencionesSuitelet", "codRetencionIRPF: " + codRetencionIRPF + " / esAgenteRetencionIRPF: " + esAgenteRetencionIRPF + " / noCumpleMinimoIRPF: " + noCumpleMinimoIRPF + " / validado: " + validado);
                     }
                   }
                 }

                 if (!isEmpty(mniIRNR) && esAgenteRetencionIRNR) {

                   if (mniEnUiIRNR == "T" || mniEnUiIRNR === true) {
                     mImponiblemniIRNR = parseFloat(parseFloat(mniIRNR, 10) * parseFloat(valueUI, 10), 10);
                   }
                   else {
                     mImponiblemniIRNR = parseFloat(mniIRNR, 10);
                   }

                   //SI EL IMPORTE NETO DE LA TRANSACCION NO ES MAYOR O IGUAL AL MONTO NO IMPONIBLE DEL CODIGO DE RETENCION RESPECTIVO 
                   if ((ACUMULADO_AUX_IRNR < mImponiblemniIRNR) && (ACUMULADO_IRNR < mImponiblemniIRNR)) {
                     codRetencionIRNR = null;
                     esAgenteRetencionIRNR = false;
                     noCumpleMinimoIRNR = true;
                   }
                 }

                 if (!isEmpty(mniIRAE) && esAgenteRetencionIRAE) {

                   if (mniEnUiIRAE == "T" || mniEnUiIRAE === true) {
                     mImponiblemniIRAE = parseFloat(parseFloat(mniIRAE, 10) * parseFloat(valueUI, 10), 10);
                   }
                   else {
                     mImponiblemniIRAE = parseFloat(mniIRAE, 10);
                   }

                   //SI EL IMPORTE NETO DE LA TRANSACCION NO ES MAYOR O IGUAL AL MONTO NO IMPONIBLE DEL CODIGO DE RETENCION RESPECTIVO
                   if ((ACUMULADO_AUX_IRAE < mImponiblemniIRAE) && (ACUMULADO_IRAE < mImponiblemniIRAE)) {
                     codRetencionIRAE = null;
                     esAgenteRetencionIRAE = false;
                     noCumpleMinimoIRAE = true;
                   }
                 }

                 if (!isEmpty(mniIVA) && esAgenteRetencionIVA) {

                   if (mniEnUiIVA == "T") {
                     mImponiblemniIVA = parseFloat(parseFloat(mniIVA, 10) * parseFloat(valueUI, 10), 10);
                   }
                   else {
                     mImponiblemniIVA = parseFloat(mniIVA, 10);
                   }
                   
                   //log.debug('LINE 824','arrayTransacDetailsIVA: '+JSON.stringify(arrayTransacDetailsIVA)+' - importeIvaValidarMinimo: '+importeIvaValidarMinimo+' - mImponiblemniIVA: '+mImponiblemniIVA);
                   //SI EL IMPORTE DE IVA DE LA TRANSACCION NO ES MAYOR O IGUAL AL MONTO NO IMPONIBLE DEL CODIGO DE RETENCION RESPECTIVO
                   //if (importe_neto_transaccion_proveedor_a_pagar < mImponiblemniIVA)
                   if ((ACUMULADO_AUX_IVA < mImponiblemniIVA)  && (ACUMULADO_IVA < mImponiblemniIVA)){
                     codRetencionIVA = null;
                     esAgenteRetencionIVA = false;
                     noCumpleMinimoIVA = true;
                   }
                 }
               }
             }else {
               if (!isEmpty(valueUI)) {
                 if (!isEmpty(mniIRPF) && esAgenteRetencionIRPF) {
                   if (mniEnUiIRPF == "T" || mniEnUiIRPF === true) {
                     mImponibleIRPF = parseFloat(parseFloat(mniIRPF, 10) * parseFloat(valueUI, 10), 10);
                   }
                   else {
                     mImponibleIRPF = parseFloat(mniIRPF, 10);
                   }

                   if (retAcumIRPF == "T" || retAcumIRPF === true) {
                     //SI EL IMPORTE NETO DE LAS FACTURA NO ES MAYOR O IGUAL AL MONTO NO IMPONIBLE DEL CODIGO DE RETENCION RESPECTIVO
                     //log.debug('LINE 811','impNetMensualProvIRPF: '+impNetMensualProvIRPF+'. mImponibleIRPF: '+mImponibleIRPF);
                     if (impNetMensualProvIRPF < mImponibleIRPF) {
                       if (!isEmpty(arrayTransacIRPFInversa) && arrayTransacIRPFInversa.length > 0 && !isEmpty(arrayTransacIRPFInversa[0]))
                         arrayTransacDetailsIRPF = transactionDetails(arrayTransacIRPFInversa);
                       //log.debug('LINE 816','arrayTransacDetailsIRPF: '+JSON.stringify(arrayTransacDetailsIRPF));
                     }
                     else {
                       arrayTransacIRPF.push(idTransaccionOriginal);
                       arrayTransacDetailsIRPF = transactionDetails(arrayTransacIRPF);
                       //log.debug('LINE 822','arrayTransacIRPF: '+JSON.stringify(arrayTransacIRPF));
                     }
                   }
                 }
               }
             }

             log.debug("LINE 1628", "LINE 882 - arrayTransacDetailsIRPF: " + JSON.stringify(arrayTransacDetailsIRPF));
             //INICIO - SE CALCULA LAS RETENCIONES IRPF Y SE CREA OBJETO CON EL RESULTADO
             if (esAgenteRetencionIRPF && !isEmpty(codRetencionIRPF)) {

               for (let i = 0; i < arrayTransacDetailsIRPF.length; i++) {
                 let transacId;
                 let transacFecha;
                 let retImporte;
                 let transacMoneda;
                 let transacTipoCambio;
                 let transacImporte;
                 let transacImporteXTP;
                 let transacCContable;
                 let codigo_retencion;
                 let objRetencionIRPF;
                 let retImporteMO;
                 let retAlicuota;
                 let cContableRet;
                 if (!isEmpty(codRetencionIRPF)) {
                   transacId = arrayTransacDetailsIRPF[i].transacId;//ID TRANSACCION
                   transacFecha = arrayTransacDetailsIRPF[i].transacFecha;//FECHA TRANSACCION
                   transacFecha = format.parse({ value: transacFecha, type: format.Type.DATE });
                   transacTranid = arrayTransacDetailsIRPF[i].transacTranid;//TRANID TRANSACCION
                   transacMoneda = arrayTransacDetailsIRPF[i].transacMoneda;//MONEDA TRANSCCION
                   transacTipoCambio = arrayTransacDetailsIRPF[i].transacTipoCambio;//TIPO DE CAMBIO TRANSACCION
                   transacImporte = parseFloat(arrayTransacDetailsIRPF[i].transacImporte, 10);//IMPORTE TRANSACCION
                   transacImporteXTP = arrayTransacDetailsIRPF[i].transacImporteXTP;//IMPORTE TRANSACCION * TIPO DE CAMBIO
                   // let transacCContable  = arrayTransacDetailsIRPF[i].idCuentaContable; //CUENTA CONTABLE TRANSACCION
                   transacCContable = cuentaContable; //CUENTA CONTABLE TRANSACCION
                   codigo_retencion = codRetencionIRPF;//CODIGO DE RETENCION
                   objRetencionIRPF = getRetencion("irpf", codigo_retencion, transacImporteXTP, null, transacImporte);//alex
                   retImporte = objRetencionIRPF.importeRetencion;//IMPORTE DE RETENCION
                   retImporteMO = objRetencionIRPF.importeRetencionMO;//IMPORTE DE RETENCION MONEDA ORIGINAL
                   retAlicuota = parseFloat(objRetencionIRPF.alicuotaRetencion, 10).toFixedOK(2);//ALICUOTA RETENCION
                   cContableRet = objRetencionIRPF.cuenta_contable;
                   if (objRetencionIRPF.warning) {
                     respuestaRetenciones.warning = true;
                     respuestaRetenciones.mensajeWarning.push(objRetencionIRPF.mensaje);
                   }
                 }

                 if (!isEmpty(retImporte) && retImporte > 0) {
                   const informacionRetencion = getInformacionRetencion(codigo_retencion);
                   if (!isEmpty(informacionRetencion)) {
                     const objIRPF = {
                       transacId: transacId,
                       transacFecha: transacFecha,
                       transacTrandId: transacTranid,
                       transacMoneda: transacMoneda,
                       transacTCambio: transacTipoCambio,
                       transacMontoNet: parseFloat(transacImporte, 10).toFixedOK(2),
                       transacMontoNetXTC: parseFloat(transacImporteXTP, 10).toFixedOK(2),
                       transacCContable: transacCContable,
                       retDescrip: informacionRetencion.descripcion,
                       codigo_retencion: informacionRetencion.codigo,
                       retTipo: informacionRetencion.tipo,
                       retAlicuota: parseFloat(retAlicuota, 10).toFixedOK(2),
                       retBaseCalculo: parseFloat(transacImporte, 10).toFixedOK(2),
                       retImporte: parseFloat(retImporte, 10).toFixedOK(2),
                       retImporteMO: parseFloat(retImporteMO, 10).toFixedOK(2),
                       cContableRet: cContableRet,
                     };

                     respuestaRetenciones.retencion_IRPF.push(objIRPF);
                     //log.debug('LINE 923','objIRPF: '+JSON.stringify(objIRPF));

                     total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(parseFloat(objIRPF.retImporte, 10), 10), 10);
                   }
                 }
               }
             } else { //alex
               if (!esAgenteRetencionIRPF && !isEmpty(codRetencionIRPF))
                 mensajeAgenteRetencion += "No se calculó la Retención IRPF porque la empresa no se encuentra configurada como Agente de Retencion IRPF. \n";
             }
             //FIN - SE CALCULA LAS RETENCIONES IRPF Y SE CREA OBJETO CON EL RESULTADO

             log.debug("LINE 1704", "LINE 941 - arrayTransacDetailsIRNR: " + JSON.stringify(arrayTransacDetailsIRNR));
             //INICIO - SE CALCULA LAS RETENCIONES IRNR Y SE CREA OBJETO CON EL RESULTADO
             if (esAgenteRetencionIRNR && !isEmpty(codRetencionIRNR)) {

               let transacId;
               let transacFecha;
               let transacMoneda;
               let transacTipoCambio;
               let transacImporte;
               let transacImporteXTP;

               let transacCContable;
               let codigo_retencion;
               let objRetencionIRNR;
               let retImporte;
               let retImporteMO;
               let retAlicuota;
               let cContableRet;

               for (let i = 0; i < arrayTransacDetailsIRNR.length; i++) {
                 if (!isEmpty(codRetencionIRNR)) {
                   transacId = arrayTransacDetailsIRNR[i].transacId;//ID TRANSACCION
                   transacFecha = arrayTransacDetailsIRNR[i].transacFecha;//FECHA TRANSACCION
                   transacFecha = format.parse({ value: transacFecha, type: format.Type.DATE });
                   transacTranid = arrayTransacDetailsIRNR[i].transacTranid;//TRANID TRANSACCION
                   transacMoneda = arrayTransacDetailsIRNR[i].transacMoneda;//MONEDA TRANSCCION
                   transacTipoCambio = arrayTransacDetailsIRNR[i].transacTipoCambio;//TIPO DE CAMBIO TRANSACCION
                   transacImporte = parseFloat(arrayTransacDetailsIRNR[i].transacImporte, 10);//IMPORTE TRANSACCION
                   transacImporteXTP = arrayTransacDetailsIRNR[i].transacImporteXTP;//IMPORTE TRANSACCION * TIPO DE CAMBIO
                   // let transacCContable  = arrayTransacDetailsIRNR[i].idCuentaContable; //CUENTA CONTABLE TRANSACCION
                   transacCContable = cuentaContable; //CUENTA CONTABLE TRANSACCION
                   codigo_retencion = codRetencionIRNR;//CODIGO DE RETENCION
                   objRetencionIRNR = getRetencion("irnr", codigo_retencion, transacImporteXTP, apGrossingUpIRNR, transacImporte);
                   retImporte = objRetencionIRNR.importeRetencion;//IMPORTE DE RETENCION
                   retImporteMO = objRetencionIRNR.importeRetencionMO;//IMPORTE DE RETENCION MONEDA ORIGINAL
                   retAlicuota = parseFloat(objRetencionIRNR.alicuotaRetencion, 10).toFixedOK(2);//ALICUOTA RETENCION
                   cContableRet = objRetencionIRNR.cuenta_contable;
                   transacImporte = objRetencionIRNR.base_calculo_MO;
                   transacImporteXTP = objRetencionIRNR.base_calculo;
                   guIRNR_base_calculo_MO = transacImporte;
                   guIRNR_base_calculo_XTP = transacImporteXTP;
                   guIRNR_alicuotaRet = objRetencionIRNR.alicuotaRetencion;
                   //log.debug('LINE 955','objRetencionIRNR: '+JSON.stringify(objRetencionIRNR));
                   if (objRetencionIRNR.warning) {
                     respuestaRetenciones.warning = true;
                     respuestaRetenciones.mensajeWarning.push(objRetencionIRNR.mensaje);
                   }
                 }

                 if (!isEmpty(retImporte) && retImporte > 0) {
                   const informacionRetencion = getInformacionRetencion(codigo_retencion);
                   if (!isEmpty(informacionRetencion)) {
                     const objIRNR = {
                       transacId: transacId,
                       transacFecha: transacFecha,
                       transacTrandId: transacTranid,
                       transacMoneda: transacMoneda,
                       transacTCambio: transacTipoCambio,
                       transacMontoNet: parseFloat(transacImporte, 10).toFixedOK(2),
                       transacMontoNetXTC: parseFloat(transacImporteXTP, 10).toFixedOK(2),
                       transacCContable: transacCContable,
                       retDescrip: informacionRetencion.descripcion,
                       codigo_retencion: informacionRetencion.codigo,
                       retTipo: informacionRetencion.tipo,
                       retAlicuota: parseFloat(retAlicuota, 10).toFixedOK(2),
                       retBaseCalculo: parseFloat(transacImporte, 10).toFixedOK(2),
                       retImporte: parseFloat(retImporte, 10).toFixedOK(2),
                       retImporteMO: parseFloat(retImporteMO, 10).toFixedOK(2),
                       cContableRet: cContableRet,
                     };

                     respuestaRetenciones.retencion_IRNR.push(objIRNR);
                     //log.debug('LINE 986','objIRNR: '+JSON.stringify(objIRNR));

                     total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(parseFloat(objIRNR.retImporte, 10), 10), 10);
                   }
                 }
               }
             } else {
               if (!esAgenteRetencionIRNR && !isEmpty(codRetencionIRNR))
                 mensajeAgenteRetencion += "No se calculó la Retención IRNR porque la empresa no se encuentra configurada como Agente de Retencion IRNR. \n";
             }
             //FIN - SE CALCULA LAS RETENCIONES IRNR Y SE CREA OBJETO CON EL RESULTADO

             log.debug("LINE 1788", "LINE 1007 - arrayTransacDetailsIRAE: " + JSON.stringify(arrayTransacDetailsIRAE));
             //INICIO - SE CALCULA LAS RETENCIONES IRAE Y SE CREA OBJETO CON EL RESULTADO
             if (esAgenteRetencionIRAE && !isEmpty(codRetencionIRAE)) {
               let transacId;
               let transacFecha;
               let transacMoneda;
               let transacTipoCambio;
               let transacImporte;
               let transacImporteXTP;
               let transacCContable;
               let codigo_retencion;
               let retImporte;
               let retImporteMO;
               let retAlicuota;
               let cContableRet;
               for (let i = 0; i < arrayTransacDetailsIRAE.length; i++) {
                 if (!isEmpty(codRetencionIRAE)) {
                   transacId = arrayTransacDetailsIRAE[i].transacId;//ID TRANSACCION
                   transacFecha = arrayTransacDetailsIRAE[i].transacFecha;//FECHA TRANSACCION
                   transacFecha = format.parse({ value: transacFecha, type: format.Type.DATE });
                   transacTranid = arrayTransacDetailsIRAE[i].transacTranid;//TRANID TRANSACCION
                   transacMoneda = arrayTransacDetailsIRAE[i].transacMoneda;//MONEDA TRANSCCION
                   transacTipoCambio = arrayTransacDetailsIRAE[i].transacTipoCambio;//TIPO DE CAMBIO TRANSACCION
                   transacImporte = parseFloat(arrayTransacDetailsIRAE[i].transacImporte, 10);//IMPORTE TRANSACCION
                   transacImporteXTP = arrayTransacDetailsIRAE[i].transacImporteXTP;//IMPORTE TRANSACCION * TIPO DE CAMBIO
                   // var transacCContable  = arrayTransacDetailsIRAE[i].idCuentaContable; //CUENTA CONTABLE TRANSACCION
                   transacCContable = cuentaContable; //CUENTA CONTABLE TRANSACCION
                   codigo_retencion = codRetencionIRAE;//CODIGO DE RETENCION
                   const objRetencionIRAE = getRetencion("irae", codigo_retencion, transacImporteXTP, apGrossingUpIRNR, transacImporte, guIRNR_alicuotaRet);
                   retImporte = objRetencionIRAE.importeRetencion;//IMPORTE DE RETENCION
                   retImporteMO = objRetencionIRAE.importeRetencionMO;//IMPORTE DE RETENCION MONEDA ORIGINAL
                   retAlicuota = parseFloat(objRetencionIRAE.alicuotaRetencion, 10).toFixedOK(2);//ALICUOTA RETENCION
                   cContableRet = objRetencionIRAE.cuenta_contable;
                   transacImporte = objRetencionIRAE.base_calculo_MO;
                   transacImporteXTP = objRetencionIRAE.base_calculo;
                   if (objRetencionIRAE.warning) {
                     respuestaRetenciones.warning = true;
                     respuestaRetenciones.mensajeWarning.push(objRetencionIRAE.mensaje);
                   }
                 }

                 if (!isEmpty(retImporte) && retImporte > 0) {
                   const informacionRetencion = getInformacionRetencion(codigo_retencion);
                   if (!isEmpty(informacionRetencion)) {
                     const objIRAE = {
                       transacId: transacId,
                       transacFecha: transacFecha,
                       transacTrandId: transacTranid,
                       transacMoneda: transacMoneda,
                       transacTCambio: transacTipoCambio,
                       transacMontoNet: parseFloat(transacImporte, 10).toFixedOK(2),
                       transacMontoNetXTC: parseFloat(transacImporteXTP, 10).toFixedOK(2),
                       transacCContable: transacCContable,
                       retDescrip: informacionRetencion.descripcion,
                       codigo_retencion: informacionRetencion.codigo,
                       retTipo: informacionRetencion.tipo,
                       retAlicuota: parseFloat(retAlicuota, 10).toFixedOK(2),
                       retBaseCalculo: parseFloat(transacImporte, 10).toFixedOK(2),
                       retImporte: parseFloat(retImporte, 10).toFixedOK(2),
                       retImporteMO: parseFloat(retImporteMO, 10).toFixedOK(2),
                       cContableRet: cContableRet,
                     };

                     respuestaRetenciones.retencion_IRAE.push(objIRAE);
                     //log.debug('LINE 1045','objIRAE: '+JSON.stringify(objIRAE));

                     total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(parseFloat(objIRAE.retImporte, 10), 10), 10);
                   }
                 }
               }
             } else {
               if (!esAgenteRetencionIRAE && !isEmpty(codRetencionIRAE))
                 mensajeAgenteRetencion += "No se calculó la Retención IRAE porque la empresa no se encuentra configurada como Agente de Retencion IRAE. \n";
             }
             //FIN - SE CALCULA LAS RETENCIONES IRNR Y SE CREA OBJETO CON EL RESULTADO

             log.debug("LINE 1864", "LINE 1069 - arrayTransacDetailsIVA: " + JSON.stringify(arrayTransacDetailsIVA));
             //INICIO - SE CALCULA LAS RETENCIONES IVA Y SE CREA OBJETO CON EL RESULTADO
             if (esAgenteRetencionIVA && !isEmpty(codRetencionIVA)) {

               let transacId;
               let transacFecha;
               let transacMoneda;
               let transacTipoCambio;
               let transacImporte;
               let transacImporteXTP;
               let transacCContable;
               let codigo_retencion;

               let retImporte;
               let retImporteMO;
               let retAlicuota;
               let cContableRet;

               for (let i = 0; i < arrayTransacDetailsIVA.length; i++) {
                 if (!isEmpty(codRetencionIVA)) {
                   transacId = arrayTransacDetailsIVA[i].transacId;//ID TRANSACCION
                   transacFecha = arrayTransacDetailsIVA[i].transacFecha;//FECHA TRANSACCION
                   transacFecha = format.parse({ value: transacFecha, type: format.Type.DATE });
                   transacTranid = arrayTransacDetailsIVA[i].transacTranid;//TRANID TRANSACCION
                   transacMoneda = arrayTransacDetailsIVA[i].transacMoneda;//MONEDA TRANSCCION
                   transacTipoCambio = arrayTransacDetailsIVA[i].transacTipoCambio;//TIPO DE CAMBIO TRANSACCION
                   transacImporte = 0.00;
                   transacImporteXTP = 0.00;
                   // ! este if y su else hacen lo mismo, raro.
                   if (calSobreIVA) {
                     transacImporte = parseFloat(arrayTransacDetailsIVA[i].transacImporte, 10);//IMPORTE TRANSACCION
                     transacImporteXTP = parseFloat(arrayTransacDetailsIVA[i].transacImporteXTP, 10);//IMPORTE TRANSACCION
                   }
                   else {
                     transacImporte = parseFloat(arrayTransacDetailsIVA[i].transacImporteNet, 10);//IMPORTE TRANSACCION
                     transacImporteXTP = parseFloat(arrayTransacDetailsIVA[i].transacImporteNetXTP, 10);//IMPORTE TRANSACCION
                   }
                   transacCContable = cuentaContable; //CUENTA CONTABLE TRANSACCION
                   codigo_retencion = codRetencionIVA;//CODIGO DE RETENCION
                   const objRetencionIVA = getRetencion("iva", codigo_retencion, transacImporteXTP, apGrossingUpIRNR, transacImporte, guIRNR_alicuotaRet);
                   retImporte = objRetencionIVA.importeRetencion;//IMPORTE DE RETENCION
                   retImporteMO = objRetencionIVA.importeRetencionMO;//IMPORTE DE RETENCION
                   retAlicuota = parseFloat(objRetencionIVA.alicuotaRetencion, 10).toFixedOK(2);//ALICUOTA RETENCION
                   cContableRet = objRetencionIVA.cuenta_contable;
                   transacImporte = objRetencionIVA.base_calculo_MO;
                   transacImporteXTP = objRetencionIVA.base_calculo;
                   if (objRetencionIVA.warning) {
                     respuestaRetenciones.warning = true;
                     respuestaRetenciones.mensajeWarning.push(objRetencionIVA.mensaje);
                   }
                 }

                 if (!isEmpty(retImporte) && retImporte > 0) {
                   const informacionRetencion = getInformacionRetencion(codigo_retencion);
                   if (!isEmpty(informacionRetencion)) {
                     const objIVA = {
                       transacId: transacId,
                       //transacFecha        : informacionPago.trandate;// transacFecha; CAMBIO TEMPORA,
                       transacFecha: transacFecha,
                       transacTrandId: transacTranid,
                       transacMoneda: transacMoneda,
                       transacTCambio: transacTipoCambio,
                       transacMontoNet: parseFloat(transacImporte, 10).toFixedOK(2),
                       transacMontoNetXTC: parseFloat(transacImporteXTP, 10).toFixedOK(2),
                       transacCContable: transacCContable,
                       retDescrip: informacionRetencion.descripcion,
                       codigo_retencion: informacionRetencion.codigo,
                       retTipo: informacionRetencion.tipo,
                       retAlicuota: parseFloat(retAlicuota, 10).toFixedOK(2),
                       retBaseCalculo: parseFloat(transacImporte, 10).toFixedOK(2),
                       retImporte: parseFloat(retImporte, 10).toFixedOK(2),
                       retImporteMO: parseFloat(retImporteMO, 10).toFixedOK(2),
                       calSobreIVA: calSobreIVA,
                       cContableRet: cContableRet,
                     };

                     respuestaRetenciones.retencion_IVA.push(objIVA);
                     //log.debug('LINE 1098','objIVA: '+JSON.stringify(objIVA));

                     total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(parseFloat(objIVA.retImporte, 10), 10), 10);
                   }
                 }
               }
             } else {
               if (!esAgenteRetencionIVA && !isEmpty(codRetencionIVA))
                 mensajeAgenteRetencion += "No se calculó la Retención IVA porque la empresa no se encuentra configurada como Agente de Retencion IVA. \n";
             }
             //FIN - SE CALCULA LAS RETENCIONES IVA Y SE CREA OBJETO CON EL RESULTADO                                  

             respuestaRetenciones.importe_total_retencion = parseFloat(total_retenciones, 10).toFixedOK(2);
             respuestaRetenciones.version_calc_ret = "2018";
           }
           if (!errorGeneral) {
             respuestaRetenciones.error = false;
             respuestaRetenciones.mensajeOk = "El proceso de cálculo de retenciones finalizó exitosamente. \n" + mensajeAgenteRetencion;
           }

         } else {

           let mensajeAlert = "";

           if (!esAgenteRetencionIRPF) {
             //alert('No se encuentra configurado si la empresa es Agente de Retencion IRPF. Verificar el panel "URU-Configuración Proceso Retenciones"');
             mensajeAlert += "No se encuentra configurado si la empresa es Agente de Retencion IRPF. \n";
             log.debug("calcularRetencionesSuiteLet", "mensajeAlert IRPF " + mensajeAlert);
             respuestaRetenciones.error = true;
             respuestaRetenciones.mensajeError.push("No se encuentra configurado si la empresa es Agente de Retencion IRPF.");
           }

           if (!esAgenteRetencionIRNR) {
             //alert('No se encuentra configurado si la empresa es Agente de Retencion IRNR. Verificar el panel "URU-Configuración Proceso Retenciones"');
             mensajeAlert += "No se encuentra configurado si la empresa es Agente de Retencion IRNR. \n";
             log.debug("calcularRetencionesSuiteLet", "mensajeAlert IRNR: " + mensajeAlert);
             respuestaRetenciones.error = true;
             respuestaRetenciones.mensajeError.push("No se encuentra configurado si la empresa es Agente de Retencion IRNR.");
           }

           if (!esAgenteRetencionIVA) {
             //alert('No se encuentra configurado si la empresa es Agente de Retencion IVA. Verificar el panel "URU-Configuración Proceso Retenciones"');
             mensajeAlert += "No se encuentra configurado si la empresa es Agente de Retencion IVA. \n";
             log.debug("calcularRetencionesSuiteLet", "mensajeAlert IVA: " + mensajeAlert);
             respuestaRetenciones.error = true;
             respuestaRetenciones.mensajeError.push("No se encuentra configurado si la empresa es Agente de Retencion IVA.");
           }

           if (!esAgenteRetencionIRAE) {
             //alert('No se encuentra configurado si la empresa es Agente de Retencion IRAE. Verificar el panel "URU-Configuración Proceso Retenciones"');
             mensajeAlert += "No se encuentra configurado si la empresa es Agente de Retencion IRAE. \n";
             log.debug("calcularRetencionesSuiteLet", "mensajeAlert IRAE: " + mensajeAlert);
             respuestaRetenciones.error = true;
             respuestaRetenciones.mensajeError.push("No se encuentra configurado si la empresa es Agente de Retencion IRAE.");
           }
         }
       } else {
         //ERROR OBTENIENDO INFORMACION DE LA TRANSACCION
         respuestaRetenciones.error = true;
         respuestaRetenciones.mensajeError.push("Error al obtener la informacion de la transacción");
       }

     } catch (err) {
       respuestaRetenciones.error = true;
       respuestaRetenciones.mensajeError.push("Error calculando retenciones - Error=" + JSON.stringify(err));
     }

     respuestaRetenciones.idTransaccionOriginal = idTransaccionOriginal;
     respuestaRetenciones.tipoTransaccionOriginal = tipoTransaccionOriginal;
     respuestaRetenciones.trandate = informacionPago.trandate;
     //respuestaRetenciones.trandate = nlapiDateToString(trandate);
     respuestaRetenciones.entity = entity;
     respuestaRetenciones.monedaTransaccionOriginal = monedaTransaccionOriginal;
     respuestaRetenciones.tipoCambio = tasa_cambio_transac;
     respuestaRetenciones.montoTotalTransaccion = montoTotalTransaccion;
     respuestaRetenciones.estado = estadoTransac;
     respuestaRetenciones.idRetencion = informacionPago.retencion;
     respuestaRetenciones.subsidiariaTransaccion = subsidiariaTransaccion;
     respuestaRetenciones.tranidTransaccionOrigen = transacTranid;
     respuestaRetenciones.cuentaContTransaccion = cuentaContable;
     respuestaRetenciones.fechaExRateUI = fechaExRate;
     respuestaRetenciones.valorUnidadIndexada = valueUI;
     respuestaRetenciones.noCumpleMinimoIRPF = noCumpleMinimoIRPF;
     respuestaRetenciones.noCumpleMinimoIRNR = noCumpleMinimoIRNR;
     respuestaRetenciones.noCumpleMinimoIRAE = noCumpleMinimoIRAE;
     respuestaRetenciones.noCumpleMinimoIVA = noCumpleMinimoIVA;
     respuestaRetenciones.retAcumIRPF = retAcumIRPF;
     respuestaRetenciones.codRetencionIRPF = codRetencionIRPF;
     respuestaRetenciones.codRetencionIRNR = codRetencionIRNR;
     respuestaRetenciones.codRetencionIRAE = codRetencionIRAE;
     respuestaRetenciones.codRetencionIVA = codRetencionIVA;
     respuestaRetenciones.idInternosFacturaIRPF = idInternosFacturaIRPF;
     respuestaRetenciones.direccion = direccion;
     respuestaRetenciones.ciudad = ciudad;
     respuestaRetenciones.pais = pais;
     respuestaRetenciones.codPostal = codPostal;
     respuestaRetenciones.poseeRetencionIRPF = poseeRetencionIRPF;
     respuestaRetenciones.poseeRetencionIRNR = poseeRetencionIRNR;
     respuestaRetenciones.poseeRetencionIRAE = poseeRetencionIRAE;
     respuestaRetenciones.poseeRetencionIVA = poseeRetencionIVA;
     respuestaRetenciones.uruTipoDoc = uruTipoDoc;
     respuestaRetenciones.uruNroDoc = uruNroDoc;
     respuestaRetenciones.uruRazonSoc = uruRazonSoc;
     //respuestaRetenciones.fechaVenci = informacionPago.fechaVenci;
     respuestaRetenciones.duedateRetencion = informacionPago.duedateRetencion;

     log.debug("Calculo Retenciones", "Respuesta : " + JSON.stringify(respuestaRetenciones));
     log.audit("TIEMPOS", "FIN SUITELET: " + new Date());

     context.response.write({ output: JSON.stringify(respuestaRetenciones) });

   }

   function calcularAcumulado(transactionDet) {
    var acumulado = 0;
    for (var i = 0; i < transactionDet.length; i++) {
      var importeXTP = parseFloat(transactionDet[i].transacImporteXTP);
      if (!isNaN(importeXTP)) {
        acumulado += importeXTP;
      }
    }
    return acumulado;
  }

  function calcularAcumuladoIVA(transactionDet, calSobreIVA) {
    var acumulado = 0;
    if (calSobreIVA) {
      for (var i = 0; i < transactionDet.length; i++) {
        var transacImporteNet = parseFloat(transactionDet[i].transacImporteNet);
        if (!isNaN(transacImporteNet)) {
          acumulado += transacImporteNet;
        }
      }
    } else {
      for (var i = 0; i < transactionDet.length; i++) {
        var transacImporteNetXTP = parseFloat(transactionDet[i].transacImporteNetXTP);
        if (!isNaN(transacImporteNetXTP)) {
          acumulado += transacImporteNetXTP;
        }
      }
  
    }
    return acumulado;
  }

   return {
     onRequest: onRequest
   };

 });
