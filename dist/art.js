import {STICKERS} from './icons.js';
export const SCENE = {src:'./assets/playground.png',width:1672,height:941};
export const TOYS = [
  {id:'slide',name:'미끄럼틀',color:'#d28650',light:'#fbebd9',word:'슈우우웅',shape:'down',question:'위에서 아래로 쭉! 미끄러지는 움직임을 내 목소리로 표현해요.',type:'sine',zone:[2,13,29,45],crop:[.005,.115,.32,.485]},
  {id:'tubes',name:'소리 전달 놀이기구',color:'#d28a37',light:'#fff0d5',word:'우우우 웅웅',shape:'wave',question:'나팔에 대고 소리를 내면 어떻게 들릴까요? 울리는 소리를 표현해요.',type:'sine',zone:[32,12,39,33],crop:[.266,.092,.466,.364]},
  {id:'spinner',name:'회전 놀이기구',color:'#6f9d76',light:'#e7f0df',word:'스르르르 빙글',shape:'wave',question:'빙글빙글 돌아요. 천천히 돌 때와 빨리 돌 때를 표현해요.',type:'sine',zone:[39,47,28,40],crop:[.389,.453,.295,.383]},
  {id:'seesaw',name:'시소',color:'#bc858c',light:'#f8e7e9',word:'끼익 쿵',shape:'wave',question:'한쪽이 올라가면 다른 쪽은 내려가요. 어떤 소리가 어울릴까요?',type:'triangle',zone:[2,60,34,33],crop:[.015,.568,.35,.363]},
  {id:'climber',name:'오르기 놀이기구',color:'#bf9b48',light:'#faf1d3',word:'콩 덕 덕',shape:'dots',question:'발판을 하나씩 올라가요. 발이 닿는 모습을 짧은 소리로 표현해요.',type:'triangle',zone:[70,28,28,65],crop:[.7,.248,.292,.666]}
];
export const SHAPES=[{id:'up',label:'올라가요',glyph:'↗'},{id:'down',label:'내려가요',glyph:'↘'},{id:'wave',label:'오르내려요',glyph:'∿'},{id:'dots',label:'톡톡톡',glyph:'···'},{id:'flat',label:'길게',glyph:'―'}];
export function toyArt(id,cls='toy-art'){
  const t=TOYS.find(t=>t.id===id)||TOYS[0],c=t.crop;
  const box=[c[0]*SCENE.width,c[1]*SCENE.height,c[2]*SCENE.width,c[3]*SCENE.height];
  return `<svg class="${cls}" viewBox="${box.join(' ')}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><image href="${SCENE.src}" width="${SCENE.width}" height="${SCENE.height}"/></svg>`;
}

export const ICONS=STICKERS;

export function defaultStrokes(shape){
  if(shape==='up')return [[{x:.08,y:.83},{x:.92,y:.17}]];
  if(shape==='down')return [[{x:.08,y:.17},{x:.92,y:.83}]];
  if(shape==='flat')return [[{x:.08,y:.5},{x:.92,y:.5}]];
  if(shape==='dots')return [.12,.31,.5,.69,.88].map((x,i)=>[{x,y:i%2?.65:.35},{x:x+.025,y:i%2?.65:.35}]);
  return [Array.from({length:41},(_,i)=>({x:.06+i/40*.88,y:.5+Math.cos(i/40*Math.PI*4)*.32}))];
}
export function graphSVG(strokes,color,cls=''){return `<svg class="${cls}" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">${strokes.map(s=>s.length===1?`<circle cx="${s[0].x*300}" cy="${s[0].y*120}" r="4" fill="${color}"/>`:`<polyline points="${s.map(p=>`${p.x*300},${p.y*120}`).join(' ')}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`;}
