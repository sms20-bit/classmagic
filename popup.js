/* ============================================================
   수업마법사 v3.2 — popup.js
   룰렛·모둠·캡처·타이머·뽀모도로·QR·메모·화이트보드·커서·설정(소리)
============================================================ */
'use strict';

/* ── Storage ── */
const Storage={
  get(k){return new Promise(r=>{if(typeof chrome!=='undefined'&&chrome.storage)chrome.storage.local.get(k,d=>r(d[k]??null));else r(localStorage.getItem(k));})},
  set(k,v){return new Promise(r=>{if(typeof chrome!=='undefined'&&chrome.storage)chrome.storage.local.set({[k]:v},r);else{localStorage.setItem(k,v);r();}})}
};

/* ── Toast ── */
const toastEl=document.getElementById('qr-toast');
function showToast(msg,dur=2200){toastEl.textContent=msg;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),dur);}

/* ── 탭 네비 ── */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    if(btn.dataset.tab==='whiteboard') setTimeout(()=>WB.resize(),50);
  });
});

/* ── 폭죽 ── */
const Confetti=(()=>{
  const ov=document.getElementById('confetti-overlay'),cvs=document.getElementById('confetti-canvas'),ctx=cvs.getContext('2d'),ne=document.getElementById('winner-name');
  const C=['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8','#20c997','#f06595','#a9e34b','#74c0fc'];
  let pts=[],aid=null;
  document.getElementById('winner-close-btn').addEventListener('click',()=>{if(aid)cancelAnimationFrame(aid);pts=[];ov.classList.add('hidden');ctx.clearRect(0,0,cvs.width,cvs.height);});
  return{fire(name){
    cvs.width=ov.offsetWidth||420;cvs.height=ov.offsetHeight||640;
    ne.textContent=name;ov.classList.remove('hidden');
    pts=[];for(let i=0;i<250;i++)pts.push({x:Math.random()*cvs.width,y:Math.random()*cvs.height*.5-20,w:Math.random()*8+4,h:Math.random()*5+3,color:C[Math.floor(Math.random()*C.length)],vx:(Math.random()-.5)*4,vy:Math.random()*3+2,rot:Math.random()*360,rs:(Math.random()-.5)*8,op:1,s:Math.random()>.5?'r':'c'});
    if(aid)cancelAnimationFrame(aid);
    (function step(){ctx.clearRect(0,0,cvs.width,cvs.height);let alive=false;pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.rot+=p.rs;p.op-=.006;if(p.op>0){alive=true;ctx.save();ctx.globalAlpha=Math.max(0,p.op);ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.color;if(p.s==='r')ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);else{ctx.beginPath();ctx.arc(0,0,p.w/2,0,Math.PI*2);ctx.fill();}ctx.restore();}});if(alive)aid=requestAnimationFrame(step);})();
  }};
})();

/* ════════════════════════════════════════════════════════
   🔔 알람 소리 시스템 — 4종 선택 가능
════════════════════════════════════════════════════════ */
const AudioAlarm=(()=>{
  let ac=null;
  let currentSound='bell'; // 기본값

  function gc(){
    if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended')ac.resume();
    return ac;
  }
  function pn(c,freq,t,dur,type='triangle',vol=0.5){
    try{
      const o=c.createOscillator(),g=c.createGain();
      o.connect(g);g.connect(c.destination);
      o.type=type;o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(vol,t+0.02);
      g.gain.setValueAtTime(vol,t+dur-0.08);
      g.gain.linearRampToValueAtTime(0,t+dur);
      o.start(t);o.stop(t+dur);
    }catch(e){}
  }

  // 소리 4종 정의
  const SOUNDS={
    bell:{
      name:'딩동댕 종소리',desc:'학교 종소리 느낌의 3음 멜로디',icon:'🔔',
      play(c,now){
        pn(c,659,now+0.0, 0.55,'triangle');
        pn(c,523,now+0.55,0.55,'triangle');
        pn(c,392,now+1.1, 0.85,'triangle');
        pn(c,659,now+0.05,0.4,'sine');
        pn(c,523,now+0.60,0.4,'sine');
      }
    },
    chime:{
      name:'맑은 차임벨',desc:'높고 청명한 차임벨 2음',icon:'🎵',
      play(c,now){
        pn(c,1047,now+0.0, 0.4,'sine',0.6);
        pn(c,1319,now+0.4, 0.4,'sine',0.6);
        pn(c,1568,now+0.8, 0.7,'sine',0.5);
      }
    },
    alarm:{
      name:'경쾌한 알람',desc:'빠르게 울리는 전자 알람음',icon:'⏰',
      play(c,now){
        for(let i=0;i<4;i++){
          pn(c,880,now+i*0.22,  0.12,'square',0.3);
          pn(c,1100,now+i*0.22+0.12,0.08,'square',0.25);
        }
      }
    },
    fanfare:{
      name:'축하 팡파레',desc:'승리·완료를 알리는 팡파레',icon:'🎺',
      play(c,now){
        const notes=[523,659,784,1047];
        notes.forEach((f,i)=>pn(c,f,now+i*0.18,0.22,'triangle',0.5));
        pn(c,1047,now+0.72,0.6,'triangle',0.6);
      }
    }
  };

  function play(soundId){
    try{
      const s=SOUNDS[soundId||currentSound]||SOUNDS.bell;
      const c=gc(),now=c.currentTime;
      s.play(c,now);
    }catch(e){console.warn('AudioAlarm.play error:',e);}
  }

  function setSound(id){currentSound=id;Storage.set('alarmSound',id);}
  function getSound(){return currentSound;}
  function getSounds(){return SOUNDS;}

  // 저장된 소리 불러오기
  Storage.get('alarmSound').then(v=>{if(v&&SOUNDS[v])currentSound=v;});
  // 첫 클릭 시 AudioContext 준비
  document.addEventListener('click',()=>gc(),{once:true});

  return{play:()=>play(currentSound),playId:play,setSound,getSound,getSounds};
})();

/* ════════════════════════════════════════════════════════
   1. 룰렛
════════════════════════════════════════════════════════ */
(function initPicker(){
  const ta=document.getElementById('picker-names'),cntEl=document.getElementById('picker-count');
  const pickBtn=document.getElementById('pick-btn'),saveBtn=document.getElementById('picker-save-btn');
  const histEl=document.getElementById('picker-history'),clearBtn=document.getElementById('picker-history-clear');
  const cvs=document.getElementById('roulette-canvas'),ctx=cvs.getContext('2d');
  const WC=['#6c63ff','#34c8a0','#ff9f43','#ff6b6b','#4d96ff','#cc5de8','#20c997','#ffd93d','#f06595','#a9e34b'];
  let history=[],spinning=false,angle=0,aid=null;

  async function load(){
    const n=await Storage.get('pickerNames'),h=await Storage.get('pickerHistory');
    if(n)ta.value=n;if(h){history=JSON.parse(h);renderHist();}
    updateCnt();draw(getNames(),angle);
  }
  function getNames(){return ta.value.split('\n').map(s=>s.trim()).filter(Boolean);}
  function updateCnt(){cntEl.textContent=`${getNames().length}명`;}

  function draw(names,a){
    const W=cvs.width,H=cvs.height,cx=W/2,cy=H/2,R=W/2-6;
    ctx.clearRect(0,0,W,H);
    if(!names.length){
      ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle='#ede9ff';ctx.fill();
      ctx.fillStyle='#9b8fff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('이름을 입력하세요',cx,cy);return;
    }
    const sa=(Math.PI*2)/names.length;
    names.forEach((name,i)=>{
      const s=a+i*sa,e=s+sa;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,s,e);ctx.closePath();
      ctx.fillStyle=WC[i%WC.length];ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
      ctx.save();ctx.translate(cx,cy);ctx.rotate(s+sa/2);ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle='#fff';
      const fs=names.length<=6?13:names.length<=12?11:9;ctx.font=`bold ${fs}px sans-serif`;
      let dn=name;while(ctx.measureText(dn).width>R-20&&dn.length>1)dn=dn.slice(0,-1);if(dn!==name)dn+='…';
      ctx.fillText(dn,R-12,0);ctx.restore();
    });
    ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
    ctx.strokeStyle='#dfe6f0';ctx.lineWidth=2;ctx.stroke();
    ctx.font='14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🎲',cx,cy);
  }

  function spin(){
    const names=getNames();if(!names.length){alert('이름을 먼저 입력해 주세요!');return;}if(spinning)return;
    spinning=true;pickBtn.disabled=true;
    const wi=Math.floor(Math.random()*names.length),sa=(Math.PI*2)/names.length;
    const target=-(wi*sa+sa/2)-Math.PI/2+Math.PI*2*(5+Math.random());
    const start=angle,diff=target-start,dur=4000;let t0=null;
    function easeOut(t){return 1-Math.pow(1-t,3);}
    function step(ts){
      if(!t0)t0=ts;
      const p=Math.min((ts-t0)/dur,1);
      angle=start+diff*easeOut(p);draw(names,angle);
      if(p<1){aid=requestAnimationFrame(step);}
      else{
        angle=target%(Math.PI*2);spinning=false;pickBtn.disabled=false;
        const winner=names[wi];history.push(winner);
        Storage.set('pickerHistory',JSON.stringify(history));renderHist();
        setTimeout(()=>{Confetti.fire(winner);AudioAlarm.play();},300);
      }
    }
    aid=requestAnimationFrame(step);
  }

  function renderHist(){
    if(!history.length){histEl.innerHTML='<span class="empty-text">아직 기록이 없어요</span>';return;}
    histEl.innerHTML=history.slice(-8).reverse().map(n=>`<span class="history-chip">${n}</span>`).join('');
  }

  pickBtn.addEventListener('click',spin);
  saveBtn.addEventListener('click',async()=>{await Storage.set('pickerNames',ta.value);saveBtn.textContent='✅ 저장됨!';setTimeout(()=>{saveBtn.textContent='💾 저장';},1500);});
  ta.addEventListener('input',()=>{updateCnt();draw(getNames(),angle);});
  clearBtn.addEventListener('click',()=>{history=[];Storage.set('pickerHistory',JSON.stringify([]));renderHist();});
  load();
})();

/* ════════════════════════════════════════════════════════
   2. 모둠
════════════════════════════════════════════════════════ */
(function initGroup(){
  const ta=document.getElementById('group-names'),cntEl=document.getElementById('group-count'),numEl=document.getElementById('group-num-display');let ng=4;
  document.getElementById('group-num-minus').addEventListener('click',()=>{ng=Math.max(2,ng-1);numEl.textContent=ng;});
  document.getElementById('group-num-plus').addEventListener('click',()=>{ng=Math.min(10,ng+1);numEl.textContent=ng;});
  ta.addEventListener('input',()=>{cntEl.textContent=`${ta.value.split('\n').filter(s=>s.trim()).length}명`;});
  document.getElementById('group-btn').addEventListener('click',()=>{
    const names=ta.value.split('\n').map(s=>s.trim()).filter(Boolean);
    if(names.length<ng){alert(`학생이 모둠 수(${ng})보다 적어요!`);return;}
    const a=[...names];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    const groups=Array.from({length:ng},()=>[]);a.forEach((n,i)=>groups[i%ng].push(n));
    const ICONS=['🔴','🔵','🟢','🟡','🟣','🟠','⚫','⚪','🩷','🩵'];
    const res=document.getElementById('group-result');
    res.innerHTML=groups.map((m,i)=>`<div class="group-card"><div class="group-card-title">${ICONS[i]||'●'} ${i+1}모둠</div>${m.map(n=>`<div class="group-member">${n}</div>`).join('')}</div>`).join('');
    res.classList.remove('hidden');res.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  Storage.get('groupNames').then(v=>{if(v){ta.value=v;cntEl.textContent=`${ta.value.split('\n').filter(s=>s.trim()).length}명`;}});
  ta.addEventListener('blur',()=>Storage.set('groupNames',ta.value));
})();

/* ════════════════════════════════════════════════════════
   3. 📸 캡처 탭
   - 전체/영역 캡처 결과를 chrome.storage에 저장
   - 팝업이 닫혔다 열려도 마지막 캡처 유지
   - 즉시 PNG 저장 + 클립보드 복사 가능
════════════════════════════════════════════════════════ */
(function initCapture(){
  const previewWrap=document.getElementById('capture-preview-wrap');
  const previewImg =document.getElementById('capture-preview');
  const previewLbl =document.getElementById('capture-preview-label');
  const fullBtn    =document.getElementById('capture-full-btn');
  const downloadBtn=document.getElementById('capture-download-btn');
  const copyBtn    =document.getElementById('capture-copy-btn');
  const clearBtn   =document.getElementById('capture-clear-btn');

  // ── 미리보기 표시 ──
  function showPreview(dataUrl, label){
    previewImg.src=dataUrl;
    previewLbl.textContent=(label||'캡처 결과')+' — 저장됨 ✅';
    previewWrap.classList.remove('hidden');
    previewWrap.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  // ── background 메시지 헬퍼 ──
  function sendMsg(msg){
    return new Promise((resolve,reject)=>{
      try{
        chrome.runtime.sendMessage(msg,res=>{
          if(chrome.runtime.lastError)reject(new Error(chrome.runtime.lastError.message));
          else resolve(res);
        });
      }catch(e){reject(e);}
    });
  }

  // ── 팝업 열릴 때마다 저장된 캡처 복원 ──
  (async()=>{
    try{
      const res=await sendMsg({type:'CAPTURE_LOAD'});
      if(res.ok&&res.capture){
        const ago=Math.round((Date.now()-res.capture.time)/1000);
        const timeStr=ago<60?`${ago}초 전`:`${Math.round(ago/60)}분 전`;
        showPreview(res.capture.dataUrl, res.capture.label+` (${timeStr})`);
      }
    }catch(e){}
  })();

  // ── 전체 화면 캡처 ──
  fullBtn.addEventListener('click',async()=>{
    if(typeof chrome==='undefined'||!chrome.runtime){showToast('⚠️ 확장프로그램 환경에서만 사용 가능해요');return;}
    fullBtn.textContent='⏳ 캡처 중...';fullBtn.disabled=true;
    try{
      const res=await sendMsg({type:'CAPTURE_FULL'});
      if(res.ok){
        showPreview(res.dataUrl,'🖥️ 전체 화면 캡처');
        showToast('📸 캡처 완료! 저장됐어요');
      }else showToast('⚠️ 캡처 실패: '+(res.error||'알 수 없는 오류'));
    }catch(e){showToast('⚠️ 캡처 실패 (chrome:// 페이지 불가)');console.error(e);}
    finally{fullBtn.textContent='🖥️ 전체 화면 캡처';fullBtn.disabled=false;}
  });

  // 영역 선택 캡처 제거됨

  // ── PNG 저장 ──
  downloadBtn.addEventListener('click',()=>{
    if(!previewImg.src||previewImg.src===location.href){showToast('⚠️ 먼저 캡처하세요');return;}
    const a=document.createElement('a');
    const ts=new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
    a.download=`capture_${ts}.png`;a.href=previewImg.src;a.click();
    showToast('⬇️ PNG 저장 완료!');
  });

  // ── 클립보드 복사 ──
  copyBtn.addEventListener('click',async()=>{
    if(!previewImg.src||previewImg.src===location.href){showToast('⚠️ 먼저 캡처하세요');return;}
    try{
      const res=await fetch(previewImg.src);
      const blob=await res.blob();
      await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
      showToast('📋 클립보드에 복사됐어요! 어디서나 Ctrl+V로 붙여넣기');
    }catch(e){
      // 클립보드 API 실패 시 다운로드로 대체
      showToast('⚠️ 복사 실패 — PNG 저장으로 대체할게요');
      downloadBtn.click();
    }
  });

  // ── 캡처 지우기 ──
  clearBtn.addEventListener('click',async()=>{
    previewImg.src='';previewWrap.classList.add('hidden');
    try{await sendMsg({type:'CAPTURE_CLEAR'});}catch(e){}
    showToast('🗑️ 캡처 삭제됨');
  });
})();

/* ════════════════════════════════════════════════════════
   4. 타이머 & 스톱워치
════════════════════════════════════════════════════════ */
(function initTimer(){
  document.querySelectorAll('.sub-tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.sub-tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.sub-tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');document.getElementById('subtab-'+btn.dataset.subtab).classList.add('active');
    });
  });

  const CIRC=2*Math.PI*54;
  const pc=document.getElementById('timer-progress-circle');
  const cdEl=document.getElementById('timer-countdown-display');
  const stEl=document.getElementById('timer-status-label');
  pc.style.strokeDasharray=CIRC;pc.style.strokeDashoffset=0;

  let tMin=5,tSec=0,total=0,remain=0,running=false,iv=null;

  document.querySelectorAll('.time-arrow').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(running)return;
      const{target,dir}=btn.dataset;
      if(target==='min')tMin=dir==='up'?Math.min(99,tMin+1):Math.max(0,tMin-1);
      else tSec=dir==='up'?Math.min(59,tSec+1):Math.max(0,tSec-1);
      document.getElementById('timer-min-display').textContent=String(tMin).padStart(2,'0');
      document.getElementById('timer-sec-display').textContent=String(tSec).padStart(2,'0');
      upD(tMin*60+tSec);
    });
  });

  function upD(s){
    const m=Math.floor(s/60),ss=s%60;
    cdEl.textContent=`${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    const ratio=total>0?s/total:1;
    pc.style.strokeDashoffset=CIRC*(1-ratio);
    const w=ratio<=.2&&s>0;pc.classList.toggle('warning',w);cdEl.classList.toggle('warning',w);
  }

  document.getElementById('timer-start-btn').addEventListener('click',()=>{
    if(running)return;
    if(remain===0){total=tMin*60+tSec;if(total===0){alert('시간을 설정해 주세요!');return;}remain=total;}
    running=true;
    document.getElementById('timer-start-btn').disabled=true;
    document.getElementById('timer-pause-btn').disabled=false;
    stEl.textContent='진행 중 ▶';
    iv=setInterval(()=>{
      remain--;upD(remain);
      if(remain<=0){
        clearInterval(iv);running=false;
        document.getElementById('timer-start-btn').disabled=false;
        document.getElementById('timer-pause-btn').disabled=true;
        stEl.textContent='완료! 🎉';cdEl.textContent='00:00';
        AudioAlarm.play();
        document.body.style.background='#ffe0e0';
        setTimeout(()=>{document.body.style.background='';},700);
      }
    },1000);
  });
  document.getElementById('timer-pause-btn').addEventListener('click',()=>{
    clearInterval(iv);running=false;
    document.getElementById('timer-start-btn').disabled=false;
    document.getElementById('timer-pause-btn').disabled=true;
    stEl.textContent='일시정지 ⏸';
  });
  document.getElementById('timer-reset-btn').addEventListener('click',()=>{
    clearInterval(iv);running=false;remain=0;
    document.getElementById('timer-start-btn').disabled=false;
    document.getElementById('timer-pause-btn').disabled=true;
    stEl.textContent='대기 중';cdEl.classList.remove('warning');pc.classList.remove('warning');
    upD(tMin*60+tSec);
  });
  upD(tMin*60+tSec);total=tMin*60+tSec;

  // 스톱워치
  const swD=document.getElementById('stopwatch-display'),lapsEl=document.getElementById('sw-laps');
  let swRun=false,swIv=null,swEl=0,laps=[];
  function upSw(){const t=swEl%10,s=Math.floor(swEl/10)%60,m=Math.floor(swEl/600);swD.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${t}`;}
  function renderLaps(){lapsEl.innerHTML=laps.slice().reverse().map((t,i)=>{const n=laps.length-i,tn=t%10,ts=Math.floor(t/10)%60,tm=Math.floor(t/600);return `<div class="sw-lap-item"><span class="sw-lap-num">랩 ${n}</span><span class="sw-lap-time">${String(tm).padStart(2,'0')}:${String(ts).padStart(2,'0')}.${tn}</span></div>`;}).join('');}
  document.getElementById('sw-start-btn').addEventListener('click',()=>{
    if(swRun){clearInterval(swIv);swRun=false;document.getElementById('sw-start-btn').textContent='▶ 재개';document.getElementById('sw-lap-btn').disabled=true;}
    else{swRun=true;document.getElementById('sw-start-btn').textContent='⏸ 정지';document.getElementById('sw-lap-btn').disabled=false;swIv=setInterval(()=>{swEl++;upSw();},100);}
  });
  document.getElementById('sw-lap-btn').addEventListener('click',()=>{laps.push(swEl);renderLaps();});
  document.getElementById('sw-reset-btn').addEventListener('click',()=>{clearInterval(swIv);swRun=false;swEl=0;laps=[];document.getElementById('sw-start-btn').textContent='▶ 시작';document.getElementById('sw-lap-btn').disabled=true;upSw();renderLaps();});
  upSw();
})();

/* ════════════════════════════════════════════════════════
   5. 뽀모도로
════════════════════════════════════════════════════════ */
(function initPomodoro(){
  const POMO_CIRC=2*Math.PI*70;
  const progEl=document.getElementById('pomo-progress');
  const timeEl=document.getElementById('pomo-time');
  const labelEl=document.getElementById('pomo-label');
  const badgeEl=document.getElementById('pomo-mode-badge');
  const dotsEl =document.getElementById('pomo-dots');
  progEl.style.strokeDasharray=POMO_CIRC;progEl.style.strokeDashoffset=0;

  let workMin=25,breakMin=5,mode='work',remain=25*60,total=25*60,running=false,iv=null,cycles=0;

  document.getElementById('pomo-work-minus').addEventListener('click',()=>{if(running)return;workMin=Math.max(1,workMin-1);document.getElementById('pomo-work-display').textContent=workMin;if(mode==='work'){remain=total=workMin*60;upPomo();}});
  document.getElementById('pomo-work-plus').addEventListener('click',()=>{if(running)return;workMin=Math.min(99,workMin+1);document.getElementById('pomo-work-display').textContent=workMin;if(mode==='work'){remain=total=workMin*60;upPomo();}});
  document.getElementById('pomo-break-minus').addEventListener('click',()=>{if(running)return;breakMin=Math.max(1,breakMin-1);document.getElementById('pomo-break-display').textContent=breakMin;if(mode==='break'){remain=total=breakMin*60;upPomo();}});
  document.getElementById('pomo-break-plus').addEventListener('click',()=>{if(running)return;breakMin=Math.min(30,breakMin+1);document.getElementById('pomo-break-display').textContent=breakMin;if(mode==='break'){remain=total=breakMin*60;upPomo();}});

  function upPomo(){
    const m=Math.floor(remain/60),s=remain%60;
    timeEl.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const ratio=total>0?remain/total:1;
    progEl.style.strokeDashoffset=POMO_CIRC*(1-ratio);
    progEl.classList.toggle('break',mode==='break');
    timeEl.classList.toggle('break',mode==='break');
    badgeEl.classList.toggle('break',mode==='break');
  }
  function renderDots(){
    dotsEl.innerHTML='';
    for(let i=0;i<Math.max(cycles,4);i++){const d=document.createElement('div');d.className='pomo-dot'+(i<cycles?' done':'');dotsEl.appendChild(d);}
  }
  function switchMode(){
    if(mode==='work'){mode='break';remain=total=breakMin*60;badgeEl.textContent='☕ 휴식 시간';labelEl.textContent='잠시 쉬어요!';cycles++;renderDots();}
    else{mode='work';remain=total=workMin*60;badgeEl.textContent='🍅 집중 시간';labelEl.textContent='집중해요!';}
    upPomo();AudioAlarm.play();showToast(mode==='work'?'🍅 집중 시간 시작!':'☕ 쉬는 시간 시작!');
  }

  document.getElementById('pomo-start-btn').addEventListener('click',()=>{
    if(running){clearInterval(iv);running=false;document.getElementById('pomo-start-btn').textContent='▶ 시작';labelEl.textContent='일시정지';}
    else{running=true;document.getElementById('pomo-start-btn').textContent='⏸ 일시정지';labelEl.textContent=mode==='work'?'집중해요!':'쉬는 중!';
      iv=setInterval(()=>{remain--;upPomo();if(remain<=0){clearInterval(iv);running=false;document.getElementById('pomo-start-btn').textContent='▶ 시작';switchMode();}},1000);}
  });
  document.getElementById('pomo-skip-btn').addEventListener('click',()=>{clearInterval(iv);running=false;document.getElementById('pomo-start-btn').textContent='▶ 시작';switchMode();});
  document.getElementById('pomo-reset-btn').addEventListener('click',()=>{
    clearInterval(iv);running=false;mode='work';cycles=0;remain=total=workMin*60;
    document.getElementById('pomo-start-btn').textContent='▶ 시작';
    badgeEl.textContent='🍅 집중 시간';badgeEl.classList.remove('break');
    labelEl.textContent='시작 전';timeEl.classList.remove('break');progEl.classList.remove('break');
    upPomo();renderDots();
  });
  upPomo();renderDots();badgeEl.textContent='🍅 집중 시간';
})();

/* ════════════════════════════════════════════════════════
   6. QR코드 — qrcode.min.js 라이브러리 사용 (완전 교체)
════════════════════════════════════════════════════════ */
(function initQR(){
  const urlInp   = document.getElementById('qr-url-input');
  const genBtn   = document.getElementById('qr-generate-btn');
  const resArea  = document.getElementById('qr-result-area');
  const qrCanvas = document.getElementById('qr-canvas');
  const urlLbl   = document.getElementById('qr-url-label');
  let lvl = 'M';   // 기본 오류 수정 레벨
  let sz  = 280;   // 기본 크기 (더 크게)

  // 저장된 URL 불러오기
  Storage.get('qrLastUrl').then(v => { if(v) urlInp.value = v; });

  // 오류 수정 레벨 선택
  document.querySelectorAll('.qr-level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qr-level-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lvl = btn.dataset.level;
    });
  });

  // 크기 조절
  document.getElementById('qr-size-minus').addEventListener('click', () => {
    sz = Math.max(160, sz - 20);
    document.getElementById('qr-size-display').textContent = sz;
  });
  document.getElementById('qr-size-plus').addEventListener('click', () => {
    sz = Math.min(340, sz + 20);
    document.getElementById('qr-size-display').textContent = sz;
  });
  // 기본값 표시
  document.getElementById('qr-size-display').textContent = sz;

  // QR 생성
  function generate() {
    const text = urlInp.value.trim();
    if (!text) { alert('링크 또는 텍스트를 입력해 주세요!'); return; }
    Storage.set('qrLastUrl', text);

    genBtn.textContent = '⏳ 생성 중...';
    genBtn.disabled = true;

    setTimeout(() => {
      try {
        QRCode.toCanvas(qrCanvas, text, {
          size: sz,
          errorCorrectionLevel: lvl,
          colorDark:  '#1a1a2e',
          colorLight: '#ffffff',
          margin: 3
        });
        urlLbl.textContent = text.length > 55 ? text.slice(0, 52) + '…' : text;
        resArea.classList.remove('hidden');
        resArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        showToast('✅ QR코드 생성 완료!');
      } catch(e) {
        alert('QR 생성 실패: 텍스트가 너무 길어요 (영문 약 900자, 한글 약 300자 이하)');
        console.error('QR error:', e);
      } finally {
        genBtn.textContent = '📷 QR코드 생성!';
        genBtn.disabled = false;
      }
    }, 10);
  }

  genBtn.addEventListener('click', generate);
  urlInp.addEventListener('keydown', e => { if(e.key === 'Enter') generate(); });

  // PNG 저장
  document.getElementById('qr-download-btn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'qrcode.png';
    a.href = qrCanvas.toDataURL('image/png');
    a.click();
    showToast('⬇️ QR 이미지 저장 완료!');
  });

  // 클립보드 복사
  document.getElementById('qr-copy-btn').addEventListener('click', () => {
    qrCanvas.toBlob(blob => {
      navigator.clipboard.write([new ClipboardItem({'image/png': blob})])
        .then(() => showToast('📋 QR 이미지 복사됐어요!'))
        .catch(() => showToast('⚠️ 복사 미지원 — PNG 저장을 이용하세요'));
    });
  });
})();

/* ════════════════════════════════════════════════════════
   7. 메모
════════════════════════════════════════════════════════ */
(function initMemo(){
  const subjEl=document.getElementById('memo-subject'),dateEl=document.getElementById('memo-date');
  const checkList=document.getElementById('memo-checklist'),newInp=document.getElementById('memo-new-item');
  const addBtn=document.getElementById('memo-add-btn'),memoTxt=document.getElementById('memo-text');
  const saveBtn=document.getElementById('memo-save-btn'),expBtn=document.getElementById('memo-export-btn'),clrBtn=document.getElementById('memo-clear-btn');
  const histList=document.getElementById('memo-history-list'),histCnt=document.getElementById('memo-history-count');
  let items=[],saved=[];

  function today(){const n=new Date();return `${n.getFullYear()}.${String(n.getMonth()+1).padStart(2,'0')}.${String(n.getDate()).padStart(2,'0')} (${['일','월','화','수','목','금','토'][n.getDay()]})`;}
  dateEl.textContent=today();

  function renderCL(){
    checkList.innerHTML=items.map(it=>`
      <div class="memo-check-item ${it.done?'done':''}" data-id="${it.id}">
        <input type="checkbox" ${it.done?'checked':''} data-check="${it.id}"/>
        <span class="memo-check-text">${it.text}</span>
        <button class="memo-check-delete" data-del="${it.id}" type="button">✕</button>
      </div>`).join('');
  }

  // 이벤트 위임 (innerHTML 재생성해도 이벤트 유지)
  checkList.addEventListener('change',e=>{
    const cb=e.target.closest('input[data-check]');if(!cb)return;
    const item=items.find(i=>i.id===cb.dataset.check);
    if(item){item.done=cb.checked;renderCL();autosave();}
  });
  checkList.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-del]');if(!btn)return;
    e.stopPropagation();
    items=items.filter(i=>i.id!==btn.getAttribute('data-del'));
    renderCL();autosave();
  });

  function addItem(){const t=newInp.value.trim();if(!t)return;items.push({id:Date.now().toString(),text:t,done:false});newInp.value='';renderCL();autosave();}
  addBtn.addEventListener('click',addItem);
  newInp.addEventListener('keydown',e=>{if(e.key==='Enter')addItem();});

  let autoT=null;
  function autosave(){clearTimeout(autoT);autoT=setTimeout(()=>Storage.set('memoDraft',JSON.stringify({subject:subjEl.value,text:memoTxt.value,items})),800);}
  subjEl.addEventListener('input',autosave);memoTxt.addEventListener('input',autosave);

  function renderHistory(){
    histCnt.textContent=`${saved.length}개`;
    if(!saved.length){histList.innerHTML='<span class="empty-text" style="padding:7px 0;display:block">저장된 메모가 없어요</span>';return;}
    histList.innerHTML=saved.slice().reverse().map((memo,i)=>{const idx=saved.length-1-i;return `<div class="memo-history-item"><div class="memo-history-title">${memo.subject||'(제목 없음)'}</div><div class="memo-history-date">${memo.date}</div><div class="memo-history-preview">${memo.text||(memo.items||[]).map(it=>(it.done?'✅':'⬜')+' '+it.text).join(' / ')||'(내용 없음)'}</div><div class="memo-history-actions"><button class="btn btn-ghost btn-xs" data-load="${idx}">📂 불러오기</button><button class="btn btn-ghost btn-xs" data-remove="${idx}">🗑️ 삭제</button></div></div>`;}).join('');
    histList.querySelectorAll('[data-load]').forEach(btn=>{btn.addEventListener('click',()=>{const m=saved[btn.dataset.load];subjEl.value=m.subject||'';memoTxt.value=m.text||'';items=m.items||[];renderCL();});});
    histList.querySelectorAll('[data-remove]').forEach(btn=>{btn.addEventListener('click',()=>{if(!confirm('삭제할까요?'))return;saved.splice(btn.dataset.remove,1);Storage.set('savedMemos',JSON.stringify(saved));renderHistory();});});
  }

  saveBtn.addEventListener('click',async()=>{
    if(!subjEl.value.trim()&&!memoTxt.value.trim()&&!items.length){alert('내용을 입력해 주세요!');return;}
    const memo={id:Date.now().toString(),subject:subjEl.value,date:today(),text:memoTxt.value,items:[...items]};
    saved.push(memo);await Storage.set('savedMemos',JSON.stringify(saved));renderHistory();
    saveBtn.textContent='✅ 저장됨!';setTimeout(()=>{saveBtn.textContent='💾 저장';},1500);
  });
  expBtn.addEventListener('click',()=>{
    const lines=[`📚 ${subjEl.value||'수업 메모'}`,`📅 ${dateEl.textContent}`,'']; if(items.length){lines.push('[ 수업 진도 ]');items.forEach(it=>lines.push(`${it.done?'✅':'⬜'} ${it.text}`));lines.push('');}if(memoTxt.value.trim()){lines.push('[ 수업 메모 ]');lines.push(memoTxt.value);}
    const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`수업메모_${today().split(' ')[0].replace(/\./g,'-')}.txt`;a.click();
  });
  clrBtn.addEventListener('click',()=>{if(!confirm('초기화할까요?'))return;subjEl.value='';memoTxt.value='';items=[];renderCL();Storage.set('memoDraft',null);});

  async function load(){const d=await Storage.get('memoDraft');const s=await Storage.get('savedMemos');if(d){const p=JSON.parse(d);subjEl.value=p.subject||'';memoTxt.value=p.text||'';items=p.items||[];renderCL();}if(s)saved=JSON.parse(s);renderHistory();}
  load();
})();

/* ════════════════════════════════════════════════════════
   8. 화이트보드
════════════════════════════════════════════════════════ */
const WB=(function initWhiteboard(){
  const cvs=document.getElementById('wb-canvas');
  const ctx=cvs.getContext('2d');
  const textInput=document.getElementById('wb-text-input');
  const PALETTE=['#1a1a2e','#ff6b6b','#6c63ff','#34c8a0','#ff9f43','#ffd93d','#cc5de8','#4d96ff','#20c997','#f8f9fa'];
  let currentColor=PALETTE[0],currentSize=4,currentTool='pen',drawing=false,darkBg=false,startX=0,startY=0,history=[],histIdx=-1,previewSnap=null;

  function resize(){
    const tb=document.querySelector('.wb-toolbar');const tbH=tb?tb.offsetHeight:130;
    const W=420,H=Math.max(150,640-40-88-tbH);
    const img=cvs.width>0&&cvs.height>0?ctx.getImageData(0,0,cvs.width,cvs.height):null;
    cvs.width=W;cvs.height=H;
    if(darkBg){ctx.fillStyle='#1e1e2e';ctx.fillRect(0,0,W,H);}
    if(img)ctx.putImageData(img,0,0);
  }

  const cg=document.getElementById('wb-colors');
  PALETTE.forEach(color=>{
    const sw=document.createElement('div');sw.className='wb-color-swatch'+(color===currentColor?' active':'');sw.style.background=color;
    if(color==='#f8f9fa')sw.style.border='2px solid #dfe6f0';
    sw.addEventListener('click',()=>{currentColor=color;document.querySelectorAll('.wb-color-swatch').forEach(s=>s.classList.remove('active'));sw.classList.add('active');if(currentTool==='eraser')setTool('pen');});
    cg.appendChild(sw);
  });

  function setTool(id){
    currentTool=id;
    document.querySelectorAll('.wb-tool-btn').forEach(b=>b.classList.remove('active'));
    const btn=document.getElementById('wb-'+id);if(btn)btn.classList.add('active');
    cvs.style.cursor=id==='eraser'?'cell':id==='text'?'text':'crosshair';
  }
  ['pen','highlight','eraser','line','rect','circle','text'].forEach(id=>{const b=document.getElementById('wb-'+id);if(b)b.addEventListener('click',()=>setTool(id));});

  const ss=document.getElementById('wb-size'),sv=document.getElementById('wb-size-val');
  ss.addEventListener('input',()=>{currentSize=+ss.value;sv.textContent=currentSize;});

  function saveSnap(){history=history.slice(0,histIdx+1);history.push(cvs.toDataURL());if(history.length>30)history.shift();histIdx=history.length-1;}

  document.getElementById('wb-undo').addEventListener('click',()=>{
    if(histIdx<=0){if(histIdx===0){history=[];histIdx=-1;ctx.clearRect(0,0,cvs.width,cvs.height);if(darkBg){ctx.fillStyle='#1e1e2e';ctx.fillRect(0,0,cvs.width,cvs.height);}}return;}
    histIdx--;const img=new Image();img.onload=()=>{ctx.clearRect(0,0,cvs.width,cvs.height);if(darkBg){ctx.fillStyle='#1e1e2e';ctx.fillRect(0,0,cvs.width,cvs.height);}ctx.drawImage(img,0,0);};img.src=history[histIdx];
  });
  document.getElementById('wb-clear').addEventListener('click',()=>{if(!confirm('전체 지울까요?'))return;ctx.clearRect(0,0,cvs.width,cvs.height);if(darkBg){ctx.fillStyle='#1e1e2e';ctx.fillRect(0,0,cvs.width,cvs.height);}history=[];histIdx=-1;});
  document.getElementById('wb-save').addEventListener('click',()=>{const a=document.createElement('a');a.download=`whiteboard_${Date.now()}.png`;a.href=cvs.toDataURL('image/png');a.click();showToast('💾 저장됐어요!');});
  document.getElementById('wb-bg').addEventListener('click',()=>{
    darkBg=!darkBg;cvs.classList.toggle('dark-bg',darkBg);document.getElementById('wb-bg').textContent=darkBg?'☀️ 배경':'🌙 배경';
    ctx.globalCompositeOperation='destination-over';ctx.fillStyle=darkBg?'#1e1e2e':'#ffffff';ctx.fillRect(0,0,cvs.width,cvs.height);ctx.globalCompositeOperation='source-over';
  });

  function getPos(e){const rect=cvs.getBoundingClientRect();const scX=cvs.width/rect.width,scY=cvs.height/rect.height;const src=e.touches?e.touches[0]:e;return{x:(src.clientX-rect.left)*scX,y:(src.clientY-rect.top)*scY};}
  function setStyle(hl,er){ctx.lineWidth=currentSize;ctx.lineCap='round';ctx.lineJoin='round';if(er){ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='rgba(0,0,0,1)';}else if(hl){ctx.globalCompositeOperation='multiply';ctx.strokeStyle=currentColor;ctx.globalAlpha=0.4;}else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=currentColor;ctx.globalAlpha=1;}}
  function resetStyle(){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}
  function drawShape(tool,x1,y1,x2,y2){ctx.beginPath();if(tool==='line'){ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}else if(tool==='rect'){ctx.strokeRect(x1,y1,x2-x1,y2-y1);}else if(tool==='circle'){const rx=(x2-x1)/2,ry=(y2-y1)/2;ctx.ellipse(x1+rx,y1+ry,Math.abs(rx),Math.abs(ry),0,0,Math.PI*2);ctx.stroke();}}

  function onStart(e){e.preventDefault();drawing=true;const{x,y}=getPos(e);startX=x;startY=y;if(currentTool==='text'){openTextInput(x,y);return;}if(['line','rect','circle'].includes(currentTool)){previewSnap=ctx.getImageData(0,0,cvs.width,cvs.height);return;}setStyle(currentTool==='highlight',currentTool==='eraser');ctx.beginPath();ctx.moveTo(x,y);}
  function onMove(e){if(!drawing)return;e.preventDefault();const{x,y}=getPos(e);if(currentTool==='pen'||currentTool==='highlight'||currentTool==='eraser'){ctx.lineTo(x,y);ctx.stroke();}else if(previewSnap){ctx.putImageData(previewSnap,0,0);setStyle(false,false);drawShape(currentTool,startX,startY,x,y);}}
  function onEnd(e){if(!drawing)return;drawing=false;resetStyle();if(['line','rect','circle'].includes(currentTool)){const{x,y}=getPos(e);ctx.putImageData(previewSnap,0,0);setStyle(false,false);drawShape(currentTool,startX,startY,x,y);resetStyle();}if(currentTool!=='text')saveSnap();}

  cvs.addEventListener('mousedown',onStart);cvs.addEventListener('mousemove',onMove);cvs.addEventListener('mouseup',onEnd);cvs.addEventListener('mouseleave',onEnd);
  cvs.addEventListener('touchstart',onStart,{passive:false});cvs.addEventListener('touchmove',onMove,{passive:false});cvs.addEventListener('touchend',onEnd,{passive:false});

  function openTextInput(x,y){const rect=cvs.getBoundingClientRect();const scX=cvs.width/rect.width;textInput.style.left=(rect.left+x/scX)+'px';textInput.style.top=(rect.top+y/scX-10)+'px';textInput.classList.remove('hidden');textInput.value='';textInput.focus();textInput.dataset.x=x;textInput.dataset.y=y;}
  textInput.addEventListener('keydown',e=>{if(e.key==='Enter'){const x=+textInput.dataset.x,y=+textInput.dataset.y,text=textInput.value;textInput.classList.add('hidden');if(text.trim()){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle=currentColor;ctx.font=`bold ${currentSize*3+8}px sans-serif`;ctx.textBaseline='top';ctx.fillText(text,x,y);saveSnap();}}else if(e.key==='Escape')textInput.classList.add('hidden');});

  return{resize};
})();

/* ════════════════════════════════════════════════════════
   9. 🖱️ 커서 설정 탭 (scripting API 방식, 완전 수정)
════════════════════════════════════════════════════════ */
(function initCursor(){
  const grid       = document.getElementById('cursor-grid');
  const slider     = document.getElementById('cursor-size-slider');
  const sizeDisplay= document.getElementById('cursor-size-display');
  const previewBox = document.getElementById('cursor-preview-box');
  const applyBtn   = document.getElementById('cursor-apply-btn');
  const resetBtn   = document.getElementById('cursor-reset-btn');
  const statusEl   = document.getElementById('cursor-status');

  const CURSORS=[
    {id:'default',   label:'기본',    icon:'🖱️', css:'default'},
    {id:'pointer',   label:'손가락',  icon:'👆',  css:'pointer'},
    {id:'crosshair', label:'십자선',  icon:'✚',   css:'crosshair'},
    {id:'text',      label:'텍스트',  icon:'📝',  css:'text'},
    {id:'move',      label:'이동',    icon:'✋',  css:'move'},
    {id:'zoom-in',   label:'확대',    icon:'🔍',  css:'zoom-in'},
    {id:'wait',      label:'로딩',    icon:'⏳',  css:'wait'},
    {id:'not-allowed',label:'금지',   icon:'🚫',  css:'not-allowed'},
    {id:'star',      label:'별⭐',    icon:'⭐',  css:'custom', svgType:'star'},
    {id:'heart',     label:'하트❤️', icon:'❤️',  css:'custom', svgType:'heart'},
    {id:'arrow-big', label:'큰화살',  icon:'↖️',  css:'custom', svgType:'arrow'},
    {id:'dot',       label:'점',      icon:'🔵',  css:'custom', svgType:'dot'},
  ];

  let selId='default', curSize=32;

  // 커서 그리드 생성
  CURSORS.forEach(cur=>{
    const card=document.createElement('div');
    card.className='cursor-card'+(cur.id==='default'?' active':'');
    card.dataset.id=cur.id;
    card.innerHTML=`<span class="cursor-card-icon">${cur.icon}</span><span class="cursor-card-label">${cur.label}</span>`;
    card.addEventListener('click',()=>{
      grid.querySelectorAll('.cursor-card').forEach(c=>c.classList.remove('active'));
      card.classList.add('active');selId=cur.id;
      updatePreview();
    });
    grid.appendChild(card);
  });

  // 슬라이더
  slider.addEventListener('input',()=>{
    curSize=+slider.value;
    sizeDisplay.textContent=curSize+'px';
    updatePreview();
  });

  // SVG 커서 생성
  function makeSVGDataUrl(type, size){
    const s=size, h=size;
    let inner='';
    if(type==='star'){
      const cx=s/2,cy=h/2,R=s*.45,r=s*.2;
      const pts=[];for(let i=0;i<10;i++){const a=(i*36-90)*Math.PI/180,rad=i%2===0?R:r;pts.push(`${cx+rad*Math.cos(a)},${cy+rad*Math.sin(a)}`);}
      inner=`<polygon points="${pts.join(' ')}" fill="#FFD700" stroke="#FFA500" stroke-width="1.5"/>`;
    }else if(type==='heart'){
      inner=`<path d="M${s*.5},${h*.28} C${s*.5},${h*.1} ${s*.1},${h*.1} ${s*.1},${h*.38} C${s*.1},${h*.65} ${s*.5},${h*.88} ${s*.5},${h} C${s*.5},${h*.88} ${s*.9},${h*.65} ${s*.9},${h*.38} C${s*.9},${h*.1} ${s*.5},${h*.1} ${s*.5},${h*.28}Z" fill="#ff6b6b" stroke="#c0392b" stroke-width="1"/>`;
    }else if(type==='arrow'){
      inner=`<polygon points="4,4 4,${h-8} ${s*.4},${h*.55} ${s*.6},${h-4} ${s*.75},${h*.82} ${s*.55},${h*.45} ${s-4},${h*.45}" fill="#6c63ff" stroke="#fff" stroke-width="1.5"/>`;
    }else if(type==='dot'){
      inner=`<circle cx="${s/2}" cy="${h/2}" r="${s*.38}" fill="#6c63ff" stroke="#fff" stroke-width="2"/>`;
    }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${h}">${inner}</svg>`;
    return`data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // 커서 CSS값 계산
  function getCursorCSS(id, size){
    const cur=CURSORS.find(c=>c.id===id);if(!cur)return 'default';
    if(cur.css==='custom'){
      const dataUrl=makeSVGDataUrl(cur.svgType, size);
      return `url('${dataUrl}') ${Math.floor(size/2)} ${Math.floor(size/2)}, auto`;
    }
    // 기본 CSS 커서는 size 무시 (브라우저 기본 크기 사용)
    return cur.css;
  }

  // 미리보기 업데이트
  function updatePreview(){
    const css=getCursorCSS(selId, curSize);
    previewBox.style.cursor=css;
  }
  updatePreview();

  // 상태 표시
  function showStatus(msg, isOk){
    statusEl.textContent=msg;
    statusEl.className='cursor-status '+(isOk?'ok':'err');
    statusEl.classList.remove('hidden');
    setTimeout(()=>statusEl.classList.add('hidden'),3000);
  }

  function sendMsg(msg){
    return new Promise((resolve,reject)=>{
      try{chrome.runtime.sendMessage(msg,res=>{if(chrome.runtime.lastError)reject(new Error(chrome.runtime.lastError.message));else resolve(res);});}
      catch(e){reject(e);}
    });
  }

  // ── 적용 버튼 ──
  applyBtn.addEventListener('click',async()=>{
    applyBtn.textContent='⏳ 적용 중...';applyBtn.disabled=true;
    if(typeof chrome==='undefined'||!chrome.runtime){
      showStatus('⚠️ 확장프로그램 환경에서만 사용 가능해요','err');
      applyBtn.textContent='✅ 현재 탭에 적용';applyBtn.disabled=false;return;
    }
    try{
      const cssValue=getCursorCSS(selId,curSize);
      const res=await sendMsg({type:'CURSOR_APPLY',cssValue});
      if(res&&res.ok){
        await Storage.set('cursorSetting',JSON.stringify({id:selId,size:curSize}));
        showStatus('✅ "'+( CURSORS.find(c=>c.id===selId)?.label||selId)+'" 커서 적용됐어요!',true);
      }else{
        showStatus('⚠️ '+(res?.error||'적용 실패'),'err');
      }
    }catch(e){
      console.error('Cursor apply error:',e);
      showStatus('⚠️ 적용 실패: '+e.message,'err');
    }finally{
      applyBtn.textContent='✅ 현재 탭에 적용';applyBtn.disabled=false;
    }
  });

  // ── 초기화 버튼 ──
  resetBtn.addEventListener('click',async()=>{
    if(typeof chrome==='undefined'||!chrome.runtime){showStatus('⚠️ 확장프로그램 환경에서만 사용 가능해요','err');return;}
    try{
      const res=await sendMsg({type:'CURSOR_RESET'});
      if(res&&res.ok)showStatus('↺ 기본 커서로 복원됐어요',true);
      else showStatus('⚠️ '+(res?.error||'복원 실패'),'err');
    }catch(e){showStatus('⚠️ 복원 실패: '+e.message,'err');}
  });

  // 저장된 설정 복원
  Storage.get('cursorSetting').then(v=>{
    if(!v)return;
    try{
      const{id,size}=JSON.parse(v);
      selId=id;curSize=size;slider.value=size;sizeDisplay.textContent=size+'px';
      grid.querySelectorAll('.cursor-card').forEach(c=>c.classList.toggle('active',c.dataset.id===id));
      updatePreview();
    }catch(e){}
  });
})();

/* ════════════════════════════════════════════════════════
   10. 설정 탭 — 알람 소리 선택
════════════════════════════════════════════════════════ */
(function initSettings(){
  const soundList=document.getElementById('sound-list');
  const sounds=AudioAlarm.getSounds();
  const currentId=AudioAlarm.getSound();

  Object.entries(sounds).forEach(([id,s])=>{
    const item=document.createElement('div');
    item.className='sound-item'+(id===currentId?' active':'');
    item.innerHTML=`
      <div class="sound-item-icon">${s.icon}</div>
      <div class="sound-item-info">
        <div class="sound-item-name">${s.name}</div>
        <div class="sound-item-desc">${s.desc}</div>
      </div>
      <button class="sound-preview-btn" data-id="${id}">▶ 미리듣기</button>`;

    // 항목 클릭 → 선택
    item.addEventListener('click',e=>{
      if(e.target.classList.contains('sound-preview-btn'))return;
      document.querySelectorAll('.sound-item').forEach(i=>i.classList.remove('active'));
      item.classList.add('active');
      AudioAlarm.setSound(id);
      showToast(`🔔 "${s.name}" 선택됨`);
    });

    // 미리듣기 버튼
    item.querySelector('.sound-preview-btn').addEventListener('click',e=>{
      e.stopPropagation();
      AudioAlarm.playId(id);
    });

    soundList.appendChild(item);
  });
})();

/* ── 키보드 단축키 ── */
document.addEventListener('keydown',e=>{
  const a=document.querySelector('.tab-panel.active');if(!a)return;
  if(e.key===' '&&a.id==='tab-picker'){e.preventDefault();document.getElementById('pick-btn')?.click();}
});

console.log('%c🏫 수업마법사 v3.2 로드 완료!','color:#6c63ff;font-weight:bold;font-size:14px');
