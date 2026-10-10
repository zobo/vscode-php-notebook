import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { NOTEBOOK_TYPE } from './serializer';
import { getFreePort, xdebugEnv, xdebugPhpArgs } from './xdebug';

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
			await this.executeCell(cell, false);
		}
	}

	debugCell(cell: vscode.NotebookCell): Promise<void> {
		return this.executeCell(cell, true);
	}

	private async executeCell(cell: vscode.NotebookCell, debug: boolean): Promise<void> {
		const execution = this.controller.createNotebookCellExecution(cell);
		execution.executionOrder = ++this.executionOrder;
		execution.start(Date.now());
		await execution.clearOutput();

		let success = true;
		let session: vscode.DebugSession | undefined;
		try {
			const file = this.writeScript(cell);
			const phpPath = vscode.workspace.getConfiguration('php-notebook').get<string>('phpPath') || 'php';
			const cwd = this.getCwd(cell.notebook);
			let args = [file];
			let env: NodeJS.ProcessEnv = process.env;
			if (debug) {
				const port = await getFreePort();
				session = await this.startDebugSession(cell, file, port);
				args = [...xdebugPhpArgs(port), file];
				env = { ...process.env, ...xdebugEnv };
			}
			success = await this.run(execution, phpPath, args, cwd, env);
		} catch (e) {
			success = false;
			await execution.appendOutput(
				new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.error(e as Error)])
			);
		} finally {
			if (session) {
				await vscode.debug.stopDebugging(session);
			}
		}
		execution.end(success, Date.now());
	}

	// php-debug's launch config without "program" waits for Xdebug to connect on the given port.
	// pathMappings maps the temp script (what PHP sees) to the cell's document URI (what the IDE sees).
	private async startDebugSession(
		cell: vscode.NotebookCell,
		file: string,
		port: number
	): Promise<vscode.DebugSession> {
		const name = `PHP Notebook ${port}`;
		const started = new Promise<vscode.DebugSession>(resolve => {
			const sub = vscode.debug.onDidStartDebugSession(s => {
				if (s.name === name) {
					sub.dispose();
					resolve(s);
				}
			});
		});
		const ok = await vscode.debug.startDebugging(
			vscode.workspace.getWorkspaceFolder(cell.notebook.uri),
			{
				type: 'php',
				request: 'launch',
				name,
				port,
				pathMappings: { [file]: cell.document.uri.toString() },
			},
			{ suppressSaveBeforeStart: true }
		);
		if (!ok) {
			throw new Error('Could not start the PHP debug session. Is the PHP Debug extension installed?');
		}
		return started;
	}

	private writeScript(cell: vscode.NotebookCell): string {
		this.tmpDir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'php-notebook-'));
		const file = path.join(this.tmpDir, `cell-${cell.index}.php`);
		fs.writeFileSync(file, cell.document.getText());
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
		args: string[],
		cwd: string | undefined,
		env: NodeJS.ProcessEnv
	): Promise<boolean> {
		return new Promise(resolve => {
			const child = cp.spawn(phpPath, args, { cwd, env });
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
