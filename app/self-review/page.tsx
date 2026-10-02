"use client";
import { useEffect, useState } from "react";
type Answer={questionId:string;prompt:string;text:string;updatedAt:string|null};
type Peer={reviewerId:string;answerId:string;text:string;updatedAt:string|null};
export default function SelfReviewPage(){
 const [answers,setAnswers]=useState<Answer[]>([]);const [peer,setPeer]=useState<Peer[]>([]);
 const [message,setMessage]=useState("Loading…");const [newReviewer,setNewReviewer]=useState("");
 useEffect(()=>{fetch("/api/self-review").then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);setAnswers(b.answers);setPeer(b.peer);setMessage("")}).catch(e=>setMessage(e.message));},[]);
 async function saveSelf(a:Answer,text:string){const r=await fetch("/api/self-review",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({questionId:a.questionId,text})});const b=await r.json();setMessage(r.ok?"Saved to knowledge graph":b.error);if(r.ok)setAnswers(xs=>xs.map(x=>x.questionId===a.questionId?b:x));}
 async function savePeer(p:Peer,text:string){const r=await fetch("/api/self-review",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"peer",reviewerId:p.reviewerId,text})});const b=await r.json();setMessage(r.ok?"Peer feedback saved to knowledge graph":b.error);if(r.ok)setPeer(xs=>xs.map(x=>x.reviewerId===p.reviewerId?{...x,text:b.text,updatedAt:null}:x));}
 async function addPeer(){if(!newReviewer.trim())return;const r=await fetch("/api/self-review",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"peer",reviewerId:newReviewer.trim(),text:"(new peer feedback — edit me)"})});const b=await r.json();if(r.ok){setPeer(xs=>[...xs.filter(x=>x.reviewerId!==newReviewer.trim()),{reviewerId:newReviewer.trim(),answerId:b.answerId,text:b.text,updatedAt:null}].sort((a,b)=>a.reviewerId.localeCompare(b.reviewerId)));setNewReviewer("");setMessage(`Peer ${newReviewer.trim()} added to knowledge graph`);}else setMessage(b.error);}
 return <main><h1>Appraisal input</h1>{message&&<p role="status">{message}</p>}
 <h2>1. Your self-review (as employee-001, about yourself)</h2>
 <p>You are the person being appraised. Answer these prompts about your own work — this is your self-review for appraisal-001.</p>
 {answers.map(a=><section key={a.questionId}><h3>{a.prompt}</h3><textarea defaultValue={a.text} onBlur={e=>{if(e.currentTarget.value!==a.text)saveSelf(a,e.currentTarget.value)}}/><p>{a.updatedAt?`Last saved: ${a.updatedAt}`:"Not saved yet"}</p></section>)}
 <h2>2. Peer feedback (role-play as a peer reviewer)</h2>
 <p>Each entry below is feedback written by a peer reviewer about employee-001. In production peers would log in themselves; here you simulate each peer. These statements feed the AI evidence pass for the appraisal.</p>
 {peer.map(p=><section key={p.reviewerId}><h3>Reviewer: {p.reviewerId}</h3><textarea defaultValue={p.text} onBlur={e=>{if(e.currentTarget.value!==p.text)savePeer(p,e.currentTarget.value)}}/></section>)}
 <div style={{marginTop:"1rem"}}><label>Add reviewer ID <input value={newReviewer} onChange={e=>setNewReviewer(e.target.value)} placeholder="reviewer-005" /></label> <button type="button" onClick={()=>void addPeer()}>Add peer</button></div>
 </main>}
