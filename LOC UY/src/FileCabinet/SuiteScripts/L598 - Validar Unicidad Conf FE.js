/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */


define(["N/search", "N/currentRecord"],
  function (search, currentRecord) {
    /* global define */
    /***
     * Migrado desde L598-FacturaElectronica.js la funcion unicidadPanelConfFE, y sus dependencias.
     */

    // FUNCTION: l598isEmpty [lista - Renée]
    function l598isEmpty(value) {
      if (value === "" || value === null || value === undefined) {
        return true;
      } else {
        return false;
      }
    }


    function l598esOneworld() {
      const filters = [];
      // var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
      // new nlobjSearchFilter('custrecord_l598_dat_imp_es_oneworld', null, 'is', 'T')];

      filters[0] = search.createFilter({
        name: "isinactive",
        operator: search.Operator.IS,
        values: false
      });
      filters[1] = search.createFilter({
        name: "custrecord_l598_dat_imp_es_oneworld",
        operator: search.Operator.IS,
        values: true
      });

      //var searchresults = new nlapiSearchRecord("customrecord_l598_datos_impositivos_emp", null, filters, null);
      const searchresults = search.create({
        type: "customrecord_l598_datos_impositivos_emp",
        filters: filters,
        // columns:columns,
        // id: string //opc                       
      }).run().getRange({
        start: 0,
        end: 1000
      });

      if (searchresults != null && searchresults.length > 0)
        return true;
      else
        return false;
    }


    //function unicidadPanelConfFE()
    function saveRecord() {
      const proceso = 'saveRecord';
      const objRecord = currentRecord.get();
      const recId = objRecord.id;

      log.debug(proceso, `INICIO validacion unicidad FE`);

      let subsidiaria = "";
      if (l598esOneworld()) {
        subsidiaria = objRecord.getValue({
          fieldId: "custrecord_l598_conf_fe_subsidiaria"
        });
        if (l598isEmpty(subsidiaria)) // Si no completo la Subsidiaria
          subsidiaria = "";
      }

      let iCont = 0;
      const filters = [];
      //filters[iCont++] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
      filters[iCont++] = search.createFilter({
        name: "isinactive",
        operator: search.Operator.IS,
        values: false
      });

      if (!l598isEmpty(recId))
        //filters[iCont++] = new nlobjSearchFilter('internalid', null, 'noneof', recId, null);
        filters[iCont++] = search.createFilter({
          name: "internalid",
          operator: search.Operator.NONEOF,
          values: recId
        });
      if (!l598isEmpty(subsidiaria))
        //filters[iCont++] = new nlobjSearchFilter('custrecord_l598_conf_fe_subsidiaria', null, 'is', subsidiaria, null);
        filters[iCont++] = search.createFilter({
          name: "custrecord_l598_conf_fe_subsidiaria",
          operator: search.Operator.IS,
          values: subsidiaria
        });

      //var results = nlapiSearchRecord('customrecord_l598_conf_factura_elec', null, filters, null);
      const results = search.create({
        type: "customrecord_l598_conf_factura_elec",
        filters: filters

      }).run().getRange({
        start: 0,
        end: 1000
      });

      if (results != null && results.length > 0) {
        alert("Solo puede cargar una configuraci" + "\u00f3" + "n del Panel de Configuraci" + "\u00f3" + "n de Factura Electr" + "\u00f3" + "nica por Subsidiaria en el Sistema. Verifique.");
        return false;
      }

      // INICIO - Encriptar Informacion
      //var informacion = nlapiGetFieldValue('custrecord_l598_conf_fe_password');
      const informacion = objRecord.getValue({
        fieldId: "custrecord_l598_conf_fe_password"
      });

      log.debug('ValidarUnicidadFE', `password: ${informacion}`);
      if (!l598isEmpty(informacion)) {
        // ya no se encripta la informacion, el campo e pasw_encriptada se oculta a la vista del usuario.
        objRecord.setValue({
          fieldId: "custrecord_l598_conf_fe_pasw_encriptada",
          value: informacion
        });
        objRecord.setValue({
          fieldId: "custrecord_l598_conf_fe_password",
          value: ""
        });
      }
      // FIN - Encriptar Informacion
      
      log.debug(proceso, `FIN validacion unicidad FE`);

      return true;
    }

    return {
      saveRecord: saveRecord
    };
  });