// Type to specify the attributes of the logs for each vulnerability
export type Log = {
    codeLineNumber: string
    codeLine: string
    explanation: string
    identifier: string
    vulnerability: string
};

// Type to specify the content of the Groq response
export type ReturnPromise = {
    attempt: number
    message: string
    logs: Log[]
};