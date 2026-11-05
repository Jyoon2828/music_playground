import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProject,validateProject,dataURLToClip} from '../dist/storage.js';
import {defaultTone,normalizeTone,frequencyAt,musicEvents} from '../dist/music.js';
import {soundStrokes} from '../dist/art.js';
import {wavBlob,sceneDuration} from '../dist/audio.js';

test('손으로 그린 악보, 소리말, 의도한 쉼이 저장 후 그대로 복원된다',()=>{
  const p=freshProject();p.title='하늘까지 들리는 내 음악';p.studentName='김하윤';p.slots[0]={toyId:'slide',mode:'music',word:'쓩!',tone:defaultTone(),strokes:[[{x:.1,y:.9},{x:.8,y:.2}]]};p.slots[2]={toyId:'tubes',mode:'music',word:'쉿',tone:defaultTone(),strokes:[]};
  const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored,p);assert.equal(restored.slots[1],null);assert.equal(restored.slots[2].strokes.length,0);
});
test('손상된 작품의 음량, 빠르기와 좌표를 안전한 범위로 복구한다',()=>{
  const p=freshProject();p.tempo=-5;p.sounds.slide.volume='danger';p.slots[0]={toyId:'slide',strokes:[[{x:-3,y:4},{x:NaN,y:1}]]};p.slots[1]={toyId:'unknown'};const v=validateProject(p);assert.equal(v.tempo,52);assert.equal(v.sounds.slide.volume,'normal');assert.deepEqual(v.slots[0].strokes,[[{x:0,y:1}]]);assert.equal(v.slots[1],null);assert.throws(()=>validateProject({version:100,slots:[]}));
});
test('기존 작품을 개인 활동 형식으로 열되 모둠 이름을 학생 이름으로 사용하지 않는다',()=>{
  const old={version:1,title:'우리 모둠의 소리 놀이터',team:'무지개 모둠',sounds:{},slots:[{toyId:'slide',mode:'music',word:'슝',strokes:[]},{toyId:'imagine',strokes:[]},null,null]};
  const restored=validateProject(old);assert.equal(restored.version,3);assert.equal(restored.title,'나의 소리 놀이터');assert.equal(restored.studentName,'');assert.equal(restored.slots[0].word,'슝');assert.equal(restored.slots[1],null);assert.equal(old.team,'무지개 모둠');
});
test('MediaRecorder가 저장한 codec 포함 MIME 형식과 음성 바이트를 복원한다',async()=>{
  const clip=dataURLToClip('data:audio/webm;codecs=opus;base64,AQIDBA==');assert.equal(clip.type,'audio/webm;codecs=opus');assert.deepEqual([...new Uint8Array(await clip.arrayBuffer())],[1,2,3,4]);assert.throws(()=>dataURLToClip('data:text/html;base64,AQID'));assert.throws(()=>dataURLToClip('data:audio/webm;base64,!!'));
});
test('WAV 파일은 정확한 길이와 샘플레이트를 가지며 피크를 제한한다',async()=>{
  const b=wavBlob({sampleRate:44100,getChannelData:()=>Float32Array.from([-2,-1,0,.5,1,2])});const bytes=await b.arrayBuffer(),v=new DataView(bytes);assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(v.getUint32(24,true),44100);assert.equal(v.getUint16(22,true),1);assert.equal(v.getUint32(40,true),12);assert.equal(v.getInt16(44,true),-32768);assert.equal(v.getInt16(54,true),32767);assert.equal(bytes.byteLength,56);assert.equal(sceneDuration(60),4);assert.equal(sceneDuration(120),2);
});

test('같은 놀이기구의 두 장면에 고른 악기와 음정이 따로 저장된다',()=>{
  const p=freshProject();p.sounds.slide.tone={instrument:'electronic',note:'G',octave:5,pitchMode:'follow'};
  p.slots[0]={toyId:'slide',mode:'music',word:'또롱',strokes:[],tone:{instrument:'piano',note:'D',octave:3,pitchMode:'fixed'}};
  p.slots[1]={toyId:'slide',mode:'music',word:'사각',strokes:[],tone:{instrument:'maracas',note:'C',octave:4,pitchMode:'follow'}};
  const r=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(r,p);assert.notDeepEqual(r.slots[0].tone,r.slots[1].tone);assert.equal(r.sounds.slide.tone.instrument,'electronic');
});
test('고른 한 음은 일정한 음정이고 한 옥타브를 높이면 진동수가 두 배가 된다',()=>{
  const tone={instrument:'piano',note:'A',octave:4,pitchMode:'fixed'},settings={tone,speed:'normal',shape:'wave'};
  assert.equal(frequencyAt(tone),440);assert.equal(frequencyAt({...tone,octave:5}),880);
  const events=musicEvents(settings,undefined,3);assert.ok(events.length>0);assert.ok(events.every(e=>e.midi===69));
  const up=musicEvents({...settings,tone:{...tone,pitchMode:'follow'}},[[{x:.1,y:.8},{x:.9,y:.2}]],3);assert.ok(up.at(-1).midi>up[0].midi);
});
test('타악기는 음정 대신 리듬을 만들고 빈 그림 악보는 소리를 내지 않는다',()=>{
  for(const instrument of ['maracas','drum']){const events=musicEvents({tone:{instrument},shape:'flat',speed:'normal'},undefined,3);assert.ok(events.length>2);assert.ok(events.every(e=>e.midi===null));}
  assert.deepEqual(musicEvents({tone:defaultTone(),shape:'flat',speed:'normal'},[],3),[]);
  assert.deepEqual(normalizeTone({instrument:'unknown',note:'H',octave:100,pitchMode:'bad'}),defaultTone());
});


test('소리 찾기에서 직접 그린 선과 점은 다시 열어도 남고 악보에 독립적으로 복사된다',()=>{
  const p=freshProject();p.sounds.slide.strokes=[[{x:.1,y:.8},{x:.7,y:.2}],[{x:.8,y:.5}]];p.sounds.tubes.strokes=[];
  const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored,p);
  const sceneStrokes=soundStrokes(restored.sounds.slide);sceneStrokes[0][0].y=.1;
  assert.equal(restored.sounds.slide.strokes[0][0].y,.8);assert.deepEqual(soundStrokes(restored.sounds.tubes),[]);
  const events=musicEvents(restored.sounds.slide,restored.sounds.slide.strokes,3);assert.ok(events.length>1);assert.ok(events.some(e=>e.midi>events[0].midi));
});
test('그린 움직임의 잘못된 좌표를 검증하고 이전 작품의 기본 모양도 복원한다',()=>{
  const p=freshProject();p.sounds.slide.strokes=[[{x:-1,y:2},null,{x:NaN,y:.4}]];
  const r=validateProject(p);assert.deepEqual(r.sounds.slide.strokes,[[{x:0,y:1}]]);
  assert.equal(r.sounds.spinner.strokes,undefined);assert.ok(soundStrokes(r.sounds.spinner).length>0);
});

test('콕 찍은 점도 그린 높이에 따라 음정이 바뀐다',()=>{
  const settings={tone:{...defaultTone(),pitchMode:'follow'},speed:'normal'};
  const high=musicEvents(settings,[[{x:.4,y:.1}]],3),low=musicEvents(settings,[[{x:.4,y:.9}]],3);
  assert.ok(high[0].midi>low[0].midi);assert.ok(high[0].duration>0);
});
