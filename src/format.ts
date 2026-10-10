export interface PhpNotebookCell {
	kind: 'code' | 'markup';
	language: string;
	source: string;
}

export interface PhpNotebookFile {
	version: 1;
	cells: PhpNotebookCell[];
}

export function parseNotebook(text: string): PhpNotebookFile {
	if (text.trim() === '') {
		return { version: 1, cells: [] };
	}
	const raw = JSON.parse(text);
	if (!raw || typeof raw !== 'object' || !Array.isArray(raw.cells)) {
		throw new Error('Invalid PHP notebook: "cells" array is missing');
	}
	const cells: PhpNotebookCell[] = raw.cells.map((c: Record<string, unknown>) => {
		const kind = c.kind === 'markup' ? 'markup' : 'code';
		const source = Array.isArray(c.source) ? c.source.join('') : String(c.source ?? '');
		const language = typeof c.language === 'string' ? c.language : kind === 'code' ? 'php' : 'markdown';
		return { kind, language, source };
	});
	return { version: 1, cells };
}

export function stringifyNotebook(nb: PhpNotebookFile): string {
	return JSON.stringify(nb, null, 2) + '\n';
}

/**
 * Builds a runnable PHP script from a cell. The opening tag is placed on the
 * first line without a newline so that line numbers match the cell's lines.
 */
export function buildScript(source: string): string {
	const stripped = source.replace(/^\s*<\?php\b[ \t]?/i, '');
	return '<?php ' + stripped;
}
