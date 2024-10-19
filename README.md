# Vulcheck

El objetivo de esta extensión para Visual Studio Code es el análisis de código de archivos TypeScript para detectar vulnerabilidades que puedan generar riesgos de seguridad en las aplicaciones donde sean utilizados.

## Requisitos previos

Para poder utilizar esta extensión, hay algunas herramientas necesarias para la ejecución de la extensión, por lo que deben ser instaladas si se quiere utilizar la extensión:

* [Visual Studio Code](https://code.visualstudio.com/)
* [Node.js](https://nodejs.org/en/)
* [Git](https://git-scm.com/)

Además, se recomienda instalar [Yeoman](https://yeoman.io/) y [VS Code Extension Generator](https://www.npmjs.com/package/generator-code) para tener un mejor control sobre el desarrollo de la extensión.

## Configuración de Groq

Esta extensión utiliza un modelo de lenguaje proporcionado por Groq, así que es requerido crear una cuenta para poder utilizar la extensión. A continuación se explicará el procedimiento para obtener una API key que será utlizada para enviar prompts y recibir respuestas de un modelo determinado.

* Visita el sitio web de [Groq](https://console.groq.com/login) y registrate con un correo electrónico.
* Se enviará un correo electrónico de confirmación (no olvides revisar la carpeta de SPAM).
* Después de iniciar sesión, localiza la opción de `API Keys` y haz clic en ella (puede que se requiera una verificación con CAPTCHA).
* Haz clic en el botón `Create API Key` y en el modal que aparece, escribe un nombre para distinguirla.
* Después de esto, el modal cambiará y se mostrará la API key. Haz clic en el botón de copiar antes de cerrar el modal, ya que una vez que se cierre el modal, no se podrá copiar la API key.

## Configuración de la extensión

Una vez que se han cumplido todos los requerimientos previos, se puede proceder con la configuración y ejecución de la extensión.

* Descarga el contenido de este repositorio, ya sea clonando este repositorio o descargando el comprimido y extrayendo los archivos.
* A conitnuación, abre un terminal en la ubicación de los archivos y ejecuta el comando `npm i` para instalar las dependencias requeridas.
* Abre Visual Studio Code con el proyecto de la extensión y crea un archivo `.env` en el directorio raíz para almacenar la variable de entorno con la API key de Groq, la cual posee el siguiente formato: `GROQ_API_KEY=Tu-API-Key`. Reemplaza `Tu-API-Key` con la que copiaste del dashboard de Groq.
* Abre el archivo `extension.ts` que se encuentra dentro de la carpeta `src` y ejecuta la extensión con la tecla F5.
* A continuación, se abrirá otra ventana de Visual Studio Code. Para probar la extensión, abre cualquier archivo y/o proyecto que tenga código TypeScript (es decir, archivos de tipo .ts o .tsx).
* Cuando el archivo esté abierto, haz clic derecho en el editor de código y selecciona la opción `Analyze Code`.
* La extensión ejecutará un análisis en dicho archivo y retornará las vulnerabilidades que logre detectar (ten en cuenta que el uso de la extensión requiere de una conexión a Internet estable, ya que debe enviar el prompt al modelo de Groq y recibir su respuesta).

Con este proceso, la extensión es funcional y se puede utilizar sin ningún impedimento y/o dificultad.
