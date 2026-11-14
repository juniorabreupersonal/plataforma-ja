import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifest from './migrations.json' with { type: 'json' };
const root = new URL('../../', import.meta.url);
try {
  const expected = manifest.files.map(item => item.path).sort();
  const actual = readdirSync(new URL('supabase/migrations/', root)).filter(name => name.endsWith('.sql')).map(name => 'supabase/migrations/'+name).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw Error('set');
  for (const item of manifest.files) {
    if (!/^supabase\/migrations\/\d+_[a-z0-9_]+\.sql$/.test(item.path)) throw Error('path');
    const hash = createHash('sha256').update(readFileSync(new URL(item.path, root))).digest('hex');
    if (hash !== item.sha256) throw Error('hash');
  }
  console.log(`PASS: ${expected.length} migrações coincidem com o PR #8; nenhum SQL executado.`);
} catch {
  console.error('FAIL: conjunto ou hash das migrações diverge do plano revisado. Não aplicar SQL.');
  process.exitCode = 1;
}
// Keep paths local; this verifier never loads a database driver or environment credentials.
