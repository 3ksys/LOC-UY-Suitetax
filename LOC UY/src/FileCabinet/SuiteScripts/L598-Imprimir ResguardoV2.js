/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(["N/log", "N/redirect", "N/search"], function (log, redirect, search) {
  /* global define */
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
      filters: filters,
    }).run().getRange({
      start: 0,
      end: 1000
    });
    if (searchresults != null && searchresults.length > 0)
      return true;
    else
      return false;
  }
  function onAction(scriptContext) {
    log.debug("imprimirResguardo_workflow", "INICIO");
    const params = scriptContext.newRecord;
    const recId = params.id;
    const recType = params.type;

    const oneWorld = esOneworld();
    params.recId = recId;
    params.recType = recType;
    params.oneWorld = oneWorld;
    log.debug("imprimirResguardo_workflow", "RECID:" + params.recId + ". RECTYPE: " + params.recType + ". ONEWORLD: " + params.oneWorld);
    redirect.toSuitelet({
      scriptId: "customscript_l598_gen_pdf_resguardo",
      deploymentId: "customdeploy_l598_gen_pdf_resguardo",
      parameters: params
    });
    log.debug("imprimirResguardo_workflow", "FIN");
  }
  return {
    onAction: onAction
  };
});