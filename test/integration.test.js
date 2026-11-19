const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const hasRuntimeDeps=['express','helmet','dotenv'].every(name=>{try{require.resolve(name);return true}catch{return false}});
const {validLogin}=require('../core');

test('participant input rejects malformed login data',()=>{
  assert.equal(validLogin({name:'Student One',registerno:'12345678',department:'IT',consent:true}),true);
  assert.equal(validLogin({name:'Student1',registerno:'12345678',department:'IT',consent:true}),false);
});
test('server-side question content is not stored in public assets',()=>{
  const pub=path.join(__dirname,'../public'),files=[];
  function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push(p)}}walk(pub);
  for(const f of files){const s=fs.readFileSync(f,'utf8');for(const secret of ['Annual_Report.pdf','login-company-secure.net','parameterised queries','cmd.exe'])assert.equal(s.includes(secret),false,`${path.basename(f)} must not contain server-only case answers`);}
});
test('HTTP integration: validation, duplicate session, admin separation, hidden keys and restart persistence',{skip:!hasRuntimeDeps?'Install project dependencies to run HTTP integration tests.':false},async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'code-clash-http-'));
  const port=34000+Math.floor(Math.random()*10000),password='Integration-Test-Only-Password';
  const emptyEnv=path.join(dir,'.env.empty');fs.writeFileSync(emptyEnv,'');
  let child;
  const start=async(env)=>{
    child=spawn(process.execPath,[path.join(__dirname,'../server.js')],{cwd:path.join(__dirname,'..'),env:{...process.env,...env,PORT:String(port),DATA_DIR:path.join(dir,'data'),R1_SLOT_SECONDS:'2'},stdio:'ignore'});
    const base=`http://127.0.0.1:${port}`;let ready=false;
    for(let i=0;i<80;i++){if(child.exitCode!==null)throw new Error('Server exited during startup');try{const r=await fetch(base+'/api/state');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100));}
    if(!ready)throw new Error('Server did not become ready');return base;
  };
  const stop=async()=>{if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}child=null};
  try{
    let base=await start({ADMIN_PASSWORD:password,DOTENV_CONFIG_PATH:emptyEnv});
    let r=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Bad',registerno:'12345',department:'IT',consent:true})});assert.equal(r.status,400);
    r=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Test Player',registerno:'12345678',department:'CSE',consent:true})});assert.equal(r.status,200);const login=await r.json();
    r=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Test Player',registerno:'12345678',department:'CSE',consent:true})});assert.equal(r.status,409);
    r=await fetch(base+'/api/admin/overview',{headers:{'x-session-token':login.sessionToken}});assert.equal(r.status,401);
    r=await fetch(base+'/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'wrong'})});assert.equal(r.status,401);
    r=await fetch(base+'/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});assert.equal(r.status,200);const admin=await r.json();
    r=await fetch(base+'/api/admin/start-r1',{method:'POST',headers:{'content-type':'application/json','x-admin-token':admin.adminToken},body:'{}'});assert.equal(r.status,200);
    await new Promise(resolve=>setTimeout(resolve,5200));
    r=await fetch(base+'/api/me',{headers:{'x-session-token':login.sessionToken}});assert.equal(r.status,200);const participant=await r.json();
    assert.ok(participant.r1?.question);assert.equal(JSON.stringify(participant).includes('accepted'),false);assert.equal(JSON.stringify(participant).includes('correct'),false);assert.equal(JSON.stringify(participant).includes('hint'),false);
    const first=participant.r1;const correct=first.options.find(o=>o.label===require('../content').r1.find(q=>q.question===first.question).answer);r=await fetch(base+'/api/r1/submit',{method:'POST',headers:{'content-type':'application/json','x-session-token':login.sessionToken},body:JSON.stringify({optionId:correct.id,questionNumber:first.number})});assert.equal(r.status,200);const submitted=await r.json();assert.ok(submitted.submissionTime);assert.equal(submitted.next.number,2,'Round 1 must advance immediately after submit');assert.equal(submitted.score,require('../content').r1.find(q=>q.question===first.question).points);
    await new Promise(resolve=>setTimeout(resolve,2200));r=await fetch(base+'/api/me',{headers:{'x-session-token':login.sessionToken}});const afterTimeout=await r.json();assert.equal(afterTimeout.r1.number,3,'Round 1 must auto-advance after a 2-second test slot expires');
    await new Promise(resolve=>setTimeout(resolve,250));await stop();
    base=await start({ADMIN_PASSWORD:password,DOTENV_CONFIG_PATH:emptyEnv});
    r=await fetch(base+'/api/me',{headers:{'x-session-token':login.sessionToken}});assert.equal(r.status,200);
    await stop();
    const missingPort=port+1;child=spawn(process.execPath,[path.join(__dirname,'../server.js')],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(missingPort),DATA_DIR:path.join(dir,'missing-data'),DOTENV_CONFIG_PATH:emptyEnv,ADMIN_PASSWORD:''},stdio:'ignore'});
    let missingBase=`http://127.0.0.1:${missingPort}`,ready=false;for(let i=0;i<80;i++){try{if((await fetch(missingBase+'/api/state')).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(ready,true);
    r=await fetch(missingBase+'/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'anything'})});assert.equal(r.status,503);
  } finally {await stop();fs.rmSync(dir,{recursive:true,force:true});}
});
