// Modules Import
import { config } from 'dotenv';
import { resolve } from 'path';
import {
	CancellationToken,
	commands as vscCommands,
	Disposable,
	ExtensionContext,
	Hover,
	languages as vscLanguages,
	MarkdownString,
	Position,
	ProgressLocation,
	Range,
	TextDocument,
	TextEditor,
	TextEditorDecorationType,
	window as vscWindow,
	Progress
} from 'vscode';

// Methods and Types Import
import {
	Log,
	ReturnPromise
} from './customTypes';
import { analyzeCodeTool } from './groq';
import { vulnerabilityIds } from './vulnerabilityInfo';

// Setting the custom env variables from the .env file
config({ path: resolve(__dirname, '../.env') });

// Initialize variables to hold the information retrieved from the Groq response to add and modify elements from the editor
let logs: Log[] = [];
let decorationTypes: TextEditorDecorationType[] = [];
let hoverProviders: Disposable[] = [];
let vulnerabilityCount: number = 0;

// Method used to analyze the code when the user requests it
const beginAnalysis: (context: ExtensionContext) => Promise<void> = async (context: ExtensionContext) => {
	// Error handling
	try {
		// Get the editor element from the user who invoked the analysis
		const editor: TextEditor | undefined = vscWindow.activeTextEditor;
		// Check if the editor exists
		if (editor) {
			// Get the document section of the editor
			const document: TextDocument = editor.document;
			// Extract the code from the document
			const code: string = document.getText();
			// Invoke the method to analyze the code and await the response object
			const vulnerabilitiesLog: ReturnPromise = await analyzeCodeTool(code);
			// Create a Regex validator to check if the identifier for the vulnerability is valid
			const identifierValidator: RegExp = /^CWE-\d{1,4}$/;
			// Check if the message from the response object is successful
			if (vulnerabilitiesLog.message === 'Success') {
				// Add the logs from the response to the previously initialized array
				logs = vulnerabilitiesLog.logs;
				// Loop through each one of the logs
				logs.forEach((log: Log, index: number) => {
					// Get the vulnerable lines of code from the codeLine attribute
					const codeLines: string[] = log.codeLine.split(`\n`);
					// Check if the identifier is valid or if it belongs to one of the vulnerabilities available in the info file
					if (identifierValidator.test(log.identifier) || vulnerabilityIds.some((id: number) => id === Number(log.identifier.split('-')[1]))) {
						// Loop through each line of code
						for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
							// Get the text from that line of code
							const lineText: string = document.lineAt(lineNumber).text;
							// Check if the current line is the first one or the only one from the log
							if (lineText.includes(codeLines[0].trimStart())) {
								// Define the range of the lines of code
								let startLine: number = lineNumber;
								let endLine: number = lineNumber + codeLines.length - 1;
								// Define a variable to check if the line matches the one retrieved within the response object
								let isMatch: boolean = true;
								// Loop through the set of lines when the response returned two or more lines
								for (let nextLine = 1; nextLine < codeLines.length; nextLine++) {
									// Check if the next line is the last one of the document or if it doesn't match the one from the response
									if (startLine + nextLine >= document.lineCount || !document.lineAt(startLine + nextLine).text.includes(codeLines[nextLine].trim())) {
										// Turn the isMatch variable to false and exit the loop
										isMatch = false;
										break;
									}
								}
								// Check if the lines of code are still a match
								if (isMatch) {
									// Get the character delimiters from the range of lines
									const startChar: number = lineText.indexOf(codeLines[0].trimStart());
									const endChar: number = document.lineAt(endLine).text.indexOf(codeLines[codeLines.length - 1].trimEnd()) + codeLines[codeLines.length - 1].trimEnd().length;
									// Set the range from the start character to the end character
									const range: Range = new Range(
										new Position(startLine, startChar),
										new Position(endLine, endChar)
									);
									// Create a new highlight object with a specific background color
									const highlightDecoration: TextEditorDecorationType = vscWindow.createTextEditorDecorationType({
										backgroundColor: 'rgba(255,255,0,0.3)' // Resalta con color amarillo claro
									});
									// Apply the highlight to the range of lines
									editor.setDecorations(highlightDecoration, [range]);
									// Add the highlight to the decorationTypes array
									decorationTypes.push(highlightDecoration);
									// Create a hover provider to add within the lines of code
									const hoverProvider: Disposable = vscLanguages.registerHoverProvider('*', {
										// Use the provideHover method to instantiate a new hover provider
										provideHover(document: TextDocument, position: Position, token: CancellationToken) {
											// Set a range from the hover provider using the position from the highlight
											const hoverRange: Range = new Range(position, position);
											// Check if the two ranges match
											if (range.contains(position)) {
												// Define the message used by the hover provider and set the view more link
												const hoverMessage: MarkdownString = new MarkdownString(`**Vulcheck Analysis:**\n(${log.identifier}) => ${log.vulnerability}\n[Más detalles...](command:vulcheck.showDetails?${index})`);
												// Modify the isTrusted attribute to allow the editor to display modal links
												hoverMessage.isTrusted = true;
												// Return the new hover provider with its attributes
												return new Hover(hoverMessage, hoverRange);
											}
										}
									});
									// Add the hover provided to the array created at the start of the method
									hoverProviders.push(hoverProvider);
									// Enable the hover within the editor of the user
									context.subscriptions.push(hoverProvider);
									// Increase the vulnerability count by one and exit the loop
									vulnerabilityCount++;
									break;
								}
							}
						}
					}
				});
				// Show a notification message with the results from the analysis
				vscWindow.showInformationMessage(`Análisis completado con éxito. ${vulnerabilityCount > 0 ? `Se encontr${vulnerabilityCount === 1 ? `ó` : `aron`} ${vulnerabilityCount} vulnerabilidad${vulnerabilityCount > 1 ? `es` : ``}` : `No se encontraron vulnerabilidades.`}`);
				// Check if the number of vulnerabilities found is more than 0
				if (vulnerabilityCount > 0) {
					// Notify the editor that the analysis is active
					vscCommands.executeCommand('setContext', 'vulcheck.isAnalysisOngoing', true);
				}
			} else {
				// Display an error message when an error with the Groq API is found
				vscWindow.showErrorMessage(`La extensión encontró un error inesperado`);
			}
		} else {
			// Display an error message when the editor is not found
			vscWindow.showErrorMessage(`El editor de texto no se ha definido`);
		}
	} catch (error) {
		// Show any possible error in the console
		console.log(error);
	}
};

// Method to finish the analysis and return the editor status to normal
const endAnalysis: () => void = () => {
	// Get the editor from the user who invoked this method
    const activeEditor: TextEditor | undefined = vscWindow.activeTextEditor;
	// Check if the editor exists
    if (activeEditor) {
        // Clean each highlight from the editor
        decorationTypes.forEach((decoration) => {
            activeEditor.setDecorations(decoration, []);
        });
		// Empty the array for the decoration types
        decorationTypes = [];
		// Delete all of the hover providers within the code
		hoverProviders.forEach(provider => provider.dispose());
		// Empty the array for the hover providers
        hoverProviders = [];
		// Reset the vulnerability count to 0
		vulnerabilityCount = 0;
		// Display a notification message that ends the analysis
        vscWindow.showInformationMessage("Análisis finalizado.");
    }
};

// Method that it's executed when the extension is initialized
export const activate: (context: ExtensionContext) => void = (context: ExtensionContext) => {

	// Execute the endAnalysis method when the active editor changes by editing a different code or focusing out of the window
	vscWindow.onDidChangeActiveTextEditor((editor: TextEditor | undefined) => {
		endAnalysis();
		vscCommands.executeCommand('setContext', 'vulcheck.isAnalysisOngoing', false);
	});

	// Create a command to execute the beginAnalysis method
	const analysisRequest: Disposable = vscCommands.registerCommand('vulcheck.beginAnalysis', async () => {
		// Show a progress notification until the analysis is ready
        vscWindow.withProgress({
            location: ProgressLocation.Notification,
            title: "Estado del análisis",
            cancellable: false
        }, async (progress: Progress<{ message?: string; increment?: number; }>) => {
            // Define the waiting message
            progress.report({ message: "En progreso..." });
			// Wait until the analysis is ready
            await beginAnalysis(context);
        });
	});

	// Add the beginAnalysis command to the available options of the editor
	context.subscriptions.push(analysisRequest);

	// Create a command to undo the changes made after the analysis
	const stopAnalysis: Disposable = vscCommands.registerCommand('vulcheck.endAnalysis', () => {
		endAnalysis();
		vscCommands.executeCommand('setContext', 'vulcheck.isAnalysisOngoing', false);
	});

	// Add the stopAnalysis command to the available options of the editor
	context.subscriptions.push(stopAnalysis);

	// Create a command to display a modal when a link from a hover provider is clicked
	const showDetailsCommand: Disposable = vscCommands.registerCommand('vulcheck.showDetails', (index: number) => {
		// Check the log associated with the hover provider
        const log: Log = logs[index];
		// Display a modal with details about the vulnerability
        vscWindow.showInformationMessage(
            `(${log.identifier}) => ${log.vulnerability}`, 
            { modal: true, detail: `${log.explanation}` }
        );
    });
	// Add the showDetails command to the available options of the editor
	context.subscriptions.push(showDetailsCommand);

	// Set the context of the analysis to false after the extension is activated
	vscCommands.executeCommand('setContext', 'vulcheck.isAnalysisOngoing', false);

	// Display a notification message whenever the extension is active for the first time
	vscWindow.showInformationMessage(`La extensión Vulcheck está activa`);

};

// Empty method that it's called whenever the extension is deactivated
export const deactivate: () => void = () => {};
