**Lineamientos de Trabajo**

*Proyecto de Refactorización de Scripts*

Cuenta de Desarrollo Tekiio

# 1. Datos Generales del Proyecto

|              |                                                    |
|:-------------|:---------------------------------------------------|
| **Ambiente** | 3KSYS-DEV ACCT SDN (LOC URU / LOC PAN — SUITE TAX) |

|                    |                                   |
|:-------------------|:----------------------------------|
| **Tipo de cuenta** | Cuenta de Desarrollo (Producción) |

|  |  |
|:---|:---|
| **Objetivo** | Refactorización de scripts existentes sin afectar los procesos actuales en producción |

# 2. Contexto y Restricciones

La cuenta de desarrollo 3KSYS-DEV ACCT SDN (LOC URU / LOC PAN — SUITE TAX) es el único ambiente disponible en este momento para ejecutar y validar el proyecto de refactorización. Dado que la contratación y configuración de una cuenta adicional implicaría demoras significativas, el equipo deberá operar con las siguientes restricciones y acuerdos de trabajo:

- No se sobreescribirán los scripts actualmente en producción dentro de la cuenta.

- Se crearán versiones nuevas de cada script refactorizado, con nomenclatura claramente diferenciada.

- Se generará un rol dedicado para la ejecución de los scripts refactorizados, que no interfiera con los procesos activos.

# 3. Roles y Accesos

## 3.1 Rol Funcional: URU-Contador Suitetax

Este rol será otorgado al equipo de refactorización para la ejecución de pruebas sobre el proceso actual. Permite:

- Ejecutar las versiones actuales (originales) de los scripts.

- Validar el comportamiento base del proceso existente.

## 3.2 Nuevo Rol: URU-Contador (Mobeats)

Se creará un nuevo rol específico para la ejecución de los scripts modificados. Este rol:

- Tendrá permisos exclusivamente sobre los nuevos scripts creados durante el refactor.

- No interferirá con los procesos que dependen del rol URU-Contador ni de otros roles existentes.

- Será configurado por el equipo de Tekiio antes de iniciar las pruebas del refactor.

# 4. Metodología de Trabajo

## 4.1 Creación de nuevos scripts

Para cada script que requiera modificaciones, el equipo deberá:

1.  Crear un nuevo script en la cuenta (no editar el original).

2.  Utilizar una convención de nomenclatura que permita identificar claramente la versión refactorizada (ej.: sufijo \_REF o \_V2 o \_Mobeats).

3.  Coordinar con Tekiio la carga y configuración correcta del script antes de ejecutar pruebas.

4.  Asociar el nuevo script al rol dedicado de refactorización.

## 4.2 Metodología para Scripts Existentes

Las pruebas sobre los scripts existentes (versiones originales) se realizarán en base a los procesos revisados durante la demo funcional. El alcance y los escenarios de prueba se definirán a partir de dicha instancia y estarán respaldados por información de performance provista por el equipo de Tekiio.

- Los procesos por probar serán los identificados y acordados durante la demo funcional realizada con el equipo de Tekiio.

- Tekiio proveerá la información de performance de los scripts actuales (tiempos de ejecución, volumen de registros procesados, errores frecuentes, etc.) como línea base para las pruebas comparativas.

- Las pruebas se ejecutarán con el rol **URU-Contador**, sobre los scripts originales sin modificación.

- Los resultados obtenidos servirán de referencia para comparar el comportamiento de las versiones refactorizadas.

## 4.3 Apoyo de Tekiio

El equipo de Tekiio brindará asistencia en las siguientes instancias:

- Carga y registro de nuevos scripts en la cuenta de desarrollo.

- Configuración de deployments y parámetros asociados.

- Asignación del nuevo rol a los usuarios del equipo de refactorización.

- Soporte durante las sesiones de prueba.

## 4.4 Aislamiento de Entornos

Para garantizar que el proyecto de refactorización no afecte los procesos activos, se aplicarán las siguientes medidas de aislamiento:

| **Proceso Actual (Producción)** | **Proceso de Refactorización** |
|:---|:---|
| Scripts originales sin modificación | Nuevos scripts con sufijo identificatorio |
| Rol URU-Contador | URU-Contador Suitetax (Mobeats) |
| Deployments y configuraciones existentes | Nuevos deployments y configuraciones |

# 5. Acuerdos y Responsabilidades

| **Actividad** | **Responsable** | **Observaciones** |
|:---|:---|:---|
| Otorgar rol URU-Contador | Tekiio | Al inicio del proyecto |
| Crear nuevos scripts refactorizados | Mobeats - Tekiio | Sin modificar originales |
| Cargar y configurar scripts en cuenta | Mobeats - Tekiio | Coordinado |
| Crear y asignar nuevo rol | Tekiio | Previo a pruebas de refactor |
| Ejecutar pruebas proceso actual | Mobeats | Con rol URU-Contador |
| Ejecutar pruebas scripts refactorizados | Mobeats | Con nuevo rol asignado |
| Validar y aprobar resultados | Mobeats - Tekiio | Revisión conjunta |

# 6. Notas y Consideraciones Finales

- Este documento es de uso interno y puede ser actualizado a medida que avance el proyecto.

- Cualquier modificación al alcance o a los acuerdos aquí descritos deberá ser consensuada entre Tekiio y el equipo de refactorización.

- Las sesiones de trabajo serán coordinadas previamente para garantizar la disponibilidad del equipo de Tekiio durante la carga y configuración de scripts.

- Ante cualquier duda o inconveniente técnico, el equipo de refactorización deberá contactar a Tekiio antes de realizar cambios en la cuenta.
