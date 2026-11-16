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
     * Migrado desde L598_CS.js
     */

    function l598isEmpty(value) {
      return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
    }


    //function unicidadDatosImpositivos()
    function saveRecord() {
      const objRecord = currentRecord.get();
      //var recId = nlapiGetRecordId();
      const recId = objRecord.id;
      //var recType = nlapiGetRecordType();
      // const recType = objRecord.type;
      let i = 0;

      //var subsidiaria = nlapiGetFieldValue('custrecord_l598_dat_imp_subsidiaria');
      const subsidiaria = objRecord.getValue({
        fieldId: "custrecord_l598_dat_imp_subsidiaria"
      });

      const filters = [];
      //filters[i++] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
      filters[i++] = search.createFilter({
        name: "isinactive",
        operator: search.Operator.IS,
        values: false
      });

      if (!l598isEmpty(subsidiaria))
        //filters[i++] = new nlobjSearchFilter('custrecord_l598_dat_imp_subsidiaria', null, 'is', subsidiaria);
        filters[i++] = search.createFilter({
          name: "custrecord_l598_dat_imp_subsidiaria",
          operator: search.Operator.IS,
          values: subsidiaria
        });

      if (!l598isEmpty(recId))
        //filters[i++] = new nlobjSearchFilter('internalid', null, 'noneof', recId, null);
        filters[i++] = search.createFilter({
          name: "internalid",
          operator: search.Operator.NONEOF,
          values: recId
        });

      //var results = nlapiSearchRecord('customrecord_l598_datos_impositivos_emp', null, filters, null);
      const results = search.create({
        type: "customrecord_l598_datos_impositivos_emp",
        filters: filters
      }).run().getRange({
        start: 0,
        end: 1000
      });

      if (results != null && results.length > 0) {
        alert("Solo puede cargar una configuración en el Sistema por Subsidiaria. Verifique.");
        return false;
      }
      return true;
    }


    return {
      saveRecord: saveRecord
    };
  });