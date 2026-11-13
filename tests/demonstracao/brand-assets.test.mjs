import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('tests/demonstracao/brand/manifest.json', root)));
for (const logo of manifest.files) {
  test(`PNG original ${logo.variant}: integridade, dimensões e canal alfa`, () => {
    const bytes = readFileSync(new URL('public' + logo.path, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), logo.sha256);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.subarray(12, 16).toString(), 'IHDR');
    assert.equal(bytes.readUInt32BE(16), logo.width);
    assert.equal(bytes.readUInt32BE(20), logo.height);
    assert.equal(bytes[24], 8);
    assert.equal(bytes[25], 6); // RGBA; alpha values were inspected on these exact hashed files.
    assert.deepEqual(logo.alphaRange, [0,255]);
    assert.ok(logo.transparentPixels > 0);
  });
}
test('prancha de referência preservada sem alterações', () => {
  const bytes = readFileSync(new URL('tests/demonstracao/brand/prancha-referencia.png', root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.referenceSHA256);
});
