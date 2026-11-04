import {musicEvents,normalizeTone} from './music.js';
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
const noiseBuffers=new WeakMap();
function noiseBuffer(ctx){
  if(noiseBuffers.has(ctx))return noiseBuffers.get(ctx);
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.24),ctx.sampleRate),data=buffer.getChannelData(0);let seed=928371;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
  noiseBuffers.set(ctx,buffer);return buffer;
}
function releaseNode(source,gain,track,filter){if(track)liveNodes.push(source);source.onended=()=>{try{source.disconnect();gain.disconnect();filter?.disconnect();}catch{}};}
function partial(ctx,out,hz,ratio,weight,decay,start,duration,volume,track,type='sine',sustain=false){
  const osc=ctx.createOscillator(),gain=ctx.createGain(),life=Math.max(.07,duration+.04),peak=volume*weight;
  osc.type=type;osc.frequency.setValueAtTime(Math.min(ctx.sampleRate/2-200,hz*ratio),start);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(peak,start+.005);
  if(sustain){gain.gain.setValueAtTime(peak,start+Math.max(.006,life-.045));gain.gain.linearRampToValueAtTime(0,start+life);}
  else{gain.gain.exponentialRampToValueAtTime(Math.max(.00001,peak*Math.exp(-Math.max(.01,life-.02)/decay)),start+life-.012);gain.gain.linearRampToValueAtTime(0,start+life);}
  osc.connect(gain);gain.connect(out);osc.start(start);osc.stop(start+life+.005);releaseNode(osc,gain,track);
}
function percussion(ctx,out,instrument,start,duration,volume,track){
  if(instrument==='drum'){
    const osc=ctx.createOscillator(),gain=ctx.createGain(),life=.19;osc.type='sine';osc.frequency.setValueAtTime(155,start);osc.frequency.exponentialRampToValueAtTime(58,start+.14);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume*1.3,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+life);osc.connect(gain);gain.connect(out);osc.start(start);osc.stop(start+life+.01);releaseNode(osc,gain,track);
  }
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),life=instrument==='maracas'?.125:.055;
  source.buffer=noiseBuffer(ctx);filter.type=instrument==='maracas'?'highpass':'lowpass';filter.frequency.value=instrument==='maracas'?3300:1900;filter.Q.value=.65;
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume*(instrument==='maracas'?1.4:.32),start+.007);gain.gain.exponentialRampToValueAtTime(.0001,start+life);
  source.connect(filter);filter.connect(gain);gain.connect(out);source.start(start);source.stop(start+life+.01);releaseNode(source,gain,track,filter);
}
function scheduleMusic(ctx,out,settings,strokes,start,duration,track){
  const tone=normalizeTone(settings.tone),events=musicEvents(settings,strokes,duration),volume=(settings.volume==='soft'?.34:settings.volume==='loud'?.82:.56)*.24/Math.sqrt(Math.max(1,(strokes?.length||1)/3));
  for(const e of events){const at=start+e.at;
    if(e.midi===null){percussion(ctx,out,tone.instrument,at,e.duration,volume,track);continue;}
    const hz=440*2**((e.midi-69)/12);
    if(tone.instrument==='electronic'){partial(ctx,out,hz,1,.76,1,at,e.duration,volume,track,'triangle',true);partial(ctx,out,hz,2,.24,1,at,e.duration,volume,track,'sine',true);}
    else if(tone.instrument==='xylophone')for(const [ratio,weight,decay]of [[1,.77,.19],[3.98,.17,.09],[9.17,.06,.045]])partial(ctx,out,hz,ratio,weight,decay,at,e.duration,volume*1.3,track);
    else if(tone.instrument==='bell')for(const [ratio,weight,decay]of [[1,.69,.95],[2.76,.22,.55],[5.4,.09,.25]])partial(ctx,out,hz,ratio,weight,decay,at,e.duration,volume,track);
    else for(const [ratio,weight,decay]of [[1,.65,.78],[2,.23,.47],[3,.09,.28],[4,.03,.18]])partial(ctx,out,hz,ratio,weight,decay,at,e.duration,volume*1.18,track);
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
  scheduleMusic(ctx,out,settings,strokes,ctx.currentTime+.05,duration,true);
  setTimeout(()=>{try{out.disconnect();}catch{}},(duration+.2)*1000);return duration;
}
export async function playTone(tone){stopAudio();const ctx=await getAudio(),out=compressor(ctx);scheduleMusic(ctx,out,{tone:{...normalizeTone(tone),pitchMode:'fixed'},shape:'flat',speed:'normal',volume:'normal'},[[{x:.03,y:.5},{x:.94,y:.5}]],ctx.currentTime+.025,.7,true);setTimeout(()=>out.disconnect(),1000);}
export async function playRecording(buffer){stopAudio();const ctx=await getAudio(),out=compressor(ctx);scheduleVoice(ctx,out,buffer,ctx.currentTime+.04,buffer.duration+.1,'normal',true);setTimeout(()=>{try{out.disconnect();}catch{}},(buffer.duration+.2)*1000);return buffer.duration;}
export function sceneDuration(tempo){return 4*60/tempo;}
export async function playComposition(project,buffers){
  stopAudio();const ctx=await getAudio(),out=compressor(ctx);const start=ctx.currentTime+.1,d=sceneDuration(project.tempo);
  project.slots.forEach((slot,i)=>{if(!slot)return;const settings={...project.sounds[slot.toyId],tone:slot.tone??project.sounds[slot.toyId].tone},at=start+i*d;
    if(slot.mode==='voice'&&buffers.has(slot.toyId))scheduleVoice(ctx,out,buffers.get(slot.toyId),at,d,settings.volume,true);
    else scheduleMusic(ctx,out,settings,slot.strokes,at,d,true);
  });
  setTimeout(()=>{try{out.disconnect();}catch{}},(4*d+.4)*1000);
  return {start,duration:d*4,scene:d,context:ctx};
}
export async function renderCompositionBuffer(project,buffers){
  const d=sceneDuration(project.tempo),rate=44100,total=d*4+.25;
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!Offline)throw new Error('연주 파일 저장을 지원하지 않는 브라우저예요. Chrome에서 다시 열어 주세요.');
  const ctx=new Offline(1,Math.ceil(total*rate),rate),out=compressor(ctx);
  project.slots.forEach((slot,i)=>{if(!slot)return;const settings={...project.sounds[slot.toyId],tone:slot.tone??project.sounds[slot.toyId].tone};
    if(slot.mode==='voice'&&buffers.has(slot.toyId))scheduleVoice(ctx,out,buffers.get(slot.toyId),i*d,d,settings.volume,false);
    else scheduleMusic(ctx,out,settings,slot.strokes,i*d,d,false);
  });
  return await ctx.startRendering();
}
export async function renderComposition(project,buffers){return wavBlob(await renderCompositionBuffer(project,buffers));}
export function wavBlob(buffer){
  const samples=buffer.getChannelData(0),data=new ArrayBuffer(44+samples.length*2),view=new DataView(data);
  const write=(pos,str)=>[...str].forEach((c,i)=>view.setUint8(pos+i,c.charCodeAt(0)));
  write(0,'RIFF');view.setUint32(4,36+samples.length*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,s<0?s*32768:s*32767,true);}return new Blob([data],{type:'audio/wav'});
}
