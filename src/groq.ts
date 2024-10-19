// Module Import
import Groq from 'groq-sdk';

// Method and Types Import
import {
    Log,
    ReturnPromise
} from './customTypes';
import { vulnerabilityDB } from './vulnerabilityInfo';

// Method to call the Groq API to send the prompt and receive the response
export const analyzeCodeTool: (codeFragment: string) => Promise<ReturnPromise> = async (codeFragment: string) => {
    // Define a Regex to validate if the logs from the response have a valid format
    const contentRegex: RegExp = /^(?:(?!%VULCHECK%).)*%VULCHECK%(?:(?!%VULCHECK%).)*%VULCHECK%(?:(?!%VULCHECK%).)*$/s;
    // Format the code to be analyzed by adding escape validations for some characters
    const newCodeFragment: string = codeFragment.split('`').join('\\`').split('$').join('\\$');
    // Define the prompt to be sent to the Groq API by defining three phases: Vulnerability data, prompt restrictions and requested code
    const contentRequestGroq: string = `
        ${vulnerabilityDB}

        Analiza el siguiente fragmento de código en busca de vulnerabilidades que pertenezcan al top 25 especificado anteriormente, y sin ser estricto con cada línea analizada.
        Agrega cada una de las vulnerabilidades encontradas a una lista de objetos JSON en el que cada item debe seguir el siguiente formato:

        - vulnerability: Nombre de la vulnerabilidad.
        - identifier: Especificar el id de la vulnerabilidad tomando en cuenta la enumeración realizada por la CWE.
        - codeLineNumber: Especificar el número de línea donde se encuentra el código afectado. Si son 2 o más líneas, especificar el rango con el inicio y final separados por guión (-).
        - codeLine: Especificar el contenido de la línea de código. Si son 2 o más líneas de código, separar cada una con la expresión '\\n'.
        - explanation: Breve descripción de la vulnerabilidad explicando los riesgos que conlleva de no ser prevenida.

        Antes de generar la respuesta, agrega el siguiente conjunto de caracteres antes y después de la lista de objetos JSON: %VULCHECK%

        Fragmento de código:
        ${newCodeFragment}
    `;
    // Define a loading quote
    let loadingQuote: string = `Loading`;
    // Initialize the variable to store the number of attempts required to obtain a successful Groq response
    let attemptCount: number = 0;
    // Define an empty array to store the logs obtained from the response
    let logsList: Log[] = [];
    // Cycle to the following codelines until a successful response is returned or the number of attempts is equal or more than 10
    do {
        // Show the loading word along n number of dots, with n being the number of the current attempt
        loadingQuote = loadingQuote.concat(`.`);
        console.log(loadingQuote);
        // Call the async method to invoke the Groq API and await its response
        const chatCompletion: Groq.Chat.Completions.ChatCompletion = await getGroqChatCompletion(contentRequestGroq);
        // Check if the response has a valid format
        if (
            chatCompletion.choices.length === 1 &&
            chatCompletion.choices[0].message.content &&
            contentRegex.test(chatCompletion.choices[0].message.content)
        ) {
            // Get the list of vulnerabilities from the response of the prompt
            logsList = JSON.parse(chatCompletion.choices[0].message.content.split('%VULCHECK%')[1].trim());
            // Exit the cycle and continue the execution of the method
            break;
        }
        // Define a waiting time to avoid visual bugs with the notifications
        setTimeout(() => {}, 1000);
        // Increase the number of attempts by 1
        attemptCount++;
    } while (attemptCount < 10);
    // Build the object with custom attributes that will be used as the response of the method
    const responseData: ReturnPromise = {
        attempt: attemptCount,
        message: logsList.length > 0 ? 'Success' : 'Error',
        logs: logsList.length > 0 ? logsList : []
    };
    // Return the response object
    return responseData;
};

// Method to invoke the Groq API to process the prompt with a set of specified rules
export const getGroqChatCompletion: (contentGroq: string) => Promise<Groq.Chat.Completions.ChatCompletion> = async (contentGroq: string) => {
    // Instantiate a groq object to use the Groq methods by defining an API key from the user
    const groq: Groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    // Return the response from Groq whenever it's received or an error message if the prompt wasn't successful
    return groq.chat.completions.create({
        // Define the role of the sender and the content of the prompt
        messages: [
            {
                role: `user`,
                content: contentGroq,
            },
        ],
        // Define the model used by Groq to process the prompt
        model: `llama-3.1-70b-versatile`,
        // Define a lower temperature value than the one by default to reduce the level of randomness from the prompt
        temperature: 0.2
    });
};