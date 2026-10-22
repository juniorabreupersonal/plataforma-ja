import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Usa o build existente; sem cadastro, envio de e-mails ou dados de saúde.
const origin = 'http://127.0.0.1:3101';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3101'], {
  env: { ...process.env, APP_URL: origin }, stdio: 'ignore',
});
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (server.exitCode !== null) throw new Error('Servidor de teste não iniciou; confira a disponibilidade da porta 3101.');
    try { const r = await fetch(`${origin}/login`); ready = r.ok; await r.body?.cancel(); } catch { /* Aguardar startup. */ }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, 'Servidor não ficou pronto');
  for (const [path, content] of [['/login', 'Acesso à Plataforma JA'], ['/criar-conta', 'Criar sua conta'], ['/recuperar-senha', 'Recuperar senha'], ['/cadastro', 'Cadastro Inicial JA']]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes(content));
    console.log(`${path}: HTTP 200 e conteúdo esperado`);
  }
  for (const [path, target, forbidden] of [['/conta', '/login', 'Sua sessão foi validada'], ['/redefinir-senha', '/recuperar-senha', 'name="confirmation"']]) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    const html = await response.text();
    assert.ok(!html.includes(forbidden));
    if ([303, 307].includes(response.status)) assert.ok(response.headers.get('location').endsWith(target));
    else { assert.equal(response.status, 200); assert.ok(html.includes('NEXT_REDIRECT') && html.includes(target)); }
    console.log(`${path}: acesso anônimo negado no servidor`);
  }
  for (const query of ['next=https://evil.invalid', 'code=invalid&next=https://evil.invalid']) {
    const response = await fetch(`${origin}/auth/callback?${query}`, { redirect: 'manual' });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), `${origin}/login?status=invalid-link`);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    console.log('/auth/callback: HTTP 303, link inválido e destino externo rejeitado');
  }
} finally {
  server.kill('SIGTERM');
}
