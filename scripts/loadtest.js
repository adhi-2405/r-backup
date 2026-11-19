'use strict';
require('dotenv').config();
// Destructive end-to-end rehearsal: resets the local event and drives 100 simulated players through both rounds.
const {r1,cases}=require('../content');
const base=process.env.BASE_URL||'http://127.0.0.1:3000';
const count=100;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(url,{method='GET',body,session,admin}={}){
  const headers={};if(body!==undefined)headers['content-type']='application/json';if(session)headers['x-session-token']=session;if(admin)headers['x-admin-token']=admin;
  const res=await fetch(base+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(`${method} ${url} → ${res.status}: ${data.error||'request failed'}`);return data;
}
(async()=>{
  if(process.env.LOADTEST_CONFIRM!=='YES')throw new Error('This test resets the event. Set LOADTEST_CONFIRM=YES to confirm you are using a disposable local rehearsal server.');
  if(!process.env.ADMIN_PASSWORD)throw new Error('Set ADMIN_PASSWORD in the environment used by the server and load-test process.');
  const started=Date.now();
  let auth=await request('/api/admin/login',{method:'POST',body:{password:process.env.ADMIN_PASSWORD}});
  await request('/api/admin/reset',{method:'POST',body:{confirm:'RESET'},admin:auth.adminToken});
  auth=await request('/api/admin/login',{method:'POST',body:{password:process.env.ADMIN_PASSWORD}});
  const logins=await Promise.all(Array.from({length:count},(_,i)=>request('/api/login',{method:'POST',body:{name:`Load Player ${String(i+1).padStart(3,'0')}`,registerno:String(70000000000+i),department:'CSE',consent:true}})));
  console.log(`Created ${logins.length} participant sessions.`);
  await request('/api/admin/start-r1',{method:'POST',body:{},admin:auth.adminToken});
  await sleep(5200);
  for(let slot=1;slot<=30;slot++){
    const t=Date.now();
    const outcomes=await Promise.all(logins.map(async login=>{
      const s=await request('/api/me',{session:login.sessionToken});const q=s.r1;
      if(!q||q.number!==slot||q.waiting)throw new Error(`Player ${s.name} was not on Round 1 slot ${slot}.`);
      const source=r1.find(x=>x.question===q.question);if(!source)throw new Error('Could not map participant question to server test content.');
      const correct=q.options.find(o=>o.label===source.answer);if(!correct)throw new Error('Correct option missing from shuffled choices.');
      await request('/api/r1/draft',{method:'POST',body:{optionId:correct.id,questionNumber:q.number},session:login.sessionToken});
      return request('/api/r1/submit',{method:'POST',body:{optionId:correct.id,questionNumber:q.number},session:login.sessionToken});
    }));
    if(outcomes.length!==count)throw new Error(`Round 1 slot ${slot}: incomplete player submissions.`);
    const nextStates=await Promise.all(logins.map(login=>request('/api/me',{session:login.sessionToken})));if(nextStates.some(s=>s.r1?.number!==slot+1&&slot<30))throw new Error(`Round 1 question ${slot} did not advance immediately after submission.`);
    if(slot%5===0)console.log(`Round 1: ${slot}/30 slots completed.`);
  }
  await request('/api/admin/end-r1',{method:'POST',body:{},admin:auth.adminToken}).catch(async e=>{const s=await request('/api/state');if(s.event.status!=='r1-ended')throw e;});
  await request('/api/admin/qualify',{method:'POST',body:{finalists:12},admin:auth.adminToken});
  await request('/api/admin/start-r2',{method:'POST',body:{},admin:auth.adminToken});
  await sleep(5200);
  for(let qn=1;qn<=4;qn++){
    await Promise.all(logins.map(async login=>{
      const s=await request('/api/me',{session:login.sessionToken});if(!s.finalist)throw new Error(`${s.name} was not qualified despite the Round 1 cutoff tie.`);
      const q=s.r2Info.question;if(!q||q.number!==qn)throw new Error(`${s.name} was not on Round 2 question ${qn}.`);
      const answer=cases[s.caseId].questions[qn-1].accepted[0];
      await request('/api/r2/submit',{method:'POST',body:{answer,questionNumber:qn},session:login.sessionToken});
    }));
    console.log(`Round 2: ${qn}/4 questions completed for all finalists.`);
  }
  await request('/api/admin/publish',{method:'POST',body:{},admin:auth.adminToken});
  const winners=await request('/api/winners');
  if(winners.players.length!==count)throw new Error(`Expected ${count} published participants, received ${winners.players.length}.`);
  if(winners.players.some(p=>p.total!==60))throw new Error('At least one simulated player did not score 60/60.');
  console.log(`PASS: ${count} simulated players completed both rounds with 60/60. End-to-end duration: ${Math.round((Date.now()-started)/1000)} seconds.`);
})().catch(e=>{console.error('LOAD TEST FAILED:',e.message);process.exitCode=1;});
