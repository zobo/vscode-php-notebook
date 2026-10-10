import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildScript } from './format';
import { NOTEBOOK_TYPE } from './serializer';

export class PhpNotebookController implements vscode.Disposable {
	private readonly controller: vscode.NotebookController;
	private executionOrder = 0;
	private tmpDir: string | undefined;

	constructor() {
		this.controller = vscode.notebooks.createNotebookController('php-notebook-controller', NOTEBOOK_TYPE, 'PHP');
		this.controller.supportedLanguages = ['php'];
		this.controller.supportsExecutionOrder = true;
		this.controller.executeHandler = (cells, _nb, _ctrl) => this.execute(cells);
	}

	dispose() {
		this.controller.dispose();
		if (this.tmpDir) {
			fs.rmSync(this.tmpDir, { recursive: true, force: true });
		}
	}

	private async execute(cells: vscode.NotebookCell[]): Promise<void> {
		for (const cell of cells) {
			await this.executeCell(cell);
		}
	}

	private async executeCell(cell: vscode.NotebookCell): Promise<void> {
		const execution = this.controller.createNotebookCellExecution(cell);
		execution.executionOrder = ++this.executionOrder;
		execution.start(Date.now());
		await execution.clearOutput();

		let success = true;
		try {
			const file = this.writeScript(cell);
			const phpPath = vscode.workspace.getConfiguration('php-notebook').get<string>('phpPath') || 'php';
			const cwd = this.getCwd(cell.notebook);
			success = await this.run(execution, phpPath, file, cwd);
		} catch (e) {
			success = false;
			await execution.appendOutput(
				new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.error(e as Error)])
			);
		}
		execution.end(success, Date.now());
	}

	private writeScript(cell: vscode.NotebookCell): string {
		this.tmpDir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'php-notebook-'));
		const file = path.join(this.tmpDir, `cell-${cell.index}.php`);
		fs.writeFileSync(file, buildScript(cell.document.getText()));
		return file;
	}

	private getCwd(notebook: vscode.NotebookDocument): string | undefined {
		if (notebook.uri.scheme === 'file') {
			return path.dirname(notebook.uri.fsPath);
		}
		return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	}

	private run(
		execution: vscode.NotebookCellExecution,
		phpPath: string,
		file: string,
		cwd: string | undefined
	): Promise<boolean> {
		return new Promise(resolve => {
			const child = cp.spawn(phpPath, [file], { cwd });
			const cancel = execution.token.onCancellationRequested(() => child.kill());

			// Appends to the last output of the same mime type so streamed chunks form one block.
			let stdout: vscode.NotebookCellOutput | undefined;
			let stderr: vscode.NotebookCellOutput | undefined;
			child.stdout.on('data', (d: Buffer) => {
				if (!stdout) {
					stdout = new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout(d.toString())]);
					void execution.appendOutput(stdout);
				} else {
					void execution.appendOutputItems(vscode.NotebookCellOutputItem.stdout(d.toString()), stdout);
				}
			});
			child.stderr.on('data', (d: Buffer) => {
				if (!stderr) {
					stderr = new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(d.toString())]);
					void execution.appendOutput(stderr);
				} else {
					void execution.appendOutputItems(vscode.NotebookCellOutputItem.stderr(d.toString()), stderr);
				}
			});
			child.on('error', err => {
				cancel.dispose();
				void execution
					.appendOutput(
						new vscode.NotebookCellOutput([
							vscode.NotebookCellOutputItem.stderr(`Failed to start "${phpPath}": ${err.message}\n`),
						])
					)
					.then(() => resolve(false));
			});
			child.on('close', code => {
				cancel.dispose();
				resolve(code === 0);
			});
		});
	}
}
