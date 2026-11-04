import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProject,validateProject,dataURLToClip} from '../dist/storage.js';
import {wavBlob,sceneDuration} from '../dist/audio.js';

test('손으로 그린 악보, 소리말, 의도한 쉼이 저장 후 그대로 복원된다',()=>{
  const p=freshProject();p.title='하늘까지 들리는 내 음악';p.studentName='김하윤';p.slots[0]={toyId:'slide',mode:'music',word:'쓩!',strokes:[[{x:.1,y:.9},{x:.8,y:.2}]]};p.slots[2]={toyId:'tubes',mode:'music',word:'쉿',strokes:[]};
  const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored,p);assert.equal(restored.slots[1],null);assert.equal(restored.slots[2].strokes.length,0);
});
test('손상된 작품의 음량, 빠르기와 좌표를 안전한 범위로 복구한다',()=>{
  const p=freshProject();p.tempo=-5;p.sounds.slide.volume='danger';p.slots[0]={toyId:'slide',strokes:[[{x:-3,y:4},{x:NaN,y:1}]]};p.slots[1]={toyId:'unknown'};const v=validateProject(p);assert.equal(v.tempo,52);assert.equal(v.sounds.slide.volume,'normal');assert.deepEqual(v.slots[0].strokes,[[{x:0,y:1}]]);assert.equal(v.slots[1],null);assert.throws(()=>validateProject({version:100,slots:[]}));
});
test('기존 작품을 개인 활동 형식으로 열되 모둠 이름을 학생 이름으로 사용하지 않는다',()=>{
  const old={version:1,title:'우리 모둠의 소리 놀이터',team:'무지개 모둠',sounds:{},slots:[{toyId:'slide',mode:'music',word:'슝',strokes:[]},{toyId:'imagine',strokes:[]},null,null]};
  const restored=validateProject(old);assert.equal(restored.version,2);assert.equal(restored.title,'나의 소리 놀이터');assert.equal(restored.studentName,'');assert.equal(restored.slots[0].word,'슝');assert.equal(restored.slots[1],null);assert.equal(old.team,'무지개 모둠');
});
test('MediaRecorder가 저장한 codec 포함 MIME 형식과 음성 바이트를 복원한다',async()=>{
  const clip=dataURLToClip('data:audio/webm;codecs=opus;base64,AQIDBA==');assert.equal(clip.type,'audio/webm;codecs=opus');assert.deepEqual([...new Uint8Array(await clip.arrayBuffer())],[1,2,3,4]);assert.throws(()=>dataURLToClip('data:text/html;base64,AQID'));assert.throws(()=>dataURLToClip('data:audio/webm;base64,!!'));
});
test('WAV 파일은 정확한 길이와 샘플레이트를 가지며 피크를 제한한다',async()=>{
  const b=wavBlob({sampleRate:44100,getChannelData:()=>Float32Array.from([-2,-1,0,.5,1,2])});const bytes=await b.arrayBuffer(),v=new DataView(bytes);assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(v.getUint32(24,true),44100);assert.equal(v.getUint16(22,true),1);assert.equal(v.getUint32(40,true),12);assert.equal(v.getInt16(44,true),-32768);assert.equal(v.getInt16(54,true),32767);assert.equal(bytes.byteLength,56);assert.equal(sceneDuration(60),4);assert.equal(sceneDuration(120),2);
});
