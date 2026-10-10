import * as vscode from 'vscode';
import { DEFAULT_CELL_SOURCE, parseNotebook, stringifyNotebook } from './format';

export const NOTEBOOK_TYPE = 'php-notebook';

export class PhpNotebookSerializer implements vscode.NotebookSerializer {
	deserializeNotebook(content: Uint8Array): vscode.NotebookData {
		const file = parseNotebook(new TextDecoder().decode(content));
		const cells = file.cells.map(
			c =>
				new vscode.NotebookCellData(
					c.kind === 'code' ? vscode.NotebookCellKind.Code : vscode.NotebookCellKind.Markup,
					c.source,
					c.language
				)
		);
		if (cells.length === 0) {
			cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Code, DEFAULT_CELL_SOURCE, 'php'));
		}
		return new vscode.NotebookData(cells);
	}

	serializeNotebook(data: vscode.NotebookData): Uint8Array {
		const text = stringifyNotebook({
			version: 1,
			cells: data.cells.map(c => ({
				kind: c.kind === vscode.NotebookCellKind.Code ? 'code' : 'markup',
				language: c.languageId,
				source: c.value,
			})),
		});
		return new TextEncoder().encode(text);
	}
}
