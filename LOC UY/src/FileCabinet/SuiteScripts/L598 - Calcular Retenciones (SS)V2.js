/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(["N/log", "N/record", "N/search", "N/runtime", "N/error", "N/format", "N/url", "N/https"], function (log, record, search, runtime, error, format, url, https) {
  /*global define */
  /* eslint-disable no-magic-numbers */
  function isEmpty(value) {

    return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
  }

  function isEmptyOK(value) {

    return (value === "undefined" || value === null || value === "" || value === undefined || value === "null");
  }

  // eslint-disable-next-line no-extend-native
  Number.prototype.toFixedOK = function (decimals) {
    const sign = this >= 0 ? 1 : -1;
    return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
  };


  function letras(c, d, u) {

    const proceso = "letras";

    try {

      let lc = "";
      let ld = "";
      let lu = "";
      const centenas = eval(c);
      const decenas = eval(d);
      const decom = eval(u);

      switch (centenas) {

        case 0:
          lc = "";
          break;
        case 1: {
          if (decenas == 0 && decom == 0)
            lc = "CIEN";
          else
            lc = "CIENTO ";
        }
          break;
        case 2:
          lc = "DOSCIENTOS ";
          break;
        case 3:
          lc = "TRESCIENTOS ";
          break;
        case 4:
          lc = "CUATROCIENTOS ";
          break;
        case 5:
          lc = "QUINIENTOS ";
          break;
        case 6:
          lc = "SEISCIENTOS ";
          break;
        case 7:
          lc = "SETECIENTOS ";
          break;
        case 8:
          lc = "OCHOCIENTOS ";
          break;
        case 9:
          lc = "NOVECIENTOS ";
          break;
      }

      switch (decenas) {

        case 0:
          ld = "";
          break;
        case 1: {
          switch (decom) {

            case 0:
              ld = "DIEZ";
              break;
            case 1:
              ld = "ONCE";
              break;
            case 2:
              ld = "DOCE";
              break;
            case 3:
              ld = "TRECE";
              break;
            case 4:
              ld = "CATORCE";
              break;
            case 5:
              ld = "QUINCE";
              break;
            case 6:
              ld = "DIECISEIS";
              break;
            case 7:
              ld = "DIECISIETE";
              break;
            case 8:
              ld = "DIECIOCHO";
              break;
            case 9:
              ld = "DIECINUEVE";
              break;
          }
        }
          break;
        case 2:
          ld = "VEINTE";
          break;
        case 3:
          ld = "TREINTA";
          break;
        case 4:
          ld = "CUARENTA";
          break;
        case 5:
          ld = "CINCUENTA";
          break;
        case 6:
          ld = "SESENTA";
          break;
        case 7:
          ld = "SETENTA";
          break;
        case 8:
          ld = "OCHENTA";
          break;
        case 9:
          ld = "NOVENTA";
          break;
      }
      switch (decom) {

        case 0:
          lu = "";
          break;
        case 1:
          lu = "UN";
          break;
        case 2:
          lu = "DOS";
          break;
        case 3:
          lu = "TRES";
          break;
        case 4:
          lu = "CUATRO";
          break;
        case 5:
          lu = "CINCO";
          break;
        case 6:
          lu = "SEIS";
          break;
        case 7:
          lu = "SIETE";
          break;
        case 8:
          lu = "OCHO";
          break;
        case 9:
          lu = "NUEVE";
          break;
      }

      if (decenas == 1) {

        return lc + ld;
      }
      if (decenas == 0 || decom == 0) {

        //return lc+" "+ld+lu;
        return lc + ld + lu;
      } else {

        if (decenas == 2) {

          ld = "VEINTI";
          return lc + ld + lu.toLowerCase();
        } else {

          return lc + ld + " Y " + lu;
        }
      }
    } catch (err) {
      log.error(proceso, "Error NetSuite Excepción letras - Detalles: " + error.message);
    }

    return null;
  }


  function getNumberLiteral(n) {

    const proceso = "getNumberLiteral";

    try {
      let m0,
        cm,
        dm,
        um,
        cmi,
        dmi,
        umi,
        ce,
        de,
        un,
        hlp,
        decimal;

      if (isNaN(n)) {

        alert("La Cantidad debe ser un valor NumÃ©rico.");
        return null;
      }
      /* eslint-disable */
      m0 = parseInt(n / 1000000000000);
      rm0 = n % 1000000000000;
      m1 = parseInt(rm0 / 100000000000);
      rm1 = rm0 % 100000000000;
      m2 = parseInt(rm1 / 10000000000);
      rm2 = rm1 % 10000000000;
      m3 = parseInt(rm2 / 1000000000);
      rm3 = rm2 % 1000000000;
      cm = parseInt(rm3 / 100000000);
      r1 = rm3 % 100000000;
      dm = parseInt(r1 / 10000000);
      r2 = r1 % 10000000;
      um = parseInt(r2 / 1000000);
      r3 = r2 % 1000000;
      cmi = parseInt(r3 / 100000);
      r4 = r3 % 100000;
      dmi = parseInt(r4 / 10000);
      r5 = r4 % 10000;
      umi = parseInt(r5 / 1000);
      r6 = r5 % 1000;
      ce = parseInt(r6 / 100);
      r7 = r6 % 100;
      de = parseInt(r7 / 10);
      r8 = r7 % 10;
      un = parseInt(r8 / 1);

      //r9=r8%1;
      999123456789;
      if (n < 1000000000000 && n >= 1000000000) {

        tmp = n.toString();
        s = tmp.length;
        tmp1 = tmp.slice(0, s - 9);
        tmp2 = tmp.slice(s - 9, s);

        tmpn1 = getNumberLiteral(tmp1);
        tmpn2 = getNumberLiteral(tmp2);

        if (tmpn1.indexOf("Un") >= 0)
          pred = " BILLÓN ";
        else
          pred = " BILLONES ";

        return tmpn1 + pred + tmpn2;
      }

      if (n < 10000000000 && n >= 1000000) {

        mldata = letras(cm, dm, um);
        hlp = mldata.replace("UN", "*");
        if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

          mldata = mldata.replace("UNO", "UN");
          mldata += " MILLONES ";
        } else
          mldata = "UN MILLÓN ";

        mdata = letras(cmi, dmi, umi);
        cdata = letras(ce, de, un);

        if (mdata != "	") {
          if (n == 1000000)
            mdata = mdata.replace("UNO", "UN") + "DE";
          else
            mdata = mdata.replace("UNO", "UN") + " MIL ";
        }

        return (mldata + mdata + cdata);
      }
      if (n < 1000000 && n >= 1000) {

        mdata = letras(cmi, dmi, umi);
        cdata = letras(ce, de, un);
        hlp = mdata.replace("UN", "*");
        if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

          mdata = mdata.replace("UNO", "UN");
          return (mdata + " MIL " + cdata);
        } else
          return ("UN MIL " + cdata);
      }
      if (n < 1000 && n >= 1)
        return (letras(ce, de, un));

      if (n == 0)
        return " CERO";
      /* eslint-enable */
    } catch (err) {
      log.error(proceso, "Error NetSuite Excepción getNumberLiteral - Detalles: " + error.message);
    }

    return "NO DISPONIBLE";
  }

  function getNumeroEnLetras(numero, subsidiaria) {

    const proceso = "getNumeroEnLetras";

    try {
      const filters = [];
      filters[0] = search.createFilter({
        name: "isinactive",
        operator: search.Operator.IS,
        values: false
      });

      if (!isEmpty(subsidiaria)) {
        filters[1] = search.createFilter({
          name: "custrecord_l598_dat_imp_subsidiaria",
          operator: search.Operator.ANYOF,
          values: subsidiaria
        });
      }

      const results = search.create({
        type: "customrecord_l598_datos_impositivos_emp",
        columns: ["custrecord_l598_dat_imp_usar_d_mont"],
        filters: filters
      }).run().getRange({
        start: 0,
        end: 1
      });

      let usarDecimales = null;
      if (results != null && results.length > 0) {
        usarDecimales = results[0].getValue("custrecord_l598_dat_imp_usar_d_mont");
      }

      log.debug(proceso, "usarDecimales: " + usarDecimales);

      if (!isEmpty(numero)) {
        /* eslint-disable */
        if (usarDecimales === false) {

          //Se redondea el numero para no usar los decimales.
          // var parteEntera = Math.round(numero);
          var parteEntera = Math.round(Math.abs(parseFloat(numero, 10)));

          var parteEnteraLetras = "";

          // convierto la parte entera en letras
          parteEnteraLetras = getNumberLiteral(parteEntera);
          // le hago un TRIM a la parte entera en letras
          parteEnteraLetras = parteEnteraLetras.replace(/^\s*|\s*$/g, "");

          var numeroEnLetras = parteEnteraLetras;

          // dejo toda la palabra en mayusculas
          numeroEnLetras = numeroEnLetras.toUpperCase();

          return numeroEnLetras;
        } else { //hay que usar decimales

          const partes = String(numero).split(".");
          parteEntera = partes[0];
          const parteDecimal = partes[1] ?? "00";
          parteEnteraLetras = "";

          // convierto la parte entera en letras
          // parteEnteraLetras = getNumberLiteral(parteEntera);
          parteEnteraLetras = getNumberLiteral(Math.abs(parseFloat(parteEntera, 10)));
          // le hago un TRIM a la parte entera en letras
          parteEnteraLetras = parteEnteraLetras.replace(/^\s*|\s*$/g, "");

          numeroEnLetras = parteEnteraLetras + " con " + parteDecimal;

          // dejo toda la palabra en mayusculas
          numeroEnLetras = numeroEnLetras.toUpperCase();

          // le agrego MN (Moneda Nacional) al final
          numeroEnLetras = numeroEnLetras + "/100";

          return numeroEnLetras;
        }
        /* eslint-enable */
      } else {
        log.error(proceso, "Error al obtener el monto escrito - No se recibió ningún monto para transformar a letras.");
      }
    } catch (err) {
      log.error(proceso, "Error NetSuite Excepción getNumeroEnLetras - Detalles: " + error.message);
    }

    return null;
  }


  function sePermiteProcesarEnFacturaPendiente() {
    const currScript = runtime.getCurrentScript();
    const rta = currScript.getParameter("custscript_l598_calc_ret_ss_pfp2");
    return convertToBoolean(rta);
  }
  function convertToBoolean(maybeString) {
    return ((isEmpty(maybeString) || maybeString == "F" || maybeString == false) ? false : true);
  }

  function getSucursalxLocation(subsidiaria) {

    const sucursarxLocation = {
      porLocation: false,
      sucursalDefault: 1,
      serieDefault: 1,
    };


    const filters = new Array();
    filters.push({
      name: "isinactive",
      operator: "is",
      values: false
    });


    if (!isEmpty(subsidiaria)) {
      filters.push({
        name: "custrecord_l598_dat_imp_subsidiaria",
        operator: "is",
        values: subsidiaria
      });
    }

    const columns = ["custrecord_l598_dat_imp_num_location", "custrecord_l598_dat_imp_suc_default", "custrecord_l598_dat_imp_serie_default"];


    const busqueda = search.create({
      type: "customrecord_l598_datos_impositivos_emp",
      columns: columns,
      filters: filters
    });

    const resultado = busqueda.run().getRange({
      start: 0,
      end: 1,
    });


    if (resultado != null && resultado.length > 0) {
      const sucPorLocation = resultado[0].getValue("custrecord_l598_dat_imp_num_location");
      const sucDefault = resultado[0].getValue("custrecord_l598_dat_imp_suc_default");
      const serieDefault = resultado[0].getValue("custrecord_l598_dat_imp_serie_default");

      if (!isEmpty(sucPorLocation) && sucPorLocation === true) {
        sucursarxLocation.porLocation = true;
      }
      // Asignar Sucursal Por Defecto
      if (!isEmpty(sucDefault)) {
        sucursarxLocation.sucursalDefault = sucDefault;
      }
      // Asignar Serie Por Defecto
      if (!isEmpty(serieDefault)) {
        sucursarxLocation.serieDefault = serieDefault;
      }
    }

    return sucursarxLocation;
  }

  function getSucursal(subsidiaria, categoriaSucursal) {

    const informacionSucursal = {};
    informacionSucursal.sucursal = 1;// Sucursal default: 1
    informacionSucursal.serie = 1;// Serie default: 1 - A
    let categoriaVacio = false;

    // Obtengo la Sucursal
    const filters = new Array();
    filters.push({
      name: "isinactive",
      operator: "IS",
      values: false
    });


    if (!isEmpty(subsidiaria))
      filters.push({
        name: "custrecord_l598_sucursales_subsidiaria",
        operator: "IS",
        values: subsidiaria
      });

    //Si la empresa utiliza Sucursal por location, filtro categoria de Sucursal
    const objSucursalxLocation = getSucursalxLocation(subsidiaria);
    if (!isEmpty(objSucursalxLocation)) {
      if (!isEmpty(objSucursalxLocation.sucursalDefault)) {
        informacionSucursal.sucursal = objSucursalxLocation.sucursalDefault;
      }
      if (!isEmpty(objSucursalxLocation.serieDefault)) {
        informacionSucursal.serie = objSucursalxLocation.serieDefault;
      }
      if (!isEmpty(objSucursalxLocation.porLocation) && (objSucursalxLocation.porLocation == true || objSucursalxLocation.porLocation == "T")) {
        if (isEmpty(categoriaSucursal)) {
          categoriaVacio = true;
          // categoriaSucursal = "@NONE@";
        }
      } else {
        categoriaVacio = true;
        // categoriaSucursal = "@NONE@";
      }
    } else {
      // categoriaSucursal = "@NONE@";
      return informacionSucursal;
    }

    if (!categoriaVacio) {
      filters.push({
        name: "custrecord_l598_sucursales_categoria",
        operator: 'IS',
        values: categoriaSucursal
      });
    } else {
      filters.push({
        name: "internalid",
        operator: 'IS',
        values: informacionSucursal.sucursal
      });
    }

    const columns = ["internalid"];

    const results = search.create({
      type: "customrecord_l598_sucursales",
      filters: filters,
      columns: columns
    }).run().getRange({
      start: 0,
      end: 1
    });


    if (results != null && results.length > 0) {
      const idSucursal = results[0].getValue("internalid");
      if (!isEmpty(idSucursal)) {
        informacionSucursal.sucursal = idSucursal;
      }

    }
    return informacionSucursal;
  }


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


  function obtenerSucursal(context) {
    let subsidiaria = null;
    if (esOneworld())
      subsidiaria = context.getValue("subsidiary");


    let categoriaSucursal = null;

    const locationId = context.getValue("location");
    if (!isEmpty(locationId)) {
      const categoriaSucursalAux = search.lookupFields({
        type: search.Type.LOCATION,
        id: locationId,
        columns: ["custrecord_l598_categoria_sucursal"]
      });

      log.debug("obtenerSucursal", `categoriaSucursalAux: ${JSON.stringify(categoriaSucursalAux)}`);

      if (!isEmpty(categoriaSucursalAux) && categoriaSucursalAux.custrecord_l598_categoria_sucursal.length > 0) {
        categoriaSucursal = categoriaSucursalAux.custrecord_l598_categoria_sucursal[0].value;
      }
    }

    const informacionSucursal = {};
    informacionSucursal.sucursal = 1; // Sucursal default: 1
    informacionSucursal.serie = 1; // Serie default: 1 - A

    const infoSucursal = getSucursal(subsidiaria, categoriaSucursal);
    if (!isEmpty(infoSucursal)) {
      informacionSucursal.sucursal = infoSucursal.sucursal;
      informacionSucursal.serie = infoSucursal.serie;
    }
    return informacionSucursal;
  }


  function obtenerIDTipoTransNS(tipoTransNS) {
    let idTipoTransNS = "";
    if (!isEmpty(tipoTransNS)) {


      const filters = new Array();
      filters.push({
        name: "isinactive",
        operator: "is",
        values: false
      });
      filters.push({
        name: "custrecord_l598_tipo_trans_ns_cod",
        operator: "is",
        values: tipoTransNS
      });

      const busqueda = search.create({
        type: "customrecord_l598_tipo_trans_ns",
        columns: ["internalid"],
        filters: filters
      });

      const results = busqueda.run().getRange({
        start: 0,
        end: 1
      });


      if (results != null && results.length > 0) {

        const idTipoTransaccion = results[0].getValue("internalid");
        if (!isEmpty(idTipoTransaccion)) {
          idTipoTransNS = idTipoTransaccion;
        }
      }
    }
    return idTipoTransNS;
  }

  function obtenerTipoComprobanteFE(tipoTransLocal, esExportacion, compContingencia, compCuentaAjena, esTicket) {
    const objTipoComprobanteFE = {};
    objTipoComprobanteFE.error = false;
    objTipoComprobanteFE.mensaje = "";
    objTipoComprobanteFE.tipoComprobanteFE = "";

    if (!isEmpty(tipoTransLocal)) {
      let i = 0;

      const filters = new Array();
      filters[i++] = search.createFilter({
        name: "isinactive",
        operator: search.Operator.IS,
        values: false
      });
      filters[i++] = search.createFilter({
        name: "custrecord_l598_tipos_comprobantes_trans",
        operator: search.Operator.IS,
        values: tipoTransLocal
      });

      let comprobanteExoportacion = false;
      let comprobanteCuentaAjena = false;
      let comprobanteContingencia = false;
      let comprobanteTicket = false;

      if (!isEmpty(esExportacion) && esExportacion === true) {
        comprobanteExoportacion = true;
      }

      if (!isEmpty(compContingencia) && compContingencia === true) {
        comprobanteContingencia = true;
      }

      if (!isEmpty(compCuentaAjena) && compCuentaAjena === true) {
        comprobanteCuentaAjena = true;
      }

      if (!isEmpty(esTicket) && esTicket === true) {
        comprobanteTicket = true;
      }

      filters[i++] = search.createFilter({
        name: "custrecord_l598_tipos_comprobantes_exp",
        operator: search.Operator.IS,
        values: comprobanteExoportacion
      });
      filters[i++] = search.createFilter({
        name: "custrecord_l598_tipos_comprobantes_con",
        operator: search.Operator.IS,
        values: comprobanteContingencia
      });
      filters[i++] = search.createFilter({
        name: "custrecord_l598_tipos_comprobantes_aje",
        operator: search.Operator.IS,
        values: comprobanteCuentaAjena
      });
      filters[i++] = search.createFilter({
        name: "custrecord_l598_tipos_comprobantes_tick",
        operator: search.Operator.IS,
        values: comprobanteTicket
      });

      const columns = [search.createColumn("internalid")];

      const results = search.create({
        type: "customrecord_l598_tipos_comprobantes",
        filters: filters,
        columns: columns
      }).run().getRange({
        start: 0,
        end: 1000
      });

      if (results != null && results.length > 0) {
        const tipoCompFE = results[0].getValue("internalid");
        if (!isEmpty(tipoCompFE)) {
          objTipoComprobanteFE.tipoComprobanteFE = tipoCompFE;
        } else {
          objTipoComprobanteFE.error = true;
          objTipoComprobanteFE.mensaje = "No se encontro la Configuracion de Tipos de Comprobantes de Factura Electronica para el Tipo de Transaccion Local con ID Interno : " + tipoTransLocal;
        }
      } else {
        objTipoComprobanteFE.error = true;
        objTipoComprobanteFE.mensaje = "No se encontro la Configuracion de Tipos de Comprobantes de Factura Electronica para el Tipo de Transaccion Local con ID Interno : " + tipoTransLocal;
      }
    } else {
      objTipoComprobanteFE.error = true;
      objTipoComprobanteFE.mensaje = "No se Recibio el Tipo de Transaccion Local";
    }

    return objTipoComprobanteFE;
  }


  function obtenerTipoTransaccionLocal(tipoTransNS, esND) {
    const objTipoTransLocal = {};
    objTipoTransLocal.error = false;
    objTipoTransLocal.mensaje = "";
    objTipoTransLocal.tipoTransaccionLocal = "";
    objTipoTransLocal.idTipoTransNS = "";

    if (!isEmpty(tipoTransNS)) {

      const idTipoTransNS = obtenerIDTipoTransNS(tipoTransNS);

      if (!isEmpty(idTipoTransNS)) {

        objTipoTransLocal.idTipoTransNS = idTipoTransNS;

        let i = 0;

        const filters = new Array();
        filters[i++] = search.createFilter({
          name: "isinactive",
          operator: search.Operator.IS,
          values: false
        });
        filters[i++] = search.createFilter({
          name: "custrecord_l598_tipo_trans_loc_tipo_ns",
          operator: search.Operator.IS,
          values: idTipoTransNS
        });
        if (!isEmpty(esND))
          filters[i++] = search.createFilter({
            name: "custrecord_l598_tipo_trans_loc_es_nd",
            operator: search.Operator.IS,
            values: esND
          });
        else
          filters[i++] = search.createFilter({
            name: "custrecord_l598_tipo_trans_loc_es_nd",
            operator: search.Operator.IS,
            values: false
          });

        const columns = [search.createColumn("internalid")];

        const results = search.create({
          type: "customrecord_l598_tipo_trans_loc",
          filters: filters,
          columns: columns
        }).run().getRange({
          start: 0,
          end: 1000
        });

        if (results != null && results.length > 0) {

          const idTipoTransLocal = results[0].getValue("internalid");
          if (!isEmpty(idTipoTransLocal)) {
            objTipoTransLocal.tipoTransaccionLocal = idTipoTransLocal;
          } else {
            objTipoTransLocal.error = true;
            objTipoTransLocal.mensaje = "No se encontro la configuración del Tipo de Transacción Local para el Tipo de Transacción NetSuite: " + tipoTransNS + " Es Nota de Debito : " + esND;
          }
        } else {
          objTipoTransLocal.error = true;
          objTipoTransLocal.mensaje = "No se encontro la configuración del Tipo de Transacción Local para el Tipo de Transacción NetSuite: " + tipoTransNS + " Es Nota de Debito : " + esND;
        }
      } else {
        objTipoTransLocal.error = true;
        objTipoTransLocal.mensaje = "No se encontro la configuración del Tipo de Transacción NetSuite para el Tipo de Transacción : " + tipoTransNS;
      }
    } else {
      objTipoTransLocal.error = true;
      objTipoTransLocal.mensaje = "No se recibio el Tipo de Transaccion de NetSuite";
    }

    return objTipoTransLocal;
  }

  /*
     * Función l598beforeLoad
     */
  function beforeLoad(context) {

    log.audit("l598beforeLoad", "INICIO");

    try {
      const objRecord = context.newRecord;
      const recId = objRecord.id;
      const contextType = context.type;
      const recType = objRecord.type;
      const form = context.form;

      if (contextType == "view" && (recType == "vendorbill" || recType == "vendorcredit")) {
        log.audit("l598beforeLoad", "LOG DE CONTROL 1, recId=" + recId);

        const filtro = search.createFilter({
          name: "internalid",
          operator: search.Operator.ANYOF,
          values: recId
        });

        //https://tstdrv2415381.app.netsuite.com/app/common/search/search.nl?id=243&e=T&cu=T&whence=
        const loadSearch = search.load({
          id: "customsearch_l598_transaction_det_ret",
        });

        loadSearch.filters.push(filtro);

        const results = loadSearch.run().getRange({
          start: 0,
          end: 1000
        });

        let retencion;
        let codRetIRAE;
        let codRetIRNR;
        let codRetIRPF;
        let codRetIVA;
        const cuentaContable = objRecord.getValue("account");

        if (!isEmpty(results) && results.length > 0) {
          log.audit("l598beforeLoad", "LOG DE CONTROL 2");

          for (let cont = 0; cont < results.length; cont++) {
            const resultSearch = results[cont];
            const columns = resultSearch.columns;
            codRetIRAE = resultSearch.getValue(columns[12]); //URU-COD RET IRAE
            codRetIRNR = resultSearch.getValue(columns[13]); //URU-COD RET IRNR
            codRetIRPF = resultSearch.getValue(columns[14]); //URU-COD RET IRPF
            codRetIVA = resultSearch.getValue(columns[15]); //URU-COD RET IVA
            retencion = resultSearch.getValue(columns[17]); //URU-RETENCION
          }

          log.audit("l598beforeLoad log3", "codRetIRAE: " + codRetIRAE + " - codRetIRNR: " + codRetIRNR + " - codRetIRPF: " + codRetIRPF + " - codRetIVA: " + codRetIVA + " - retencion: " + retencion);
        }

        log.debug('isEmpty(codRetIRPF)',isEmpty(codRetIRPF))
        if (!isEmpty(codRetIRPF) || !isEmpty(codRetIRNR) || !isEmpty(codRetIVA) || !isEmpty(codRetIRAE)) {
          log.audit("l598beforeLoad log4", "codRetIRAE: " + codRetIRAE + " - codRetIRNR: " + codRetIRNR + " - codRetIRPF: " + codRetIRPF + " - codRetIVA: " + codRetIVA);
          log.audit("l598beforeLoad log5", "codRetIRAE: " + isEmpty(codRetIRAE) + " - codRetIRNR: " + isEmpty(codRetIRNR) + " - codRetIRPF: " + isEmpty(codRetIRPF) + " - codRetIVA: " + isEmpty(codRetIVA) + " - retencion: " + isEmpty(retencion));
        }

        if ((!isEmpty(codRetIRPF) || !isEmpty(codRetIRNR) || !isEmpty(codRetIVA) || !isEmpty(codRetIRAE)) && isEmpty(retencion)) {
          log.debug("l598beforeLoad log6", "RecId: " + recId + " - contextType: " + contextType + " - CodRetIRPF: " + codRetIRPF + " - CodRetIRNR: " + codRetIRNR + " - CodRetIVA: " + codRetIVA + " - CodRetIRAE: " + codRetIRAE + " - URU-Retencion: " + retencion);

          form.clientScriptModulePath = "./L598 - Calcular Retenciones (LIBS)V2.js";
          form.addButton({
            id: "custpage_calcular_retenciones",
            label: "Calcular Retenciones",
            functionName: "calcularRetencionesl598(".concat(cuentaContable, ",", sePermiteProcesarEnFacturaPendiente(), ")")
          });

        }
      }

    } catch (e) {
      log.error("error l598beforeLoad", "Ocurrio un error en el proceso - Excepcion: " + e.message);
    }
  }

  /*
     * Función l598afterSubmit
     */
  function afterSubmit(context) {

    //nlapiLogExecution('AUDIT','l598afterSubmit','INICIO');

    const contextType = context.type;
    var objRecord = context.newRecord;
    const recType = objRecord.type;
    const recId = objRecord.id;

    let retAuto = objRecord.getValue("custbody_l598_cal_ret_auto");
    // const idRetencion = objRecord.getValue("custbody_l598_link_retencion");
    const cuentaContable = objRecord.getValue("account");
    const fechaVencimRetInicial = objRecord.getValue("custbody_l598_fecha_venc_retenc");
    const fechaDiaActual = objRecord.getValue("trandate");
    const fechaVencRet = !isEmptyOK(fechaVencimRetInicial) ? fechaVencimRetInicial : fechaDiaActual;
    log.debug("l598afterSubmit", "cuentaContable: " + cuentaContable + " - fechaVencimRetInicial: " + fechaVencimRetInicial + " - fechaVencRet: " + fechaVencRet + " - fechaDiaActual: " + fechaDiaActual);
    const errorGeneral = false;
    const mensajeError = "";
    var newResguardo = ''

    if (isEmpty(retAuto))
      retAuto = false;

    //if ((type=='create' || type=='edit') && (recType=='vendorbill' || recType=='vendorcredit') && retAuto=='T' && isEmpty(idRetencion))
    if ((contextType == context.UserEventType.CREATE || contextType == context.UserEventType.EDIT) && (recType == "vendorbill" || recType == "vendorcredit") && retAuto === true) {
      /*//nlapiLogExecution('DEBUG','l598afterSubmit','RECID: '+recId+'. RECTYPE: '+recType+'. TYPE: '+type+'. retAuto: '+retAuto+'. IdRetencion: '+idRetencion);
            if (type=='edit' && !isEmpty(idRetencion))
            {
                try
                {
                    nlapiDeleteRecord(recType,idRetencion);
                }
                catch(e)
                {
                    mensajeError = 'Error al eliminar la retencion. Excepcion detalles: '+e.message;
                    errorGeneral = true;
                    nlapiLogExecution('DEBUG','l598afterSubmit',mensajeError);
                }
            }*/

      if (!errorGeneral) {
        const informacionPago = {};
        const id_transaction = recId;
        //var recType         = nlapiGetRecordType();
        const esOneWorld = esOneworld();
        const filtro = search.createFilter({
          name: "internalid",
          operator: search.Operator.ANYOF,
          values: id_transaction
        });

        const loadSearch = search.load({
          id: "customsearch_l598_transaction_det_ret"
        });

        loadSearch.filters.push(filtro);


        const resultadoSearch = loadSearch.run();


        const results = resultadoSearch.getRange({
          start: 0,
          end: 1000
        });

        let subsidiariaPago = "";

        if (!isEmpty(results) && results.length > 0) {
          const resultSearch = results[0];
          const columns = resultSearch.columns;
          informacionPago.recId = id_transaction;
          informacionPago.recType = recType;
          informacionPago.tranid = resultSearch.getValue(columns[1]); //REF NUMERO
          informacionPago.trandate = resultSearch.getValue(columns[2]); //FECHA
          informacionPago.fecha = format.parse({
            value: resultSearch.getValue(columns[2]),
            type: format.Type.DATE
          });
          informacionPago.periodo = resultSearch.getValue(columns[3]); //PERIODO
          informacionPago.entity = resultSearch.getValue(columns[5]); //PROVEEDOR
          informacionPago.moneda = resultSearch.getValue(columns[6]); //MONEDA
          informacionPago.tipoCambio = resultSearch.getValue(columns[7]); //TIPO DE CAMBIO
          informacionPago.importeTotal = resultSearch.getValue(columns[8]); //IMPORTE TOTAL
          informacionPago.estado = resultSearch.getValue(columns[11]); //ESTADO DE APROBACION FACTURA
          informacionPago.cod_ret_irae = resultSearch.getValue(columns[12]); //CÓDIGO RET. IRAE
          informacionPago.cod_ret_irnr = resultSearch.getValue(columns[13]); //CÓDIGO RET. IRNR
          informacionPago.cod_ret_irpf = resultSearch.getValue(columns[14]); //CÓDIGO RET. IRPF
          informacionPago.cod_ret_iva = resultSearch.getValue(columns[15]); //CÓDIGO RET. IVA
          // informacionPago.cuentaCont   = resultSearch.getValue(columns[16]);//CUENTA ACREEDOR;
          informacionPago.retencion = resultSearch.getValue(columns[17]); //URU-RETENCION
          informacionPago.direccion = resultSearch.getValue(columns[18]); //DIRECCION
          informacionPago.ciudad = resultSearch.getValue(columns[19]); //CIUDAD
          informacionPago.pais = resultSearch.getValue(columns[20]); //PAIS
          informacionPago.codPostal = resultSearch.getValue(columns[21]); //CODIGO POSTAL
          informacionPago.uruNroDoc = resultSearch.getValue(columns[23]); //URU-NUMERO DE DOCUMENTO
          informacionPago.uruRazonSoc = resultSearch.getValue(columns[24]); //URU-RAZON SOCIAL
          informacionPago.uruTipoDoc = resultSearch.getValue(columns[25]); //URU-TIPO DOCUMENTO
          informacionPago.esOneWorld = esOneWorld;
          informacionPago.fechaExRate = resultSearch.getValue(columns[26]); //FECHA TRANSACCION EN FORMATO MM/DD/YYYY
          // informacionPago.duedateRetencion = resultSearch.getValue(columns[27]);//FECHA DE VENCIMIENTO DE TRANSACCIÓN

          if (esOneWorld)
            subsidiariaPago = resultSearch.getValue(columns[4]); //SUBSIDIARIA;

          informacionPago.subsidiaria = subsidiariaPago; //SUBSIDIARIA;
          informacionPago.cuentaCont = cuentaContable;
          informacionPago.duedateRetencion = fechaVencRet;

          if (isEmpty(informacionPago.estado) && !isEmpty(contextType) && (recType == "vendorcredit"))
            informacionPago.estado = 2;
        }

        if ((!isEmpty(informacionPago.cod_ret_irpf) || !isEmpty(informacionPago.cod_ret_irnr) || !isEmpty(informacionPago.cod_ret_iva) || !isEmpty(informacionPago.cod_ret_irae)) && isEmpty(informacionPago.retencion)) {
          if (informacionPago.estado == 2 || (informacionPago.estado == 1 && sePermiteProcesarEnFacturaPendiente())) {
            if (!isEmpty(informacionPago.importeTotal) && informacionPago.importeTotal > 0.00) {
              const objInformacionPago = {};
              const informacionPagoJson = JSON.stringify(informacionPago);
              log.debug("antes de enviar SL", "informacionPago=" + informacionPagoJson);
              objInformacionPago.informacionPago = informacionPagoJson;

              //SE INVOCA SUITELET PARA EL CALCULO DE LAS RETENCIONES
              try {
                const strURL = url.resolveScript({
                  scriptId: "customscript_l598_calcular_ret_v2",
                  deploymentId: "customdeploy1",
                  returnExternalUrl: true
                });
                const response = https.post({
                  url: strURL,
                  body: objInformacionPago
                });

                const objRta = {};
                objRta.error = false;
                objRta.warning = false;
                objRta.mensajeError = new Array();
                objRta.mensajeWarning = new Array();
                objRta.mensajeOk = "";
                // const scriptObj = runtime.getCurrentScript(); //nlapiGetContext();
                // const remaining = scriptObj.getRemainingUsage(); //context.getRemainingUsage();

                try {
                  if (!isEmpty(response)) {
                    const informacionRetenciones = JSON.parse(response.body);
                    log.debug("despues recibir respuesta del suitlet", "despues parse=" + JSON.stringify(informacionRetenciones));
                    const tipoTransaccionOriginal = informacionRetenciones.tipoTransaccionOriginal;
                    const id_transactionOriginal = informacionRetenciones.idTransaccionOriginal;

                    log.debug("afterSubmitCalcRet", "id_transactionOriginal: " + id_transactionOriginal);

                    if ((!isEmpty(informacionRetenciones)) && (informacionRetenciones.error == false) && (!isEmpty(informacionRetenciones.retencion_IRPF) || !isEmpty(informacionRetenciones.retencion_IRNR) || !isEmpty(informacionRetenciones.retencion_IRAE) || !isEmpty(informacionRetenciones.retencion_IVA))) {
                      const entity = informacionRetenciones.entity;
                      const subsidiary = informacionRetenciones.subsidiariaTransaccion;
                      const estado_vb = informacionRetenciones.estado;
                      const tranidTransaccionOrigen = informacionRetenciones.tranidTransaccionOrigen;
                      //var trandateTransaccionOrigen = isEmpty(informacionRetenciones.fechaVenci) ? informacionRetenciones.trandate : informacionRetenciones.fechaVenci;
                      const trandateTransaccionOrigen = informacionRetenciones.trandate;
                      const dueDateTransaccionOrigen = informacionRetenciones.duedateRetencion;
                      let total_ret = 0.00;
                      let totalRetIRPF = 0.00;
                      let totalRetIRNR = 0.00;
                      let totalRetIRAE = 0.00;
                      let totalRetIVA = 0.00;
                      const idCTRetencion = "customtransaction_l598_retencion";
                      let idRetencionNueva = null;
                      var retencionDetalle = [];

                      //TRANSACCION CON ESTADO
                      if (estado_vb == 2 || (estado_vb == 1 && sePermiteProcesarEnFacturaPendiente())) {
                        //INICIO - CREACION DEL CUSTOM DE RETENCIONES					           
                        try {
                          //SI EXISTE INFORMACION PARA RETENCIONES
                          if ((!isEmpty(informacionRetenciones.retencion_IRPF) && informacionRetenciones.retencion_IRPF.length > 0) ||
                            (!isEmpty(informacionRetenciones.retencion_IRNR) && informacionRetenciones.retencion_IRNR.length > 0) ||
                            (!isEmpty(informacionRetenciones.retencion_IVA) && informacionRetenciones.retencion_IVA.length > 0) ||
                            (!isEmpty(informacionRetenciones.retencion_IRAE) && informacionRetenciones.retencion_IRAE.length > 0)) {
                              var location = objRecord.getValue('location');
                              var department = objRecord.getValue("department");
                              var clase = objRecord.getValue('class');
                              const recRetencion = record.create({
                              type: idCTRetencion,
                              isDynamic: true
                            });
                            if (esOneWorld) {
                              recRetencion.setValue("subsidiary", subsidiary);
                            }
                            const partesFecha = trandateTransaccionOrigen.split("/");
                            // javascript necesita format MM/DD/YYYY
                            const trandateFormateada = new Date(`${partesFecha[1]}/${partesFecha[0]}/${partesFecha[2]}`);
                            recRetencion.setValue("trandate", trandateFormateada);
                            recRetencion.setValue("tranid", "Retencion " + tranidTransaccionOrigen);
                            recRetencion.setValue("custbody_l598_resguardo_direccion_prov", informacionRetenciones.direccion);
                            recRetencion.setValue("currency", informacionRetenciones.monedaTransaccionOriginal);
                            recRetencion.setValue("custbody_l598_resguardo_ciudad", informacionRetenciones.ciudad);
                            recRetencion.setValue("custbody_l598_resguardo_pais", informacionRetenciones.pais);
                            recRetencion.setValue("custbody_l598_resguardo_cod_postal", informacionRetenciones.codPostal);
                            recRetencion.setValue("custbody_l598_resguardo_fact_vinculada", id_transactionOriginal);
                            recRetencion.setValue("custbody_l598_codigo_ret_irpf", informacionRetenciones.codRetencionIRPF);
                            recRetencion.setValue("custbody_l598_codigo_ret_irnr", informacionRetenciones.codRetencionIRNR);
                            recRetencion.setValue("custbody_l598_codigo_ret_iva", informacionRetenciones.codRetencionIVA);
                            recRetencion.setValue("custbody_l598_codigo_ret_irae", informacionRetenciones.codRetencionIRAE);
                            recRetencion.setValue("custbody_l598_tipo_documento", informacionRetenciones.uruTipoDoc);
                            recRetencion.setValue("custbody_l598_nro_documento", informacionRetenciones.uruNroDoc);
                            recRetencion.setValue("custbody_l598_razon_social_cliente", informacionRetenciones.uruRazonSoc);
                            recRetencion.setValue("custbody_l598_resguardo_proveedor", entity);
                            log.debug("braian9", "antes de custbody_l598_fecha_venc_retenc");
                            recRetencion.setValue("custbody_l598_fecha_venc_retenc", new Date(dueDateTransaccionOrigen));
                            recRetencion.setValue("custbody_l598_transaccion_origen_reten", id_transactionOriginal);
                            log.debug("antes de entrar a", "SI EXISTE INFORMACION PARA RETENCIO IRPF");
                            //INICIO - SI EXISTE INFORMACION PARA RETENCIO IRPF
                            for (let i = 0; !isEmpty(informacionRetenciones.retencion_IRPF) && i < informacionRetenciones.retencion_IRPF.length /*&& !isEmpty(ccIRPF)*/; i++) {
                              let retImporte = 0.00;
                              let retImporteMO = 0.00;
                              let retImporteAUX = 0.00;
                              let retImporteAUXMO = 0.00;
                              let debito = 0.00;
                              let credito = 0.00;
                              let indFacturacion;
                              if(informacionRetenciones.retencion_IRPF[i].transacId == recId){
                                retImporte = parseFloat(informacionRetenciones.retencion_IRPF[i].retImporte).toFixedOK(2);
                                retImporteMO = parseFloat(informacionRetenciones.retencion_IRPF[i].retImporteMO).toFixedOK(2);
                                //INICIO - LINEAS DE ASIENTOS
                                recRetencion.selectNewLine("line");
                                if (!isEmpty(location))
																  recRetencion.setCurrentSublistValue('line', 'location', location);
                                if (!isEmpty(department))
                                  recRetencion.setCurrentSublistValue('line', 'department', department);
                                if (!isEmpty(clase))
                                  recRetencion.setCurrentSublistValue('line', 'class', clase);
                                recRetencion.setCurrentSublistValue("line", "account", informacionRetenciones.retencion_IRPF[i].cContableRet);
                                if (tipoTransaccionOriginal == "vendorbill") {
                                  debito = 0.00;
                                  credito = retImporteMO;
                                  indFacturacion = 0;
                                  retImporteAUX = retImporte;
                                  retImporteAUXMO = retImporteMO;
                                }
                                if (tipoTransaccionOriginal == "vendorcredit") {
                                  debito = retImporteMO;
                                  credito = 0.00;
                                  indFacturacion = 9;
                                  retImporteAUX = parseFloat(retImporte, 10) * parseFloat(-1, 10).toFixedOK(2);
                                  retImporteAUXMO = parseFloat(retImporteMO, 10) * parseFloat(-1, 10).toFixedOK(2);
                                }

                                recRetencion.setCurrentSublistValue("line", "debit", debito);
                                recRetencion.setCurrentSublistValue("line", "credit", credito);
                                recRetencion.setCurrentSublistValue("line", "entity", entity);
                                recRetencion.setCurrentSublistValue("line", "memo", informacionRetenciones.retencion_IRPF[i].transacTrandId);
                                recRetencion.commitLine("line");

                                recRetencion.selectNewLine("line");
                                if (!isEmpty(department))
																  recRetencion.setCurrentSublistValue('line', 'department', department);
                                if (!isEmpty(location))
                                  recRetencion.setCurrentSublistValue('line', 'location', location);
                                if (!isEmpty(clase))
                                  recRetencion.setCurrentSublistValue('line', 'class', clase);
															
                                recRetencion.setCurrentSublistValue("line", "account", informacionRetenciones.retencion_IRPF[i].transacCContable);
                                recRetencion.setCurrentSublistValue("line", "debit", credito);
                                recRetencion.setCurrentSublistValue("line", "credit", debito);
                                recRetencion.setCurrentSublistValue("line", "entity", entity);
                                recRetencion.setCurrentSublistValue("line", "memo", informacionRetenciones.retencion_IRPF[i].transacTrandId);
                                recRetencion.commitLine("line");
                                //FIN - LINEAS DE ASIENTOS

                                //LINEA DE DETALE RETENCION
                                recRetencion.selectNewLine("recmachcustrecord_l598_ret_detalle_transaccion");
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord__l598_ret_detalle_transaccion", informacionRetenciones.retencion_IRPF[i].transacId);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_esta_rete_id", "A");
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_esta_rete", "Pendiente por Resguardo");
                                let fechaRetencion = new Date(informacionRetenciones.retencion_IRPF[i].transacFecha);
                                fechaRetencion = format.parse({
                                  value: fechaRetencion,
                                  type: format.Type.DATE
                                });
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_fecha_trans", fechaRetencion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_moneda_trans", informacionRetenciones.retencion_IRPF[i].transacMoneda);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_tipo_cambio", informacionRetenciones.retencion_IRPF[i].transacTCambio);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_tipo_ret", informacionRetenciones.retencion_IRPF[i].retTipo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_cod_ret", informacionRetenciones.retencion_IRPF[i].codigo_retencion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_alicuota", informacionRetenciones.retencion_IRPF[i].retAlicuota);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_base_calculo", informacionRetenciones.retencion_IRPF[i].retBaseCalculo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_base_cal_fin", informacionRetenciones.retencion_IRPF[i].retBaseCalculo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_importe", retImporteAUXMO);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_imp_ret_fina", retImporteAUXMO);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_ind_facturac", indFacturacion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_rectype", tipoTransaccionOriginal);
                                recRetencion.setCurrentSublistValue('recmachcustrecord_l598_ret_detalle_transaccion', 'custrecord_l598_ret_detalle_uru_cod_ret',  informacionRetenciones.codRetencionIRPF);
                                recRetencion.commitLine("recmachcustrecord_l598_ret_detalle_transaccion");
                                
                                total_ret = parseFloat(total_ret, 10) + parseFloat(retImporteAUX, 10);
                                totalRetIRPF = parseFloat(totalRetIRPF, 10) + parseFloat(retImporteAUX, 10);
                              }else{
                                var arrayRetencion = []
                                arrayRetencion.push(informacionRetenciones.retencion_IRPF[i].transacId);//0
                                arrayRetencion.push('A');//1
                                arrayRetencion.push('Pendiente por Resguardo');//2
                                arrayRetencion.push(informacionRetenciones.retencion_IRPF[i].transacFecha);//3
                                arrayRetencion.push(informacionRetenciones.retencion_IRPF[i].transacMoneda);//4
                                arrayRetencion.push(informacionRetenciones.retencion_IRPF[i].transacTCambio);//5
                                arrayRetencion.push(informacionRetenciones.retencion_IRPF[i].retTipo);//6
                                arrayRetencion.push(informacionRetenciones.retencion_IRPF[i].codigo_retencion);//7
                                arrayRetencion.push(informacionRetenciones.retencion_IRPF[i].retAlicuota);//8
                                arrayRetencion.push(informacionRetenciones.retencion_IRPF[i].retBaseCalculo);//9
                                arrayRetencion.push(informacionRetenciones.retencion_IRPF[i].retImporteMO);//10
                                arrayRetencion.push(tipoTransaccionOriginal);//11
                                arrayRetencion.push(informacionRetenciones.codRetencionIRPF);//12
                                retencionDetalle.push(arrayRetencion)
                              }
                              
                            }
                            //FIN - SI EXISTE INFORMACION PARA RETENCIO IRPF

                            //INICIO - SI EXISTE INFORMACION PARA RETENCIO IRNR
                            for (let i = 0; !isEmpty(informacionRetenciones.retencion_IRNR) && i < informacionRetenciones.retencion_IRNR.length /*&& !isEmpty(ccIRNR)*/; i++) {
                              let retImporte = 0.00;
                              let retImporteMO = 0.00;
                              let retImporteAUX = 0.00;
                              let retImporteAUXMO = 0.00;
                              let debito = 0.00;
                              let credito = 0.00;
                              let indFacturacion;
                              if(informacionRetenciones.retencion_IRNR[i].transacId == recId){
                                retImporte = parseFloat(informacionRetenciones.retencion_IRNR[i].retImporte).toFixedOK(2);
                                retImporteMO = parseFloat(informacionRetenciones.retencion_IRNR[i].retImporteMO).toFixedOK(2);
                                //INICIO - LINEAS DE ASIENTOS
                                recRetencion.selectNewLine("line");
                                if (!isEmpty(location))
																	recRetencion.setCurrentSublistValue('line', 'location', location);
																if (!isEmpty(department))
																	recRetencion.setCurrentSublistValue('line', 'department', department);
																if (!isEmpty(clase))
																	recRetencion.setCurrentSublistValue('line', 'class', clase);
                                recRetencion.setCurrentSublistValue("line", "account", informacionRetenciones.retencion_IRNR[i].cContableRet);
                                if (tipoTransaccionOriginal == "vendorbill") {
                                  debito = 0.00;
                                  credito = retImporteMO;
                                  indFacturacion = 0;
                                  retImporteAUX = retImporte;
                                  retImporteAUXMO = retImporteMO;
                                }
                                if (tipoTransaccionOriginal == "vendorcredit") {
                                  debito = retImporteMO;
                                  credito = 0.00;
                                  indFacturacion = 9;
                                  retImporteAUX = parseFloat(retImporte, 10) * parseFloat(-1, 10).toFixedOK(2);
                                  retImporteAUXMO = parseFloat(retImporteMO, 10) * parseFloat(-1, 10).toFixedOK(2);
                                }
                                recRetencion.setCurrentSublistValue("line", "debit", debito);
                                recRetencion.setCurrentSublistValue("line", "credit", credito);
                                recRetencion.setCurrentSublistValue("line", "entity", entity);
                                recRetencion.setCurrentSublistValue("line", "memo", informacionRetenciones.retencion_IRNR[i].transacTrandId);
                                recRetencion.commitLine("line");

                                recRetencion.selectNewLine("line");
                                if (!isEmpty(department))
																	recRetencion.setCurrentSublistValue('line', 'department', department);
																if (!isEmpty(location))
																	recRetencion.setCurrentSublistValue('line', 'location', location);
																if (!isEmpty(clase))
																	recRetencion.setCurrentSublistValue('line', 'class', clase);
                                recRetencion.setCurrentSublistValue("line", "account", informacionRetenciones.retencion_IRNR[i].transacCContable);
                                recRetencion.setCurrentSublistValue("line", "debit", credito);
                                recRetencion.setCurrentSublistValue("line", "credit", debito);
                                recRetencion.setCurrentSublistValue("line", "entity", entity);
                                recRetencion.setCurrentSublistValue("line", "memo", informacionRetenciones.retencion_IRNR[i].transacTrandId);
                                recRetencion.commitLine("line");
                                //FIN - LINEAS DE ASIENTOS
                                //LINEA DE DETALE RETENCION
                                recRetencion.selectNewLine("recmachcustrecord_l598_ret_detalle_transaccion");
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord__l598_ret_detalle_transaccion", informacionRetenciones.retencion_IRNR[i].transacId);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_esta_rete_id", "A");
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_esta_rete", "Pendiente por Resguardo");
                                let fechaRetencion = new Date(informacionRetenciones.retencion_IRNR[i].transacFecha);
                                fechaRetencion = format.parse({
                                  value: fechaRetencion,
                                  type: format.Type.DATE
                                });
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_fecha_trans", fechaRetencion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_moneda_trans", informacionRetenciones.retencion_IRNR[i].transacMoneda);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_tipo_cambio", informacionRetenciones.retencion_IRNR[i].transacTCambio);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_tipo_ret", informacionRetenciones.retencion_IRNR[i].retTipo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_cod_ret", informacionRetenciones.retencion_IRNR[i].codigo_retencion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_alicuota", informacionRetenciones.retencion_IRNR[i].retAlicuota);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_base_calculo", informacionRetenciones.retencion_IRNR[i].retBaseCalculo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_base_cal_fin", informacionRetenciones.retencion_IRNR[i].retBaseCalculo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_importe", retImporteAUXMO);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_imp_ret_fina", retImporteAUXMO);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_ind_facturac", indFacturacion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_rectype", tipoTransaccionOriginal);
                                recRetencion.setCurrentSublistValue('recmachcustrecord_l598_ret_detalle_transaccion', 'custrecord_l598_ret_detalle_uru_cod_ret',  informacionRetenciones.codRetencionIRNR); // Agregado
																recRetencion.commitLine("recmachcustrecord_l598_ret_detalle_transaccion");
                                total_ret = parseFloat(total_ret, 10) + parseFloat(retImporteAUX, 10);
                                totalRetIRNR = parseFloat(totalRetIRNR, 10) + parseFloat(retImporteAUX, 10);
                              }else{
                                var arrayRetencion = []
																arrayRetencion.push(informacionRetenciones.retencion_IRNR[i].transacId);
																arrayRetencion.push('A');
																arrayRetencion.push('Pendiente por Resguardo');
																arrayRetencion.push(informacionRetenciones.retencion_IRNR[i].transacFecha);
																arrayRetencion.push(informacionRetenciones.retencion_IRNR[i].transacMoneda);
																arrayRetencion.push(informacionRetenciones.retencion_IRNR[i].transacTCambio);
																arrayRetencion.push(informacionRetenciones.retencion_IRNR[i].retTipo);
																arrayRetencion.push(informacionRetenciones.retencion_IRNR[i].codigo_retencion);
																arrayRetencion.push(informacionRetenciones.retencion_IRNR[i].retAlicuota);
																arrayRetencion.push(informacionRetenciones.retencion_IRNR[i].retBaseCalculo);
																arrayRetencion.push(informacionRetenciones.retencion_IRNR[i].retImporteMO);
																arrayRetencion.push(tipoTransaccionOriginal);
																arrayRetencion.push(informacionRetenciones.codRetencionIRNR);
																retencionDetalle.push(arrayRetencion)
                              }
                            }
                            //FIN - SI EXISTE INFORMACION PARA RETENCIO IRNR

                            //INICIO - SI EXISTE INFORMACION PARA RETENCIO IRAE
                            for (let i = 0; !isEmpty(informacionRetenciones.retencion_IRAE) && i < informacionRetenciones.retencion_IRAE.length /*&& !isEmpty(ccIRAE)*/; i++) {
                              let retImporte = 0.00;
                              let retImporteMO = 0.00;
                              let retImporteAUX = 0.00;
                              let retImporteAUXMO = 0.00;
                              let debito = 0.00;
                              let credito = 0.00;
                              let indFacturacion;
                              if(informacionRetenciones.retencion_IRAE[i].transacId == recId){
                                retImporte = parseFloat(informacionRetenciones.retencion_IRAE[i].retImporte).toFixedOK(2);
                                retImporteMO = parseFloat(informacionRetenciones.retencion_IRAE[i].retImporteMO).toFixedOK(2);
                                //INICIO - LINEAS DE ASIENTOS
                                recRetencion.selectNewLine("line");
                                if (!isEmpty(location))
																recRetencion.setCurrentSublistValue('line', 'location', location);
                                if (!isEmpty(department))
                                  recRetencion.setCurrentSublistValue('line', 'department', department);
                                if (!isEmpty(clase))
                                  recRetencion.setCurrentSublistValue('line', 'class', clase);
                                recRetencion.setCurrentSublistValue("line", "account", informacionRetenciones.retencion_IRAE[i].cContableRet);
                                if (tipoTransaccionOriginal == "vendorbill") {
                                  debito = 0.00;
                                  credito = retImporteMO;
                                  indFacturacion = 0;
                                  retImporteAUX = retImporte;
                                  retImporteAUXMO = retImporteMO;
                                }
                                if (tipoTransaccionOriginal == "vendorcredit") {
                                  debito = retImporteMO;
                                  credito = 0.00;
                                  indFacturacion = 9;
                                  retImporteAUX = parseFloat(retImporte, 10) * parseFloat(-1, 10).toFixedOK(2);
                                  retImporteAUXMO = parseFloat(retImporteMO, 10) * parseFloat(-1, 10).toFixedOK(2);
                                }
                                recRetencion.setCurrentSublistValue("line", "debit", debito);
                                recRetencion.setCurrentSublistValue("line", "credit", credito);
                                recRetencion.setCurrentSublistValue("line", "entity", entity);
                                recRetencion.setCurrentSublistValue("line", "memo", informacionRetenciones.retencion_IRAE[i].transacTrandId);
                                recRetencion.commitLine("line");

                                recRetencion.selectNewLine("line");
                                if (!isEmpty(department))
																recRetencion.setCurrentSublistValue('line', 'department', department);
                                if (!isEmpty(location))
                                  recRetencion.setCurrentSublistValue('line', 'location', location);
                                if (!isEmpty(clase))
                                  recRetencion.setCurrentSublistValue('line', 'class', clase);
                                recRetencion.setCurrentSublistValue("line", "account", informacionRetenciones.retencion_IRAE[i].transacCContable);
                                recRetencion.setCurrentSublistValue("line", "debit", credito);
                                recRetencion.setCurrentSublistValue("line", "credit", debito);
                                recRetencion.setCurrentSublistValue("line", "entity", entity);
                                recRetencion.setCurrentSublistValue("line", "memo", informacionRetenciones.retencion_IRAE[i].transacTrandId);
                                recRetencion.commitLine("line");
                                //FIN - LINEAS DE ASIENTOS
                                //LINEA DE DETALE RETENCION
                                recRetencion.selectNewLine("recmachcustrecord_l598_ret_detalle_transaccion");
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord__l598_ret_detalle_transaccion", informacionRetenciones.retencion_IRAE[i].transacId);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_esta_rete_id", "A");
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_esta_rete", "Pendiente por Resguardo");
                                let fechaRetencion = new Date(informacionRetenciones.retencion_IRAE[i].transacFecha);
                                fechaRetencion = format.parse({
                                  value: fechaRetencion,
                                  type: format.Type.DATE
                                });
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_fecha_trans", fechaRetencion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_moneda_trans", informacionRetenciones.retencion_IRAE[i].transacMoneda);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_tipo_cambio", informacionRetenciones.retencion_IRAE[i].transacTCambio);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_tipo_ret", informacionRetenciones.retencion_IRAE[i].retTipo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_cod_ret", informacionRetenciones.retencion_IRAE[i].codigo_retencion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_alicuota", informacionRetenciones.retencion_IRAE[i].retAlicuota);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_base_calculo", informacionRetenciones.retencion_IRAE[i].retBaseCalculo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_base_cal_fin", informacionRetenciones.retencion_IRAE[i].retBaseCalculo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_importe", retImporteAUXMO);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_imp_ret_fina", retImporteAUXMO);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_ind_facturac", indFacturacion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_rectype", tipoTransaccionOriginal);
                                recRetencion.setCurrentSublistValue('recmachcustrecord_l598_ret_detalle_transaccion', 'custrecord_l598_ret_detalle_uru_cod_ret', informacionRetenciones.codRetencionIRAE);
                                recRetencion.commitLine("recmachcustrecord_l598_ret_detalle_transaccion");
                                total_ret = parseFloat(total_ret, 10) + parseFloat(retImporteAUX, 10);
                                totalRetIRAE = parseFloat(totalRetIRAE, 10) + parseFloat(retImporteAUX, 10);
                              
                              }else{
                                var arrayRetencion = []
                                arrayRetencion.push(informacionRetenciones.retencion_IRAE[i].transacId);
                                arrayRetencion.push('A');
                                arrayRetencion.push('Pendiente por Resguardo');
                                arrayRetencion.push(informacionRetenciones.retencion_IRAE[i].transacFecha);
                                arrayRetencion.push(informacionRetenciones.retencion_IRAE[i].transacMoneda);
                                arrayRetencion.push(informacionRetenciones.retencion_IRAE[i].transacTCambio);
                                arrayRetencion.push(informacionRetenciones.retencion_IRAE[i].retTipo);
                                arrayRetencion.push(informacionRetenciones.retencion_IRAE[i].codigo_retencion);
                                arrayRetencion.push(informacionRetenciones.retencion_IRAE[i].retAlicuota);
                                arrayRetencion.push(informacionRetenciones.retencion_IRAE[i].retBaseCalculo);
                                arrayRetencion.push(informacionRetenciones.retencion_IRAE[i].retImporteMO);
                                arrayRetencion.push(tipoTransaccionOriginal);
                                arrayRetencion.push(informacionRetenciones.codRetencionIRAE);
                                retencionDetalle.push(arrayRetencion)
                              }
                             
                            }
                            //FIN - SI EXISTE INFORMACION PARA RETENCIO IRAE

                            //INICIO - SI EXISTE INFORMACION PARA RETENCIO IVA
                            for (let i = 0; !isEmpty(informacionRetenciones.retencion_IVA) && i < informacionRetenciones.retencion_IVA.length /*&& !isEmpty(ccIVA)*/; i++) {
                              let retImporte = 0.00;
                              let retImporteMO = 0.00;
                              let retImporteAUX = 0.00;
                              let retImporteAUXMO = 0.00;
                              let debito = 0.00;
                              let credito = 0.00;
                              let indFacturacion;
                              if(informacionRetenciones.retencion_IVA[i].transacId == recId){ 
                                retImporte = parseFloat(informacionRetenciones.retencion_IVA[i].retImporte).toFixedOK(2);
                                retImporteMO = parseFloat(informacionRetenciones.retencion_IVA[i].retImporteMO).toFixedOK(2);
                                //INICIO - LINEAS DE ASIENTOS
                                recRetencion.selectNewLine("line");
                                if (!isEmpty(location))
																  recRetencion.setCurrentSublistValue('line', 'location', location);
                                if (!isEmpty(department))
                                  recRetencion.setCurrentSublistValue('line', 'department', department);
                                if (!isEmpty(clase))
                                  recRetencion.setCurrentSublistValue('line', 'class', clase);
                                recRetencion.setCurrentSublistValue("line", "account", informacionRetenciones.retencion_IVA[i].cContableRet);
                                if (tipoTransaccionOriginal == "vendorbill") {
                                  debito = 0.00;
                                  credito = retImporteMO;
                                  indFacturacion = 0;
                                  retImporteAUX = retImporte;
                                  retImporteAUXMO = retImporteMO;
                                }
                                if (tipoTransaccionOriginal == "vendorcredit") {
                                  debito = retImporteMO;
                                  credito = 0.00;
                                  indFacturacion = 9;
                                  retImporteAUX = parseFloat(retImporte, 10) * parseFloat(-1, 10).toFixedOK(2);
                                  retImporteAUXMO = parseFloat(retImporteMO, 10) * parseFloat(-1, 10).toFixedOK(2);
                                }
                                recRetencion.setCurrentSublistValue("line", "debit", debito);
                                recRetencion.setCurrentSublistValue("line", "credit", credito);
                                recRetencion.setCurrentSublistValue("line", "entity", entity);
                                recRetencion.setCurrentSublistValue("line", "memo", informacionRetenciones.retencion_IVA[i].transacTrandId);
                                recRetencion.commitLine("line");
                              
                                recRetencion.selectNewLine("line");
                                if (!isEmpty(department))
                                  recRetencion.setCurrentSublistValue('line', 'department', department);
                                if (!isEmpty(location))
                                  recRetencion.setCurrentSublistValue('line', 'location', location);
                                if (!isEmpty(clase))
                                  recRetencion.setCurrentSublistValue('line', 'class', clase);
															  recRetencion.setCurrentSublistValue("line", "account", informacionRetenciones.retencion_IVA[i].transacCContable);
                                recRetencion.setCurrentSublistValue("line", "debit", credito);
                                recRetencion.setCurrentSublistValue("line", "credit", debito);
                                recRetencion.setCurrentSublistValue("line", "entity", entity);
                                recRetencion.setCurrentSublistValue("line", "memo", informacionRetenciones.retencion_IVA[i].transacTrandId);
                                recRetencion.commitLine("line");
                                //FIN - LINEAS DE ASIENTOS

                                //LINEA DE DETALE RETENCION
                                recRetencion.selectNewLine("recmachcustrecord_l598_ret_detalle_transaccion");
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord__l598_ret_detalle_transaccion", informacionRetenciones.retencion_IVA[i].transacId);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_esta_rete_id", "A");
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_esta_rete", "Pendiente por Resguardo");
                                let fechaRetencion = new Date(informacionRetenciones.retencion_IVA[i].transacFecha);
                                fechaRetencion = format.parse({
                                  value: fechaRetencion,
                                  type: format.Type.DATE
                                });
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_fecha_trans", fechaRetencion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_moneda_trans", informacionRetenciones.retencion_IVA[i].transacMoneda);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_tipo_cambio", informacionRetenciones.retencion_IVA[i].transacTCambio);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_tipo_ret", informacionRetenciones.retencion_IVA[i].retTipo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_cod_ret", informacionRetenciones.retencion_IVA[i].codigo_retencion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_alicuota", informacionRetenciones.retencion_IVA[i].retAlicuota);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_base_calculo", informacionRetenciones.retencion_IVA[i].retBaseCalculo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_base_cal_fin", informacionRetenciones.retencion_IVA[i].retBaseCalculo);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_importe", retImporteAUXMO);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_imp_ret_fina", retImporteAUXMO);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_ind_facturac", indFacturacion);
                                recRetencion.setCurrentSublistValue("recmachcustrecord_l598_ret_detalle_transaccion", "custrecord_l598_ret_detalle_rectype", tipoTransaccionOriginal);
                                recRetencion.setCurrentSublistValue('recmachcustrecord_l598_ret_detalle_transaccion', 'custrecord_l598_ret_detalle_uru_cod_ret', informacionRetenciones.codRetencionIVA);
                                recRetencion.commitLine("recmachcustrecord_l598_ret_detalle_transaccion");
                                total_ret = parseFloat(total_ret, 10) + parseFloat(retImporteAUX, 10);
                                totalRetIVA = parseFloat(totalRetIVA, 10) + parseFloat(retImporteAUX, 10);
                              }else{
                                var arrayRetencion = []
                                arrayRetencion.push(informacionRetenciones.retencion_IVA[i].transacId);
                                arrayRetencion.push('A');
                                arrayRetencion.push('Pendiente por Resguardo');
                                arrayRetencion.push(informacionRetenciones.retencion_IVA[i].transacFecha);
                                arrayRetencion.push(informacionRetenciones.retencion_IVA[i].transacMoneda);
                                arrayRetencion.push(informacionRetenciones.retencion_IVA[i].transacTCambio);
                                arrayRetencion.push(informacionRetenciones.retencion_IVA[i].retTipo);
                                arrayRetencion.push(informacionRetenciones.retencion_IVA[i].codigo_retencion);
                                arrayRetencion.push(informacionRetenciones.retencion_IVA[i].retAlicuota);
                                arrayRetencion.push(informacionRetenciones.retencion_IVA[i].retBaseCalculo);
                                arrayRetencion.push(informacionRetenciones.retencion_IVA[i].retImporteMO);
                                arrayRetencion.push(tipoTransaccionOriginal);
                                arrayRetencion.push(informacionRetenciones.codRetencionIVA);
                                retencionDetalle.push(arrayRetencion)
                              }
                            }
                            //FIN - SI EXISTE INFORMACION PARA RETENCIO IVA

                            //INICIO - SE SETEAN LOS TOTALES POR CADA TIPO DE RETENCION
                            recRetencion.setValue("custbody_l598_retencion_imp_ret_irpf", parseFloat(totalRetIRPF/informacionRetenciones.tipoCambio,10).toFixedOK(2));
                            recRetencion.setValue("custbody_l598_retencion_imp_ret_irnr", parseFloat(totalRetIRNR/informacionRetenciones.tipoCambio,10).toFixedOK(2));
                            recRetencion.setValue("custbody_l598_retencion_imp_ret_irae", parseFloat(totalRetIRAE/informacionRetenciones.tipoCambio,10).toFixedOK(2));
                            recRetencion.setValue("custbody_l598_retencion_imp_ret_iva", parseFloat(totalRetIVA/informacionRetenciones.tipoCambio,10).toFixedOK(2));
                            //FIN - SE SETEAN LOS TOTALES POR CADA TIPO DE RETENCION

                            idRetencionNueva = recRetencion.save();

                            var objInformacionResguardo = {};
                            var informacionRetencionJson = JSON.stringify(retencionDetalle);			
                            objInformacionResguardo['newRetencion'] = informacionRetencionJson;
                            log.debug('Acumulado SS',JSON.stringify(objInformacionResguardo) )
                              const suiteletUrlDetalle = url.resolveScript({
                                scriptId: "customscript_l598_crear_ret_detalle_slv2",
                                deploymentId: "customdeploy_l598_crear_ret_detalle_slv2",
                                returnExternalUrl: true
                              });
                              const responseSLDetalle = https.post({
                                url: suiteletUrlDetalle,
                                body: objInformacionResguardo
                              });
                              var newRetencion = JSON.parse(response.body);
                            
                          }

                          if (!isEmpty(idRetencionNueva)) {
                            record.submitFields({
                              type: tipoTransaccionOriginal,
                              id: id_transactionOriginal,
                              values: {
                                "custbody_l598_link_retencion": idRetencionNueva
                              }
                            });
                            var respuesta = calcularGenerarResguardoAutomaticamente(subsidiary);
                            log.debug('respuesta',respuesta)
                            if(respuesta){
                              var objDetail = new Object();
                              var objRecord =  record.load({
                                type: idCTRetencion,
                                id: idRetencionNueva
                              });
															objDetail.idProveedor = objRecord.getValue('custbody_l598_resguardo_proveedor');
															objDetail.periodo = objRecord.getValue('postingperiod');
															objDetail.subsidiaria = objRecord.getValue('subsidiary');
															objDetail.moneda = objRecord.getValue('currency');
															objDetail.importeResguardo = parseFloat(objRecord.getValue('custbody_l598_retencion_imp_ret_irpf')) + parseFloat(objRecord.getValue('custbody_l598_retencion_imp_ret_irnr')) + parseFloat(objRecord.getValue('custbody_l598_retencion_imp_ret_irae')) + parseFloat(objRecord.getValue('custbody_l598_retencion_imp_ret_iva'));
															objDetail.idsRetenciones = objRecord.id;
															objDetail.sucursal = objRecord.getValue('custbody_l598_sucursal') || '';
															objDetail.tipoDocumento = objRecord.getValue('custbody_l598_tipo_documento');
															objDetail.nroDocumento = objRecord.getValue('custbody_l598_nro_documento');
															objDetail.razonSocial = objRecord.getValue('custbody_l598_razon_social_cliente');
                              
                              var direccion_prov_transaccion = objRecord.getValue('custbody_l598_resguardo_direccion_prov');
															var proveedorID = objRecord.getValue('custbody_l598_resguardo_proveedor');
                              
              								objDetail.direccion = direccion_prov_transaccion ? direccion_prov_transaccion : (search.lookupFields({ type: 'vendor', id: proveedorID, columns: ['address1'] }) || '');
															var ciudad_transaccion = objRecord.getValue('custbody_l598_resguardo_ciudad');
															objDetail.ciudad = ciudad_transaccion ? ciudad_transaccion : (search.lookupFields({ type: 'vendor', id: proveedorID, columns: ['city'] })|| '');
                              var country_transaccion = objRecord.getValue('custbody_l598_resguardo_pais');
															objDetail.pais = country_transaccion ? country_transaccion : (search.lookupFields({ type: 'vendor', id: proveedorID, columns: ['country'] }) || '');
															var codigo_transaccion = objRecord.getValue('custbody_l598_resguardo_cod_postal');
															objDetail.codigoPostal = codigo_transaccion ? codigo_transaccion : (search.lookupFields({ type: 'vendor', id: proveedorID, columns: ['zipcode'] }) || '');
                              objDetail.importeIRPF = parseFloat(objRecord.getValue('custbody_l598_retencion_imp_ret_irpf'));
															objDetail.importeIRNR = parseFloat(objRecord.getValue('custbody_l598_retencion_imp_ret_irnr'));
															objDetail.importeIRAE = parseFloat(objRecord.getValue('custbody_l598_retencion_imp_ret_irae'));
															objDetail.importeIVA = parseFloat(objRecord.getValue('custbody_l598_retencion_imp_ret_iva'));
															objDetail.fechaResguardo = objRecord.getValue('trandate');
															objDetail.fechaEmisionResguardo = objRecord.getValue('trandate');
                              
                              var transactionLookup = search.lookupFields({ type: 'transaction', id: objRecord.getValue('custbody_l598_transaccion_origen_reten'), columns: ['recordtype'] });
                              objDetail.origenRetencion = transactionLookup;

                              objDetail.auxKey = 1;
                              
                              var sublistFieldIds = [];
															var fieldCount = objRecord.getLineCount('recmachcustrecord_l598_ret_detalle_transaccion');
															for (var i = 0; i < fieldCount; i++) {
																var fieldId = objRecord.getSublistValue('recmachcustrecord_l598_ret_detalle_transaccion', 'id', i);
																sublistFieldIds.push(fieldId);
															}
															objDetail.idsRetencionesDet = sublistFieldIds.toString();
															objDetail.autor = runtime.getCurrentUser();
                              var objInformacionResguardo = {};
															var informacionResguardoJson = JSON.stringify(objDetail);			
															objInformacionResguardo['newResguardo'] = informacionResguardoJson;
                              log.debug('informacionResguardoJson',informacionResguardoJson)
                              var suiteletUrl = url.resolveScript({
                                scriptId: "customscript_l598_crear_resguardo_sl_v2",
                                deploymentId: "customdeploy_l598_crear_resguardo_sl_v2",
                                returnExternalUrl: true
                              });
                              log.debug('suiteletUrl', objInformacionResguardo)
                              var responseSL = https.post({
                                url: suiteletUrl,
                                body: objInformacionResguardo
                              });
                              var newRetencion = JSON.parse(responseSL.body);
                            }
                            try{
															var respuesta_aplicacion = aplicarRetencionFacturaAutomaticamente(subsidiary)
															if (respuesta_aplicacion){
																if(recType == 'vendorbill' ){
																	var objBill = new Object();
																	objBill.entity = entity;
																	objBill.currency = informacionRetenciones.monedaTransaccionOriginal;
																	objBill.memo = tranidTransaccionOrigen;
																	objBill.retencion = idRetencionNueva;
																	objBill.transaction = recId;
																	var informacionBillJson = JSON.stringify(objBill);
																	var objInformacionBill = {};			
																	objInformacionBill['pagoFactura'] = informacionBillJson;
                                  var suiteletUrl = url.resolveScript({
                                    scriptId: "customscript_l598_crear_pago_factura_slv",
                                    deploymentId: "customdeploy_l598_crear_pago_factura_slv",
                                    returnExternalUrl: true
                                  });
                                  var responseSL = https.post({
                                    url: suiteletUrl,
                                    body: objInformacionBill
                                  });
																	var newVendorPayment = JSON.parse(responseSL.body);
																
																}
															}
														}catch (e) {
															log.error('l598afterSubmit', 'Error generando vendor payment. Exception detalles: ' + e.message);
														}
                          }

                          if (informacionRetenciones.poseeRetencionIRPF == false && informacionRetenciones.poseeRetencionIRNR == false && informacionRetenciones.poseeRetencionIRAE == false && informacionRetenciones.poseeRetencionIVA == false) {
                            objRta.warning = true;
                            objRta.mensajeWarning = "No se generó la transacción de URU-Retención porque no existen datos de retenciones para generarla.";

                            const mensajeRet = "No cumple mínimo  para calcular retencion: ";
                            let strRetencion = "";

                            if (informacionRetenciones.noCumpleMinimoIRPF)
                              strRetencion = "IRPF, ";

                            if (informacionRetenciones.noCumpleMinimoIRNR)
                              strRetencion = strRetencion + "IRNR, ";

                            if (informacionRetenciones.noCumpleMinimoIRAE)
                              strRetencion = strRetencion + "IRAE, ";

                            if (informacionRetenciones.noCumpleMinimoIVA)
                              strRetencion = strRetencion + "IVA";

                            if ((strRetencion.toString().length) > 1)
                              log.debug("l598afterSubmit", mensajeRet + strRetencion);

                            if (!isEmpty(idRetencionNueva)) {
                              log.debug("l598afterSubmit", "Se generó la siguiente retención: " + idRetencionNueva);
                            } else if ((strRetencion.toString().length) <= 1) {
                              log.debug("l598afterSubmit", "El proceso de cálculo de retenciones ha finalizado correctamente. \n" + objRta.mensajeWarning);
                            }
                          } else {
                            let mensajeRet = "No cumple mínimo  para calcular retencion: ";
                            let strRetencion = "";
                            if (informacionRetenciones.noCumpleMinimoIRPF)
                              strRetencion = "IRPF, ";

                            if (informacionRetenciones.noCumpleMinimoIRNR)
                              strRetencion = strRetencion + "IRNR, ";

                            if (informacionRetenciones.noCumpleMinimoIRAE)
                              strRetencion = strRetencion + "IRAE, ";

                            if (informacionRetenciones.noCumpleMinimoIVA)
                              strRetencion = strRetencion + "IVA";

                            if ((strRetencion.toString().length) > 1)
                              log.debug("l598afterSubmit", mensajeRet + strRetencion);

                            mensajeRet = "La transaccion actual ya posee retención: ";
                            strRetencion = "";

                            if (informacionRetenciones.poseeRetencionIRPF)
                              strRetencion = "IRPF, ";

                            if (informacionRetenciones.poseeRetencionIRNR)
                              strRetencion = strRetencion + "IRNR, ";

                            if (informacionRetenciones.poseeRetencionIRAE)
                              strRetencion = strRetencion + "IRAE, ";

                            if (informacionRetenciones.poseeRetencionIVA)
                              strRetencion = strRetencion + "IVA";

                            if ((strRetencion.toString().length) > 1)
                              log.debug("l598afterSubmit", mensajeRet + strRetencion);

                            if (!isEmpty(idRetencionNueva)) {
                              log.debug("l598afterSubmit", "Se generó la siguiente retención: " + idRetencionNueva);
                            }
                          }
                        } catch (e) {
                          log.error("l598afterSubmit", "Error generando retenciones. Exception detalles: " + e.message);
                        }
                        //FIN - CREACION DEL CUSTOM DE RETENCIONES
                      } else {
                        objRta.warning = true;
                        objRta.mensajeWarning = "La transacción debe estar con estado aprobada para proceder al calculo de las retenciones";
                        log.error("l598afterSubmit", "La transacción debe estar con estado aprobada para proceder al calculo de las retenciones");
                      }
                    } else {
                      if (!informacionRetenciones.error) {
                        if (informacionRetenciones.poseeRetencionIRPF == false && informacionRetenciones.poseeRetencionIRNR == false && informacionRetenciones.poseeRetencionIRAE == false && informacionRetenciones.poseeRetencionIVA == false) {
                          objRta.warning = true;
                          objRta.mensajeWarning = "No se generó la transacción de URU-Retención porque no existen datos de retenciones para generarla.";

                          const mensajeRet = "No cumple mínimo  para calcular retencion: ";
                          let strRetencion = "";

                          if (informacionRetenciones.noCumpleMinimoIRPF)
                            strRetencion = "IRPF, ";

                          if (informacionRetenciones.noCumpleMinimoIRNR)
                            strRetencion = strRetencion + "IRNR, ";

                          if (informacionRetenciones.noCumpleMinimoIRAE)
                            strRetencion = strRetencion + "IRAE, ";

                          if (informacionRetenciones.noCumpleMinimoIVA)
                            strRetencion = strRetencion + "IVA";

                          if ((strRetencion.toString().length) > 1) {
                            log.debug("l598afterSubmit", mensajeRet + strRetencion);
                          }

                          log.debug("l598afterSubmit", "No existen datos de retenciones para generar retención");
                        } else {
                          let mensajeRet = "La transaccion actual ya posee retención: ";
                          let strRetencion = "";

                          if (informacionRetenciones.poseeRetencionIRPF)
                            strRetencion = "IRPF, ";

                          if (informacionRetenciones.poseeRetencionIRNR)
                            strRetencion = strRetencion + "IRNR, ";

                          if (informacionRetenciones.poseeRetencionIRAE)
                            strRetencion = strRetencion + "IRAE, ";

                          if (informacionRetenciones.poseeRetencionIVA)
                            strRetencion = strRetencion + "IVA";

                          if ((strRetencion.toString().length) > 1)
                            log.debug("l598afterSubmit", mensajeRet + strRetencion);


                          mensajeRet = "No cumple mínimo  para calcular retencion: ";
                          strRetencion = "";
                          if (informacionRetenciones.noCumpleMinimoIRPF)
                            strRetencion = "IRPF, ";

                          if (informacionRetenciones.noCumpleMinimoIRNR)
                            strRetencion = strRetencion + "IRNR, ";

                          if (informacionRetenciones.noCumpleMinimoIRAE)
                            strRetencion = strRetencion + "IRAE, ";

                          if (informacionRetenciones.noCumpleMinimoIVA)
                            strRetencion = strRetencion + "IVA";

                          if ((strRetencion.toString().length) > 1)
                            log.debug("l598afterSubmit", mensajeRet + strRetencion);
                        }
                        record.submitFields({
                          type: tipoTransaccionOriginal,
                          id: id_transactionOriginal,
                          values: {
                            "custbody_l598_cal_ret_auto": false
                          }
                        });
                      } else {
                        log.debug("l598afterSubmit", informacionRetenciones.mensajeError[0]);
                      }
                    }
                  }
                } catch (err) {
                  log.error("l598afterSubmit", "Error before submit del " + recType + " - NetSuite error: " + err.message);
                  objRta.error = true;
                  objRta.mensajeError = "Error before submit del " + recType + " - NetSuite error: " + err.message;
                }
              } catch (err) {
                log.error("l598afterSubmit", "Error en el SUITELET calculando retenciones. Excepcion: " + err.message);
              }
            } else {
              log.error("l598afterSubmit", "Importe de la transaccion menor o igual a cero.");
            }
          } else {
            log.error("l598afterSubmit", "La transaccion debe estar en Estado de Aprobación = Aprobada para proceder al calculo de las retenciones.");
          }
        }
      } else {
        log.debug("l598afterSubmit", mensajeError);
      }
    }

    // SETEO DE CAMPO URU-DETALLE RETENCION JSON
    if ((contextType == context.UserEventType.CREATE || contextType == context.UserEventType.COPY) && recType == "customtransaction_l598_resguardos") {

      try {

        log.debug("LINE 765", "Mode: " + contextType + " / recType: " + recType);

        // Load Transaction
        const reguardo_transaccion = record.load({
          type: recType,
          id: recId
        });
        
        let idsRetDetalle = reguardo_transaccion.getValue("custbody_l598_resguardo_ret_det_json");
        log.debug('calcularRetenciones', 'idsRetdetalle: ' + JSON.stringify(idsRetDetalle));
        //const lineNum2 = reguardo_transaccion.getLineCount("recmachcustrecord_l598_ret_detalle_resguardo");

        if (isEmpty(idsRetDetalle)) {
          // Loop through Retencion Detalle
          const lineNum = reguardo_transaccion.getLineCount("recmachcustrecord_l598_ret_detalle_resguardo");
          const arrayIdRetDetalle = [];

          for (let i = 0; i < lineNum; i++) {
            const id = reguardo_transaccion.getSublistValue("recmachcustrecord_l598_ret_detalle_resguardo", "id", i);
            arrayIdRetDetalle.push(id);
          }

          idsRetDetalle = arrayIdRetDetalle.toString();
        }

        //log.debug("LINE 782", "idsRetDetalle: " + idsRetDetalle + ' / lineNum2: ' + lineNum2);

        if (!isEmpty(idsRetDetalle)) {

          const arrayIdsRetDet = idsRetDetalle.split(",");
          log.debug("LINE 934", "arrayIdsRetDet: " + JSON.stringify(arrayIdsRetDet));

          if (!isEmpty(arrayIdsRetDet) && arrayIdsRetDet.length > 0) {
            const filters = new Array();
            filters[0] = search.createFilter({
              name: "internalid",
              operator: search.Operator.ANYOF,
              values: arrayIdsRetDet
            });
            let columns = new Array();
            columns[0] = search.createColumn({
              name: "internalid",
              join: "custrecord__l598_ret_detalle_transaccion",
              summary: search.Summary.GROUP
            });

            columns[1] = search.createColumn({
              name: "tranid",
              join: "custrecord__l598_ret_detalle_transaccion",
              summary: search.Summary.GROUP
            });

            columns[2] = search.createColumn({
              name: "custrecord_l598_ret_detalle_fecha_trans",
              summary: search.Summary.MAX
            });

            columns[3] = search.createColumn({
              name: "name",
              join: "custrecord_l598_ret_detalle_tipo_ret",
              summary: search.Summary.GROUP
            });

            columns[4] = search.createColumn({
              name: "custrecord_l598_ret_detalle_alicuota",
              summary: search.Summary.MAX
            });

            columns[5] = search.createColumn({
              name: "custrecord_l598_ret_detalle_base_cal_fin",
              summary: search.Summary.MAX
            });

            columns[6] = search.createColumn({
              name: "custrecord_l598_ret_detalle_imp_ret_fina",
              summary: search.Summary.MAX
            });

            columns[7] = search.createColumn({
              name: "custrecord_l598_ret_detalle_base_calculo",
              summary: search.Summary.MAX
            });

            columns[8] = search.createColumn({
              name: "symbol",
              join: "custrecord_l598_ret_detalle_moneda_trans",
              summary: search.Summary.MAX
            });

            columns[9] = search.createColumn({
              name: "custrecord_l598_ret_detalle_tipo_cambio",
              summary: search.Summary.MAX
            });

            columns[10] = search.createColumn({
              name: "custrecord_l598_ret_detalle_cod_ret",
              summary: search.Summary.MAX
            });

            const result = search.create({
              type: "customrecord_l598_ret_detalle",
              filters: filters,
              columns: columns
            }).run().getRange({
              start: 0,
              end: 1000
            });

            const customRecords = {
              columns: columns,
              results: result
            };

            columns = customRecords.columns;
            const results = customRecords.results;
            //custrecord = form.addField('custpage_custrecord_to_print', 'longtext', '', null, null),
            const custrecordArray = [];

            if (results && results instanceof Array) {
              for (let i = 0; i < results.length; i++) {
                const singleLine = {};
                for (let j = 0; j < columns.length; j++) {
                  let value = results[i].getValue(columns[j]);
                  if (j == 0 || j == 1 || j == 2 || j == 3 || j == 4 || j == 5 || j == 6 || j == 7 || j == 8 || j == 9) {
                    if (value.indexOf(".") == 0 || value.indexOf(",") == 0 || value.indexOf("-.") == 0 || value.indexOf("-,") == 0) {
                      value = "0" + value;
                    }
                  }
                  singleLine["col" + j] = (value) ? value : "";
                }
                custrecordArray.push(singleLine);
              }
              reguardo_transaccion.setValue("custbody_l598_resguardo_ret_det_json", JSON.stringify(custrecordArray));
              // Save Record
              const _idResguardo = reguardo_transaccion.save();
            }
          }
        }
      } catch (e) {
        log.error("Excepcion grabando transaccion (" + contextType + ")", "ID Interno transaccion : " + recId + " - NetSuite Error: " + e.message);
      }
    }

  }

  /*
     * función l598beforeSubmit
     */
  function beforeSubmit(context) {

    const contextType = context.type;
    const objRecord = context.newRecord;
    const recType = objRecord.type;
    const currentScript = runtime.getCurrentScript(); //nlapiGetContext();
    const paramEjecutarValidacion = currentScript.getParameter({
      name: "custscript_l598_calc_ret_val_resgret"
    });
    log.debug("beforeSubmit", "paramEjecutarValidacion: " + paramEjecutarValidacion);
    const tranVinculada = objRecord.getValue("custbody_l598_resguardo_fact_vinculada");
    const recId = objRecord.id;

    //SI LA TRANSACCION CORRESPONDE A UNA URU-RETENCION, SE DESEA EDITAR Y TIENE URU-FACTURA/NOTA DE CREDITO VINCULADA
    //Se valida que el contexto de ejecución sea USERINTERFACE debido a que es necesario que este script se ejecute en los contextos ya establecidos (mapreduce)
    //Y que en dichos contextos el proceso continúe su flujo normal, sin realizar la validación y generar error
    if (!isEmpty(paramEjecutarValidacion) && paramEjecutarValidacion === true && recType == "customtransaction_l598_retencion" && contextType == "edit" && !isEmpty(tranVinculada) && runtime.executionContext == runtime.ContextType.USER_INTERFACE) {
      const mensaje = "No se puede editar la transaccion de URU-Retencion porque la misma fue creada por el proceso automático de Cálculo de Retenciones y se encuentra vinculada a una Factura/Nota de Crédito - ID Transaccion: " + recId + " - TIPO Transaccion: URU-Retencion";
      throw error.create({
        name: "ERR001",
        message: mensaje,
        notifyOff: true
      });
    }

    //SI LA TRANSACCION CORRESPONDE A UNA URU-RESGUARDO Y ESTA VINCULADA A ALGUNA TRANSACCION DE URU-RETENCION DETALLE CON EL CAMPO TIPO TRANSACCIÓN NO VACÍO
    //Se valida que el contexto de ejecución sea USERINTERFACE debido a que es necesario que este script se ejecute en los contextos ya establecidos (mapreduce)
    //Y que en dichos contextos el proceso continúe su flujo normal, sin realizar la validación y generar error
    if (!isEmpty(paramEjecutarValidacion) && paramEjecutarValidacion === true && recType == "customtransaction_l598_resguardos" && contextType == "edit" && runtime.executionContext == "userinterface") {
      const filters = new Array();
      filters[0] = search.createFilter({
        name: "custrecord_l598_ret_detalle_resguardo",
        operator: search.Operator.IS,
        values: recId
      });
      filters[1] = search.createFilter({
        name: "custrecord_l598_ret_detalle_rectype",
        operator: search.Operator.ISNOTEMPTY
      });

      //var filters = [new nlobjSearchFilter('custrecord_l598_ret_detalle_resguardo', null, 'is', recId)];
      //var searchResults = new nlapiSearchRecord('customrecord_l598_ret_detalle', 'customsearch_l598_ret_detalle_w_resg', filters, null);

      const loadSearch = search.load({
        id: "customsearch_l598_ret_detalle_w_resg",
        filters: filters
      });

      const resultadoSearch = loadSearch.run();

      const searchResults = resultadoSearch.getRange({
        start: 0,
        end: 1000
      });

      if (searchResults != null && searchResults.length > 0) {
        const mensaje = "No se puede editar la transaccion de URU-Resguardo porque ya fue considerada en una transaccion de URU-Retención - ID Transaccion: " + recId + " - TIPO Transaccion: URU-Resguardo";
        throw error.create({
          name: "ERR002",
          message: mensaje,
          notifyOff: true
        });
      }
    }

    //SE BORRA EL LINK DE LA TRANSACCION QUE PUEDA TENER ASOCIADO (ESTO ES PARA CUANDO SE COPIA UNA TRANSACCION)
    if (context.type == context.UserEventType.CREATE) {

      objRecord.setValue("custbody_l598_link_retencion", null);
      objRecord.setValue("custbody_l598_calcular_sobre_iva", false);
    }

    if ((contextType == context.UserEventType.CREATE || contextType == context.UserEventType.EDIT) && recType == "vendorbill") {
      try {

        const duedate = objRecord.getValue("duedate");
        const trandate = objRecord.getValue("trandate");
        const duedateRetencion = !isEmptyOK(duedate) ? duedate : trandate;

        objRecord.setValue("custbody_l598_fecha_venc_retenc", duedateRetencion);

      } catch (err) {
        log.error("l598beforeSubmit", "Error en creando/editando VendorBill/VendorCredit, NetSuite Excepcion: " + err.message);
      }
    }

    //SI SE VA A ELIMINAR UNA TRANSACCION DEL TIPO URU-RETENCION
    //if (contextType == context.UserEventType.DELETE && (contextType == 'customtransaction_l598_retencion' || contextType == 'customtransaction_l598_anul_retencion'))
    /*
         * condición modificada
         */
    if (contextType == context.UserEventType.DELETE && (recType == "customtransaction_l598_retencion" || recType == "customtransaction_l598_anul_retencion")) {

      const idRec = objRecord.getValue("custbody_l598_resguardo_fact_vinculada");
      const numLinesRetDetalle = objRecord.getLineCount("recmachcustrecord_l598_ret_detalle_transaccion");
      let idRetDetalle;
      for (let i = 0; i < numLinesRetDetalle; i++) {
        //SE TUVO QUE USAR RECORD DELETE PORQUE AL GUARDAR LA TRANSACCION NO SE BORRABAN LOS REGISTROS
        idRetDetalle = objRecord.getSublistValue({
          sublistId: "recmachcustrecord_l598_ret_detalle_transaccion",
          fieldId: "id",
          line: i
        });
        try {
          objRecord.delete("customrecord_l598_ret_detalle", idRetDetalle);
        } catch (e) {
          log.error("l598beforeSubmitTransaction", "Ocurrio un error al borrar URU-Retencion Detalle asociadas al registro URU-Retencion: " + e.message);
        }
      }

      if (!isEmpty(idRec))
        record.submitFields({
          type: record.Type.VENDOR_BILL,
          id: idRec,
          values: {
            "custbody_l598_cal_ret_auto": false
          }
        });
    }


    //SI SE VA A ELIMINAR UNA TRANSACCION DEL TIPO URU-RESGUARDO
    /*
         * condición modificada
         */
    if (contextType == context.UserEventType.DELETE && recType == "customtransaction_l598_resguardos") {
      const idResguardo = objRecord.id;
      const numLinesDetRetenciones = objRecord.getLineCount("recmachcustrecord_l598_ret_detalle_resguardo");
      // const numLinesRefCFE = objRecord.getLineCount("recmachcustrecord_l598_info_referencia_transac");
      let idDetRetencione;
      // let idrefCFE;
      const arrayIdDetRetenciones = new Array();

      for (let i = 0; i < numLinesDetRetenciones; i++) {
        //SE TUVO QUE USAR RECORD DELETE PORQUE AL GUARDAR LA TRANSACCION NO SE BORRABAN LOS REGISTROS
        idDetRetencione = objRecord.getSublistValue({
          sublistId: "recmachcustrecord_l598_ret_detalle_resguardo",
          fieldId: "id",
          line: i
        });
        arrayIdDetRetenciones.push(idDetRetencione);
      }
      //nlapiLogExecution('DEBUG','LINE 766','Array de URU-Detalle Retencion: '+JSON.stringify(arrayIdDetRetenciones));

      if (!isEmpty(arrayIdDetRetenciones) && arrayIdDetRetenciones.length > 0) {
        //FILTRO DE ID INTERNO DE TRANSACCIONES
        const filter = search.createFilter({
          name: "internalid",
          operator: search.Operator.ANYOF,
          values: arrayIdDetRetenciones
        });

        //DECLARACION DEL SAVE SEARCH A EJECUTAR                
        const loadSearch = search.load({
          id: "customsearch_l598_ret_detalle_w_resg"
        });

        loadSearch.filters.push(filter);

        const resultadoSearch = loadSearch.run();


        const searchResults = resultadoSearch.getRange({
          start: 0,
          end: 1000
        });


        //nlapiLogExecution('DEBUG','LINE 775','Resultados del SS (customsearch_l598_ret_detalle_w_resg): '+searchResults.length);
        const arrayIdUruRetencion = new Array();

        for (let i = 0; !isEmpty(searchResults) && i < searchResults.length; i++) {
          const result = searchResults[i];
          const columns = result.columns;
          const idUruRetencion = result.getValue(columns[1]);
          arrayIdUruRetencion.push(idUruRetencion);
        }

        if (!isEmpty(arrayIdUruRetencion) && arrayIdUruRetencion.length > 0) {
          const arrayIdUruRetencionAux = arrayIdUruRetencion.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
          });

          //nlapiLogExecution('DEBUG','l598beforeSubmit','Ids de URU-Retenciones a actualizar: '+JSON.stringify(arrayIdUruRetencionAux)+' - Total: '+arrayIdUruRetencionAux.length);

          //INICIO - CAMBIAR ESTADO DE TRANSACCION DE URU-RETENCION A "PENDIENTE DE RESGUARDO"
          for (let i = 0; !isEmpty(arrayIdUruRetencionAux) && i < arrayIdUruRetencionAux.length; i++) {
            //ID TRANSACCION URU-RETENCION
            const idUruRet = arrayIdUruRetencionAux[i];

            if (!isEmpty(idUruRet)) {
              try {
                if (!isEmpty(idUruRet))
                  //nlapiSubmitField('customtransaction_l598_retencion',idUruRet,'transtatus','A');
                  record.submitFields({
                    type: "customtransaction_l598_retencion",
                    id: idUruRet,
                    values: {
                      "transtatus": "A"
                    }
                  });
              } catch (e) {
                log.error("Generacion URU-Resguardo", "Excepcion ocurrida mientras se actualizaba el estado de la transaccion de URU-Retencion: " + idUruRet + ". Detalles: " + e.message);
              }
            }
          }
        }

        const record_transaccion = record.load({
          type: recType,
          id: idResguardo,
          isDynamic: true
        });

        const sublistaRefCFE = "recmachcustrecord_l598_info_referencia_transac";
        const sublistaRefCFELines = record_transaccion.getLineCount(sublistaRefCFE);

        //nlapiLogExecution('DEBUG','LINE 839','sublistaRefCFELines: '+sublistaRefCFELines+' - record_transaccion: '+JSON.stringify(record_transaccion));
        if (!isEmpty(record_transaccion)) {
          try {
            for (let k = 0; !isEmpty(sublistaRefCFELines) && k < sublistaRefCFELines; k++) {
              record_transaccion.removeLine(sublistaRefCFE, 1);
              //nlapiLogExecution('DEBUG','LINE 845','INDICE: '+k+' - LINES Despues de REMOVE: '+record_transaccion.getLineItemCount(sublistaRefCFE));
            }
            /* var idResguardo = nlapiSubmitRecord(record_transaccion, {
                            disabletriggers: true,
                            enablesourcing: false
                        }); */
            const _idResguardo = record_transaccion.save();
            //nlapiLogExecution('DEBUG','LINE 851','ID RESGUARDO: '+idRL+' - SAVE');
          } catch (e) {
            log.error("l598beforeSubmitTransaction", "Ocurrio un error al borrar URU-Informacion Referencia asociadas al registro URU-Resguardo - ID URU-RESGUARDO: " + idResguardo + ". - Excepcion detalles: " + e.message);
          }
        }
      }
      /*for (var i=1; i <= numLinesRefCFE; i++)
            {
                for (var i=1; i <= numLinesRefCFE; i++)
                {
                    //SE TUVO QUE USAR RECORD DELETE PORQUE AL GUARDAR LA TRANSACCION NO SE BORRABAN LOS REGISTROS
                    idrefCFE = nlapiGetLineItemValue('recmachcustrecord_l598_info_referencia_transac','id',i);
                    try
                    {
                        nlapiDeleteRecord('customrecord_l598_info_referencia', idrefCFE);
                    }
                    catch(e)
                    {
                        nlapiLogExecution('ERROR', 'l598beforeSubmitTransaction', 'Ocurrio un error al borrar URU-Informacion Referencia asociadas al registro URU-Resguardo - ID REF CFE: '+idrefCFE+'. - Excepcion detalles: '+e.message);
                    }
                }
            }*/
    }

    let subsidiaria = null;
    const idTransaccion = objRecord.id;
    if (esOneworld())
      subsidiaria = objRecord.getValue("subsidiary");
    // Sólo para setear monto escrito al crear o editar
    if ((contextType == context.UserEventType.CREATE || contextType == context.UserEventType.EDIT) && recType == "customtransaction_l598_resguardos") {


      //URU-IMPORTE RESGUARDO
      let total = objRecord.getValue("custbody_l598_resguardo_importe");
      total = parseFloat(total, 10).toFixedOK(2);
      objRecord.setValue("custbody_l598_resguardo_importe", total);

      if (!isEmpty(total) && Math.abs(total) >= 0) {
        const numeroEnLetras = getNumeroEnLetras(total, subsidiaria);

        if (!isEmpty(numeroEnLetras)) {
          if (total >= 0) {
            objRecord.setValue("custbody_l598_monto_escrito", "SON " + numeroEnLetras);
          } else {
            objRecord.setValue("custbody_l598_monto_escrito", "SON MENOS " + numeroEnLetras);
          }
        } else {
          log.error("Error grabando transaccion (" + contextType + ")", "ID Interno Transaccion : " + idTransaccion + " - Error Generando MontoEscrito");
        }
      }
    }

    if ((contextType == context.UserEventType.CREATE || contextType == context.UserEventType.COPY) && recType == "customtransaction_l598_resguardos") {
      try {
        const serie = objRecord.getValue("custbody_l598_serie_comprobante");
        const sucursal = objRecord.getValue("custbody_l598_sucursal");
        const caja = objRecord.getValue("custbody_l598_caja");

        //FIN - CONSULTAR SUCURSAL POR DEFECTO
        let infoSucursal = null;
        log.debug("braian buscando error campos faltantes resguardo", `sucursal=${sucursal} | serie=${serie}`);
        if (isEmpty(sucursal) || isEmpty(serie)) {
          //OBTENER SUCURSAL
          log.debug("braian buscando error campos faltantes resguardo", "objRecord=" + JSON.stringify(objRecord));
          infoSucursal = obtenerSucursal(objRecord);
          log.debug("braian buscando error campos faltantes resguardo", "infoSucursal=" + JSON.stringify(infoSucursal));
          if (!isEmpty(infoSucursal)) {
            if (!isEmpty(infoSucursal.sucursal) && isEmpty(sucursal)) {
              objRecord.setValue("custbody_l598_sucursal", infoSucursal.sucursal);
            }
            if (!isEmpty(infoSucursal.serie) && isEmpty(serie)) {
              objRecord.setValue("custbody_l598_serie_comprobante", infoSucursal.serie);
            }
          } else {
            log.error("URU-Asignacion Indicador Facturacion", "Error Obteniendo la Serie y Sucursal por Defecto - ID Interno Transaccion : " + idTransaccion);
          }
        }

        log.debug("URU-Asignacion Indicador Facturacion", `LINE 2048 - LOG DE CONTROL POSTERIOR A SETEO DE SERIE, SUCURSAL / caja: ${caja} / sucursal: ${JSON.stringify(sucursal)}`);


        if (isEmpty(caja)) {
          //OBTENER CAJA PREFERIDA DE LA SUCURSAL
          let idSucursal = "";
          if (!isEmpty(sucursal)) {
            idSucursal = sucursal;
          } else {
            if (!isEmpty(infoSucursal)) {
              if (!isEmpty(infoSucursal.sucursal)) {
                idSucursal = infoSucursal.sucursal;
              }
            }
          }
          if (!isEmpty(idSucursal)) {
            const cajaPreferida = search.lookupFields({
              type: "customrecord_l598_sucursales",
              id: idSucursal,
              columns: ["custrecord_l598_sucursales_caja_pref"]
            });

            log.debug("URU-Asignacion Indicador Facturacion", `cajaPreferida: ${JSON.stringify(cajaPreferida)}`);
            if (!isEmpty(cajaPreferida) && cajaPreferida.custrecord_l598_sucursales_caja_pref.length > 0) {
              objRecord.setValue("custbody_l598_caja", cajaPreferida.custrecord_l598_sucursales_caja_pref[0].value);
            }
          }
        }
        //FIN - CONSULTAR SUCURSAL POR DEFECTO

        log.debug("URU-Asignacion Indicador Facturacion", "LINE 2076 - LOG DE CONTROL POSTERIOR A SETEO DE CAJA Y VALIDACION DE SUCURSAL.");

        const tipoTransStr = recType;
        const esND = false;
        const comprobanteContingencia = false;
        const comprobanteCuentaAjena = false;
        const esExportacion = false;
        const esETicket = false;

        const tipoTransLocal = obtenerTipoTransaccionLocal(tipoTransStr, esND, subsidiaria);

        if (!isEmpty(tipoTransLocal) && tipoTransLocal.error !== true) {
          const tipoComprobanteFE = obtenerTipoComprobanteFE(tipoTransLocal.tipoTransaccionLocal, esExportacion, comprobanteContingencia, comprobanteCuentaAjena, esETicket);

          if (!isEmpty(tipoComprobanteFE) && tipoComprobanteFE.error !== true) {
            //CONFIGURAR EL TIPO DE COMPROBANTE DE FACTURA ELECTRONICA
            objRecord.setValue("custbody_l598_tipo_comprobante", tipoComprobanteFE.tipoComprobanteFE);
          } else {
            log.error("Error grabando transaccion (" + contextType + ")", "ID Interno transaccion : " + idTransaccion + " - Error obteniendo el tipo de comprobante de Factura Electronica - Error : " + tipoComprobanteFE.mensaje);
          }
        } else {
          log.error("Error grabando transaccion (" + contextType + ")", "ID Interno transaccion : " + idTransaccion + " - Error : " + tipoTransLocal.mensaje);
        }
      } catch (e) {
        log.error("Excepcion grabando transaccion (" + contextType + ")", "ID Interno transaccion : " + idTransaccion + " - NetSuite Error: " + e.message);
      }
    }
  }

  function calcularGenerarResguardoAutomaticamente(subsidiaria) {
    var calcular_generar_resguardo_automaticamente = "F";
    var filters = ["isinactive", "is", "F"];
    
    if (!isEmpty(subsidiaria)) {
      filters.push("custrecord_l598_conf_proc_ret_subsidiari", "is", subsidiaria);
    }

    var results = search.create({
      type: "customrecord_l598_conf_proc_ret",
      columns: ["custrecord_l598_conf_proc_ret_cal_res_au"],
      filters: filters
    }).run().getRange({
      start: 0,
      end: 1
    });

    if (results != null && results.length > 0) {
      calcular_generar_resguardo_automaticamente = results[0].getValue("custrecord_l598_conf_proc_ret_cal_res_au");
    }
    log.debug('condicion',!isEmpty(calcular_generar_resguardo_automaticamente) && calcular_generar_resguardo_automaticamente )
    if (!isEmpty(calcular_generar_resguardo_automaticamente) && calcular_generar_resguardo_automaticamente) {
      return true;
    } else {
      return false;
    }
  }
  
    function aplicarRetencionFacturaAutomaticamente(subsidiaria) {
      var aplicar_retencion_factura_automaticamente = "F";
      var filters = ["isinactive", "is", "F"];
      
      if (!isEmpty(subsidiaria)) {
        filters.push("custrecord_l598_conf_proc_ret_subsidiari", "is", subsidiaria);
      }

      var results = search.create({
        type: "customrecord_l598_conf_proc_ret",
        columns: ["custrecord_l598_conf_proc_ret_ap_ret_fac"],
        filters: filters
      }).run().getRange({
        start: 0,
        end: 1
      });
  
      if (results != null && results.length > 0) {
        aplicar_retencion_factura_automaticamente = results[0].getValue("custrecord_l598_conf_proc_ret_ap_ret_fac");
      }
      
      if (!isEmpty(aplicar_retencion_factura_automaticamente) && aplicar_retencion_factura_automaticamente) {
        return true;
      } else {
        return false;
      }
    }

  return {
    beforeLoad: beforeLoad,
    beforeSubmit: beforeSubmit,
    afterSubmit: afterSubmit
  };

});
