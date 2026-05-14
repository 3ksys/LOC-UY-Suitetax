/**
 *@NApiVersion 2.1
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
define(["N/log", "N/record", "N/search", "N/format", "L598/utilities"], function (log, record, search, format, utilities) {
  /* global define */
  /**
   * Migrado desde L598-FacturaElectronica.js solo las funciones dependientes de generarBotonCAE
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

    return false;
  }

  function l598esOneworld() {
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
                operator: search.Operator.arrayComparacionFiltroCampo[contFiltros],
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
          columnas.push(search.createColumn(arrayIDColumna[contColumnas]));
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

  function grabarError(codigoEstado, codigoMensaje, detalleMensaje, puntoVenta, tipoComprobante, refLog, refTransaccion) {
    //nlapiLogExecution('ERROR', 'URU - Grabar LOG', 'INICIO PROCESO');
    try {
      let idRL = refLog;
      const fechaFinal = format.format({ value: new Date(), type: format.Type.DATETIMETZ, timezone: format.Timezone.AMERICA_BUENOS_AIRES });
      if (l598isEmpty(idRL)) {
        const recordLog = record.create({ type: "customrecord_l598_fact_elec_log" });

        recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_fecha", value: fechaFinal });

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

        recordDetalleLog.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_fecha", value: fechaFinal });

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
      log.error("URU - Grabar LOG", "e=" + JSON.stringify(excepcion));
    }
  }

  /*
     * Función generarBotonCAE
     */
  function beforeLoad(context) {

    const objRecord = context.newRecord;

    log.audit("URU - Agregar Boton Generar CAE", "INICIO PROCESO - type: " + context.type);
    const codigoEstadoError = "FESTADO-2";
    const tipoMensaje = "FMSJ-2";
    const punto_venta = "";
    const tipoTransacción = "";
    const refLog = "";
    let refTransaccion = "";


    if (context.type == context.UserEventType.VIEW) {

      try {
        // Obtengo Punto de Venta y Letra de Transaccion
        const recId = objRecord.id;
        const recType = objRecord.type;
        let esResguardo_anulacion = false;

        refTransaccion = recId;

        if (!l598isEmpty(recType) && !l598isEmpty(recId)) {

          let camposTransaccion = ["custbody_l598_cae", "custbody_l598_serie_comprobante", "custbody_l598_sucursal", "custbody_l598_nd", "custbody_l598_tipo_comprobante", "custbody_l598_cod_tipo_comprobante", "custbody_l598_link_uru_resguardo", "custbody_l598_resguardo_anulacion"];

          if (l598esOneworld()) {
            camposTransaccion = ["custbody_l598_cae", "custbody_l598_serie_comprobante", "custbody_l598_sucursal", "custbody_l598_nd", "custbody_l598_tipo_comprobante", "subsidiary", "custbody_l598_cod_tipo_comprobante", "custbody_l598_link_uru_resguardo", "custbody_l598_resguardo_anulacion"];
          }

          const resultadoTransaccion = search.lookupFields({
            type: recType,
            id: recId,
            columns: camposTransaccion
          });
          log.debug("before lookupfieldSafe", JSON.stringify(resultadoTransaccion));
          if (l598isEmpty(utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_cae"))) {
            const serie = utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_serie_comprobante");
            const sucursal = utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_sucursal");
            // const esNotaDebito = resultadoTransaccion.custbody_l598_nd;
            const tipoComprobante = utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_tipo_comprobante");
            const link_uru_resguardo = utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_link_uru_resguardo");
            esResguardo_anulacion = utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_resguardo_anulacion");

            log.debug("beforeload getLookupFieldsSafe", JSON.stringify([serie, sucursal, tipoComprobante, link_uru_resguardo, esResguardo_anulacion]));

            if (!l598isEmpty(serie) && !l598isEmpty(sucursal) && !l598isEmpty(tipoComprobante)) {

              // Obtengo la subsidiaria
              let subsidiaria = "";
              if (l598esOneworld()) {
                subsidiaria = utilities.getLookupFieldsSafe(resultadoTransaccion, "subsidiary");
                if (l598isEmpty(subsidiaria)) // Si no completo la Subsidiaria, envio sin Subsidiaria
                  subsidiaria = "";
              }

              // Busco el ID de Transaccion de AFIP
              const idTransaccionURU = utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_cod_tipo_comprobante");

              log.debug("beforeload getLookupFieldsSafe2", JSON.stringify([subsidiaria, idTransaccionURU]));

              if (idTransaccionURU != null && idTransaccionURU > 0) {

                // Obtengo la URL del Middleware Correspondiente

                // Busco el Usuario y Password  y URL del Middleware de la Configuracion, el cual se utilizara para Buscar informacion en NetSuite.
                const filtroConfiguracion = new Array();
                filtroConfiguracion.push({
                  name: "isinactive",
                  operator: "is",
                  values: false
                });
                if (!l598isEmpty(subsidiaria))
                  filtroConfiguracion[1] = search.createFilter({
                    name: "custrecord_l598_conf_fe_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                  });

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
                columnaConfiguracion[15] = search.createColumn("custrecord_l598_conf_fe_url_gateway");
                columnaConfiguracion[16] = search.createColumn("custrecord_l598_conf_fe_serv_firma_comp");
                columnaConfiguracion[17] = search.createColumn("custrecord_l598_conf_fe_url_serv_c_firma");
                //NUEVOS CAMPOS PARA INTEGRACION CON UCFE
                columnaConfiguracion[18] = search.createColumn({ name: "custrecord_l598_tipo_integracion_codigo", join: "custrecord_l598_conf_factura_elec_integr" });
                columnaConfiguracion[19] = search.createColumn("custrecord_l598_conf_fe_cod_terminal");
                columnaConfiguracion[20] = search.createColumn("custrecord_l598_conf_fe_cod_comercio");
                columnaConfiguracion[21] = search.createColumn("custrecord_l598_conf_fe_url_rest");
                columnaConfiguracion[22] = search.createColumn("custrecord_l598_conf_fe_usuario_ucfe");
                columnaConfiguracion[23] = search.createColumn("custrecord_l598_conf_fe_password_ucfe");
                columnaConfiguracion[24] = search.createColumn("custrecord_l598_conf_fe_usuario_sige");
                columnaConfiguracion[25] = search.createColumn("custrecord_l598_conf_fe_password_sige");
                columnaConfiguracion[26] = search.createColumn("custrecord_l598_conf_fe_url_firma_sige");
                columnaConfiguracion[27] = search.createColumn("custrecord_l598_conf_fe_url_consult_sige");

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
                  const password = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_pasw_encriptada");
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
                  const URLGateway = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_gateway");
                  const URLServicioFirma = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_serv_firma_comp");
                  const URLServicioConfFirma = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_serv_c_firma");
                  //NUEVOS CAMPOS PARA INTEGRACION CON UCFE
                  const codTipoIntegracion = resultadoConfiguracion[0].getValue({ name: "custrecord_l598_tipo_integracion_codigo", join: "custrecord_l598_conf_factura_elec_integr" });
                  const codTerminalUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_cod_terminal");
                  const codComercioUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_cod_comercio");
                  const URLServicioRestUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_rest");
                  const usuarioUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_usuario_ucfe");
                  const passwordUCFE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_password_ucfe");
                  //NUEVOS CAMPOS PARA INTEGRACION CON SIGE
                  const usuarioSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_usuario_sige");
                  const passwordSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_password_sige");
                  const urlServicioFirmaSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_firma_sige");
                  const urlServicioConsultaSIGE = resultadoConfiguracion[0].getValue("custrecord_l598_conf_fe_url_consult_sige");

                  log.debug('URU-GENERAR BOTON CAE', `password Encriptada: ${password}`)

                  //VALIDACION CUANDO LA INTEGRACION ES CON TAFACE
                  if (((middlewareURL.length != 0 || !l598isEmpty(middlewareURL)) && !l598isEmpty(usuario) && !l598isEmpty(password) &&
                    !l598isEmpty(URLRESTSolicitud) && !l598isEmpty(URLRESTActualizacion) && !l598isEmpty(URLRESTEmail) && !l598isEmpty(URLRESTGrabarCabLog) &&
                    !l598isEmpty(URLRESTGrabarDetLog) && !l598isEmpty(cuenta) && rol != null && rol > 0 && !l598isEmpty(margenError) &&
                    !l598isEmpty(nombreSistemaFacturacion) && !l598isEmpty(razonSocial) && !l598isEmpty(RUTEmpresa) &&
                    !l598isEmpty(URLGateway) && !l598isEmpty(URLServicioFirma) &&
                    !l598isEmpty(URLServicioConfFirma) && (!l598isEmpty(codTipoIntegracion) && codTipoIntegracion == "TAFACE") && (l598isEmpty(link_uru_resguardo) || esResguardo_anulacion == "T" || esResguardo_anulacion === true)) || //VALIDACION CUANDO LA INTEGRACION ES CON UCFE
                    ((middlewareURL.length != 0 || !l598isEmpty(middlewareURL)) && !l598isEmpty(usuario) && !l598isEmpty(password) &&
                      !l598isEmpty(URLRESTSolicitud) && !l598isEmpty(URLRESTActualizacion) && !l598isEmpty(URLRESTEmail) && !l598isEmpty(URLRESTGrabarCabLog) &&
                      !l598isEmpty(URLRESTGrabarDetLog) && !l598isEmpty(cuenta) && rol != null && rol > 0 && !l598isEmpty(razonSocial) && !l598isEmpty(RUTEmpresa) &&
                      !l598isEmpty(codTerminalUCFE) && !l598isEmpty(codComercioUCFE) && !l598isEmpty(URLServicioRestUCFE) &&
                      !l598isEmpty(usuarioUCFE) && !l598isEmpty(passwordUCFE) && (!l598isEmpty(codTipoIntegracion) && codTipoIntegracion == "UCFE") && (l598isEmpty(link_uru_resguardo) || esResguardo_anulacion == "T" || esResguardo_anulacion === true)) || //VALIDACION CUANDO LA INTEGRACION ES CON SIGE
                    ((middlewareURL.length != 0 || !l598isEmpty(middlewareURL)) && !l598isEmpty(usuario) && !l598isEmpty(password) &&
                      !l598isEmpty(URLRESTSolicitud) && !l598isEmpty(URLRESTActualizacion) && !l598isEmpty(URLRESTEmail) && !l598isEmpty(URLRESTGrabarCabLog) &&
                      !l598isEmpty(URLRESTGrabarDetLog) && !l598isEmpty(cuenta) && rol != null && rol > 0 && !l598isEmpty(razonSocial) && !l598isEmpty(RUTEmpresa) &&
                      !l598isEmpty(urlServicioFirmaSIGE) && !l598isEmpty(urlServicioConsultaSIGE) &&
                      !l598isEmpty(usuarioSIGE) && !l598isEmpty(passwordSIGE) && (!l598isEmpty(codTipoIntegracion) && codTipoIntegracion == "SIGE") && (l598isEmpty(link_uru_resguardo) || esResguardo_anulacion == "T" || esResguardo_anulacion === true))) {
                    log.debug("URU - Agregar Boton Generar CAE", "middlewareURL: ");
                    if (generarCaeAutomatico == false) {
                      try {
                        const form = context.form;
                        form.clientScriptModulePath = "./L598 - Generar CAE (cliente).js";
                        form.addButton({ id: "custpage_l598_boton_generar_cae", label: "Generar CAE", functionName: "generar_cae()" });
                      } catch (excepcion) {
                        const mensaje = "Excepcion Agegando Boton - Generar CAE - NetSuite error: " + excepcion.message;
                        log.error("URU - Agregar Boton Generar CAE", mensaje);
                        log.error("log excepcion:", "e=" + JSON.stringify(excepcion));
                        grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
                      }
                    }
                  } else {
                    //No se encuentran Configurados Campos Requeridos del Middleware de Factura Electronica
                    let mensaje = "No se encuentran Configurados los siguientes Campos Requeridos de la Configuracion del Middleware de Factura Electronica : ";

                    if ((middlewareURL.length == 0 || l598isEmpty(middlewareURL)))
                      mensaje = mensaje + "URL del Middleware de Factura Electronica / ";
                    if (l598isEmpty(usuario))
                      mensaje = mensaje + "Usuario Para la conexion con el Middleware de Factura Electronica / ";
                    if (l598isEmpty(password))
                      mensaje = mensaje + "Password Para la conexion con el Middleware de Factura Electronica / ";
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
                    if (!(l598isEmpty(link_uru_resguardo) || esResguardo_anulacion == "T" || esResguardo_anulacion === true))
                      mensaje = mensaje + `link_uru_resguardo=${JSON.stringify(link_uru_resguardo)}, esResguardo_anulacion=${esResguardo_anulacion}`;
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
                    } else if (codTipoIntegracion == "UCFE") {
                      if (l598isEmpty(codTerminalUCFE))
                        mensaje = mensaje + "Codigo Terminal UCFE / ";
                      if (l598isEmpty(codComercioUCFE))
                        mensaje = mensaje + "Codigo Comercio UCFE / ";
                      if (l598isEmpty(URLServicioRestUCFE))
                        mensaje = mensaje + "Direccion URL servicio REST UCFE / ";
                      if (l598isEmpty(usuarioUCFE))
                        mensaje = mensaje + "Usuario UCFE / ";
                      if (l598isEmpty(passwordUCFE))
                        mensaje = mensaje + "Password UCFE / ";
                    } else if (codTipoIntegracion == "SIGE") {
                      if (l598isEmpty(urlServicioFirmaSIGE))
                        mensaje = mensaje + "Direccion URL servicio Firma Comprobante SIGE / ";
                      if (l598isEmpty(urlServicioConsultaSIGE))
                        mensaje = mensaje + "Direccion URL servicio Consulta Comprobante SIGE / ";
                      if (l598isEmpty(usuarioSIGE))
                        mensaje = mensaje + "Usuario SIGE / ";
                      if (l598isEmpty(passwordSIGE))
                        mensaje = mensaje + "Password SIGE / ";
                    } else {
                      mensaje = mensaje + `codTipoIntegracion no es ninguno de los valores previos codTipoIntegracion=${codTipoIntegracion}`;
                    }

                    log.error("URU - Agregar Boton Generar CAE", mensaje);
                    grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
                  }
                } else {
                  //No Se Encuentra configurado el Middleware de Factura Electronica
                  let mensaje = "No Se Encuentra configurado el Middleware de Factura Electronica";
                  if (!l598isEmpty(subsidiaria))
                    mensaje = mensaje + " para la Subsidiaria con ID Interno : " + subsidiaria;
                  log.error("URU - Agregar Boton Generar CAE", mensaje);
                  grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
                }
              } else {
                // Falta Configurar ID Transaccion URUGUAY en la Transaccion
                const mensaje = "Falta Configurar el ID de Transaccion Electronica en la Transaccion";
                log.error("URU - Agregar Boton Generar CAE", mensaje);
                grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
              }

            } else {
              // Falta Serie, Sucursal, Tipo de Comprobante DGI
              let mensaje = "Falta Configurar la Siguiente Informacion : ";
              if (l598isEmpty(serie)) {
                mensaje = mensaje + "Serie , ";
              }
              if (l598isEmpty(sucursal)) {
                mensaje = mensaje + "Sucursal , ";
              }
              if (l598isEmpty(tipoComprobante)) {
                mensaje = mensaje + "Tipo de Comprobante DGI , ";
              }
              mensaje = mensaje + "Para la Transaccion con ID Interno : " + recId;

              log.error("URU - Agregar Boton Generar CAE", mensaje);
              grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
            }
          }
        } else {
          let mensaje = "Error Obteniendo la siguiente informacion de la Transaccion : ";
          if (l598isEmpty(recType)) {
            mensaje = mensaje + "Tipo de Transaccion , ";
          }
          if (l598isEmpty(recId)) {
            mensaje = mensaje + "ID Interno de la Transaccion , ";
          }
          log.error("URU - Agregar Boton Generar CAE", mensaje);
          grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
        }

      } catch (excepcion) {
        const mensaje = "Excepcion General Agegando Boton - Generar CAE - NetSuite error: " + excepcion.message;
        log.error("URU - Agregar Boton Generar CAE", mensaje);
        log.error("log excepcion:", "e=" + JSON.stringify(excepcion));
        grabarError(codigoEstadoError, tipoMensaje, mensaje, punto_venta, tipoTransacción, refLog, refTransaccion);
      }

      log.audit("URU - Agregar Boton Generar CAE", "FIN PROCESO");

    }
  }


  return {
    beforeLoad: beforeLoad
  };

});