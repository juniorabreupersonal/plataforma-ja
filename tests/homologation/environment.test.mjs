import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { publicSupabaseConfig, runtimeEnvironment } from '../../src/lib/environment/policy.mjs';
const require = createRequire(import.meta.url);
// Synthetic identifiers only: never look up or connect to these domains.
const policy = { schemaVersion:1, stagingProjectRef:'s'.repeat(20), protectedProjectRefs:['p'.repeat(20)], stagingAppOrigin:'https://staging.example.invalid', syntheticDataOnly:true };
const key='sb_publishable_'+'synthetic'.repeat(6);
const secret='SyntheticGate_'+'x9A2v7B4q6C8m3D5'.repeat(2);
const env={APP_ENV:'staging',VERCEL:'1',VERCEL_ENV:'preview',APP_URL:policy.stagingAppOrigin,NEXT_PUBLIC_SUPABASE_URL:`https://${policy.stagingProjectRef}.supabase.co`,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key,STAGING_GATE_SECRET:secret};
const local={APP_URL:'http://127.0.0.1:3210',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'synthetic-local-key'};
function load(path,mocks) {
  const source=readFileSync(path,'utf8');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const loaded={exports:{}};
  new Function('require','module','exports',outputText)(name=>Object.hasOwn(mocks,name)?mocks[name]:require(name),loaded,loaded.exports);
  return loaded.exports;
}
const server=load('src/lib/environment/server.ts',{'server-only':{},'./policy.mjs':{runtimeEnvironment}});
test('política versionada não configurada bloqueia qualquer homologação',()=>{
  assert.throws(()=>runtimeEnvironment(env),/PROJECT_APPROVAL/);
  assert.throws(()=>publicSupabaseConfig(env.NEXT_PUBLIC_SUPABASE_URL,key),/PROJECT_APPROVAL/);
});
test('somente projeto aprovado, distinto do protegido, com origem fixa e Preview é aceito',()=>{
  assert.equal(runtimeEnvironment(env,policy).mode,'staging');
  for(const patch of [{VERCEL_ENV:'production'},{APP_ENV:'production'},{APP_ENV:'local'},{VERCEL:'0'},{VERCEL:undefined,VERCEL_ENV:undefined},{APP_URL:'https://external.example.invalid'},{STAGING_GATE_SECRET:undefined},{STAGING_GATE_SECRET:'short'},{NEXT_PUBLIC_SUPABASE_URL:local.NEXT_PUBLIC_SUPABASE_URL}]) assert.throws(()=>runtimeEnvironment({...env,...patch},policy));
  for(const patch of [{stagingProjectRef:policy.protectedProjectRefs[0]},{protectedProjectRefs:[]},{stagingAppOrigin:'http://staging.example.invalid'},{syntheticDataOnly:false}]) assert.throws(()=>runtimeEnvironment(env,{...policy,...patch}));
});
test('trocar env pública, usar destino principal ou URL enganosa falha antes do SDK',()=>{
  for(const url of [`https://${policy.protectedProjectRefs[0]}.supabase.co`,`https://${'z'.repeat(20)}.supabase.co`,env.NEXT_PUBLIC_SUPABASE_URL+'.external.invalid',env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1',env.NEXT_PUBLIC_SUPABASE_URL+'?x=1',env.NEXT_PUBLIC_SUPABASE_URL+'#x',env.NEXT_PUBLIC_SUPABASE_URL.replace('https://','https://user:password@'),env.NEXT_PUBLIC_SUPABASE_URL+':8443','http://192.168.1.1:54321','http://localhost:9999']) assert.throws(()=>publicSupabaseConfig(url,key,policy));
});
test('nuvem exige chave publishable e desenvolvimento não aceita destino remoto',()=>{
  for(const value of ['sb_secret_'+'x'.repeat(40),'eyJ.synthetic.jwt',undefined,'plain-key']) assert.throws(()=>publicSupabaseConfig(env.NEXT_PUBLIC_SUPABASE_URL,value,policy),/PUBLIC_KEY/);
  assert.equal(runtimeEnvironment(local).mode,'local');
  assert.throws(()=>runtimeEnvironment({...local,NEXT_PUBLIC_SUPABASE_URL:env.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key},policy),/LOCAL_REMOTE/);
  assert.throws(()=>runtimeEnvironment({...local,APP_URL:'https://external.example.invalid'}));
  assert.throws(()=>runtimeEnvironment({...local,VERCEL:'1',VERCEL_ENV:'production'}));
  const privileged='eyJ.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature';
  assert.throws(()=>publicSupabaseConfig(local.NEXT_PUBLIC_SUPABASE_URL,privileged),/PUBLIC_KEY/);
});
test('barreira de infraestrutura aceita somente Basic correto e não confunde Bearer ou cookies',()=>{
  const authorization='Basic '+Buffer.from('ja-homologacao:'+secret).toString('base64');
  assert.equal(server.stagingAccess(authorization,secret),true);
  for(const value of [null,'Bearer '+secret,'Basic '+Buffer.from('owner:'+secret).toString('base64'),'Basic '+Buffer.from('ja-homologacao:wrong').toString('base64'),'Basic '.padEnd(2000,'A')]) assert.equal(server.stagingAccess(value,secret),false);
});
function proxyFixture(configuration,authorization=null,url=env.APP_URL) {
  let sdk=0;
  class Response {constructor(body,options={}){this.body=body;this.status=options.status??200;this.headers=new Headers(options.headers);this.cookies={set(){}};} static next(){return new Response('next');}}
  const {proxy}=load('src/proxy.ts',{'@/lib/environment/server':{serverEnvironment:()=>{if(configuration instanceof Error)throw configuration;return configuration;},stagingAccess:(value)=>server.stagingAccess(value,secret)},'next/server':{NextResponse:Response},'@supabase/ssr':{createServerClient:()=>{sdk++;return {auth:{getUser:async()=>({})}}}}});
  const parsed=new URL(url);
  const request={nextUrl:{origin:parsed.origin,pathname:parsed.pathname},headers:new Headers(authorization?{authorization}:{}),cookies:{getAll:()=>[],set(){}}};
  return {run:()=>proxy(request),sdkCalls:()=>sdk};
}
test('Proxy barra acesso anônimo, config inválida, host alternativo e arquivos estáticos antes do SDK',async()=>{
  const cfg=runtimeEnvironment(env,policy);
  for(const path of ['/','/administrador','/auth/callback?code=not-a-token','/api/example','/_next/static/example.js','/brand/revisadas/ja-simbolo-tecnica.png']){
    const f=proxyFixture(cfg,null,env.APP_URL+path);const result=await f.run();assert.equal(result.status,401);assert.equal(f.sdkCalls(),0);assert.match(result.headers.get('cache-control'),/no-store/);
  }
  const invalid=proxyFixture(new Error('config'));assert.equal((await invalid.run()).status,503);assert.equal(invalid.sdkCalls(),0);
  const other=proxyFixture(cfg,null,'https://external.example.invalid/administrador');assert.equal((await other.run()).status,421);assert.equal(other.sdkCalls(),0);
});
test('barreira válida preserva verificação Auth e cabeçalhos privados sem conceder papel',async()=>{
  const header='Basic '+Buffer.from('ja-homologacao:'+secret).toString('base64');
  const f=proxyFixture(runtimeEnvironment(env,policy),header,env.APP_URL+'/administrador');const response=await f.run();
  assert.equal(response.status,200);assert.equal(f.sdkCalls(),1);assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');assert.match(response.headers.get('cache-control'),/no-store/);
});
test('fábricas SSR e browser negam destino inválido antes de criar qualquer cliente',async()=>{
  let count=0;
  const ssr=load('src/lib/auth/server.ts',{'server-only':{},'next/headers':{cookies:async()=>({})},'@/lib/environment/server':{serverEnvironment:()=>{throw Error('JA_ENV_SYNTHETIC');}},'@supabase/ssr':{createServerClient:()=>{count++;}}});
  await assert.rejects(ssr.authClient(),/JA_ENV_SYNTHETIC/);assert.equal(count,0);
  const browser=load('src/lib/supabase.ts',{'@/lib/environment/policy.mjs':{publicSupabaseConfig:()=>{throw Error('JA_ENV_SYNTHETIC');}},'@supabase/ssr':{createBrowserClient:()=>{count++;}}});
  const previous=[process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY];
  try{process.env.NEXT_PUBLIC_SUPABASE_URL=env.NEXT_PUBLIC_SUPABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=key;assert.throws(()=>browser.createSupabaseClient(),/JA_ENV_SYNTHETIC/);assert.equal(count,0);}finally{for(const [i,name]of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].entries())if(previous[i]===undefined)delete process.env[name];else process.env[name]=previous[i];}
});
test('preflight não faz rede, não imprime valores e falha com cloud não aprovada',()=>{
  const result=spawnSync(process.execPath,['scripts/homologation/preflight.mjs','--staging'],{env:{PATH:process.env.PATH,...env},encoding:'utf8'});
  assert.notEqual(result.status,0);const output=result.stdout+result.stderr;
  for(const sensitive of [key,secret,env.NEXT_PUBLIC_SUPABASE_URL,env.APP_URL])assert.ok(!output.includes(sensitive));
});
test('deploy Git permanece desligado, sem etapas de publicação e sem modo production',()=>{
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  assert.equal(config.git.deploymentEnabled,false);assert.equal(config.buildCommand,'npm run build');
  const source=readFileSync('src/lib/environment/policy.mjs','utf8');assert.ok(!source.includes('fetch('));
});
