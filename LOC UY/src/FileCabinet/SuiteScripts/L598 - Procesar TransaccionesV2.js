/**
 *@NApiVersion 2.1
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 *@NScriptType Suitelet
 *@NModuleScope Public
 */
define(["N/log", "N/search", "N/runtime", "N/format", "N/ui/serverWidget", "N/task", "L598/utilities"],
  function (log, search, runtime, format, serverWidget, task, utilities) {
    /*global define */
    /***
     *  Migrado L598 - Procesar Transacciones V2.js , desde L598-ProcesarTransacciones.js solo funcion facturasAProcesar y dependencias.
     */

    function l598isEmpty(value) {
      if (value === "") {
        return true;
      }

      if (value === null) {
        return true;
      }

      if (value === undefined) {
        return true;
      }

      if (value === "null") {
        return true;
      }

      if (value === "undefined") {
        return true;
      }

      return false;
    }


    function l598esOneworld() {
      const filters = [
        search.createFilter({
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


    function procesarTransacciones(context) {
      log.audit("URU - SUITELET Generar CAE ", "INICIO PROCESAR TRANSACCIONES");
      try {
        //Armo array con los marcados

        let fechaDesde = !l598isEmpty(context.request.parameters.custpage_fecha_desde) ? format.parse({ value: context.request.parameters.custpage_fecha_desde, type: format.Type.DATE }) : '';
        let fechaHasta = !l598isEmpty(context.request.parameters.custpage_fecha_hasta) ? format.parse({ value: context.request.parameters.custpage_fecha_hasta, type: format.Type.DATE }) : '';

        log.debug('URU - SUITELET GENERAR CAE', `fechaDesde: ${fechaDesde} / fechaHasta: ${fechaHasta}`);

        const objParams = {
          listadoTransacciones: new Array(),
          custpage_subsidiaria: context.request.parameters.custpage_subsidiaria,
          custpage_serie: context.request.parameters.custpage_serie,
          custpage_sucursal: context.request.parameters.custpage_sucursal,
          custpage_tipo_transaccion: context.request.parameters.custpage_tipo_transaccion,
          custpage_fecha_desde: fechaDesde,
          custpage_fecha_hasta: fechaHasta,
          usuarioEmail: runtime.getCurrentUser(),
        };

        //Llamo al programado
        const params = {};

        // Objeto de pagos con todos los parametros
        // Envio los Filtros
        params.custscript_l598_info_transacciones_v2 = JSON.stringify(objParams);

        log.debug("URU - SUITELET Generar CAE ", "INICIO Invocar a Script Programado - Parametros : " + JSON.stringify(objParams));

        /* const status = task.create({
          taskType: task.TaskType.SCHEDULED_SCRIPT,
          scriptId: "customscript_l598_generar_cae_lotes_v2",
          params: params
        }); */

        var mrTask = task.create({
          taskType: task.TaskType.SCHEDULED_SCRIPT
        });
        mrTask.scriptId = "customscript_l598_generar_cae_lotes_v2";
        mrTask.deploymentId = "customdeploy_l598_generar_cae_lotes_v2";
        mrTask.params = params;
        var taskId = mrTask.submit(); //Submit ScheduledScript

        const status = taskId;

        log.debug("URU - SUITELET Generar CAE ", "STATUS ENCOLADO Script Programado : " + status);

      } catch (excepcion) {
        log.error("URU - SUITELET Generar CAE ", "Excepcion invocando al Script Programado para el Procesamiento de las Transacciones - Excepcion : " + excepcion.message);
      }

    }

    function obtenerSubsidiarias(parametroPais){
      var response = { error: false, mensaje: '', data: [] };
      try {
        var i=0;
        var filtros = new Array();
        
        if (!l598isEmpty(parametroPais)){
          var filtro = {};
          filtro.name = 'country';
          filtro.operator = 'ANYOF';
          filtro.values = [parametroPais];
          filtros.push(filtro);
        }
          
        var objResultSet = utilities.searchSavedPro('customsearch_l598_loc_subidiarias_pais', filtros);
        if (!objResultSet.error) {

          var resultSet = objResultSet.objRsponseFunction.result;
          var resultSearch = objResultSet.objRsponseFunction.search;

          if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {

              for (var i = 0; !utilities.isEmpty(resultSet) && i < resultSet.length; i++) {
                  var data = {};
                  data.nombre = resultSet[i].getValue({ name: resultSearch.columns[1] });
                  data.internalId = resultSet[i].getValue({ name: resultSearch.columns[0] });

                  response.data.push(data);
              }

          } else {
              response.error = true;
              response.mensaje = 'No se obtuvieron resultados de Cuentas de Bancos';
          }
        } else {
            response.error = true;
            response.mensaje = 'Error Consultando searchSavedPro - Cuentas de Bancos: ' + objResultSet.descripcion;
        }
        return response;
      } catch (e) {
        log.error("Error Inesperado",e)
        response.error = true;
        response.mensaje = "Netsuite Excepción: " + e.message;
        return response;
      }
      
    }
    
    function buscarTransacciones(context) {

      let proceso = 'buscarTransacciones';
      log.audit("URU - SUITELET Generar CAE ", "INICIO CONSULTA TRANSACCIONES");
      let existenTransacciones = 0;

      try {
        const filtros = new Array();
        let i = 0;

        log.debug(proceso, `parameters: ${JSON.stringify(context.request.parameters)}`);

        // Inicio Obtener Dominio de Ejecucion
        let subsidiariaDominio = "";
        if (!l598isEmpty(context.request.parameters.custpage_subsidiaria)) {
          subsidiariaDominio = context.request.parameters.custpage_subsidiaria;
        }

        const filtroConfiguracion = new Array();

        filtroConfiguracion[0] = search.createFilter({
          name: "isinactive",
          operator: search.Operator.IS,
          values: false
        });

        if (!l598isEmpty(subsidiariaDominio))
          filtroConfiguracion[1] = search.createFilter({
            name: "custrecord_l598_conf_fe_subsidiaria",
            operator: search.Operator.IS,
            values: subsidiariaDominio
          });

        const columnaConfiguracion = search.createColumn({
          name: 'custrecord_l598_conf_fe_url_dom'
        });

        let resultadoConfiguracion = null;


        resultadoConfiguracion = search.create({
          type: "customrecord_l598_conf_factura_elec",
          filters: filtroConfiguracion,
          columns: columnaConfiguracion
        }).run().getRange({
          start: 0,
          end: 1000,
        });

        resultadoConfiguracion = search.create({
          type: "customrecord_l598_conf_factura_elec",
          columns: columnaConfiguracion
        }).run().getRange({
          start: 0,
          end: 1000
        });


        let urlDomConf = "";
        if (!l598isEmpty(resultadoConfiguracion) && resultadoConfiguracion.length > 0) {
          urlDomConf = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_dom");
        }
        // Fin Obtener Dominio de Ejecucion

        log.debug(proceso, `urlDomConfig: ${urlDomConf}`);

        if (!l598isEmpty(context.request.parameters.custpage_subsidiaria))
          filtros[i++] = search.createFilter({
            name: "subsidiary",
            operator: search.Operator.IS,
            values: context.request.parameters.custpage_subsidiaria
          });

        log.debug(proceso, `LINE 171 - nro filtro: ${i}   /   ultimo filtro: ${JSON.stringify(filtros[filtros.length])}`);

        if (!l598isEmpty(context.request.parameters.custpage_sucursal))
          filtros[i++] = search.createFilter({
            name: "custbody_l598_sucursal",
            operator: search.Operator.IS,
            values: context.request.parameters.custpage_sucursal
          });

        log.debug(proceso, `LINE 180 - nro filtro: ${i}   /   ultimo filtro: ${JSON.stringify(filtros[filtros.length])}`);

        if (!l598isEmpty(context.request.parameters.custpage_serie))
          filtros[i++] = search.createFilter({
            name: "custbody_l598_serie_comprobante",
            operator: search.Operator.IS,
            values: context.request.parameters.custpage_serie
          });

        log.debug(proceso, `LINE 197 - nro filtro: ${i}   /   ultimo filtro: ${JSON.stringify(filtros[filtros.length])}`);

        log.debug(proceso, `LINE 185 - filtros SS ANTES de tipo transaccion: ${JSON.stringify(filtros)}`);

        log.debug(proceso, `tipo de transaccion: ${context.request.parameters.custpage_tipo_transaccion}`);

        if (!l598isEmpty(context.request.parameters.custpage_tipo_transaccion)) {

          const informacionTipoTransaccion = search.lookupFields({
            type: "customrecord_l598_tipo_transaccion_fe",
            id: context.request.parameters.custpage_tipo_transaccion,
            columns: ["custrecord_l598_tipo_transaccion_fe_tipo", "custrecord_l598_tipo_transaccion_fe_exp", "custrecord_l598_tipo_transaccion_fe_tick", "custrecord_l598_tipo_transaccion_fe_ajen"]
          });

          log.debug(proceso, `informacionTipoTransaccion: ${JSON.stringify(informacionTipoTransaccion)}`);
          log.debug(proceso, `tipo transaccion fe (custrecord_l598_tipo_transaccion_fe_tipo): ${utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_tipo")}`);

          if (!l598isEmpty(utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_tipo"))) {

            const filtroTipoTransaccion = new Array();

            filtroTipoTransaccion[0] = search.createFilter({
              name: "internalid",
              operator: search.Operator.IS,
              values: utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_tipo")
            });

            const columnaTipoTransaccion = new Array();
            columnaTipoTransaccion[0] = search.createColumn({ name: "custrecord_l598_tipo_trans_ns_cod", join: "custrecord_l598_tipo_trans_loc_tipo_ns" });
            columnaTipoTransaccion[1] = search.createColumn("custrecord_l598_tipo_trans_loc_es_nd");

            const resultadoTipoTransaccion = search.create({
              type: "customrecord_l598_tipo_trans_loc",
              filters: filtroTipoTransaccion,
              columns: columnaTipoTransaccion
            }).run().getRange({
              start: 0,
              end: 1000
            });

            log.debug(proceso, `resultadoTipoTransaccion: ${JSON.stringify(resultadoTipoTransaccion)}`);

            if (!l598isEmpty(resultadoTipoTransaccion) && resultadoTipoTransaccion.length > 0) {

              //var tipoNS = resultadoTipoTransaccion[0].getValue('custrecord_l598_tipo_trans_ns_cod','custrecord_l598_tipo_trans_loc_tipo_ns');
              const tipoNS = resultadoTipoTransaccion[0].getValue({ name: "custrecord_l598_tipo_trans_ns_cod", join: "custrecord_l598_tipo_trans_loc_tipo_ns" });
              const esND = resultadoTipoTransaccion[0].getValue("custrecord_l598_tipo_trans_loc_es_nd");

              log.debug(proceso, `LINE 245 - tipoNS: ${tipoNS}   /   esND: ${esND}`);

              let esNotaDebito = 'F';

              if (!l598isEmpty(esND) && (esND == "T" || esND === true))
                esNotaDebito = 'T';

              if (!l598isEmpty(tipoNS)) {

                filtros[i++] = search.createFilter({
                  name: "recordType",
                  operator: search.Operator.IS,
                  values: tipoNS
                });

                let esExportacion = 'F';
                let esTicket = 'F';
                let esCuentaAjena = 'F';

                filtros[i++] = search.createFilter({
                  name: "custbody_l598_nd",
                  operator: search.Operator.IS,
                  values: esNotaDebito
                });

                if (utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_exp") === true) {
                  esExportacion = 'T';
                }

                filtros[i++] = search.createFilter({
                  name: "custbody_l598_trans_exportacion",
                  operator: search.Operator.IS,
                  values: esExportacion
                });

                if (utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_tick") === true) {
                  esTicket = 'T';
                }

                filtros[i++] = search.createFilter({
                  name: "custbody_l598_trans_eticket",
                  operator: search.Operator.IS,
                  values: esTicket
                });

                if (utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_ajen") === true) {
                  esCuentaAjena = 'T';
                }

                filtros[i++] = search.createFilter({
                  name: "custbody_l598_transac_cuenta_ajena",
                  operator: search.Operator.IS,
                  values: esCuentaAjena
                });

                log.debug(proceso, `esNotaDebito: ${esNotaDebito} / tipoNS: ${tipoNS} / esExportacion: ${esExportacion} / esTicket: ${esTicket} / esCuentaAjena: ${esCuentaAjena}`);

              }
            }
          }
        }

        if (!l598isEmpty(context.request.parameters.custpage_fecha_desde)) {
          filtros[i++] = search.createFilter({
            name: "trandate",
            operator: search.Operator.ONORAFTER,
            // values: format.parse({ value: context.request.parameters.custpage_fecha_desde, type: format.Type.DATE })
            values: context.request.parameters.custpage_fecha_desde
          });
        }

        log.debug(proceso, `LINE 298 - nro filtro: ${i}   /   ultimo filtro: ${JSON.stringify(filtros[filtros.length])}`);

        if (!l598isEmpty(context.request.parameters.custpage_fecha_hasta)) {
          filtros[i++] = search.createFilter({
            name: "trandate",
            operator: search.Operator.ONORBEFORE,
            // values: format.parse({ value: context.request.parameters.custpage_fecha_hasta, type: format.Type.DATE })
            values: context.request.parameters.custpage_fecha_hasta
          });
        }

        log.debug(proceso, `LINE 309 - nro filtro: ${i}   /   ultimo filtro: ${JSON.stringify(filtros[filtros.length])}`);

        log.debug(proceso, `LINE 279 - filtros SS de tipo transaccion: ${JSON.stringify(filtros)}`);

        const searchSave = search.load({ id: "customsearch_l598_trans_gen_cae_suitelet" });
        searchSave.filters.push(...filtros);
        /* const columna = new Array();
        columna[0] = search.createColumn({
          name: "internalid",
          summary: search.Summary.COUNT
        });
        searchSave.columns.push(...columna); */
        const searchResults = searchSave.run();

        const completeResultSet = searchResults.getRange(0, 1000);
        
        if (!l598isEmpty(completeResultSet) && completeResultSet.length > 0) {
          existenTransacciones = completeResultSet[0].getValue(searchResults.columns[0]);
        } //if

      } catch (excepcion) {
        log.error("URU - SUITELET Generar CAE ", "Excepcion buscando las Transacciones A Generar CAE - Excepcion : " + excepcion.message);
      }

      log.audit("URU - SUITELET Generar CAE ", "FIN CONSULTA TRANSACCIONES");
      return existenTransacciones;

    }

    /**
     * Función a migrar facturasAProcesar(request, response, subsidiaria)
     */
    function onRequest(context) {

      log.audit("URU - SUITELET Generar CAE ", "INICIO PROCESO");

      try {

        const user = runtime.getCurrentUser();

        // Verifico Si es OneWorld
        let oneWorld = false;
        if (l598esOneworld()) {
          oneWorld = true;
        }

        const form = serverWidget.createForm("Factura Electronica");
        form.clientScriptModulePath = "./L598 - Procesar Transacciones (Cliente).js";

        const grupoFiltro = form.addFieldGroup({
          id: "filtros",
          label: "Criterios"
        });
        const tabDetalle = form.addTab({
          id: "tabdetalle",
          label: "Detalle"
        });
        const subTab = form.addSubtab({
          id: 'custpage_tabbusqueda',
          label: 'Transacciones A Procesar',
          tab: 'tabdetalle'
        });

        let campoSubsidiaria = null;
        if (oneWorld == true) {
          campoSubsidiaria = form.addField({
            id: 'custpage_subsidiaria',
            label: 'Subsidiaria:',
            type: serverWidget.FieldType.SELECT,
            source: null,
            container: 'filtros'
          });
        } else {
          campoSubsidiaria = form.addField({
            id: 'custpage_subsidiaria',
            label: 'Subsidiaria:',
            type: serverWidget.FieldType.TEXT,
            source: 'subsidiary',
            container: 'filtros'
          }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
          })

          campoSubsidiaria.defaultValue = '';
        }
        const campoLetra = form.addField({
          id: "custpage_serie",
          label: "Serie:",
          type: serverWidget.FieldType.SELECT,
          source: "customrecord_l598_serie_comprobante",
          container: "filtros"
        });
        const campoPuntoVenta = form.addField({
          id: "custpage_sucursal",
          label: "Sucursal:",
          type: serverWidget.FieldType.SELECT,
          source: "customrecord_l598_sucursales",
          container: "filtros"
        });
        const campoTipoTransaccion = form.addField({
          id: "custpage_tipo_transaccion",
          label: "Tipo Transaccion:",
          type: serverWidget.FieldType.SELECT,
          source: "customrecord_l598_tipo_transaccion_fe",
          container: "filtros"
        });
        const campoFechaDesde = form.addField({
          id: "custpage_fecha_desde",
          label: "Fecha Desde:",
          type: serverWidget.FieldType.DATE,
          container: "filtros"
        });
        const campoFechaHasta = form.addField({
          id: "custpage_fecha_hasta",
          label: "Fecha Hasta:",
          type: serverWidget.FieldType.DATE,
          container: "filtros"
        });

        if (oneWorld == true) {
          campoSubsidiaria.isMandatory = true;
        }
        //filtro Dinamico Suubsidiaria
        if (oneWorld == true) {
        campoSubsidiaria.addSelectOption({ value: '', text: '' });
        let script = runtime.getCurrentScript();
        let paramPais = script.getParameter('custscript_l598_cae_proces_trans_country');
        var subsidiariasInfo = obtenerSubsidiarias(paramPais);
        if (!subsidiariasInfo.error) {
          if (subsidiariasInfo.data.length > 0) {
              for (var i = 0; i < subsidiariasInfo.data.length; i++) {
                campoSubsidiaria.addSelectOption({
                      value: subsidiariasInfo.data[i].internalId,
                      text: subsidiariasInfo.data[i].nombre
                  });
              }
          }
        }
        }
        //Subsidiaria del Usuario por Defecto
        const objRecord = runtime.getCurrentUser();
        if (oneWorld == true) {
          const subsidiariaUsuario = objRecord.subsidiary;
          if (!l598isEmpty(subsidiariaUsuario)) {
            campoSubsidiaria.defaultValue = subsidiariaUsuario.toString();
          }
        }

        const btnAccion = form.addField({
          id: 'custpage_accion',
          label: 'Accion:',
          type: serverWidget.FieldType.TEXT,
          container: 'filtros'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        const infoResultado = form.addField({
          id: 'custpage_resultado',
          label: 'Resultados:',
          type: serverWidget.FieldType.INLINEHTML,
          container: 'filtros'
        });

        form.addSubmitButton({
          label: 'Buscar Transacciones'
        });

        if (context.request.method == "POST") {

          // const respuesta = runtime.getCurrentScript();
          //Por la limitacion que no se pueden mostrar 2 botones submit, si es el BUSCAR viene el valor en submitter, sino viene en la accion
          const sAccion = l598isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;

          let transaccionesEncontradas;
          let mensaje;
          switch (sAccion) {
            case "GENERAR_CAE":
              procesarTransacciones(context);
              infoResultado.defaultValue = "<font color=\"red\">Se procesó su solicitud. Recibirá una notificación al finalizar por email</font>";
              context.response.writePage(form);
              break;
            case "Buscar Transacciones":
              transaccionesEncontradas = false;
              transaccionesEncontradas = buscarTransacciones(context);

              mensaje = "No se Encontraron Transacciones";
              if (transaccionesEncontradas > 0) {
                form.addButton({
                  id: "custpage_btn_generar_cae",
                  label: "Generar CAE",
                  functionName: "generarCAE()"
                });
                mensaje = "Se Encontraron : " + transaccionesEncontradas + " Transacciones";
              }
              infoResultado.defaultValue = "<font color=\"blue\">" + mensaje + "</font>";

              if (oneWorld == true) {
                if (!l598isEmpty(context.request.parameters.custpage_subsidiaria))
                  campoSubsidiaria.defaultValue = context.request.parameters.custpage_subsidiaria;
              }
              if (!l598isEmpty(context.request.parameters.custpage_sucursal))
                campoPuntoVenta.defaultValue = context.request.parameters.custpage_sucursal;
              if (!l598isEmpty(context.request.parameters.custpage_serie))
                campoLetra.defaultValue = context.request.parameters.custpage_serie;
              if (!l598isEmpty(context.request.parameters.custpage_tipo_transaccion))
                campoTipoTransaccion.defaultValue = context.request.parameters.custpage_tipo_transaccion;
              if (!l598isEmpty(context.request.parameters.custpage_fecha_desde))
                campoFechaDesde.defaultValue = context.request.parameters.custpage_fecha_desde;
              if (!l598isEmpty(context.request.parameters.custpage_fecha_hasta))
                campoFechaHasta.defaultValue = context.request.parameters.custpage_fecha_hasta;

              context.response.writePage(form);
              break;
          }

        } else {
          context.response.writePage(form);
        }

      } catch (excepcion) {
        log.error("URU - SUITELET Generar CAE ", "Excepcion Generando Pantalla de Busqueda y Envio de Transacciones A Generar CAE - Excepcion : " + excepcion.message);
      }

      log.audit("URU - SUITELET Generar CAE ", "FIN PROCESO");
    }

    return {
      onRequest: onRequest
    };

  });
