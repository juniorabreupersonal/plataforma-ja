import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function load(path, mocks) {
  const source = readFileSync(path, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => { if (!(name in mocks)) throw Error('Unexpected import: '+name); return mocks[name]; }, loaded, loaded.exports);
  return loaded.exports;
}
const basic = { active: true, owner_candidate: false, administrator: false, professional: false, student: false };
function fixture(permissions = basic, options = {}) {
  const calls = [];
  const client = { auth: { getUser: async () => ({ data: { user: options.user ?? { id: 'synthetic', email_confirmed_at: '2026-01-01', user_metadata: { role: 'owner' } } }, error: options.authError }) },
    rpc: async name => { calls.push(name); if (options.throw) throw Error('sensitive'); return { data: permissions, error: options.rpcError }; } };
  const guard = load('src/lib/panels/server.ts', { 'server-only': {}, '@/lib/auth/server': { authClient: async () => client }, 'next/navigation': { redirect: path => { throw Error('redirect:'+path); }, notFound: () => { throw Error('notFound'); } } });
  return { guard, calls };
}
test('cadastro básico e metadados owner não concedem nenhum painel', async () => {
  const {guard}=fixture();
  for (const role of ['administrator','professional','student']) await assert.rejects(guard.requirePanel(role), /notFound/);
});
test('funções profissionais e aluno são independentes, sem privilégio administrativo', async () => {
  const {guard}=fixture({...basic,professional:true,student:true});
  await guard.requirePanel('professional'); await guard.requirePanel('student');
  await assert.rejects(guard.requirePanel('administrator'), /notFound/);
});
test('proprietário AAL1 precisa de MFA e não herda função profissional', async () => {
  const {guard}=fixture({...basic,owner_candidate:true});
  await assert.rejects(guard.requirePanel('administrator'), /redirect:\/seguranca\/mfa/);
  await assert.rejects(guard.requirePanel('professional'), /notFound/);
});
test('proprietário AAL2 e vínculo profissional separado permitem ambos os contextos', async () => {
  const {guard}=fixture({...basic,owner_candidate:true,administrator:true,professional:true});
  await guard.requirePanel('administrator'); await guard.requirePanel('professional');
  await assert.rejects(guard.requirePanel('student'), /notFound/);
});
test('revogação é consultada novamente a cada acesso; não há cache de autorização', async () => {
  const current = {...basic,professional:true}; const {guard,calls}=fixture(current);
  await guard.requirePanel('professional'); current.professional=false;
  await assert.rejects(guard.requirePanel('professional'), /notFound/);
  assert.equal(calls.length,2);
});
test('falhas de Auth, RPC, perfil inativo ou contrato inválido negam acesso', async () => {
  for (const [data, options] of [[basic,{authError:{}}], [basic,{rpcError:{}}], [basic,{throw:true}], [{...basic,active:false},{}], [{...basic,administrator:'true'},{}], [null,{}]]) {
    const {guard}=fixture(data,options);
    await assert.rejects(guard.requirePanel('administrator'), /redirect:\/conta\?status=access-unavailable/);
  }
});
test('MFA não é exposto a identidades sem atribuição owner', async () => {
  await assert.rejects(fixture().guard.requireOwnerCandidate(), /notFound/);
});
function form(data) { const f = new FormData(); for (const [k,v] of Object.entries(data)) f.set(k,v); return f; }
test('ação administrativa verifica permissão antes de ler formulário ou chamar RPC', async () => {
  let calls=0;
  const actions=load('src/app/conta/panel-actions.ts', {'next/cache': {revalidatePath(){}}, '@/lib/panels/server': {requirePanel:async role=>{assert.equal(role,'administrator');calls++;throw Error('denied');}}});
  await assert.rejects(actions.createOrganization({message:''},form({name:'Synthetic',role:'owner'})), /denied/); assert.equal(calls,1);
});
test('ação administrativa aceita somente nome validado, não envia funções e oculta erro sensível', async () => {
  const calls=[];const client={rpc:async (...args)=>{calls.push(args);return {error:{message:'secret-provider'}};}};
  const actions=load('src/app/conta/panel-actions.ts', {'next/cache':{revalidatePath(){}}, '@/lib/panels/server': {requirePanel:async()=>({client})}});
  await actions.createOrganization({message:''},form({name:' '.repeat(4)})); assert.equal(calls.length,0);
  const result=await actions.createOrganization({message:''},form({name:' Synthetic ',role:'admin'}));
  assert.deepEqual(calls,[['ja_create_organization',{p_name:'Synthetic'}]]); assert.ok(!result.message.includes('secret-provider'));
});
test('MFA escolhe fator verificado no servidor e não confia no factorId do formulário', async () => {
  const calls=[]; const client={auth:{mfa:{listFactors:async()=>({data:{totp:[{id:'unverified',status:'unverified'},{id:'verified-synthetic',status:'verified'}]},error:null}),challengeAndVerify:async data=>{calls.push(data);return {error:null};}}}};
  const actions=load('src/app/seguranca/mfa/actions.ts', {'next/navigation':{redirect:path=>{throw Error('redirect:'+path);}}, '@/lib/panels/server':{requireOwnerCandidate:async()=>({client})}});
  await assert.rejects(actions.verifyMfa({message:''},form({code:'123456',factorId:'attacker'})), /redirect:\/administrador/);
  assert.deepEqual(calls,[{factorId:'verified-synthetic',code:'123456'}]);
  const result=await actions.verifyMfa({message:''},form({code:'not valid'}));assert.match(result.message,/seis/);assert.equal(calls.length,1);
});
test('aceite valida identidade ativa e UUID, sem aceitar papel enviado pelo navegador', async () => {
  const calls=[];let session=null;
  const actions=load('src/app/conta/panel-actions.ts', {'next/cache':{revalidatePath(){}}, '@/lib/panels/server':{panelSession:async()=>session,requirePanel:async()=>{throw Error('unused');}}});
  await actions.acceptInvitation({message:''},form({id:'00000000-0000-4000-8000-000000000001'}));assert.equal(calls.length,0);
  session={client:{rpc:async(...args)=>{calls.push(args);return {error:null};}}};
  await actions.acceptInvitation({message:''},form({id:'invalid'}));assert.equal(calls.length,0);
  await actions.acceptInvitation({message:''},form({id:'00000000-0000-4000-8000-000000000001',role:'owner'}));
  assert.deepEqual(calls,[['ja_accept_membership',{p_id:'00000000-0000-4000-8000-000000000001'}]]);
});
test('Proxy cobre os três painéis e segurança para renovar sessão e impedir cache compartilhado', () => {
  const proxy = load('src/proxy.ts', {'@supabase/ssr':{},'next/server':{}});
  for (const path of ['/administrador/:path*','/profissional/:path*','/aluno/:path*','/seguranca/:path*']) assert.ok(proxy.config.matcher.includes(path));
});
