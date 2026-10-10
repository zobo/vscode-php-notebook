import * as vscode from 'vscode';
import { PhpNotebookController } from './controller';
import { NOTEBOOK_TYPE, PhpNotebookSerializer } from './serializer';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(NOTEBOOK_TYPE, new PhpNotebookSerializer()),
		new PhpNotebookController(),
		vscode.commands.registerCommand('php-notebook.newNotebook', async () => {
			const doc = await vscode.workspace.openNotebookDocument(NOTEBOOK_TYPE);
			await vscode.window.showNotebookDocument(doc);
		})
	);
}

export function deactivate() {}
