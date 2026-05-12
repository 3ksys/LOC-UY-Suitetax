/**
 *@NApiVersion 2.1
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 *@NScriptType ScheduledScript
 */
define(["N/log", "N/format", "N/search", "N/record", "N/runtime", "N/http", "N/format", "N/email", "L598/utilities"],
  /* global define */
  /***
   * Migrado desde L598-ProcesarTransacciones.js la funcion generarCAE_Lotes y sus dependencias.
   */
  function (log, format, search, record, runtime, http, format, email, utilities) {

    function l598isEmpty(value) {
      return (typeof value == "undefined" || value == null || value == "");
    }


    function grabarError(codigoEstado, codigoMensaje, detalleMensaje, puntoVenta, tipoComprobante, refLog, refTransaccion) {
      log.debug('grabarError', "URU - Grabar LOG", "INICIO PROCESO");
      let idRL = refLog;
      let fechaFinal;
      try {
        if (l598isEmpty(idRL)) {
          const recordLog = record.create({ type: "customrecord_l598_fact_elec_log" });
          // Genero la Fecha
          fechaFinal = format.format({ value: new Date(), type: format.Type.DATETIMETZ, timezone: format.Timezone.AMERICA_BUENOS_AIRES });
          recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_fecha", value: fechaFinal }); // Buenos Aires GMT-03:00
          if (!l598isEmpty(codigoEstado)) {
            const codigoInternoEstado = obtenerInformacionRT("customrecord_l598_fe_est_log", ["custrecord_l598_fe_est_log_codigo"], ["is"], [codigoEstado], ["internalid"], true, false);
            if (codigoInternoEstado != null && codigoInternoEstado.error == false && !l598isEmpty(codigoInternoEstado.informacion)) {
              recordLog.setValue("custrecord_l598_fact_elec_log_estado", codigoInternoEstado.informacion[0]);
            }
          }
          if (!l598isEmpty(puntoVenta))
            recordLog.setValue("custrecord_l598_fact_elec_log_pv", puntoVenta);
          if (!l598isEmpty(tipoComprobante))
            recordLog.setValue("custrecord_l598_fact_elec_log_tipo_comp", tipoComprobante);
          idRL = recordLog.save();
        }
        if (!l598isEmpty(idRL)) {
          // Grabo el Detalle
          const recordDetalleLog = record.create({ type: "customrecord_l598_fact_elec_dlog" });
          recordDetalleLog.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_fecha", value: fechaFinal }); // Buenos Aires GMT-03:00
          if (!l598isEmpty(codigoMensaje)) {
            const codigoInternoMensaje = obtenerInformacionRT("customrecord_l598_msg_log", ["custrecord_l598_msg_log_codigo"], ["is"], [codigoMensaje], ["internalid"], true, false);
            if (codigoInternoMensaje != null && codigoInternoMensaje.error == false && !l598isEmpty(codigoInternoMensaje.informacion)) {
              recordDetalleLog.setValue("custrecord_l598_fact_elec_dlog_msg", codigoInternoMensaje.informacion[0]);
            }
          }
          if (!l598isEmpty(detalleMensaje)) {
            recordDetalleLog.setValue("custrecord_l598_fact_elec_dlog_det", detalleMensaje);
          }
          if (!l598isEmpty(idRL))
            recordDetalleLog.setValue("custrecord_l598_fact_elec_dlog_rlog", idRL);
          if (!l598isEmpty(refTransaccion))
            recordDetalleLog.setValue("custrecord_l598_fact_elec_dlog_rtrans", refTransaccion);
          const _idRDL = recordDetalleLog.save();
        }
      } catch (excepcion) {
        log.error("URU - Grabar LOG", "Excepcion Grabando Log de Proceso de Factura Electronica - Excepcion : " + excepcion.message);
      }
      return idRL;
    }


    function obtenerIDTransaccionesAProcesar(infoTransacciones) {

      log.audit("URU - SUITELET Generar CAE ", "INICIO OBTENER ID INTERNO DE TRANSACCIONES");
      const idTransacciones = [];

      try {
        let i = 0;
        const filtros = new Array();

        log.debug('URU - GENERAR CAE LOTES', `infoTransacciones ${JSON.stringify(infoTransacciones)}`);

        if (!l598isEmpty(infoTransacciones.custpage_subsidiaria))
          filtros[i++] = search.createFilter({
            name: "subsidiary",
            operator: search.Operator.IS,
            values: infoTransacciones.custpage_subsidiaria
          });

        if (!l598isEmpty(infoTransacciones.custpage_sucursal))
          filtros[i++] = search.createFilter({
            name: "custbody_l598_sucursal",
            operator: search.Operator.IS,
            values: infoTransacciones.custpage_sucursal
          });

        if (!l598isEmpty(infoTransacciones.custpage_serie))
          filtros[i++] = search.createFilter({
            name: "custbody_l598_serie_comprobante",
            operator: search.Operator.IS,
            values: infoTransacciones.custpage_serie
          });

        if (!l598isEmpty(infoTransacciones.custpage_tipo_transaccion)) {

          const informacionTipoTransaccion = search.lookupFields({
            type: "customrecord_l598_tipo_transaccion_fe",
            id: infoTransacciones.custpage_tipo_transaccion,
            columns: ["custrecord_l598_tipo_transaccion_fe_tipo", "custrecord_l598_tipo_transaccion_fe_exp", "custrecord_l598_tipo_transaccion_fe_tick", "custrecord_l598_tipo_transaccion_fe_ajen"]
          });

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

            if (!l598isEmpty(resultadoTipoTransaccion) && resultadoTipoTransaccion.length > 0) {

              const tipoNS = resultadoTipoTransaccion[0].getValue({ name: "custrecord_l598_tipo_trans_ns_cod", join: "custrecord_l598_tipo_trans_loc_tipo_ns" });
              const esND = resultadoTipoTransaccion[0].getValue("custrecord_l598_tipo_trans_loc_es_nd");

              let esNotaDebito = 'F';

              if (!l598isEmpty(esND) && (esND == "T" || esND === true))
                esNotaDebito = 'T';

              if (!l598isEmpty(tipoNS)) {

                filtros[i++] = search.createFilter({
                  name: "recordType",
                  operator: search.Operator.IS,
                  values: tipoNS
                });

                filtros[i++] = search.createFilter({
                  name: "custbody_l598_nd",
                  operator: search.Operator.IS,
                  values: esNotaDebito
                });

                let esExportacion = 'F';

                if (utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_exp") === true) {
                  esExportacion = 'T';
                }

                filtros[i++] = search.createFilter({
                  name: "custbody_l598_trans_exportacion",
                  operator: search.Operator.IS,
                  values: esExportacion
                });

                let esTicket = 'F';

                if (utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_tick") === true) {
                  esTicket = 'T';
                }

                filtros[i++] = search.createFilter({
                  name: "custbody_l598_trans_eticket",
                  operator: search.Operator.IS,
                  values: esTicket
                });

                let esCuentaAjena = 'F';

                if (utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_ajen") === true) {
                  esCuentaAjena = 'T';
                }

                filtros[i++] = search.createFilter({
                  name: "custbody_l598_transac_cuenta_ajena",
                  operator: search.Operator.IS,
                  values: esCuentaAjena
                });

                log.debug('L598 - GENERAR CAE LOTES', `esNotaDebito: ${esNotaDebito} / tipoNS: ${tipoNS} / esExportacion: ${esExportacion} / esTicket: ${esTicket} / esCuentaAjena: ${esCuentaAjena}`);

              }
            }
          }
        }

        if (!l598isEmpty(infoTransacciones.custpage_fecha_desde)) {
          let fechaDsd = new Date(infoTransacciones.custpage_fecha_desde);

          log.debug('URU - GENERAR CAE LOTES', `fechaDsd: ${fechaDsd}`);

          let fechaDesdeFinal = format.format({
            value: fechaDsd,
            type: format.Type.DATE
          });

          log.debug('URU - GENERAR CAE LOTES', `fechaDesdeFinal: ${fechaDesdeFinal}`);

          filtros[i++] = search.createFilter({
            name: "trandate",
            operator: search.Operator.ONORAFTER,
            values: fechaDesdeFinal
          });

        }

        if (!l598isEmpty(infoTransacciones.custpage_fecha_hasta)) {
          let fechaHsta = new Date(infoTransacciones.custpage_fecha_hasta);

          log.debug('URU - GENERAR CAE LOTES', `fechaHsta: ${fechaHsta}`);

          let fechaHastaFinal = format.format({
            value: fechaHsta,
            type: format.Type.DATE
          });

          log.debug('URU - GENERAR CAE LOTES', `fechaHastaFinal: ${fechaHastaFinal}`);

          filtros[i++] = search.createFilter({
            name: "trandate",
            operator: search.Operator.ONORBEFORE,
            values: fechaHastaFinal
          });
        }

        log.debug('URU - GENERA CAE LOTES', `LINE 279 - filtros SS de tipo transaccion: ${JSON.stringify(filtros)}`);

        const searchLoad = search.load({
          id: "customsearch_l598_trans_gen_cae_scr_prog"
        });

        searchLoad.filters.push(...filtros);

        const searchResults = searchLoad.run();
        let completeResultSet = [];
        let resultIndex = 0;
        const resultStep = 1000; // Number of records returned in one step (maximum is 1000)
        let resultado; // temporary variable used to store the result set
        log.debug("URU - SUITELET Generar CAE ", "Script Programado - Inicio Consulta ID Transacciones A Procesar - Fecha : " + new Date());

        do {
          // fetch one result set
          resultado = searchResults.getRange({
            start: resultIndex,
            end: resultIndex + resultStep
          });

          if (!l598isEmpty(resultado) && resultado.length > 0) {
            if (resultIndex == 0)
              completeResultSet = resultado; //Primera ve inicializa
            else
              completeResultSet = completeResultSet.concat(resultado);
          }
          // increase pointer
          resultIndex = resultIndex + resultStep;

        } while (!l598isEmpty(resultado) && resultado.length > 0);

        log.debug('URU - GENERAR CAE LOTES', `CANTIDAD DE TRANSACCIONES A PROCESAR: ${completeResultSet.length}`);
        // log.debug('URU - GENERAR CAE LOTES', `TRANSACCIONES A PROCESAR: ${JSON.stringify(completeResultSet)}`);

        if (!l598isEmpty(completeResultSet) && completeResultSet.length > 0) {
          for (let j = 0; j < completeResultSet.length; j++) {
            idTransacciones.push(completeResultSet[j].id); //searchId
          } //for
        } //if

        log.debug("URU - SUITELET Generar CAE ", `idTransacciones a procesar: ${JSON.stringify(idTransacciones)}`);
        log.debug("URU - SUITELET Generar CAE ", "Script Programado - Fin Consulta ID Transacciones A Procesar - Fecha : " + new Date());

      } catch (excepcion) {
        log.debug("URU - SUITELET Generar CAE ", "Excepcion Obteniendo los ID Internos de las Transacciones A Procesar - Excepcion : " + excepcion.message);
      }
      log.debug("URU - SUITELET Generar CAE ", "FIN OBTENER ID INTERNO DE TRANSACCIONES");
      return idTransacciones;
    }


    function obtenerInformacionRT(idRecordType, arrayIDFiltroCampo, arrayComparacionFiltroCampo, arrayValorFiltroCampo, arrayIDColumna, considerarFiltroInactivo, filtroInactivo) {
      const infoResultado = {
        error: false,
        descripcionError: "",
        informacion: new Array(),
      };
      if (!l598isEmpty(idRecordType) && arrayIDColumna != null && arrayIDColumna.length > 0) {
        const filtros = new Array();
        if (considerarFiltroInactivo == true) {
          let valorInactivo = false;
          if (filtroInactivo == true) {
            valorInactivo = true;
          }
          filtros.push(search.createFilter({
            name: "isinactive",
            operator: search.Operator.IS,
            values: valorInactivo
          }));
        }
        if (arrayIDFiltroCampo != null && arrayIDFiltroCampo.length > 0 && arrayValorFiltroCampo != null && arrayValorFiltroCampo.length > 0 && arrayComparacionFiltroCampo != null && arrayComparacionFiltroCampo.length > 0) {
          if (arrayIDFiltroCampo.length == arrayValorFiltroCampo.length && arrayValorFiltroCampo.length == arrayComparacionFiltroCampo.length) {
            for (let contFiltros = 0; contFiltros < arrayIDFiltroCampo.length; contFiltros++) {
              if (!l598isEmpty(arrayIDFiltroCampo[contFiltros]) && !l598isEmpty(arrayComparacionFiltroCampo[contFiltros]) && !l598isEmpty(arrayValorFiltroCampo[contFiltros]))
                filtros.push(search.createFilter({
                  name: arrayIDFiltroCampo[contFiltros],
                  operator: arrayComparacionFiltroCampo[contFiltros],
                  values: arrayValorFiltroCampo[contFiltros]
                }));
            }
          } else {
            infoResultado.error = true;
            infoResultado.descripcionError = "Contenido de Array de Filtros Invalido";
          }
        }
        if (infoResultado.error == false) {
          const columnas = new Array();
          for (let contColumnas = 0; contColumnas < arrayIDColumna.length; contColumnas++) {
            columnas[contColumnas] = search.createColumn(arrayIDColumna[contColumnas]);
          }
          const resultados = search.create({
            type: idRecordType,
            filters: filtros,
            columns: columnas
          }).run().getRange({
            start: 0,
            end: 1000
          });
          if (resultados != null && resultados.length > 0) {
            for (let contColumnas = 0; contColumnas < arrayIDFiltroCampo.length; contColumnas++) {
              infoResultado.informacion[contColumnas] = resultados[0].getValue(arrayIDColumna[contColumnas]);
            }
          }
        }
      } else {
        infoResultado.error = true;
        infoResultado.descripcionError = "Faltan Parametros Requeridos";
      }
      return infoResultado;
    }


    function enviarEmail(mensajeEmail, emailUsuario, subsidiaria, idLog) {
      if (!l598isEmpty(mensajeEmail) && !l598isEmpty(emailUsuario)) {
        let urlLog = "";
        let urlDominio = "";
        let enviarEmailConf = false;
        const columnaConf = new Array();
        columnaConf[0] = search.createColumn("custrecord_l598_conf_fe_url_dom");
        columnaConf[1] = search.createColumn("custrecord_l598_conf_fe_log");
        columnaConf[2] = search.createColumn("custrecord_l598_conf_fe_enviar_email");
        const filtroConf = [];
        filtroConf.push({
          name: "isinactive",
          operator: "is",
          values: false
        });
        if (!l598isEmpty(subsidiaria))
          filtroConf[1] = search.createFilter({
            name: "custrecord_l598_conf_fe_subsidiaria",
            operator: search.Operator.IS,
            values: subsidiaria
          });
        const resultadoConf = search.create({
          type: "customrecord_l598_conf_factura_elec",
          filters: filtroConf,
          columns: columnaConf
        }).run().getRange({
          start: 0,
          end: 1000
        });
        if (!l598isEmpty(resultadoConf) && resultadoConf.length > 0) {
          urlLog = resultadoConf[0].getValue("custrecord_l598_conf_fe_log");
          urlDominio = resultadoConf[0].getValue("custrecord_l598_conf_fe_url_dom");
          enviarEmailConf = resultadoConf[0].getValue("custrecord_l598_conf_fe_enviar_email");
        }
        if (!l598isEmpty(enviarEmailConf) && (enviarEmailConf == "T" || enviarEmailConf === true)) {
          let mensaje = "<html><head></head><body><br>";
          mensaje += mensajeEmail;
          mensaje += "<br>";
          if (!l598isEmpty(idLog) && idLog > 0 && !l598isEmpty(urlLog) && !l598isEmpty(urlDominio)) {
            mensaje += "Puede Observar el Detalle de Errores desde el Siguiente link " + "<br> ";
            mensaje += "<a href=\"" + urlDominio + "/app/common/custom/custrecordentry.nl?rectype=" + urlLog + "&id=" + idLog + "\"> Informacion Generacion de CAE </a>";
          }
          mensaje += "</body></html>";
          //nlapiSendEmail(emailUsuario, emailUsuario, 'NetSuite - Proceso de generación de CAE', mensaje);
          email.send({
            author: emailUsuario,
            subject: "NetSuite - Proceso de generación de CAE",
            body: mensaje,
            recipients: emailUsuario
          });
        }
      }
    }


    /*
      * Función generarCae_Lotes 
      */
    function execute(_context) {
      let idLog = null;
      let mensajeEmail = "";
      const codigoEstadoError = "FESTADO-2";
      const tipoMensaje = "FMSJ-3";
      const punto_venta = "";
      const tipoTransacción = "";
      const refLog = "";
      const refTransaccion = "";
      let emailUsuario;
      let subsidiaria;
      let idUserEmail = '';
      const currentScript = runtime.getCurrentScript();
      try {
        let mensaje = "";
        const infoTransacciones = JSON.parse(currentScript.getParameter("custscript_l598_info_transacciones_v2"));
        log.debug("URU - SUITELET Generar CAE", "INICIO SCRIPT PROGRAMADO - Params:" + currentScript.getParameter("custscript_l598_info_transacciones_v2"));

        //if (infoTransacciones != null && infoTransacciones.listadoTransacciones != null && infoTransacciones.listadoTransacciones.length > 0) {
        if (infoTransacciones != null) {
          // INICIO NUEVO - Obtener ID Transacciones A Procesar
          const idTransaccionesProcesar = obtenerIDTransaccionesAProcesar(infoTransacciones);
          if (!l598isEmpty(idTransaccionesProcesar) && idTransaccionesProcesar.length > 0) {
            // FIN NUEVO - Obtener ID Transacciones A Procesar

            // Busco el Usuario y Password  y URL del Middleware de la Configuracion, el cual se utilizara para Buscar informacion en NetSuite.
            emailUsuario = infoTransacciones.usuarioEmail.email;
            idUserEmail = infoTransacciones.usuarioEmail.id;
            log.debug('URU - GENERAR CAE LOTES', `emailUsuario: ${emailUsuario} / idUserEmail: ${idUserEmail}`);

            subsidiaria = infoTransacciones.custpage_subsidiaria;
            const filtroConfiguracion = new Array();
            filtroConfiguracion.push({
              name: "isinactive",
              operator: "is",
              values: false
            });
            if (!l598isEmpty(subsidiaria)) {
              filtroConfiguracion[1] = search.createFilter({
                name: "custrecord_l598_conf_fe_subsidiaria",
                operator: search.Operator.IS,
                values: subsidiaria
              });
            }
            const columnaConfiguracion = new Array();
            columnaConfiguracion[0] = search.createColumn("custrecord_l598_conf_fe_link");
            columnaConfiguracion[1] = search.createColumn("custrecord_l598_conf_fe_usuario");
            columnaConfiguracion[2] = search.createColumn("custrecord_l598_conf_fe_pasw_encriptada");
            columnaConfiguracion[3] = search.createColumn("custrecord_l598_conf_fe_url_r_solicitud");
            columnaConfiguracion[4] = search.createColumn("custrecord_l598_conf_fe_url_r_actualizar");
            columnaConfiguracion[5] = search.createColumn("custrecord_l598_conf_fe_url_r_env_email");
            columnaConfiguracion[6] = search.createColumn("custrecord_l598_conf_fe_url_r_cab_log");
            columnaConfiguracion[7] = search.createColumn("custrecord_l598_conf_fe_url_r_det_log");
            columnaConfiguracion[8] = search.createColumn("custrecord_l598_conf_fe_generar_cae_auto");
            columnaConfiguracion[9] = search.createColumn("custrecord_l598_conf_fe_rol");
            columnaConfiguracion[10] = search.createColumn("custrecord_l598_conf_fe_margen_error_mon");
            columnaConfiguracion[11] = search.createColumn("custrecord_l598_conf_fe_nom_sist_fact");
            columnaConfiguracion[12] = search.createColumn("custrecord_l598_conf_fe_razon_social");
            columnaConfiguracion[13] = search.createColumn("custrecord_l598_conf_fe_ruc_empresa");
            columnaConfiguracion[14] = search.createColumn("custrecord_l598_conf_fe_cuenta");
            columnaConfiguracion[15] = search.createColumn("custrecord_l598_conf_fe_tipo_negocio");
            columnaConfiguracion[16] = search.createColumn("custrecord_l598_conf_fe_ver_sist_fact");
            columnaConfiguracion[17] = search.createColumn("custrecord_l598_conf_fe_ruc_emisor");
            columnaConfiguracion[18] = search.createColumn("custrecord_l598_conf_fe_r_social_emisor");
            columnaConfiguracion[19] = search.createColumn("custrecord_l598_conf_fe_nom_comercial");
            columnaConfiguracion[20] = search.createColumn("custrecord_l598_conf_fe_giro_negocio");
            columnaConfiguracion[21] = search.createColumn("custrecord_l598_conf_fe_correo_elec");
            columnaConfiguracion[22] = search.createColumn("custrecord_l598_conf_fe_domicilio_fiscal");
            columnaConfiguracion[23] = search.createColumn("custrecord_l598_conf_fe_ciudad");
            columnaConfiguracion[24] = search.createColumn("custrecord_l598_conf_fe_departamento");
            columnaConfiguracion[25] = search.createColumn("custrecord_l598_conf_fe_url_gateway");
            columnaConfiguracion[26] = search.createColumn("custrecord_l598_conf_fe_serv_firma_comp");
            columnaConfiguracion[27] = search.createColumn("custrecord_l598_conf_fe_url_serv_c_firma");
            columnaConfiguracion[28] = search.createColumn("custrecord_l598_conf_fe_telefono");
            columnaConfiguracion[29] = search.createColumn("custrecord_l598_conf_fe_cod_terminal");
            columnaConfiguracion[30] = search.createColumn("custrecord_l598_conf_fe_cod_comercio");
            columnaConfiguracion[31] = search.createColumn("custrecord_l598_conf_fe_url_rest");
            columnaConfiguracion[32] = search.createColumn("custrecord_l598_conf_fe_usuario_ucfe");
            columnaConfiguracion[33] = search.createColumn("custrecord_l598_conf_fe_password_ucfe");
            columnaConfiguracion[34] = search.createColumn({
              name: "custrecord_l598_tipo_integracion_codigo",
              join: "custrecord_l598_conf_factura_elec_integr"
            });
            columnaConfiguracion[35] = search.createColumn("custrecord_l598_conf_fe_usuario_sige");
            columnaConfiguracion[36] = search.createColumn("custrecord_l598_conf_fe_password_sige");
            columnaConfiguracion[37] = search.createColumn("custrecord_l598_conf_fe_url_firma_sige");
            columnaConfiguracion[38] = search.createColumn("custrecord_l598_conf_fe_url_consult_sige");

            let resultadoConfiguracion = null;


            resultadoConfiguracion = search.create({
              type: "customrecord_l598_conf_factura_elec",
              filters: filtroConfiguracion,
              columns: columnaConfiguracion
            }).run().getRange({
              start: 0,
              end: 1000
            });


            if (!l598isEmpty(resultadoConfiguracion) && resultadoConfiguracion.length > 0) {

              const middlewareURL = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_link");
              const usuario = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_usuario");
              let password = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_pasw_encriptada");
              const URLRESTSolicitud = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_solicitud");
              const URLRESTActualizacion = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_actualizar");
              const URLRESTEmail = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_env_email");
              const URLRESTGrabarCabLog = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_cab_log");
              const URLRESTGrabarDetLog = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_det_log");
              // const generarCaeAutomatico = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_generar_cae_auto");
              const rol = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_rol");
              const cuenta = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_cuenta");
              const margenError = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_margen_error_mon");
              const nombreSistemaFacturacion = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_nom_sist_fact");
              const razonSocial = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_razon_social");
              const RUTEmpresa = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_ruc_empresa");
              const tipoNegocio = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_tipo_negocio");
              const versionSistFact = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_ver_sist_fact");
              const RUCEmisor = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_ruc_emisor");
              const razonSocialEmisor = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_r_social_emisor");
              const nomComercialEmisor = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_nom_comercial");
              const giroNegocioEmisor = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_giro_negocio");
              const correoEmisor = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_correo_elec");
              const domicilioEmisor = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_domicilio_fiscal");
              const ciudadEmisor = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_ciudad");
              const departamentoEmisor = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_departamento");
              const URLGateway = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_gateway");
              const URLServicioFirma = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_serv_firma_comp");
              const URLServicioConfFirma = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_serv_c_firma");
              const telefonoEmisor = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_telefono");
              const codTerminalUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_cod_terminal");
              const codComercioUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_cod_comercio");
              const URLRestUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_rest");
              const usuarioUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_usuario_ucfe");
              const passwordUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_password_ucfe");
              const codTipoIntegracion = resultadoConfiguracion[0].getValue({ name: "custrecord_l598_tipo_integracion_codigo", join: "custrecord_l598_conf_factura_elec_integr" });
              //NUEVOS CAMPOS PARA INTEGRACION CON SIGE
              const usuarioSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_usuario_sige");
              const passwordSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_password_sige");
              const urlServicioFirmaSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_firma_sige");
              const urlServicioConsultaSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_consult_sige");

              // INICIO - Desencriptar
              if (!l598isEmpty(password)) {
                // const informacionDesencriptada = nlapiDecrypt(password, "aes");
                // ya no se encripta.
                const informacionDesencriptada = password;
                if (!l598isEmpty(informacionDesencriptada)) {
                  password = informacionDesencriptada;
                } else {
                  password = "";
                }
              }
              // FIN - Desencriptar
              if (//TAFACE
                ((middlewareURL.length != 0 || !l598isEmpty(middlewareURL)) && !l598isEmpty(usuario) && !l598isEmpty(password) &&
                  !l598isEmpty(URLRESTSolicitud) && !l598isEmpty(URLRESTActualizacion) && !l598isEmpty(URLRESTEmail) && !l598isEmpty(URLRESTGrabarCabLog) &&
                  !l598isEmpty(URLRESTGrabarDetLog) && !l598isEmpty(cuenta) && rol != null && rol > 0 && !l598isEmpty(margenError) &&
                  !l598isEmpty(nombreSistemaFacturacion) && !l598isEmpty(razonSocial) && !l598isEmpty(RUTEmpresa) &&
                  !l598isEmpty(emailUsuario) && !l598isEmpty(URLGateway) &&
                  !l598isEmpty(URLServicioFirma) && !l598isEmpty(URLServicioConfFirma) && (!l598isEmpty(codTipoIntegracion) && codTipoIntegracion == "TAFACE"))
                || //UCFE
                ((middlewareURL.length != 0 || !l598isEmpty(middlewareURL)) && !l598isEmpty(usuario) && !l598isEmpty(password) &&
                  !l598isEmpty(URLRESTSolicitud) && !l598isEmpty(URLRESTActualizacion) && !l598isEmpty(URLRESTEmail) && !l598isEmpty(URLRESTGrabarCabLog) &&
                  !l598isEmpty(URLRESTGrabarDetLog) && !l598isEmpty(cuenta) && rol != null && rol > 0 && !l598isEmpty(razonSocial) && !l598isEmpty(RUTEmpresa) &&
                  !l598isEmpty(emailUsuario) && !l598isEmpty(codTerminalUCFE) && !l598isEmpty(codComercioUCFE) && !l598isEmpty(URLRestUCFE) &&
                  !l598isEmpty(usuarioUCFE) && !l598isEmpty(passwordUCFE) && (!l598isEmpty(codTipoIntegracion) && codTipoIntegracion == "UCFE"))
                || //SIGE
                ((middlewareURL.length != 0 || !l598isEmpty(middlewareURL)) && !l598isEmpty(usuario) && !l598isEmpty(password) &&
                  !l598isEmpty(URLRESTSolicitud) && !l598isEmpty(URLRESTActualizacion) && !l598isEmpty(URLRESTEmail) && !l598isEmpty(URLRESTGrabarCabLog) &&
                  !l598isEmpty(URLRESTGrabarDetLog) && !l598isEmpty(cuenta) && rol != null && rol > 0 && !l598isEmpty(razonSocial) && !l598isEmpty(RUTEmpresa) &&
                  !l598isEmpty(emailUsuario) && !l598isEmpty(usuarioSIGE) && !l598isEmpty(passwordSIGE) && !l598isEmpty(urlServicioFirmaSIGE) &&
                  !l598isEmpty(urlServicioConsultaSIGE) && (!l598isEmpty(codTipoIntegracion) && codTipoIntegracion == "SIGE"))) {
                const url = middlewareURL;
                const urlSolicitudFinal = encodeURIComponent(URLRESTSolicitud);
                const urlActualizarFinal = encodeURIComponent(URLRESTActualizacion);
                const urlEmailFinal = encodeURIComponent(URLRESTEmail);
                const urlLogCabeceraFinal = encodeURIComponent(URLRESTGrabarCabLog);
                const urlLogDetalleFinal = encodeURIComponent(URLRESTGrabarDetLog);
                const urlGatewayFinal = encodeURIComponent(URLGateway);
                const urlServicioFirmaFinal = encodeURIComponent(URLServicioFirma);
                const urlServicioConfFirmaFinal = encodeURIComponent(URLServicioConfFirma);
                const URLRestUCFEFinal = encodeURIComponent(URLRestUCFE);
                let recId = idTransaccionesProcesar.toString();
                recId = recId.replace(/\s+/g, "");

                const postStr = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
                  "<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
                  "<soap:Body>" +
                  "<URUFESolicitarCAE xmlns=\"http://tempuri.org/\">" +
                  "<idRegistro>" + recId + "</idRegistro>" +
                  "<usuario>" + usuario + "</usuario>" +
                  "<password>" + password + "</password>" +
                  "<cuenta>" + cuenta + "</cuenta>" +
                  "<subsidiaria>" + subsidiaria + "</subsidiaria>" +
                  "<urlSolicitud>" + urlSolicitudFinal + "</urlSolicitud>" +
                  "<urlActualizar>" + urlActualizarFinal + "</urlActualizar>" +
                  "<rol>" + rol + "</rol>" +
                  "<emailUsuario>" + emailUsuario + "</emailUsuario>" +
                  "<urlEmail>" + urlEmailFinal + "</urlEmail>" +
                  "<urlActualizarCabLOG>" + urlLogCabeceraFinal + "</urlActualizarCabLOG>" +
                  "<urlActualizarDetLOG>" + urlLogDetalleFinal + "</urlActualizarDetLOG>" +
                  "<margenError>" + margenError + "</margenError>" +
                  "<tipoNegocio>" + tipoNegocio + "</tipoNegocio>" +
                  "<nomSistFact>" + nombreSistemaFacturacion + "</nomSistFact>" +
                  "<razonSocial>" + razonSocial + "</razonSocial>" +
                  "<RUTEmpresa>" + RUTEmpresa + "</RUTEmpresa>" +
                  "<versionSistFact>" + versionSistFact + "</versionSistFact>" +
                  "<RUCEmisor>" + RUCEmisor + "</RUCEmisor>" +
                  "<razonSocialEmisor>" + razonSocialEmisor + "</razonSocialEmisor>" +
                  "<nomComercialEmisor>" + nomComercialEmisor + "</nomComercialEmisor>" +
                  "<giroNegocioEmisor>" + giroNegocioEmisor + "</giroNegocioEmisor>" +
                  "<correoEmisor>" + correoEmisor + "</correoEmisor>" +
                  "<domicilioEmisor>" + domicilioEmisor + "</domicilioEmisor>" +
                  "<ciudadEmisor>" + ciudadEmisor + "</ciudadEmisor>" +
                  "<departamentoEmisor>" + departamentoEmisor + "</departamentoEmisor>" +
                  "<telefonoEmisor>" + telefonoEmisor + "</telefonoEmisor>" +
                  "<urlGateway>" + urlGatewayFinal + "</urlGateway>" +
                  "<urlServicioFirma>" + urlServicioFirmaFinal + "</urlServicioFirma>" +
                  "<urlServicioConfFirma>" + urlServicioConfFirmaFinal + "</urlServicioConfFirma>" +
                  "<codTerminal>" + codTerminalUCFE + "</codTerminal>" +
                  "<codComercio>" + codComercioUCFE + "</codComercio>" +
                  "<urlRestUCFE>" + URLRestUCFEFinal + "</urlRestUCFE>" +
                  "<usuarioUCFE>" + usuarioUCFE + "</usuarioUCFE>" +
                  "<passwordUCFE>" + passwordUCFE + "</passwordUCFE>" +
                  "<tipoIntegracion>" + codTipoIntegracion + "</tipoIntegracion>" +
                  "<usuarioSIGE>" + usuarioSIGE + "</usuarioSIGE>" +
                  "<passwordSIGE>" + passwordSIGE + "</passwordSIGE>" +
                  "<urlServicioFirmaSIGE>" + urlServicioFirmaSIGE + "</urlServicioFirmaSIGE>" +
                  "<urlServicioConsultaSIGE>" + urlServicioConsultaSIGE + "</urlServicioConsultaSIGE>" +
                  "</URUFESolicitarCAE>" +
                  "</soap:Body>" +
                  "</soap:Envelope>";
                const header = new Array();
                header["Content-Type"] = "text/xml; charset=utf-8";

                const response = http.post({
                  url: url,
                  body: postStr
                });

                log.debug("URU - GENERAR CAE LOTES", `response web services MDW: ${JSON.stringify(response)}`);

                let mensajeAdicional = "";
                let errorEnvio = true;

                if (response != "") {
                  if (response.code == 200) { // OK
                    if (response.body != "") {
                      mensaje = response.body;
                      if (!l598isEmpty(mensaje) && mensaje.length > 0) {
                        const posicionInicialRespuesta = (mensaje.indexOf("-INICIORESPUESTAFE-"));
                        const posicionFinalRespuesta = (mensaje.indexOf("-INICIORESPUESTAFE-"));
                        if (!l598isEmpty(posicionInicialRespuesta) && !isNaN(posicionInicialRespuesta) && parseInt(posicionInicialRespuesta, 10) > 0) {
                          if (!l598isEmpty(posicionFinalRespuesta) && !isNaN(posicionFinalRespuesta) && parseInt(posicionFinalRespuesta, 10) > 0 && posicionFinalRespuesta < mensaje.length) {
                            const error = mensaje[posicionInicialRespuesta + 19];
                            if (!l598isEmpty(error)) {
                              if (error == "N")
                                errorEnvio = false;
                              else {
                                const mensajeAux = mensaje.substr((posicionInicialRespuesta + 21), (posicionFinalRespuesta - (posicionInicialRespuesta + 21)));
                                if (!l598isEmpty(mensajeAux)) {
                                  mensajeAdicional = mensajeAux;
                                } else {
                                  mensajeAdicional = "Error de Conexion Con el Middleware TAFACE";
                                }
                              }
                            } else {
                              mensajeAdicional = "No se recibio informacion del estado de Conexion Con el Middleware TAFACE en la Respuesta";
                            }
                          } else {
                            mensajeAdicional = "No se recibio informacion de Respuesta Final de Conexion Con el Middleware TAFACE";
                          }
                        } else {
                          mensajeAdicional = "No se recibio informacion de Respuesta Inicial de Conexion Con el Middleware TAFACE";
                        }
                      } else {
                        mensajeAdicional = "El cuerpo de la respuesta de Conexion Con el Middleware TAFACE recibida fue vacio";
                      }
                    } else {
                      mensajeAdicional = "No se recibio el cuerpo de la Respuesta de Conexion Con el Middleware TAFACE";
                    }
                  } else {
                    mensajeAdicional = "Error de Conexion Con el Middleware TAFACE - Codigo Error : " + response.code;
                  }
                } else {
                  mensajeAdicional = "No se recibio Respuesta de Conexion Con el Middleware TAFACE";
                }

                if (errorEnvio == true) {
                  mensaje = "Error Conectando con Servicio de Generacion de CAE - ";
                  mensaje = mensaje + mensajeAdicional;
                  log.error("URU - SUITELET Generar CAE", mensaje);
                  idLog = grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
                  mensajeEmail = mensaje;
                }

              } else {
                //No se encuentran Configurados Campos Requeridos del Middleware de Factura Electronica
                mensaje = "No se encuentran Configurados los siguientes Campos Requeridos de la Configuracion del Middleware de Factura Electronica : ";
                if ((middlewareURL.length == 0 || l598isEmpty(middlewareURL)))
                  mensaje = mensaje + "URL del Middleware de Factura Electronica / ";
                if (l598isEmpty(usuario))
                  mensaje = mensaje + "Usuario Para la conexion con el Middleware de Factura Electronica / ";
                if (l598isEmpty(password))
                  mensaje = mensaje + "Password Para la conexion con el Middleware de Factura Electronica / ";
                if (l598isEmpty(emailUsuario))
                  mensaje = mensaje + "Email del Usuario / ";
                if (l598isEmpty(URLRESTSolicitud))
                  mensaje = mensaje + "URL del RestLet utilizado para la Solicitud de las Transacciones / ";
                if (l598isEmpty(URLRESTActualizacion))
                  mensaje = mensaje + "URL del RestLet utilizado para la Actualizacion de las Transacciones / ";
                if (l598isEmpty(URLRESTEmail))
                  mensaje = mensaje + "URL del RestLet utilizado para el Envio del Email de la Finalizacion del Proceso / ";
                if (l598isEmpty(URLRESTGrabarCabLog))
                  mensaje = mensaje + "URL del RestLet utilizado para Grabar la Cabecera del Log / ";
                if (l598isEmpty(URLRESTGrabarDetLog))
                  mensaje = mensaje + "URL del RestLet utilizado para Grabar el Detalle del Log / ";
                if (l598isEmpty(cuenta))
                  mensaje = mensaje + "Cuenta de NetSuite / ";
                if (rol == null || rol == 0)
                  mensaje = mensaje + "Rol del Usuario utilizado Para la conexion con el Middleware de Factura Electronica / ";
                if (l598isEmpty(razonSocial))
                  mensaje = mensaje + "Razon Social de la Empresa / ";
                if (l598isEmpty(RUTEmpresa))
                  mensaje = mensaje + "RUT de la Empresa / ";
                if (l598isEmpty(codTipoIntegracion))
                  mensaje = mensaje + "Tipo de Integración / ";
                if (codTipoIntegracion == "TAFACE") {
                  if (l598isEmpty(margenError))
                    mensaje = mensaje + "Monto de Margen de Error Permitido para enviar la Transaccion a la DGI / ";
                  if (l598isEmpty(nombreSistemaFacturacion))
                    mensaje = mensaje + "Nombre del Sistema de Facturacion / ";
                  if (l598isEmpty(URLGateway))
                    mensaje = mensaje + "Direccion URL del Gateway TAFACE / ";
                  if (l598isEmpty(URLServicioFirma))
                    mensaje = mensaje + "Direccion URL del WebService de Firma de Comprobantes TAFACE / ";
                  if (l598isEmpty(URLServicioConfFirma))
                    mensaje = mensaje + "Direccion URL del WebService de Confirmacion de Firma de Comprobantes TAFACE / ";
                }
                //NUEVOS CAMPOS PARA INTEGRACION CON UCFE
                if (codTipoIntegracion == "UCFE") {
                  if (l598isEmpty(codTerminalUCFE))
                    mensaje = mensaje + "Codigo Terminal UCFE / ";
                  if (l598isEmpty(codComercioUCFE))
                    mensaje = mensaje + "Codigo Comercio UCFE / ";
                  if (l598isEmpty(URLRestUCFE))
                    mensaje = mensaje + "Direccion URL servicio REST UCFE / ";
                  if (l598isEmpty(usuarioUCFE))
                    mensaje = mensaje + "Usuario UCFE / ";
                  if (l598isEmpty(passwordUCFE))
                    mensaje = mensaje + "Password UCFE / ";
                }
                if (codTipoIntegracion == "SIGE") {
                  if (l598isEmpty(urlServicioFirmaSIGE))
                    mensaje = mensaje + "Direccion URL servicio Firma Comprobante SIGE / ";
                  if (l598isEmpty(urlServicioConsultaSIGE))
                    mensaje = mensaje + "Direccion URL servicio Consulta Comprobante SIGE / ";
                  if (l598isEmpty(usuarioSIGE))
                    mensaje = mensaje + "Usuario SIGE / ";
                  if (l598isEmpty(passwordSIGE))
                    mensaje = mensaje + "Password SIGE / ";
                }
                log.error("URU - SUITELET Generar CAE", mensaje);
                idLog = grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
                mensajeEmail = mensaje;
              }
            } else {
              //No Se Encuentra configurado el Middleware de Factura Electronica
              mensaje = "No Se Encuentra configurado el Middleware de Factura Electronica";
              if (!l598isEmpty(subsidiaria))
                mensaje = mensaje + " para la Subsidiaria con ID Interno : " + subsidiaria;
              log.error("URU - SUITELET Generar CAE", mensaje);
              idLog = grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
              mensajeEmail = mensaje;
            }
          } else {
            // Solo Grabo LOG si no es la Ejecución Automatica
            const ejecucionAutomatica = currentScript.getParameter("custscript_l598_automatico_v2");
            if (ejecucionAutomatica != "T" || ejecucionAutomatica !== true) {
              mensaje = "No se Encontraron Transacciones A Procesar";
              log.error("URU - SUITELET Generar CAE", mensaje);
              idLog = grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
              mensajeEmail = mensaje;
            }
          }
        }
      } catch (e) {
        const mensaje = "Excepcion Invocando al Middleware TA-FACE para en Envio de las Transacciones A Procesar - Excepcion : " + e.message;
        log.error("URU - SUITELET Generar CAE", mensaje);
        idLog = grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
        mensajeEmail = mensaje;
      }
      if (!l598isEmpty(idLog)) {
        enviarEmail(mensajeEmail, idUserEmail, subsidiaria, idLog);
      }
      log.debug("URU - SUITELET Generar CAE", "FIN SCRIPT PROGRAMADO - Params:" + currentScript.getParameter("custscript_l598_info_transacciones_v2"));
    }


    return {
      execute: execute
    };
  });