import {TOYS,defaultStrokes} from './art.js';
export const KEY='sorirang-playground-v2';
export function freshProject(){return {version:2,title:'나의 소리 놀이터',studentName:'',tempo:84,reflection:'',sounds:Object.fromEntries(TOYS.map(t=>[t.id,{word:t.word,shape:t.shape,speed:'normal',volume:'normal'}])),slots:[null,null,null,null]};}
const text=(v,n,f='')=>typeof v==='string'?v.slice(0,n):f;
export function validateProject(raw){
  if(!raw||![1,2].includes(raw.version)||!Array.isArray(raw.slots)||raw.slots.length!==4)throw new Error('소리랑 놀이터에서 저장한 작품 파일을 선택해 주세요.');
  const p=freshProject();
  p.title=raw.title==='우리 모둠의 소리 놀이터'?p.title:text(raw.title,40,p.title);p.studentName=text(raw.studentName,24);p.reflection=text(raw.reflection,200);p.tempo=Math.max(52,Math.min(120,Number(raw.tempo)||84));
  for(const t of TOYS){const s=raw.sounds?.[t.id];if(!s)continue;p.sounds[t.id]={word:text(s.word,48,t.word),shape:['up','down','wave','dots','flat'].includes(s.shape)?s.shape:t.shape,speed:['slow','normal','fast'].includes(s.speed)?s.speed:'normal',volume:['soft','normal','loud'].includes(s.volume)?s.volume:'normal'};}
  p.slots=raw.slots.map(s=>{
    if(!s||!TOYS.some(t=>t.id===s.toyId))return null;
    let strokes=Array.isArray(s.strokes)?s.strokes.slice(0,12).map(line=>Array.isArray(line)?line.slice(0,180).filter(q=>q&&Number.isFinite(q.x)&&Number.isFinite(q.y)).map(q=>({x:Math.max(0,Math.min(1,q.x)),y:Math.max(0,Math.min(1,q.y))})):[]).filter(l=>l.length):[];
    if(!Array.isArray(s.strokes))strokes=defaultStrokes(p.sounds[s.toyId].shape);
    return {toyId:s.toyId,mode:s.mode==='voice'?'voice':'music',word:text(s.word,48,p.sounds[s.toyId].word),strokes};
  });
  return p;
}
export function loadProject(){try{const raw=localStorage.getItem(KEY)||localStorage.getItem('sorirang-playground-v1');return raw?validateProject(JSON.parse(raw)):freshProject();}catch{return freshProject();}}
let dbPromise;
function db(){return dbPromise??=new Promise((resolve,reject)=>{const request=indexedDB.open('sorirang-voice-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('clips');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function loadClips(){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('clips','readonly'),store=tx.objectStore('clips'),clips=new Map();for(const t of TOYS){const req=store.get(t.id);req.onsuccess=()=>{if(req.result instanceof Blob)clips.set(t.id,req.result);};}tx.oncomplete=()=>resolve(clips);tx.onerror=()=>reject(tx.error);});}
export async function putClip(id,blob){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('clips','readwrite');if(blob)tx.objectStore('clips').put(blob,id);else tx.objectStore('clips').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
export async function replaceClips(clips){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('clips','readwrite'),s=tx.objectStore('clips');s.clear();for(const [id,blob]of clips)s.put(blob,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
export function clipToDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
export function dataURLToClip(value){
  const match=typeof value==='string'&&value.length<=1800000?value.match(/^data:(audio\/[a-z0-9.+-]+(?:;[a-z0-9.+_-]+=[a-z0-9.+_-]+)*);base64,([a-z0-9+/=]*)$/i):null;
  if(!match)throw new Error('녹음 파일을 읽을 수 없어요. 원래 작품 파일을 다시 선택해 주세요.');
  const binary=atob(match[2]),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new Blob([bytes],{type:match[1]});
}
