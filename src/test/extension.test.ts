import * as assert from 'assert';
import { buildScript, parseNotebook, stringifyNotebook } from '../format';

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

	test('buildScript keeps line numbers and strips open tag', () => {
		assert.strictEqual(buildScript('echo 1;\necho 2;'), '<?php echo 1;\necho 2;');
		assert.strictEqual(buildScript('<?php\necho 1;'), '<?php \necho 1;');
	});
});
