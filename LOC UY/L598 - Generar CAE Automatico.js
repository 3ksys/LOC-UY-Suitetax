/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/log", "L598/utilities", "N/format", "N/search", "N/record", "N/runtime", "N/http"],
  /* global define log*/
  function (Log, Utilities, Format, Search, Record, Runtime, Http) {

    function obtenerInformacionRT(idRecordType, arrayIDFiltroCampo, arrayComparacionFiltroCampo, arrayValorFiltroCampo, arrayIDColumna, considerarFiltroInactivo, filtroInactivo) {

      const infoResultado = {
        error: false,
        descripcionError: "",
        informacion: []
      };

      let indiceInformacion = 0;


      // eslint-disable-next-line no-magic-numbers
      if (!Utilities.isEmpty(idRecordType) && arrayIDColumna != null && arrayIDColumna.length > 0) {
        const filtros = new Array();
        let valorInactivo;
        if (considerarFiltroInactivo == true) {
          valorInactivo = false;
          if (filtroInactivo == true) {
            valorInactivo = true;
          }

          filtros.push({
            name: "isinactive",
            operator: "is",
            values: valorInactivo
          });
        }

        if (arrayIDFiltroCampo != null && arrayIDFiltroCampo.length > 0 && arrayValorFiltroCampo != null && arrayValorFiltroCampo.length > 0 && arrayComparacionFiltroCampo != null && arrayComparacionFiltroCampo.length > 0) {
          if (arrayIDFiltroCampo.length == arrayValorFiltroCampo.length && arrayValorFiltroCampo.length == arrayComparacionFiltroCampo.length) {
            for (let contFiltros = 0; contFiltros < arrayIDFiltroCampo.length; contFiltros++) {
              if (!Utilities.isEmpty(arrayIDFiltroCampo[contFiltros]) && !Utilities.isEmpty(arrayComparacionFiltroCampo[contFiltros]) && !Utilities.isEmpty(arrayValorFiltroCampo[contFiltros])) {
                filtros.push({
                  name: arrayIDFiltroCampo[contFiltros],
                  operator: arrayComparacionFiltroCampo[contFiltros],
                  values: arrayValorFiltroCampo[contFiltros]
                });
              }

            }
          } else {
            infoResultado.error = true;
            infoResultado.descripcionError = "Contenido de Array de Filtros Invalido";
          }
        }

        if (infoResultado.error == false) {

          //arrayIDColumna

          const saveSearch = Search.create({
            type: idRecordType,
            columns: arrayIDColumna,
            filters: filtros
          });

          const resultados = saveSearch.run().getRange({
            start: 0,
            end: 1,
          });

          if (resultados != null && resultados.length > 0) {
            for (let contColumnas = 0; contColumnas < arrayIDFiltroCampo.length; contColumnas++) {
              infoResultado.informacion[indiceInformacion++] = resultados[0].getValue(arrayIDColumna[contColumnas]);
            }
          }
        }
      } else {
        infoResultado.error = true;
        infoResultado.descripcionError = "Faltan Parametros Requeridos";
      }
      return infoResultado;
    }

    function grabarError(codigoEstado, codigoMensaje, detalleMensaje, puntoVenta, tipoComprobante, refLog, refTransaccion) {
      //nlapiLogExecution('ERROR', 'URU - Grabar LOG', 'INICIO PROCESO');
      try {

        let idRL = refLog;
        const fechaFinal = Format.format({ value: new Date(), type: Format.Type.DATETIMETZ, timezone: Format.Timezone.AMERICA_BUENOS_AIRES });
        if (Utilities.isEmpty(idRL)) {

          const recordLog = Record.create({
            type: "customrecord_l598_fact_elec_log"
          });


          recordLog.setValue({
            fieldId: "custrecord_l598_fact_elec_log_fecha",
            value: fechaFinal
          });


          if (!Utilities.isEmpty(codigoEstado)) {
            const codigoInternoEstado = obtenerInformacionRT("customrecord_l598_fe_est_log", ["custrecord_l598_fe_est_log_codigo"], ["is"], [codigoEstado], ["internalid"], true, false);
            if (codigoInternoEstado != null && codigoInternoEstado.error == false && !Utilities.isEmpty(codigoInternoEstado.informacion)) {
              recordLog.setValue({
                fieldId: "custrecord_l598_fact_elec_log_estado",
                value: codigoInternoEstado.informacion[0]
              });
            }
          }

          if (!Utilities.isEmpty(puntoVenta))
            recordLog.setValue({
              fieldId: "custrecord_l598_fact_elec_log_pv",
              value: puntoVenta
            });

          if (!Utilities.isEmpty(tipoComprobante))
            recordLog.setValue({
              fieldId: "custrecord_l598_fact_elec_log_tipo_comp",
              value: tipoComprobante
            });
          idRL = recordLog.save();
        }

        if (!Utilities.isEmpty(idRL)) {
          // Grabo el Detalle
          const recordDetalleLog = Record.create({
            type: "customrecord_l598_fact_elec_dlog"
          });

          recordDetalleLog.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_fecha", value: fechaFinal });

          if (!Utilities.isEmpty(codigoMensaje)) {
            const codigoInternoMensaje = obtenerInformacionRT("customrecord_l598_msg_log", ["custrecord_l598_msg_log_codigo"], ["is"], [codigoMensaje], ["internalid"], true, false);
            if (codigoInternoMensaje != null && codigoInternoMensaje.error == false && !Utilities.isEmpty(codigoInternoMensaje.informacion)) {
              recordDetalleLog.setValue({
                fieldId: "custrecord_l598_fact_elec_dlog_msg",
                value: codigoInternoMensaje.informacion[0]
              });
            }
          }

          if (!Utilities.isEmpty(detalleMensaje)) {
            recordDetalleLog.setValue({
              fieldId: "custrecord_l598_fact_elec_dlog_det",
              value: detalleMensaje
            });
          }
          if (!Utilities.isEmpty(idRL))
            recordDetalleLog.setValue({
              fieldId: "custrecord_l598_fact_elec_dlog_rlog",
              value: idRL
            });

          if (!Utilities.isEmpty(refTransaccion))
            recordDetalleLog.setValue({
              fieldId: "custrecord_l598_fact_elec_dlog_rtrans",
              value: refTransaccion
            });

          const _idRDL = recordDetalleLog.save();
        }
      } catch (excepcion) {
        Log.error("URU - Grabar LOG", "Excepcion Grabando Log de Proceso de Factura Electronica - Excepcion : " + excepcion.message);
      }
      //nlapiLogExecution('ERROR', 'URU - Grabar LOG', 'FIN PROCESO');
    }

    /**Funcion encargada de Generar el CAE de la Transaccion, luego de guardar la transaccion
     * Esta funcion tiene un archivo que clona el mismo comportamiento pero para ser usada desde el lado de cliente
     * ver mas en el archivo L598 - Generar CAE (cliente).js
     * @param {scriptContext} scriptContext 
     */
    function generar_cae(scriptContext) {


      const codigoEstadoError = "FESTADO-2";
      const tipoMensaje = "FMSJ-3";
      let mensaje = "";
      const punto_venta = "";
      const tipoTransacción = "";
      const refLog = "";
      let refTransaccion = "";

      const type = scriptContext.type;
      // la variable confirmacion, esta para mostrar alerts, esto solo es importante para el script que ejecuta
      // esta misma funcion, pero del lado del cliente.
      // ver mas en el archivo L598 - Generar CAE (cliente).js
      const confirmacion = false;

      try {
        if (type == "edit" || type == "create") {
          Log.audit("URU - Generar CAE MANUAL", "INICIO PROCESO");
          // variable no utilizada.
          const _conceptoGenerado = false;


          // Obtengo Punto de Venta y Letra de Transaccion

          //var servicio='CAE';
          const objRecord = scriptContext.newRecord;
          const recId = objRecord.id;
          const recType = objRecord.type;


          refTransaccion = recId;

          //Obtengo Usuario para Enviar Email
          let usuarioEmail = Runtime.getCurrentUser().email;
          if (Utilities.isEmpty(usuarioEmail)) {
            usuarioEmail = "";
          }

          if (!Utilities.isEmpty(recType) && !Utilities.isEmpty(recId)) {

            const camposTransaccion = ["custbody_l598_cae", "custbody_l598_serie_comprobante", "custbody_l598_sucursal", "custbody_l598_nd", "custbody_l598_tipo_comprobante", "custbody_l598_cod_tipo_comprobante"];
            if (Utilities.l598esOneworld()) {
              camposTransaccion.push("subsidiary");
            }
            const resultadoTransaccion = Search.lookupFields({
              type: recType,
              id: recId,
              columns: camposTransaccion
            });


            if (Utilities.isEmpty(Utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_cae"))) {
              const serie = Utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_serie_comprobante", false); // se quiere el text, no el value
              const sucursal = Utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_sucursal", false); // se quiere el text, no el value
              // const esNotaDebito = resultadoTransaccion.custbody_l598_nd;
              const tipoComprobante = Utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_tipo_comprobante");

              if (!Utilities.isEmpty(serie) && !Utilities.isEmpty(sucursal) && !Utilities.isEmpty(tipoComprobante)) {

                // Obtengo la subsidiaria
                let subsidiaria = "";
                if (Utilities.l598esOneworld()) {
                  subsidiaria = Utilities.getLookupFieldsSafe(resultadoTransaccion, "subsidiary");
                  if (Utilities.isEmpty(subsidiaria)) // Si no completo la Subsidiaria, envio sin Subsidiaria
                    subsidiaria = "";
                }

                const idTransaccionURU = Utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_cod_tipo_comprobante");

                if (idTransaccionURU != null && idTransaccionURU > 0) {

                  // Busco el Usuario y Password  y URL del Middleware de la Configuracion, el cual se utilizara para Buscar informacion en NetSuite.

                  const columnaConfiguracion = ["custrecord_l598_conf_fe_link", "custrecord_l598_conf_fe_usuario",
                    "custrecord_l598_conf_fe_pasw_encriptada", "custrecord_l598_conf_fe_url_r_solicitud",
                    "custrecord_l598_conf_fe_url_r_actualizar", "custrecord_l598_conf_fe_url_r_env_email",
                    "custrecord_l598_conf_fe_url_r_cab_log", "custrecord_l598_conf_fe_url_r_det_log",
                    "custrecord_l598_conf_fe_generar_cae_auto", "custrecord_l598_conf_fe_rol",
                    "custrecord_l598_conf_fe_margen_error_mon", "custrecord_l598_conf_fe_nom_sist_fact",
                    "custrecord_l598_conf_fe_razon_social", "custrecord_l598_conf_fe_ruc_empresa",
                    "custrecord_l598_conf_fe_cuenta", "custrecord_l598_conf_fe_tipo_negocio",
                    "custrecord_l598_conf_fe_ver_sist_fact", "custrecord_l598_conf_fe_ruc_emisor",
                    "custrecord_l598_conf_fe_r_social_emisor", "custrecord_l598_conf_fe_nom_comercial",
                    "custrecord_l598_conf_fe_giro_negocio", "custrecord_l598_conf_fe_correo_elec",
                    "custrecord_l598_conf_fe_domicilio_fiscal", "custrecord_l598_conf_fe_ciudad",
                    "custrecord_l598_conf_fe_departamento", "custrecord_l598_conf_fe_url_gateway",
                    "custrecord_l598_conf_fe_serv_firma_comp", "custrecord_l598_conf_fe_url_serv_c_firma",
                    "custrecord_l598_conf_fe_telefono", "custrecord_l598_conf_fe_cod_terminal",
                    "custrecord_l598_conf_fe_cod_comercio", "custrecord_l598_conf_fe_url_rest",
                    "custrecord_l598_conf_fe_usuario_ucfe", "custrecord_l598_conf_fe_password_ucfe",
                    "custrecord_l598_conf_fe_usuario_sige", "custrecord_l598_conf_fe_password_sige",
                    "custrecord_l598_conf_fe_url_firma_sige", "custrecord_l598_conf_fe_url_consult_sige",
                    Search.createColumn({
                      name: "custrecord_l598_tipo_integracion_codigo",
                      join: "custrecord_l598_conf_factura_elec_integr"
                    })
                  ];

                  const filtroConfiguracion = new Array();
                  filtroConfiguracion.push({
                    name: "isinactive",
                    operator: "is",
                    values: false
                  });
                  if (!Utilities.isEmpty(subsidiaria))
                    filtroConfiguracion.push({
                      name: "custrecord_l598_conf_fe_subsidiaria",
                      operator: "is",
                      values: subsidiaria
                    });

                  const saveSearch = Search.create({
                    type: "customrecord_l598_conf_factura_elec",
                    columns: columnaConfiguracion,
                    filters: filtroConfiguracion
                  });

                  const resultadoConfiguracion = saveSearch.run().getRange({
                    start: 0,
                    end: 1,
                  });

                  if (!Utilities.isEmpty(resultadoConfiguracion) && resultadoConfiguracion.length > 0) {
                    const middlewareURL = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_link");
                    const usuario = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_usuario");
                    let password = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_pasw_encriptada");
                    const URLRESTSolicitud = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_solicitud");
                    const URLRESTActualizacion = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_actualizar");
                    const URLRESTEmail = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_env_email");
                    const URLRESTGrabarCabLog = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_cab_log");
                    const URLRESTGrabarDetLog = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_r_det_log");
                    const generarCaeAutomatico = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_generar_cae_auto");
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
                    const codTipoIntegracion = resultadoConfiguracion[0].getValue({
                      name: "custrecord_l598_tipo_integracion_codigo",
                      join: "custrecord_l598_conf_factura_elec_integr"
                    });
                    //NUEVOS CAMPOS PARA INTEGRACION CON SIGE
                    const usuarioSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_usuario_sige");
                    const passwordSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_password_sige");
                    const urlServicioFirmaSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_firma_sige");
                    const urlServicioConsultaSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_consult_sige");

                    log.debug("generarCAEAutomatico", `usuario: ${usuario} / password: ${password}`);

                    // INICIO - Desencriptar
                    if (!Utilities.isEmpty(password)) {
                      // const informacionDesencriptada = nlapiDecrypt(password, "aes");
                      // ya no se encripta.
                      const informacionDesencriptada = password;
                      if (!Utilities.isEmpty(informacionDesencriptada)) {
                        password = informacionDesencriptada;
                      } else {
                        password = "";
                      }
                    }
                    // FIN - Desencriptar
                    //VALIDACION CUANDO LA INTEGRACION ES CON TAFACE
                    if (((middlewareURL.length != 0 || !Utilities.isEmpty(middlewareURL)) && !Utilities.isEmpty(usuario) && !Utilities.isEmpty(password) &&
                      !Utilities.isEmpty(URLRESTSolicitud) && !Utilities.isEmpty(URLRESTActualizacion) && !Utilities.isEmpty(URLRESTEmail) && !Utilities.isEmpty(URLRESTGrabarCabLog) &&
                      !Utilities.isEmpty(URLRESTGrabarDetLog) && !Utilities.isEmpty(cuenta) && rol != null && rol > 0 && !Utilities.isEmpty(margenError) &&
                      !Utilities.isEmpty(nombreSistemaFacturacion) && !Utilities.isEmpty(razonSocial) && !Utilities.isEmpty(RUTEmpresa) &&
                      !Utilities.isEmpty(usuarioEmail) && !Utilities.isEmpty(URLGateway) &&
                      !Utilities.isEmpty(URLServicioFirma) && !Utilities.isEmpty(URLServicioConfFirma) && (!Utilities.isEmpty(codTipoIntegracion) && codTipoIntegracion == "TAFACE"))
                      ||//VALIDACION CUANDO LA INTEGRACION ES CON UCFE
                      ((middlewareURL.length != 0 || !Utilities.isEmpty(middlewareURL)) && !Utilities.isEmpty(usuario) && !Utilities.isEmpty(password) &&
                        !Utilities.isEmpty(URLRESTSolicitud) && !Utilities.isEmpty(URLRESTActualizacion) && !Utilities.isEmpty(URLRESTEmail) && !Utilities.isEmpty(URLRESTGrabarCabLog) &&
                        !Utilities.isEmpty(URLRESTGrabarDetLog) && !Utilities.isEmpty(cuenta) && rol != null && rol > 0 && !Utilities.isEmpty(razonSocial) && !Utilities.isEmpty(RUTEmpresa) &&
                        !Utilities.isEmpty(usuarioEmail) && !Utilities.isEmpty(codTerminalUCFE) && !Utilities.isEmpty(codComercioUCFE) && !Utilities.isEmpty(URLRestUCFE) &&
                        !Utilities.isEmpty(usuarioUCFE) && !Utilities.isEmpty(passwordUCFE) && (!Utilities.isEmpty(codTipoIntegracion) && codTipoIntegracion == "UCFE"))
                      ||//VALIDACION CUANDO LA INTEGRACION ES CON SIGE
                      ((middlewareURL.length != 0 || !Utilities.isEmpty(middlewareURL)) && !Utilities.isEmpty(usuario) && !Utilities.isEmpty(password) &&
                        !Utilities.isEmpty(URLRESTSolicitud) && !Utilities.isEmpty(URLRESTActualizacion) && !Utilities.isEmpty(URLRESTEmail) && !Utilities.isEmpty(URLRESTGrabarCabLog) &&
                        !Utilities.isEmpty(URLRESTGrabarDetLog) && !Utilities.isEmpty(cuenta) && rol != null && rol > 0 && !Utilities.isEmpty(razonSocial) && !Utilities.isEmpty(RUTEmpresa) &&
                        !Utilities.isEmpty(usuarioEmail) && !Utilities.isEmpty(urlServicioFirmaSIGE) && !Utilities.isEmpty(urlServicioConsultaSIGE) &&
                        !Utilities.isEmpty(usuarioSIGE) && !Utilities.isEmpty(passwordSIGE) && (!Utilities.isEmpty(codTipoIntegracion) && codTipoIntegracion == "SIGE"))
                    ) {
                      if (generarCaeAutomatico === true || generarCaeAutomatico == "T") {

                        const url = middlewareURL;

                        let urlSolicitudFinal = null;
                        let urlActualizarFinal = null;
                        let urlEmailFinal = null;
                        let urlLogCabeceraFinal = null;
                        let urlLogDetalleFinal = null;
                        let postStr = null;
                        let URLRestUCFEFinal = null;

                        urlSolicitudFinal = encodeURIComponent(URLRESTSolicitud);
                        urlActualizarFinal = encodeURIComponent(URLRESTActualizacion);
                        urlEmailFinal = encodeURIComponent(URLRESTEmail);
                        urlLogCabeceraFinal = encodeURIComponent(URLRESTGrabarCabLog);
                        urlLogDetalleFinal = encodeURIComponent(URLRESTGrabarDetLog);
                        const urlGatewayFinal = encodeURIComponent(URLGateway);
                        const urlServicioFirmaFinal = encodeURIComponent(URLServicioFirma);
                        const urlServicioConfFirmaFinal = encodeURIComponent(URLServicioConfFirma);
                        URLRestUCFEFinal = encodeURIComponent(URLRestUCFE);

                        postStr = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
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
                          "<emailUsuario>" + usuarioEmail + "</emailUsuario>" +
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

                        const response = Http.post({
                          url: url,
                          body: postStr
                        });


                        let mensajeAdicional = "";
                        let errorEnvio = true;

                        if (response != "") {
                          const HTTP_OK_RESPONSE = 200;
                          if (response.code == HTTP_OK_RESPONSE) { // OK

                            mensaje = response.body;

                            if (!Utilities.isEmpty(mensaje) && mensaje.length > 0) {

                              const posicionInicialRespuesta = (mensaje.indexOf("-INICIORESPUESTAFE-"));
                              const posicionFinalRespuesta = (mensaje.indexOf("-FINRESPUESTAFE-"));

                              if (!Utilities.isEmpty(posicionInicialRespuesta) && !isNaN(posicionInicialRespuesta) && parseInt(posicionInicialRespuesta, 10) > 0) {

                                if (!Utilities.isEmpty(posicionFinalRespuesta) && !isNaN(posicionFinalRespuesta) && parseInt(posicionFinalRespuesta, 10) > 0 && posicionFinalRespuesta < mensaje.length) {
                                  // 19 caracteres despues de posicionInicialRespuesta contiene un CHAR con N (no error...)
                                  const error = mensaje[posicionInicialRespuesta + 19];

                                  if (!Utilities.isEmpty(error)) {
                                    if (error == "N")
                                      errorEnvio = false;
                                    else {
                                      // lo mismo que el de arriba.
                                      const mensajeAux = mensaje.substr((posicionInicialRespuesta + 21), (posicionFinalRespuesta - (posicionInicialRespuesta + 21)));
                                      if (!Utilities.isEmpty(mensajeAux)) {
                                        mensajeAdicional = mensajeAux;
                                      } else {
                                        mensajeAdicional = "Error de Conexion Con el Middleware de Factura Electronica";
                                      }
                                    }
                                  } else {
                                    mensajeAdicional = "No se recibio informacion del estado de Conexion Con el Middleware de Factura Electronica en la Respuesta";
                                  }
                                } else {
                                  mensajeAdicional = "No se recibio informacion de Respuesta Final de Conexion Con el Middleware de Factura Electronica";
                                }
                              } else {
                                mensajeAdicional = "No se recibio informacion de Respuesta Inicial de Conexion Con el Middleware de Factura Electronica";
                              }
                            } else {
                              mensajeAdicional = "El cuerpo de la respuesta de Conexion Con el Middleware de Factura Electronica recibida fue vacio";
                            }

                          } else {
                            mensajeAdicional = "Error de Conexion Con el Middleware de Factura Electronica - Codigo Error : " + response.getCode();
                          }
                        } else {
                          mensajeAdicional = "No se recibio Respuesta de Conexion Con el Middleware de Factura Electronica";
                        }

                        if (errorEnvio == true) {
                          mensaje = "Error Conectando con Servicio de Generacion de CAE - ";
                          mensaje = mensaje + mensajeAdicional;
                          Log.error("URU - Generar CAE", mensaje);

                          if (confirmacion) {
                            alert(mensaje);
                          }
                          grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);

                        }
                      }
                    } else {
                      //No se encuentran Configurados Campos Requeridos del Middleware de Factura Electronica
                      mensaje = "No se encuentran Configurados los siguientes Campos Requeridos de la Configuracion del Middleware de Factura Electronica : ";

                      if ((middlewareURL.length == 0 || Utilities.isEmpty(middlewareURL)))
                        mensaje = mensaje + "URL del Middleware de Factura Electronica / ";
                      if (Utilities.isEmpty(usuario))
                        mensaje = mensaje + "Usuario Para la conexion con el Middleware de Factura Electronica / ";
                      if (Utilities.isEmpty(password))
                        mensaje = mensaje + "Password Para la conexion con el Middleware de Factura Electronica / ";
                      if (Utilities.isEmpty(usuarioEmail))
                        mensaje = mensaje + "Email del Usuario / ";
                      if (Utilities.isEmpty(URLRESTSolicitud))
                        mensaje = mensaje + "URL del RestLet utilizado para la Solicitud de las Transacciones / ";
                      if (Utilities.isEmpty(URLRESTActualizacion))
                        mensaje = mensaje + "URL del RestLet utilizado para la Actualizacion de las Transacciones / ";
                      if (Utilities.isEmpty(URLRESTEmail))
                        mensaje = mensaje + "URL del RestLet utilizado para el Envio del Email de la Finalizacion del Proceso / ";
                      if (Utilities.isEmpty(URLRESTGrabarCabLog))
                        mensaje = mensaje + "URL del RestLet utilizado para Grabar la Cabecera del Log / ";
                      if (Utilities.isEmpty(URLRESTGrabarDetLog))
                        mensaje = mensaje + "URL del RestLet utilizado para Grabar el Detalle del Log / ";
                      if (Utilities.isEmpty(cuenta))
                        mensaje = mensaje + "Cuenta de NetSuite / ";
                      if (rol == null || rol == 0)
                        mensaje = mensaje + "Rol del Usuario utilizado Para la conexion con el Middleware de Factura Electronica / ";
                      if (Utilities.isEmpty(razonSocial))
                        mensaje = mensaje + "Razon Social de la Empresa / ";
                      if (Utilities.isEmpty(RUTEmpresa))
                        mensaje = mensaje + "RUT de la Empresa / ";
                      if (Utilities.isEmpty(codTipoIntegracion))
                        mensaje = mensaje + "Tipo de Integración / ";
                      if (codTipoIntegracion == "TAFACE") {
                        if (Utilities.isEmpty(margenError))
                          mensaje = mensaje + "Monto de Margen de Error Permitido para enviar la Transaccion a la DGI / ";
                        if (Utilities.isEmpty(nombreSistemaFacturacion))
                          mensaje = mensaje + "Nombre del Sistema de Facturacion / ";
                        if (Utilities.isEmpty(URLGateway))
                          mensaje = mensaje + "Direccion URL del Gateway TAFACE / ";
                        if (Utilities.isEmpty(URLServicioFirma))
                          mensaje = mensaje + "Direccion URL del WebService de Firma de Comprobantes TAFACE / ";
                        if (Utilities.isEmpty(URLServicioConfFirma))
                          mensaje = mensaje + "Direccion URL del WebService de Confirmacion de Firma de Comprobantes TAFACE / ";
                      }
                      //NUEVOS CAMPOS PARA INTEGRACION CON UCFE
                      if (codTipoIntegracion == "UCFE") {
                        if (Utilities.isEmpty(codTerminalUCFE))
                          mensaje = mensaje + "Codigo Terminal UCFE / ";
                        if (Utilities.isEmpty(codComercioUCFE))
                          mensaje = mensaje + "Codigo Comercio UCFE / ";
                        if (Utilities.isEmpty(URLRestUCFE))
                          mensaje = mensaje + "Direccion URL servicio REST UCFE / ";
                        if (Utilities.isEmpty(usuarioUCFE))
                          mensaje = mensaje + "Usuario UCFE / ";
                        if (Utilities.isEmpty(passwordUCFE))
                          mensaje = mensaje + "Password UCFE / ";
                      }
                      if (codTipoIntegracion == "SIGE") {
                        if (Utilities.isEmpty(urlServicioFirmaSIGE))
                          mensaje = mensaje + "Direccion URL servicio Firma Comprobante SIGE / ";
                        if (Utilities.isEmpty(urlServicioConsultaSIGE))
                          mensaje = mensaje + "Direccion URL servicio Consulta Comprobante SIGE / ";
                        if (Utilities.isEmpty(usuarioSIGE))
                          mensaje = mensaje + "Usuario SIGE / ";
                        if (Utilities.isEmpty(passwordSIGE))
                          mensaje = mensaje + "Password SIGE / ";
                      }
                      Log.error("URU - Generar CAE", mensaje);
                      if (confirmacion) {
                        alert(mensaje);
                      }
                      grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
                    }
                  } else {
                    //No Se Encuentra configurado el Middleware de Factura Electronica
                    mensaje = "No Se Encuentra configurado el Middleware de Factura Electronica";
                    if (!Utilities.isEmpty(subsidiaria))
                      mensaje = mensaje + " para la Subsidiaria con ID Interno : " + subsidiaria;
                    Log.error("URU - Generar CAE", mensaje);
                    if (confirmacion) {
                      alert(mensaje);
                    }
                    grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
                  }
                } else {
                  // Falta Configurar ID Transaccion URUGUAY en la Transaccion
                  mensaje = "Falta Configurar el ID de Transaccion Electronica en la Transaccion";
                  Log.error("URU - Generar CAE", mensaje);
                  if (confirmacion) {
                    alert(mensaje);
                  }
                  grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
                }

              } else {
                // Falta Serie, Sucursal, Tipo de Comprobante DGI
                mensaje = "Falta Configurar la Siguiente Informacion : ";
                if (Utilities.isEmpty(serie)) {
                  mensaje = mensaje + "Serie , ";
                }
                if (Utilities.isEmpty(sucursal)) {
                  mensaje = mensaje + "Sucursal , ";
                }
                if (Utilities.isEmpty(tipoComprobante)) {
                  mensaje = mensaje + "Tipo de Comprobante DGI , ";
                }
                mensaje = mensaje + "Para la Transaccion con ID Interno : " + recId;

                Log.error("URU - Generar CAE", mensaje);
                if (confirmacion) {
                  alert(mensaje);
                }
                grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
              }

            } else {
              Log.debug("URU - Generar CAE", "El documento seleccionado ya dispone de CAE");

            }
          } else {
            mensaje = "Error Obteniendo la siguiente informacion de la Transaccion : ";
            if (Utilities.isEmpty(recType)) {
              mensaje = mensaje + "Tipo de Transaccion , ";
            }
            if (Utilities.isEmpty(recId)) {
              mensaje = mensaje + "ID Interno de la Transaccion , ";
            }
            Log.error("URU - Generar CAE", mensaje);
            if (confirmacion) {
              alert(mensaje);
            }
            grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
          }
        }
      } catch (ex) {
        mensaje = "Excepcion General Generando CAE para la Transaccion - Excepcion : " + ex.message;
        Log.error("URU - Generar CAE", mensaje);
        if (confirmacion) {
          alert(mensaje);
        }
        Log.error("excepcion log", "e=" + JSON.stringify(ex));
        grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
      }

      Log.audit("URU - Generar CAE MANUAL", "FIN PROCESO");
    }


    return {
      afterSubmit: generar_cae,
    };
  });


