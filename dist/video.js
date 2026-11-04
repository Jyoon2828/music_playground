import {TOYS,SCENE} from './art.js';
import {toneLabel} from './music.js';
import {getAudio,renderCompositionBuffer,sceneDuration} from './audio.js';

export const VIDEO_MIMES=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'];
export function videoSupported(){return typeof MediaRecorder!=='undefined'&&typeof HTMLCanvasElement!=='undefined'&&typeof HTMLCanvasElement.prototype.captureStream==='function';}
export const videoExtension=mime=>mime.toLowerCase().includes('mp4')?'mp4':'webm';
export function playbackPosition(seconds,scene){const elapsed=Math.max(0,Math.min(seconds,scene*4));return {index:Math.min(3,Math.floor(elapsed/scene)),progress:Math.max(0,Math.min(1,(elapsed%scene)/scene)),fraction:elapsed/(scene*4),ended:seconds>=scene*4};}
const FONT='"NanumSquareRound","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
function rect(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function fit(c,text,x,y,max,size,weight=700){c.font=`${weight} ${size}px ${FONT}`;while(size>14&&c.measureText(text).width>max)c.font=`${weight} ${--size}px ${FONT}`;c.fillText(text,x,y,max);}
function wrap(c,text,x,y,max,size,lines=2){c.font=`800 ${size}px ${FONT}`;const chars=[...text];let line='',row=0;for(let i=0;i<chars.length;i++){const ch=chars[i];if(line&&c.measureText(line+ch).width>max){if(row===lines-1){while(c.measureText(line+'…').width>max)line=line.slice(0,-1);c.fillText(line+'…',x,y+row*size*1.4);return;}c.fillText(line,x,y+row*size*1.4);line='';row++;}line+=ch;}if(line)c.fillText(line,x,y+row*size*1.4);}
function drawNotes(c,time){for(const [x,y,color,tilt]of [[61,92,'#b59bda',-.2],[1212,90,'#efa4be',.2],[1224,640,'#8acbb6',-.3]]){c.save();c.translate(x,y+Math.sin(time*2+x)*3);c.rotate(tilt);c.fillStyle=color;c.strokeStyle='#655274';c.lineWidth=3;c.beginPath();c.ellipse(0,12,10,7,-.2,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(9,10);c.lineTo(9,-20);c.lineTo(24,-16);c.stroke();c.restore();}}
export function drawVideoFrame(canvas,p,image,seconds,voiceIds){
  const c=canvas.getContext('2d'),d=sceneDuration(p.tempo),pos=playbackPosition(seconds,d),colors=['#eee2fa','#fce3eb','#e1f1e9','#fff0cf'];
  c.fillStyle='#fff6ed';c.fillRect(0,0,1280,720);c.fillStyle='#e6d7ee';for(let x=14;x<1280;x+=25)for(let y=14;y<720;y+=25){c.beginPath();c.arc(x,y,1,0,Math.PI*2);c.fill();}
  rect(c,24,20,1232,680,32,'#fffdf9','#e2cfea');drawNotes(c,seconds);c.textAlign='center';c.fillStyle='#9b7faf';fit(c,'소리랑 놀이터 · 나만의 작은 음악회',640,57,900,17);
  c.fillStyle='#665076';fit(c,p.title||'나의 소리 놀이터',640,109,1030,34,800);c.fillStyle='#846a91';fit(c,p.studentName?'만든 사람 · '+p.studentName:'내가 만든 음악',640,144,1000,18,600);
  const active=!pos.ended?pos.index:-1;
  for(let i=0;i<4;i++){
    const x=61+i*294,w=276,slot=p.slots[i],isActive=active===i,y=isActive?178:184;
    rect(c,x,y+5,w,382,24,'#e7d9ed');rect(c,x,y,w,382,24,'#fffdfb',isActive?'#bc92da':'#dfcce9');
    rect(c,x+12,y+11,w-24,37,15,colors[i]);c.fillStyle='#9476a5';fit(c,`${i+1}번째 장면`,x+w/2,y+37,w-32,16);
    if(!slot){c.fillStyle='#b9a2c6';fit(c,'잠깐 쉬어요',x+w/2,y+207,w-30,25);continue;}
    const t=TOYS.find(t=>t.id===slot.toyId),[sx,sy,sw,sh]=t.crop.map((v,j)=>v*(j%2?SCENE.height:SCENE.width)),scale=Math.min(225/sw,127/sh),dw=sw*scale,dh=sh*scale;
    c.drawImage(image,sx,sy,sw,sh,x+(w-dw)/2,y+57+(127-dh)/2,dw,dh);c.fillStyle='#9a7caa';fit(c,t.name,x+w/2,y+210,w-30,19);c.fillStyle=t.color;wrap(c,slot.word||p.sounds[t.id].word,x+w/2,y+245,w-34,23,2);
    const gx=x+21,gy=y+296,gw=w-42,gh=50;rect(c,gx-4,gy-5,gw+8,gh+10,12,'#fcf6ff');
    for(let j=0;j<4;j++){c.strokeStyle='#eadff0';c.lineWidth=1;c.beginPath();c.moveTo(gx,gy+j*gh/3);c.lineTo(gx+gw,gy+j*gh/3);c.stroke();}
    c.strokeStyle=t.color;c.fillStyle=t.color;c.lineWidth=4;c.lineCap='round';c.lineJoin='round';
    for(const line of slot.strokes){if(!line.length)continue;c.beginPath();c.moveTo(gx+line[0].x*gw,gy+line[0].y*gh);if(line.length===1){c.arc(gx+line[0].x*gw,gy+line[0].y*gh,3,0,Math.PI*2);c.fill();}else{for(const q of line.slice(1))c.lineTo(gx+q.x*gw,gy+q.y*gh);c.stroke();}}
    if(isActive){const px=gx+pos.progress*gw;c.strokeStyle='#a875ce';c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.moveTo(px,gy-5);c.lineTo(px,gy+gh+5);c.stroke();c.setLineDash([]);c.fillStyle='#c39bdf';c.beginPath();c.arc(px,gy-8,5,0,Math.PI*2);c.fill();}
    c.fillStyle='#80638c';fit(c,slot.mode==='voice'&&voiceIds.has(t.id)?'내가 녹음한 목소리':toneLabel(slot.tone??p.sounds[t.id].tone),x+w/2,y+369,w-24,13,600);
  }
  const slot=p.slots[pos.index];c.fillStyle='#a182b4';fit(c,pos.ended?'나의 작은 음악회, 잘 들으셨나요?':`${pos.index+1}번째 장면 · ${slot?TOYS.find(t=>t.id===slot.toyId).name:'잠깐 쉬어요'}`,640,605,1000,20);
  rect(c,108,626,1064,9,5,'#efe2f5');if(pos.fraction>0)rect(c,108,626,1064*pos.fraction,9,5,'#c6a4df');
  c.fillStyle='#8c759a';fit(c,`그림과 소리를 이어 만든 나만의 음악 · 한 장면 4박 · 빠르기 ${p.tempo}`,640,666,1080,15,500);
}
async function loadScene(){const image=new Image();image.src=SCENE.src;await image.decode();return image;}
function aborted(){return new DOMException('동영상 만들기를 취소했어요.','AbortError');}
export async function recordCompositionVideo(project,buffers,canvas,{signal,onProgress=()=>{}}={}){
  if(!videoSupported())throw new Error('이 브라우저는 동영상 저장을 지원하지 않아요. Chrome에서 다시 열어 주세요.');
  const ctx=await getAudio();const [image,audio]=await Promise.all([loadScene(),renderCompositionBuffer(project,buffers)]);
  if(signal?.aborted)throw aborted();
  await document.fonts.ready;
  drawVideoFrame(canvas,project,image,0,new Set(buffers.keys()));
  const stream=canvas.captureStream(30),destination=ctx.createMediaStreamDestination(),source=ctx.createBufferSource();source.buffer=audio;source.connect(destination);source.connect(ctx.destination);destination.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  let recorder,frame,timer,sourceStarted=false,timedOut=false,mediaError=null;const chunks=[];
  try{
    for(const mimeType of VIDEO_MIMES){if(!MediaRecorder.isTypeSupported(mimeType))continue;try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:3000000,audioBitsPerSecond:128000});break;}catch{}}
    if(!recorder)recorder=new MediaRecorder(stream);
    const done=new Promise((resolve,reject)=>{
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>{mediaError=new Error('동영상을 만들지 못했어요. 다른 브라우저에서 다시 시도해 주세요.');reject(mediaError);};
      recorder.onstop=()=>signal?.aborted?reject(aborted()):resolve();
    });
    // Observe rejection immediately, including cancellation before recording starts.
    done.catch(()=>{});
    const cancel=()=>{if(recorder.state!=='inactive')recorder.stop();};
    signal?.addEventListener('abort',cancel,{once:true});
    try{
      if(signal?.aborted)throw aborted();
      await Promise.race([new Promise((resolve,reject)=>{recorder.onstart=resolve;try{recorder.start(250);}catch(error){reject(error);}}),done.then(()=>{throw aborted();})]);
      const start=ctx.currentTime+.15,d=sceneDuration(project.tempo),total=d*4;
      source.start(start);sourceStarted=true;
      const tick=()=>{
        if(signal?.aborted||recorder.state==='inactive')return;
        const elapsed=Math.max(0,ctx.currentTime-start);drawVideoFrame(canvas,project,image,elapsed,new Set(buffers.keys()));onProgress(Math.min(100,elapsed/(total+.25)*100));
        if(elapsed>=total+.28){recorder.stop();return;}
        frame=requestAnimationFrame(tick);
      };
      tick();
      timer=setTimeout(()=>{timedOut=true;cancel();},(audio.duration+6)*1000);
      await done;
      if(signal?.aborted)throw aborted();
      if(timedOut)throw new Error('연주가 멈춰 동영상을 완성하지 못했어요. 화면을 열어 두고 다시 시도해 주세요.');
      if(mediaError)throw mediaError;
      const type=recorder.mimeType||chunks[0]?.type||'video/webm';const blob=new Blob(chunks,{type});if(blob.size<1000)throw new Error('동영상에 담긴 내용이 없어요. 다시 눌러 주세요.');onProgress(100);return {blob,extension:videoExtension(type)};
    }finally{signal?.removeEventListener('abort',cancel);}
  }finally{
    cancelAnimationFrame(frame);clearTimeout(timer);if(recorder&&recorder.state!=='inactive')recorder.stop();if(sourceStarted)try{source.stop();}catch{}source.disconnect();destination.disconnect();stream.getTracks().forEach(t=>t.stop());
  }
}
