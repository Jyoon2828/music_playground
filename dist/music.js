import {defaultStrokes} from './art.js';

export const INSTRUMENTS=[
  {id:'piano',name:'피아노',pitched:true,hint:'또랑또랑, 부드럽게',icon:'🎹'},
  {id:'electronic',name:'전자음',pitched:true,hint:'삐용, 신기한 소리',icon:'⚡'},
  {id:'maracas',name:'마라카스',pitched:false,hint:'사각사각, 흔들어요',icon:'✦'},
  {id:'xylophone',name:'실로폰',pitched:true,hint:'통통, 맑고 짧게',icon:'▥'},
  {id:'bell',name:'종소리',pitched:true,hint:'딩동, 은은하게',icon:'🔔'},
  {id:'drum',name:'북',pitched:false,hint:'둥둥, 힘차게',icon:'🥁'}
];
export const NOTES=[{id:'C',name:'도'},{id:'D',name:'레'},{id:'E',name:'미'},{id:'F',name:'파'},{id:'G',name:'솔'},{id:'A',name:'라'},{id:'B',name:'시'}];
export const OCTAVES=[{id:3,name:'낮은음'},{id:4,name:'보통음'},{id:5,name:'높은음'}];
export const defaultTone=()=>({instrument:'piano',note:'C',octave:4,pitchMode:'follow'});
export function normalizeTone(raw){const t=defaultTone();if(!raw||typeof raw!=='object')return t;return {instrument:INSTRUMENTS.some(i=>i.id===raw.instrument)?raw.instrument:t.instrument,note:NOTES.some(n=>n.id===raw.note)?raw.note:t.note,octave:[3,4,5].includes(Number(raw.octave))?Number(raw.octave):t.octave,pitchMode:raw.pitchMode==='fixed'?'fixed':'follow'};}
export const isPitched=raw=>INSTRUMENTS.find(i=>i.id===normalizeTone(raw).instrument).pitched;
export function toneLabel(raw){const t=normalizeTone(raw),i=INSTRUMENTS.find(i=>i.id===t.instrument);return i.pitched?`${i.name} · ${NOTES.find(n=>n.id===t.note).name} · ${OCTAVES.find(o=>o.id===t.octave).name}`:i.name+' · 리듬';}
export function midiAt(raw,y=.5){const t=normalizeTone(raw),index=NOTES.findIndex(n=>n.id===t.note),offset=t.pitchMode==='fixed'?0:Math.round((.5-y)*14),degree=t.octave*7+index+offset,octave=Math.floor(degree/7),step=((degree%7)+7)%7;return Math.max(24,Math.min(96,12+octave*12+[0,2,4,5,7,9,11][step]));}
export const frequencyAt=(raw,y=.5)=>440*2**((midiAt(raw,y)-69)/12);

// One event list drives live playback and WAV export, including per-scene choices.
export function musicEvents(settings,strokes,duration){
  const tone=normalizeTone(settings.tone),pitched=isPitched(tone),events=[],repeats=settings.speed==='fast'?2:1,active=settings.speed==='slow'?.98:.85;
  const lines=(strokes===undefined?defaultStrokes(settings.shape):strokes).slice(0,12);
  for(let rep=0;rep<repeats;rep++)for(const line of lines){
    if(!line.length)continue;const points=[...line].sort((a,b)=>a.x-b.x),part=duration/repeats*active,base=rep*duration/repeats;
    const x0=Math.max(0,Math.min(.98,points[0].x)),x1=Math.max(x0+.025,Math.min(1,points.at(-1).x)),start=base+x0*part,end=Math.min(duration,base+x1*part),span=Math.max(.06,end-start);
    if(!pitched){const count=Math.min(16,Math.max(1,Math.ceil(span/.23)));for(let j=0;j<count;j++)events.push({at:start+j*span/count,duration:Math.min(.16,span/count),midi:null});continue;}
    if(tone.pitchMode==='fixed'||points.length===1){events.push({at:start,duration:span,midi:midiAt(tone)});continue;}
    const count=Math.min(48,Math.max(2,Math.ceil(span/.07))),reduced=[];let cursor=0;
    for(let k=0;k<=count;k++){const x=x0+(x1-x0)*k/count;while(cursor<points.length-2&&points[cursor+1].x<x)cursor++;const a=points[cursor],b=points[Math.min(cursor+1,points.length-1)],mix=b.x>a.x?Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x))):0;reduced.push({x,y:a.y+(b.y-a.y)*mix});}
    let current={at:start,midi:midiAt(tone,points[0].y)};
    for(const p of reduced.slice(1)){const at=Math.min(end,base+p.x*part),midi=midiAt(tone,p.y);if(midi!==current.midi&&at-current.at>=.065&&end-at>=.04){events.push({...current,duration:at-current.at});current={at,midi};}}
    events.push({...current,duration:Math.max(.06,end-current.at)});
  }
  return events.sort((a,b)=>a.at-b.at).slice(0,128);
}
