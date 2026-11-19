'use strict';
function norm(s){return String(s??'').trim().toLowerCase().replace(/-/g,' ').replace(/\s+/g,' ').replace(/[.,!?;:]+$/g,'');}
function validLogin({name,registerno,department,consent}){return !!consent&&typeof name==='string'&&name.trim().length>=2&&name.trim().length<=60&&/^[\p{L} .]+$/u.test(name.trim())&&typeof registerno==='string'&&/^\d{6,15}$/.test(registerno)&&typeof department==='string'&&/^[a-zA-Z0-9]{2,12}$/.test(department.trim());}
function r1Score(p){return Math.max(0,Object.values(p.r1Answers||{}).reduce((n,a)=>n+(a.correct?a.points:0),0)+(p.r1Correction||0));}
function r2Score(p){return Math.max(0,Object.values(p.r2Answers||{}).reduce((n,a)=>n+(a.correct?Math.max(0,a.points-(a.hintUsed?1:0)):0),0)+(p.r2Correction||0));}
function r2Time(p){const good=Object.values(p.r2Answers||{}).filter(a=>a.correct);return {time:good.length?Math.max(...good.map(a=>Number(a.answeredAt)||0)):Infinity,count:good.length};}
function r1Slot(startAt,currentAt,slotSeconds=20,pausedMs=0){if(!startAt)return 0;return Math.min(30,Math.max(0,Math.floor((currentAt-startAt-pausedMs)/1000/slotSeconds)+1));}
function qualifyPlayers(players,limit=12){const eligible=players.filter(p=>!p.r1PendingReview&&!p.r1Disqualified);const sorted=[...eligible].sort((a,b)=>b.r1-a.r1);const cutoff=sorted[Math.min(Math.max(1,limit),sorted.length)-1]?.r1??-1;return sorted.filter(p=>cutoff>=0&&p.r1>=cutoff);}
function gradeR2(question,answer,hintUsed=false,extraAccepted=[]){const correct=[...question.accepted,...extraAccepted].includes(norm(answer));return {correct,score:correct?Math.max(0,question.points-(hintUsed?1:0)):0};}
function rankPlayers(list){
  const original=new Map(list.map((p,i)=>[p,i]));
  list.sort((a,b)=>b.total-a.total);
  for(let start=0;start<list.length;){let end=start+1;while(end<list.length&&list[end].total===list[start].total)end++;
    const group=list.slice(start,end).sort((a,b)=>{if((a.r2??0)!==(b.r2??0))return (b.r2??0)-(a.r2??0);const ta=r2Time(a),tb=r2Time(b);if(!ta.count&&tb.count)return 1;if(ta.count&&!tb.count)return -1;if(ta.count&&tb.count&&ta.time!==tb.time)return ta.time-tb.time;return original.get(a)-original.get(b);});
    list.splice(start,end-start,...group);start=end;
  }
  return list;
}
module.exports={norm,validLogin,r1Score,r2Score,r2Time,r1Slot,qualifyPlayers,gradeR2,rankPlayers};
