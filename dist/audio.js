import {TOYS,defaultStrokes} from './art.js';
let audioContext;
let liveNodes=[];
export async function getAudio(){
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)throw new Error('이 브라우저에서 음악 재생을 지원하지 않아요. Chrome에서 열어 주세요.');
  audioContext??=new Ctx();
  if(audioContext.state==='suspended')await audioContext.resume();
  return audioContext;
}
function compressor(ctx){const c=ctx.createDynamicsCompressor();c.threshold.value=-12;c.knee.value=10;c.ratio.value=4;c.attack.value=.005;c.release.value=.15;c.connect(ctx.destination);return c;}
export function stopAudio(){for(const n of liveNodes){try{n.stop();}catch{}}liveNodes=[];}
export async function decodeBlob(blob){const ctx=await getAudio();return await ctx.decodeAudioData(await blob.arrayBuffer());}
function scheduleMusic(ctx,out,toy,settings,strokes,start,duration,track){
  const lines=(strokes===undefined?defaultStrokes(settings.shape):strokes).slice(0,18);
  const volume=(settings.volume==='soft'?.34:settings.volume==='loud'?.82:.56)*.24/Math.sqrt(Math.max(1,lines.length/3));
  const repeats=settings.speed==='fast'?2:1;
  const active=settings.speed==='slow'?.98:.85;
  for(let rep=0;rep<repeats;rep++)for(const line of lines){
    if(!line.length)continue;
    const sorted=[...line].sort((a,b)=>a.x-b.x);
    const points=sorted.filter((_,i)=>i%Math.max(1,Math.ceil(sorted.length/60))===0);
    if(points.at(-1)!==sorted.at(-1))points.push(sorted.at(-1));
    const part=duration/repeats*active;
    const x0=Math.max(0,Math.min(.98,points[0].x));
    const x1=Math.max(x0+.035,Math.min(1,points.at(-1).x));
    const t=start+rep*duration/repeats+x0*part;
    const end=start+rep*duration/repeats+x1*part;
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=toy.type;
    const hz=p=>Math.max(70,Math.min(1200,130.81*2**((1-p.y)*2+(toy.id==='climber'?.25:toy.id==='spinner'?-.2:0))));
    osc.frequency.setValueAtTime(hz(points[0]),t);
    let lastT=t;
    for(const p of points.slice(1)){
      const at=Math.max(lastT+.0001,start+rep*duration/repeats+Math.min(1,p.x)*part);
      osc.frequency.exponentialRampToValueAtTime(hz(p),at);lastT=at;
    }
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.018);
    gain.gain.setValueAtTime(volume,Math.max(t+.02,end-.06));gain.gain.linearRampToValueAtTime(0,Math.max(t+.06,end));
    osc.connect(gain);gain.connect(out);osc.start(t);osc.stop(Math.max(t+.07,end+.01));if(track)liveNodes.push(osc);
  }
}
function scheduleVoice(ctx,out,buffer,start,duration,volume,track){
  const source=ctx.createBufferSource();source.buffer=buffer;
  const g=ctx.createGain();g.gain.value=volume==='soft'?.48:volume==='loud'?.95:.72;source.connect(g);g.connect(out);
  // Keep the voice's natural pitch. A long recording is trimmed to the scene.
  const length=Math.min(buffer.duration,duration*.94);
  g.gain.setValueAtTime(g.gain.value,start);g.gain.setValueAtTime(g.gain.value,start+Math.max(0,length-.04));g.gain.linearRampToValueAtTime(0,start+length);
  source.start(start,0,length);if(track)liveNodes.push(source);
}
export async function playToy(toyId,settings,strokes){
  stopAudio();const ctx=await getAudio();const out=compressor(ctx);const duration=settings.speed==='slow'?3.2:settings.speed==='fast'?1.6:2.4;
  scheduleMusic(ctx,out,TOYS.find(t=>t.id===toyId),settings,strokes,ctx.currentTime+.05,duration,true);
  setTimeout(()=>{try{out.disconnect();}catch{}},(duration+.2)*1000);return duration;
}
export async function playRecording(buffer){stopAudio();const ctx=await getAudio(),out=compressor(ctx);scheduleVoice(ctx,out,buffer,ctx.currentTime+.04,buffer.duration+.1,'normal',true);setTimeout(()=>{try{out.disconnect();}catch{}},(buffer.duration+.2)*1000);return buffer.duration;}
export function sceneDuration(tempo){return 4*60/tempo;}
export async function playComposition(project,buffers){
  stopAudio();const ctx=await getAudio(),out=compressor(ctx);const start=ctx.currentTime+.1,d=sceneDuration(project.tempo);
  project.slots.forEach((slot,i)=>{if(!slot)return;const toy=TOYS.find(t=>t.id===slot.toyId),settings=project.sounds[slot.toyId],at=start+i*d;
    if(slot.mode==='voice'&&buffers.has(slot.toyId))scheduleVoice(ctx,out,buffers.get(slot.toyId),at,d,settings.volume,true);
    else scheduleMusic(ctx,out,toy,settings,slot.strokes,at,d,true);
  });
  setTimeout(()=>{try{out.disconnect();}catch{}},(4*d+.4)*1000);
  return {start,duration:d*4,scene:d,context:ctx};
}
export async function renderComposition(project,buffers){
  const d=sceneDuration(project.tempo),rate=44100,total=d*4+.25;
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!Offline)throw new Error('연주 파일 저장을 지원하지 않는 브라우저예요. Chrome에서 다시 열어 주세요.');
  const ctx=new Offline(1,Math.ceil(total*rate),rate),out=compressor(ctx);
  project.slots.forEach((slot,i)=>{if(!slot)return;const toy=TOYS.find(t=>t.id===slot.toyId),settings=project.sounds[slot.toyId];
    if(slot.mode==='voice'&&buffers.has(slot.toyId))scheduleVoice(ctx,out,buffers.get(slot.toyId),i*d,d,settings.volume,false);
    else scheduleMusic(ctx,out,toy,settings,slot.strokes,i*d,d,false);
  });
  const buffer=await ctx.startRendering();return wavBlob(buffer);
}
export function wavBlob(buffer){
  const samples=buffer.getChannelData(0),data=new ArrayBuffer(44+samples.length*2),view=new DataView(data);
  const write=(pos,str)=>[...str].forEach((c,i)=>view.setUint8(pos+i,c.charCodeAt(0)));
  write(0,'RIFF');view.setUint32(4,36+samples.length*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,s<0?s*32768:s*32767,true);}return new Blob([data],{type:'audio/wav'});
}
