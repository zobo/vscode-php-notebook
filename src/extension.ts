import * as vscode from 'vscode';
import { PhpNotebookController } from './controller';
import { DEFAULT_CELL_SOURCE } from './format';
import { NOTEBOOK_TYPE, PhpNotebookSerializer } from './serializer';

// VS Code has no "default content" API for new cells, so empty PHP cells that
// get added to a notebook are filled with the opening tag.
async function fillNewCells(e: vscode.NotebookDocumentChangeEvent) {
	if (e.notebook.notebookType !== NOTEBOOK_TYPE) {
		return;
	}
	const edit = new vscode.WorkspaceEdit();
	for (const change of e.contentChanges) {
		for (const cell of change.addedCells) {
			if (
				cell.kind === vscode.NotebookCellKind.Code &&
				cell.document.languageId === 'php' &&
				cell.document.getText() === ''
			) {
				edit.insert(cell.document.uri, new vscode.Position(0, 0), DEFAULT_CELL_SOURCE);
			}
		}
	}
	if (edit.size > 0) {
		await vscode.workspace.applyEdit(edit);
	}
}

function activeCell(): vscode.NotebookCell | undefined {
	const editor = vscode.window.activeNotebookEditor;
	return editor && editor.notebook.notebookType === NOTEBOOK_TYPE && editor.selection
		? editor.notebook.cellAt(editor.selection.start)
		: undefined;
}

export function activate(context: vscode.ExtensionContext) {
	const controller = new PhpNotebookController();
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(NOTEBOOK_TYPE, new PhpNotebookSerializer()),
		controller,
		vscode.commands.registerCommand('php-notebook.debugCell', async (arg?: { cell?: vscode.NotebookCell } | vscode.NotebookCell) => {
			const cell =
				(arg && 'cell' in arg ? arg.cell : (arg as vscode.NotebookCell | undefined)) ??
				activeCell();
			if (cell) {
				await controller.debugCell(cell);
			}
		}),
		vscode.workspace.onDidChangeNotebookDocument(e => void fillNewCells(e)),
		vscode.commands.registerCommand('php-notebook.newNotebook', async () => {
			const doc = await vscode.workspace.openNotebookDocument(NOTEBOOK_TYPE);
			await vscode.window.showNotebookDocument(doc);
		})
	);
}

export function deactivate() {}
