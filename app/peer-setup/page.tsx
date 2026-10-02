"use client";
import { useEffect, useState } from "react";
type Peer={reviewerId:string;answerId:string;text:string;updatedAt:string|null};
export default function PeerSetupPage(){
 const [peer,setPeer]=useState<Peer[]>([]);const [message,setMessage]=useState("Loading…");const [newReviewer,setNewReviewer]=useState("");
 useEffect(()=>{fetch("/api/peer-feedback").then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);setPeer(b.peer);setMessage("")}).catch(e=>setMessage(e.message));},[]);
 async function savePeer(p:Peer,text:string){const r=await fetch("/api/peer-feedback",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({reviewerId:p.reviewerId,text})});const b=await r.json();setMessage(r.ok?"Peer feedback saved to knowledge graph":b.error);if(r.ok)setPeer(xs=>xs.map(x=>x.reviewerId===p.reviewerId?{...x,text:b.text,updatedAt:null}:x));}
 async function addPeer(){if(!newReviewer.trim())return;const r=await fetch("/api/peer-feedback",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({reviewerId:newReviewer.trim(),text:"(new peer feedback — edit me)"})});const b=await r.json();if(r.ok){setPeer(xs=>[...xs.filter(x=>x.reviewerId!==newReviewer.trim()),{reviewerId:newReviewer.trim(),answerId:b.answerId,text:b.text,updatedAt:null}].sort((a,b)=>a.reviewerId.localeCompare(b.reviewerId)));setNewReviewer("");setMessage(`Peer ${newReviewer.trim()} added to knowledge graph`);}else setMessage(b.error);}
 return <main><h1>Peer feedback setup (demo)</h1><p>Each entry is feedback written by a peer reviewer about employee-001. In production peers would sign in themselves; here you simulate each peer. These statements feed the AI evidence pass.</p>{message&&<p role="status">{message}</p>}
 {peer.map(p=><section key={p.reviewerId}><h2>Reviewer: {p.reviewerId}</h2><textarea defaultValue={p.text} onBlur={e=>{if(e.currentTarget.value!==p.text)savePeer(p,e.currentTarget.value)}}/></section>)}
 <div style={{marginTop:"1rem"}}><label>Add reviewer ID <input value={newReviewer} onChange={e=>setNewReviewer(e.target.value)} placeholder="reviewer-005" /></label> <button type="button" onClick={()=>void addPeer()}>Add peer</button></div>
 </main>}
