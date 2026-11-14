import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const empty={message:'',factorId:'',secret:'',complete:false};
function form(values){const f=new FormData();for(const[k,v]of Object.entries(values))f.set(k,v);return f;}
function fixture(owner=false,verified=false){
 const calls=[];let fail=false;
 const client={auth:{mfa:{listFactors:async()=>({data:{all:[{id:'owned-synthetic',factor_type:'totp',status:verified?'verified':'unverified'}]},error:null}),enroll:async data=>{calls.push(['enroll',data]);return{data:{id:'owned-synthetic',totp:{secret:'SYNTHETIC-SECRET'}},error:null};},challengeAndVerify:async data=>{calls.push(['verify',data]);return{error:fail?{message:'private-provider-detail'}:null};}}}};
 const mocks={'next/cache':{revalidatePath(){}},'@/lib/panels/server':{panelSession:async()=>({permissions:{owner_candidate:owner},client})}};
 const {outputText}=ts.transpileModule(readFileSync('src/app/conta/seguranca/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const loaded={exports:{}};new Function('require','module','exports',outputText)(name=>mocks[name],loaded,loaded.exports);
 return{action:loaded.exports.setupTotp,calls,setFail:()=>{fail=true;}};
}
test('proprietário não pode matricular substituto MFA com apenas a senha',async()=>{const f=fixture(true);const result=await f.action(empty,form({intent:'start'}));assert.equal(f.calls.length,0);assert.equal(result.secret,'');});
test('fator verificado existente nunca é substituído pelo fluxo inicial',async()=>{const f=fixture(false,true);await f.action(empty,form({intent:'start'}));assert.equal(f.calls.length,0);});
test('matrícula inicial não chama concessão de papéis e devolve apenas o segredo Auth da própria conta',async()=>{const f=fixture();const result=await f.action(empty,form({intent:'start',role:'owner'}));assert.equal(result.secret,'SYNTHETIC-SECRET');assert.equal(result.factorId,'owned-synthetic');assert.deepEqual(f.calls,[['enroll',{factorType:'totp',friendlyName:'Plataforma JA'}]]);});
test('UUID de fator alheio não chega à verificação e falhas não refletem detalhes do provedor',async()=>{const f=fixture();await f.action(empty,form({intent:'verify',factorId:'foreign',code:'123456'}));assert.equal(f.calls.length,0);f.setFail();const result=await f.action(empty,form({intent:'verify',factorId:'owned-synthetic',code:'123456'}));assert.ok(!result.message.includes('private-provider-detail'));assert.equal(result.secret,'');assert.equal(result.complete,false);});
test('confirmar fator próprio não concede função e não retorna segredo após sucesso',async()=>{const f=fixture();const result=await f.action(empty,form({intent:'verify',factorId:'owned-synthetic',code:'123456'}));assert.equal(result.complete,true);assert.equal(result.secret,'');assert.match(result.message,/Nenhuma função/);assert.equal(f.calls[0][0],'verify');});
