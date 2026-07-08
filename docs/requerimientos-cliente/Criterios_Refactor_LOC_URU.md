**Proyecto de Refactorización**

**Localización Uruguay — SuiteTax**

*Criterios de Análisis, Refactorización y Medición*

> *¿Cómo vamos a decidir qué cambiar y qué no?*
>
> *¿Qué significa que la IA optimice el código?*
>
> *¿Cómo vamos a medir que realmente mejoró?*

| **Cliente** | **Equipo AI** |
|:-----------:|:-------------:|
| Tekiio | Mobeats |

#  1. Objetivo del Proyecto

Reducir el tiempo de análisis y mejora del código existente de la Localización Uruguay (SuiteTax) mediante el uso de inteligencia artificial, manteniendo al 100% la lógica funcional original y mejorando la calidad técnica del código.

> *La IA actúa como un revisor técnico experto: analiza el código contra fuentes de conocimiento confiables y propone mejoras justificadas. No reemplaza al desarrollador, lo asiste.*

#  2. Fuentes de Conocimiento

El motor de análisis tiene acceso a las siguientes fuentes para fundamentar cada decisión:

- Scripts actuales de la localización Uruguay (código fuente real)

- Documentación oficial de NetSuite SuiteScript 2.x

- Guías de mejores prácticas de desarrollo NetSuite

- Patrones recomendados por Oracle para manejo de Governance Units

#  3. Criterios de Análisis

La IA detectará los siguientes problemas en el código existente:

| **Criterio** | **Categoría** | **Descripción** |
|----|----|----|
| Código duplicado | Mantenibilidad | Lógica repetida en múltiples scripts que puede centralizarse en funciones reutilizables |
| Búsquedas repetitivas | Performance | Llamadas a NetSuite Search ejecutadas más de una vez con los mismos parámetros en el mismo contexto |
| Governance ineficiente | Governance Units | Consumo excesivo de GU por uso de métodos costosos cuando existen alternativas equivalentes más económicas |
| Loops innecesarios | Performance | Iteraciones que pueden reemplazarse con operaciones de array nativas o SuiteQL más eficientes |
| Queries no optimizadas | Performance / GU | Consultas que traen más campos o registros de los necesarios; candidatas a SuiteQL con SELECT específico |
| Funciones sobrecomplejas | Mantenibilidad | Funciones con demasiada responsabilidad (más de 40 líneas o múltiples propósitos) que dificultan el testing y el debugging |
| APIs deprecadas | Estándares | Uso de APIs de SuiteScript 2.0 o anteriores que tienen equivalente mejorado en SuiteScript 2.1 |
| Falta de manejo de errores | Robustez | Bloques sin try/catch o sin logging adecuado que dificultan el diagnóstico en producción |

#  4. Criterios de Refactorización

Toda modificación propuesta debe cumplir OBLIGATORIAMENTE con el primer criterio. El resto se aplica por prioridad:

| **Pri.** | **Criterio** | **Descripción** |
|:--:|----|----|
| **🔒 \#1** | **Integridad funcional** | Mantener exactamente la misma lógica de negocio. Ningún cambio que altere el comportamiento funcional será aprobado sin validación explícita. |
| \#2 | Reducción de Governance | Priorizar cambios que reduzcan el consumo de Governance Units (GU), especialmente en scripts tipo Scheduled y Map/Reduce. |
| \#3 | Mejora de performance | Optimizar tiempos de ejecución mediante SuiteQL, búsquedas cacheadas, y reducción de llamadas a la API. |
| \#4 | Patrones NetSuite | Seguir patrones documentados por Oracle: entry points correctos, manejo de errores estándar, logging con N/log. |
| \#5 | Legibilidad y mantenibilidad | Refactorizar funciones sobrecomplejas, mejorar nombres de variables y agregar comentarios donde la lógica no sea obvia. |
| \#6 | Reutilización de código | Extraer lógica común a módulos compartidos para evitar duplicación entre scripts de la localización. |

#  5. Criterios de Medición

Para cada script refactorizado, se generará una comparativa documentada con las siguientes métricas:

| **Métrica** | **¿Qué se mide?** | **¿Cómo se mide?** | **Evidencia** |
|----|----|----|----|
| Governance Units consumidas | Cantidad de unidades consumidas por el script durante su ejecución. | Ejecutar el script en QA con el mismo volumen de datos antes y después del refactor. Registrar unidades iniciales y finales mediante logs o métricas de NetSuite. | Captura de logs o reporte comparativo. |
| Tiempo de ejecución | Tiempo real que tarda el script en completar su proceso. | Ejecutar el mismo caso de prueba en QA (basado en los casos de uso relevados en la demo) y medir inicio/fin. Realizar varias corridas para obtener un promedio. | Benchmark antes/después por caso de uso. |
| Líneas de código | Tamaño y complejidad del código fuente. | Comparar cantidad de líneas efectivas (sin comentarios ni espacios) antes y después del refactor. | Estadística generada o herramienta de análisis. |
| Legibilidad / Mantenibilidad | Facilidad para entender y modificar el código. | Evaluar complejidad del código, longitud de funciones, duplicación de código y profundidad de anidamiento. | Reporte de análisis o checklist técnico. |
| Llamadas redundantes a Search/Load | Consultas o cargas repetidas e innecesarias a registros de NetSuite. | Identificar búsquedas repetidas dentro de loops, cargas duplicadas y consultas que podrían cachearse. Comparar cantidad antes/después. | Informe de hallazgos y optimizaciones aplicadas. |
| Riesgo de modificación | Probabilidad de introducir errores funcionales. | Clasificación según alcance de cambios realizados: Bajo (estilo/formato), Medio (reestructuración de lógica), Alto (reemplazo de procesos completos, cambios estructurarles importantes). | Matriz de riesgo por script. |

> *Los casos de uso para medir tiempo de ejecución se obtienen directamente de los escenarios relevados durante la demo del proyecto. Cambios clasificados como Alto riesgo requieren aprobación explícita antes de aplicarse.*

#  6. Resultado Esperado por Script

Al finalizar el análisis de cada script, se entregará:

- Reporte de hallazgos con lista priorizada de problemas detectados

- Código refactorizado con los cambios aplicados según los criterios definidos

- Justificación por cada cambio realizado (qué se cambió, por qué y qué mejora aporta)

- Tabla comparativa antes/después con las métricas de medición

- Listado de recomendaciones adicionales que quedan fuera del alcance del refactor automático

- Clasificación de riesgo de la modificación propuesta

#  7. Alcance y Restricciones

|        **✅ Dentro del alcance**         |
|:----------------------------------------:|
|     Optimización de performance y GU     |
| Aplicación de estándares SuiteScript 2.1 |
|  Mejora de legibilidad y mantenibilidad  |
|      Detección de código duplicado       |
|  Refactorización de funciones complejas  |
| Generación de documentación comparativa  |

|          **❌ Fuera del alcance**           |
|:-------------------------------------------:|
|   Cambios de lógica funcional/tributaria    |
| Rediseño de arquitectura de la localización |
|    Cambios que no puedan validarse en QA    |
