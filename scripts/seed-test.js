'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const dir=path.resolve(process.env.REHEARSAL_DATA_DIR||'./data/rehearsal');fs.mkdirSync(dir,{recursive:true});
const state={version:1,createdAt:Date.now(),event:{status:'upcoming',r1StartedAt:null,r1EndsAt:null,r2StartedAt:null,r2EndsAt:null,pauseAt:null,pausedMs:0,finalistsLimit:12,winnersPublished:false,loginOpen:true,leaderboardVisible:false},players:{},sessions:{},roster:null,assignments:{},audit:[],suddenDeath:null,acceptedAdditions:{}};
for(let i=1;i<=12;i++){const registerno=String(90000000000+i),name=`Rehearsal Player ${String(i).padStart(2,'0')}`;state.players[registerno]={registerno,name,department:'CSE',createdAt:Date.now(),active:false,consentAt:Date.now(),r1Answers:{},r1Drafts:{},r2Answers:{},r2Drafts:{}};}
const file=path.join(dir,'state.json'),tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(tmp,file);console.log(`Created 12 rehearsal-only participants in ${file}`);console.log(`Run the app with DATA_DIR="${dir}" to use this separate rehearsal state.`);
