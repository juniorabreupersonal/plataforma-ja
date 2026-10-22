import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.invalid';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'synthetic-test-key';
// Executa o código real com adaptadores de Next/Supabase simulados, sem rede ou contas reais.
function load(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } });
  const loaded = { exports: {} };
  const localRequire = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  new Function('require', 'module', 'exports', outputText)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
const validation = load('src/lib/auth/validation.ts');
const user = { id: 'synthetic-user', email_confirmed_at: '2026-01-01' };
const state = { message: '' };
function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
function fixture(overrides = {}, marker) {
  const calls = [];
  const auth = {};
  for (const method of ['signUp', 'signInWithPassword', 'resetPasswordForEmail', 'getUser', 'updateUser', 'signOut']) {
    auth[method] = async (...args) => {
      calls.push([method, ...args]);
      if (overrides[method]) return overrides[method](...args);
      return { data: { user }, error: null };
    };
  }
  const store = { get: () => marker ? { value: marker } : undefined, delete: name => calls.push(['delete', name]), set: (...args) => calls.push(['set', ...args]) };
  const actions = load('src/app/auth/actions.ts', {
    '@/lib/auth/server': { authClient: async () => ({ auth }) },
    '@/lib/auth/validation': validation,
    'next/headers': { cookies: async () => store },
    'next/navigation': { redirect: path => { throw new Error(`redirect:${path}`); } },
  });
  return { actions, calls, auth, store };
}

test('validação rejeita entradas inválidas, senha curta, campos de arquivo e origem externa insegura', () => {
  assert.equal(validation.credentials(form({ email: 'invalid', password: 'secret' })), null);
  assert.equal(validation.credentials(form({ email: 'a@example.invalid', password: 'short' }), true), null);
  assert.equal(validation.validEmail(new Blob(['x'])), null);
  assert.equal(validation.validPassword(new Blob(['x'])), null);
  for (const value of [undefined, 'http://example.invalid', 'https://user:pass@example.invalid', 'https://example.invalid/path', 'https://example.invalid/?next=evil']) assert.throws(() => validation.applicationOrigin(value));
  assert.equal(validation.applicationOrigin('https://app.example.invalid'), 'https://app.example.invalid');
});

test('login inválido não consulta o provedor', async () => {
  const f = fixture();
  await f.actions.login(state, form({ email: 'invalid' }));
  assert.equal(f.calls.length, 0);
});

test('login confirmado redireciona somente para conta; ignora role e next enviados', async () => {
  const f = fixture();
  await assert.rejects(f.actions.login(state, form({ email: 'a@example.invalid', password: 'secret', role: 'admin', next: 'https://evil.invalid' })), /redirect:\/conta/);
  assert.deepEqual(f.calls[0], ['signInWithPassword', { email: 'a@example.invalid', password: 'secret' }]);
});

test('login não confirmado encerra sessão indevida e não libera conta', async () => {
  const f = fixture({ signInWithPassword: () => ({ data: { user: { id: user.id }, session: {} }, error: null }) });
  const result = await f.actions.login(state, form({ email: 'a@example.invalid', password: 'secret' }));
  assert.match(result.message, /confirmação/);
  assert.equal(f.calls[1][0], 'signOut');
});

test('erros e falhas de rede não expõem mensagens do provedor', async () => {
  for (const signInWithPassword of [() => ({ data: {}, error: { message: 'private-provider-detail' } }), () => { throw Error('private-provider-detail'); }]) {
    const f = fixture({ signInWithPassword });
    const result = await f.actions.login(state, form({ email: 'a@example.invalid', password: 'secret' }));
    assert.ok(!result.message.includes('private-provider-detail'));
  }
});

test('cadastro exige confirmação de senha e não atribui metadados ou privilégios', async () => {
  process.env.APP_URL = 'https://app.example.invalid';
  const f = fixture();
  const input = { email: 'a@example.invalid', password: 'synthetic-password', confirmation: 'different' };
  await f.actions.signup(state, form(input));
  assert.equal(f.calls.length, 0);
  await f.actions.signup(state, form({ ...input, confirmation: input.password, role: 'admin' }));
  assert.deepEqual(f.calls[0], ['signUp', { email: input.email, password: input.password, options: { emailRedirectTo: 'https://app.example.invalid/auth/callback' } }]);
});

test('cadastro já existente recebe a mesma mensagem que cadastro aceito', async () => {
  const input = form({ email: 'a@example.invalid', password: 'synthetic-password', confirmation: 'synthetic-password' });
  const normal = fixture();
  const duplicate = fixture({ signUp: () => ({ data: {}, error: { code: 'user_already_exists' } }) });
  assert.deepEqual(await normal.actions.signup(state, input), await duplicate.actions.signup(state, input));
});

test('cadastro com sessão automática encerra sessão e alerta sobre confirmação', async () => {
  const f = fixture({ signUp: () => ({ data: { session: {} }, error: null }) });
  const result = await f.actions.signup(state, form({ email: 'a@example.invalid', password: 'synthetic-password', confirmation: 'synthetic-password' }));
  assert.match(result.message, /requer confirmação/);
  assert.equal(f.calls[1][0], 'signOut');
});

test('APP_URL ausente impede envio de links sem origem confiável', async () => {
  delete process.env.APP_URL;
  const f = fixture();
  await f.actions.recover(state, form({ email: 'a@example.invalid' }));
  assert.equal(f.calls.length, 0);
  process.env.APP_URL = 'https://app.example.invalid';
});

test('recuperação usa destino fixo e resposta que não enumera contas', async () => {
  const f = fixture({ resetPasswordForEmail: () => ({ error: { code: 'user_not_found' } }) });
  const result = await f.actions.recover(state, form({ email: 'a@example.invalid', next: 'https://evil.invalid' }));
  assert.match(result.message, /Se houver/);
  assert.deepEqual(f.calls[0], ['resetPasswordForEmail', 'a@example.invalid', { redirectTo: 'https://app.example.invalid/auth/callback?flow=recovery' }]);
});

test('redefinição exige usuário validado e marcador correspondente', async () => {
  for (const marker of [undefined, 'another-user']) {
    const f = fixture({}, marker);
    await f.actions.resetPassword(state, form({ password: 'synthetic-password', confirmation: 'synthetic-password' }));
    assert.ok(!f.calls.some(call => call[0] === 'updateUser'));
  }
});

test('redefinição válida atualiza senha, encerra sessões e remove marcador', async () => {
  const f = fixture({}, user.id);
  await assert.rejects(f.actions.resetPassword(state, form({ password: 'synthetic-password', confirmation: 'synthetic-password' })), /redirect:\/login\?status=password-updated/);
  assert.deepEqual(f.calls.map(call => call[0]), ['getUser', 'updateUser', 'signOut', 'delete']);
});

test('logout é ação servidor e só redireciona após sucesso', async () => {
  const f = fixture();
  await assert.rejects(f.actions.logout(state), /redirect:\/login/);
  assert.deepEqual(f.calls[0], ['signOut', { scope: 'local' }]);
  const failed = fixture({ signOut: () => ({ error: {} }) });
  assert.ok((await failed.actions.logout(state)).message);
});

test('callback troca código PKCE, ignora next externo e não reflete tokens em erro', async () => {
  const f = fixture();
  f.auth.exchangeCodeForSession = async code => ({ data: { user: code === 'valid' ? user : null }, error: code === 'valid' ? null : {} });
  const { GET } = load('src/app/auth/callback/route.ts', {
    '@/lib/auth/server': { authClient: async () => ({ auth: f.auth }) },
    '@/lib/auth/validation': validation,
    'next/headers': { cookies: async () => f.store },
    'next/server': { NextResponse: { redirect: (url, status) => new Response(null, { status, headers: { location: url.href } }) } },
  });
  for (const [query, expected] of [['code=valid&next=https://evil.invalid', '/conta'], ['code=invalid', '/login?status=invalid-link'], ['token_hash=untrusted', '/login?status=invalid-link'], ['code=valid&flow=recovery', '/redefinir-senha']]) {
    const response = await GET({ nextUrl: new URL(`https://app.example.invalid/auth/callback?${query}`) });
    assert.equal(response.headers.get('location'), `https://app.example.invalid${expected}`);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  }
  assert.equal(f.calls.at(-1)[0], 'set');
  assert.equal(f.calls.at(-1)[3].httpOnly, true);
});

test('SSR usa somente chave pública e cookies HttpOnly, Secure em produção e SameSite', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  let settings;
  const writes = [];
  const { authClient } = load('src/lib/auth/server.ts', {
    'server-only': {},
    'next/headers': { cookies: async () => ({ getAll: () => [], set: (...args) => writes.push(args) }) },
    '@supabase/ssr': { createServerClient: (url, key, options) => { settings = { url, key, options }; return {}; } },
  });
  try {
    await authClient();
    assert.equal(settings.key, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    assert.deepEqual(settings.options.cookieOptions, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
    settings.options.cookies.setAll([{ name: 'synthetic-session', value: 'synthetic-value', options: { httpOnly: true } }]);
    assert.equal(writes.length, 1);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test('Proxy propaga renovação para requisição e resposta sem cache compartilhado', async () => {
  const requestWrites = [];
  const responseWrites = [];
  let verified = false;
  const request = { cookies: { getAll: () => [], set: (...args) => requestWrites.push(args) } };
  const { proxy } = load('src/proxy.ts', {
    'next/server': { NextResponse: { next: () => ({ headers: new Headers(), cookies: { set: (...args) => responseWrites.push(args) } }) } },
    '@supabase/ssr': { createServerClient: (url, key, options) => ({ auth: { getUser: async () => {
      verified = true;
      options.cookies.setAll([{ name: 'synthetic-session', value: 'renewed', options: { httpOnly: true } }]);
    } } }) },
  });
  const response = await proxy(request);
  assert.ok(verified);
  assert.equal(requestWrites.length, 1);
  assert.equal(responseWrites.length, 1);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
