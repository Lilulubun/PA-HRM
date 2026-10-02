"use client";
import { useEffect, useState } from "react";
type Answer={questionId:string;prompt:string;text:string;updatedAt:string|null};
export default function SelfReviewPage(){
 const [answers,setAnswers]=useState<Answer[]>([]);const [message,setMessage]=useState("Loading…");
 useEffect(()=>{fetch("/api/self-review").then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);setAnswers(b.answers);setMessage("")}).catch(e=>setMessage(e.message));},[]);
 async function saveSelf(a:Answer,text:string){const r=await fetch("/api/self-review",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({questionId:a.questionId,text})});const b=await r.json();setMessage(r.ok?"Saved to knowledge graph":b.error);if(r.ok)setAnswers(xs=>xs.map(x=>x.questionId===a.questionId?b:x));}
 return <main><h1>Your self-review</h1><p>You are the person being appraised. Answer these prompts about your own work — this is your self-review for appraisal-001. Every edit writes to the knowledge graph.</p>{message&&<p role="status">{message}</p>}
 {answers.map(a=><section key={a.questionId}><h2>{a.prompt}</h2><textarea defaultValue={a.text} onBlur={e=>{if(e.currentTarget.value!==a.text)saveSelf(a,e.currentTarget.value)}}/><p>{a.updatedAt?`Last saved: ${a.updatedAt}`:"Not saved yet"}</p></section>)}
 </main>}
