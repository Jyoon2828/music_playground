// One input handler for the small score canvas and the large drawing surface.
export function bindDrawing(canvas,source,{color,onChange=()=>{},onStart=()=>{},onLimit=()=>{}}={}){
  const ctx=canvas.getContext('2d'),events=new AbortController(),options={signal:events.signal};let current=null,pointer=null;
  function paint(){
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';
    for(const line of source.strokes){if(!line.length)continue;ctx.beginPath();const a=line[0];ctx.moveTo(a.x*canvas.width,a.y*canvas.height);if(line.length===1){ctx.arc(a.x*canvas.width,a.y*canvas.height,3,0,Math.PI*2);ctx.fill();}else{for(const p of line.slice(1))ctx.lineTo(p.x*canvas.width,p.y*canvas.height);ctx.stroke();}}
  }
  const point=e=>{const r=canvas.getBoundingClientRect();return {x:Math.round(Math.max(.01,Math.min(.99,(e.clientX-r.left)/r.width))*1000)/1000,y:Math.round(Math.max(.03,Math.min(.97,(e.clientY-r.top)/r.height))*1000)/1000};};
  function finish(e){if(!current||(e&&e.pointerId!==pointer))return;current=null;pointer=null;paint();onChange();}
  canvas.addEventListener('pointerdown',e=>{if(pointer!==null||(!['touch','pen'].includes(e.pointerType)&&e.button!==0))return;e.preventDefault();if(source.strokes.length>=12){onLimit();return;}onStart();pointer=e.pointerId;canvas.setPointerCapture(pointer);current=[point(e)];source.strokes.push(current);paint();},options);
  canvas.addEventListener('pointermove',e=>{if(!current||e.pointerId!==pointer)return;e.preventDefault();const points=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[e];for(const event of points.length?points:[e]){const p=point(event),last=current.at(-1);if(Math.abs(last.x-p.x)+Math.abs(last.y-p.y)>.008&&current.length<180)current.push(p);}paint();},options);
  canvas.addEventListener('pointerup',finish,options);canvas.addEventListener('pointercancel',finish,options);canvas.addEventListener('lostpointercapture',finish,options);paint();return {paint,finish,destroy:()=>{events.abort();current=null;pointer=null;}};
}
