import * as assert from 'assert';
import { DEFAULT_CELL_SOURCE, parseNotebook, stringifyNotebook } from '../format';

suite('format', () => {
	test('round trip', () => {
		const cells = [{ kind: 'code' as const, language: 'php', source: 'echo 1;' }];
		assert.deepStrictEqual(parseNotebook(stringifyNotebook({ version: 1, cells })).cells, cells);
	});

	test('empty file', () => {
		assert.strictEqual(parseNotebook('').cells.length, 0);
	});

	test('invalid file', () => {
		assert.throws(() => parseNotebook('{}'));
	});

	test('default cell source opens PHP', () => {
		assert.strictEqual(DEFAULT_CELL_SOURCE, '<?php\n');
	});
});
