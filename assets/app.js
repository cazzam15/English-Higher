'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayStr=()=>new Date().toDateString();
const LEVEL_NAMES={1:'Easy',2:'Medium',3:'Hard'};
const TYPE_NAMES={mc:'Quick quiz',num:'Calculation',written:'Exam-style'};

// Short "glyphs" shown on topic tiles
const GLYPH={ruae_paper:'30',ruae_wordchoice:'Aa',ruae_imagery:'≈',ruae_sentence:';',ruae_tone:'♪',ruae_structure:'↔',ruae_evaluation:'5',
  ce_paper:'40',ce_structure:'¶',ce_marking:'20',ce_drama:'🎭',ce_prose:'§',ce_poetry:'✒',ce_film:'▶',ce_language:'💬',
  st_skills:'8',st_slab:'SB',st_seq:'SQ',st_msw:'MW',st_jekyll:'J&H',st_sunlight:'☀',st_ics:'ICS',st_ssc:'SS',
  st_duffy:'CAD',st_maccaig:'NM',st_lochhead:'LL',st_paterson:'DP',st_dharker:'ID',st_jamie:'KJ',st_coll:'PC',
  pf_rules:'1300',pf_creative:'✎',pf_discursive:'⚖',term_lit:'T',term_poetic:'♫',term_drama:'Act'};

// What each question type needs (from the Higher English course specification and marking instructions)
const COMMAND_TIPS=[
  [/look at both passages|both writers|both passages/i,'Final question: identify the key areas of agreement/disagreement and support each with evidence from BOTH passages. 3 areas = 3 marks; detailed evidence lifts it to 5.'],
  [/elsewhere|at least one other (poem|story)|to at least one other/i,'Final Scottish text question (8 marks from 2026–27): 2 for commonality, 2 for the extract, 4 for references to elsewhere in the text/other poems. Bullet points are fine.'],
  [/own words/i,'Own words: no marks for straight lifts. Identify the relevant ideas and gloss them in your own words — one clear point per mark.'],
  [/link/i,'Link: show how the sentence refers BACK to the previous idea and introduces the NEW idea that follows.'],
  [/evaluate/i,'Evaluate: analyse specific language/ideas and make a judgement on how effective they are (e.g. how an ending links to earlier ideas).'],
  [/analyse|analysis/i,'Analyse: quotation + detailed comment on its effect. 2 marks for detailed/insightful comment, 1 for basic comment, 0 for quotation alone.'],
  [/explain/i,'Explain: make each point clearly; "explain fully" usually means one mark per developed point.'],
  [/identify/i,'Identify: pick out the relevant ideas — if it says "use your own words", gloss them.'],
  [/plan|write an introduction|write one body paragraph/i,'Planning task: use the question\'s key words and show a clear line of thought.'],
  [/final question/i,'Final question: commonality (2) + extract (2) + elsewhere (4).']
];
const cmdTip=q=>{for(const [re,t] of COMMAND_TIPS)if(re.test(q))return t;return '';};
// qType() is defined in data.js

// ---------------- State ----------------
const STORE='heng_v1';
const S={
  panel:'practice',currentQ:null,currentTopic:'random',currentDiff:'mixed',currentType:'all',answered:false,
  questionNum:1,notepadContent:'',recent:[],
  stats:{answered:0,correct:0,streak:0,bestStreak:0,dailyCount:0,dailyDate:'',dayStreak:0,lastStudyDate:'',writtenMarks:0,writtenMax:0},
  topicStats:{},settings:{name:'',goal:10,accent:'saltire',mode:'system',examDate:EXAM_DATE},
  timerScores:[],mockScores:[],fcIdx:0,fcCards:[]
};
try{
  const p=JSON.parse(localStorage.getItem(STORE)||'null');
  if(p){
    if(p.stats)Object.assign(S.stats,p.stats);
    if(p.topicStats)S.topicStats=p.topicStats;
    if(p.notepadContent)S.notepadContent=p.notepadContent;
    if(p.questionNum)S.questionNum=p.questionNum;
    if(p.settings)Object.assign(S.settings,p.settings);
    if(p.timerScores)S.timerScores=p.timerScores;
    if(p.mockScores)S.mockScores=p.mockScores;
  }
}catch(e){}

function save(){
  try{localStorage.setItem(STORE,JSON.stringify({stats:S.stats,topicStats:S.topicStats,notepadContent:S.notepadContent,questionNum:S.questionNum,settings:S.settings,timerScores:S.timerScores,mockScores:S.mockScores}));}catch(e){}
}
function rollDay(){
  const t=todayStr();
  if(S.stats.dailyDate!==t){S.stats.dailyCount=0;S.stats.dailyDate=t;}
  if(S.stats.lastStudyDate){
    const y=new Date();y.setDate(y.getDate()-1);
    if(S.stats.lastStudyDate!==t&&S.stats.lastStudyDate!==y.toDateString())S.stats.dayStreak=0;
  }
}
function recordStudy(){
  rollDay();
  const t=todayStr();
  if(S.stats.lastStudyDate!==t){S.stats.dayStreak=(S.stats.dayStreak||0)+1;S.stats.lastStudyDate=t;}
}

let toastTimer;
function toast(msg){
  const el=$('toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}

// ---------------- Navigation ----------------
const PANELS=['practice','topics','worksheets','flashcards','mock','timer','guide','essays','notepad','progress','resources','shop','settings'];
const SITE_TITLE='Free Higher English Revision — Scotland';
function showPanel(id,{focus=false}={}){
  if(!PANELS.includes(id))id='practice';
  document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!=='panel-'+id);
  document.querySelectorAll('[data-nav]').forEach(a=>{
    if(a.dataset.nav===id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  const panel=$('panel-'+id);
  $('page-title').textContent=panel.dataset.title;
  document.title=id==='practice'?SITE_TITLE:panel.dataset.title+' — Higher English Revision Scotland';
  S.panel=id;
  closeSheet();
  if(id==='progress')renderProg();
  if(id==='topics')renderTopics();
  if(id==='worksheets')closeWS();
  if(id==='notepad')$('notepad-text').value=S.notepadContent;
  if(id==='essays')renderEssays();
  if(id==='mock'&&!mock.active&&!mock.marking)renderMockHome();
  if(focus)window.scrollTo(0,0);
}
function route(){showPanel((location.hash||'#practice').slice(1),{focus:true});}
window.addEventListener('hashchange',route);
function go(id){if(location.hash==='#'+id)route();else location.hash=id;}

function openSheet(){$('more-sheet').hidden=false;$('sheet-backdrop').hidden=false;$('more-btn').setAttribute('aria-expanded','true');}
function closeSheet(){$('more-sheet').hidden=true;$('sheet-backdrop').hidden=true;$('more-btn').setAttribute('aria-expanded','false');}
$('more-btn').addEventListener('click',()=>$('more-sheet').hidden?openSheet():closeSheet());
$('sheet-backdrop').addEventListener('click',closeSheet);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});

// ---------------- Topic pickers ----------------
const AREA_KEYS=Object.keys(AREAS);
const topicKeys=area=>Object.keys(TOPICS).filter(k=>!area||TOPICS[k].area===area);
function fillTopicSelect(sel,{smart=true}={}){
  const top=document.createElement('optgroup');top.label='Whole course';
  top.append(new Option('Random mix — whole course','random'));
  if(smart)top.append(new Option('Smart Mix — focuses on your weakest topics','smart'));
  sel.append(top);
  AREA_KEYS.forEach(a=>{
    const g=document.createElement('optgroup');g.label=AREAS[a].name;
    g.append(new Option('All of '+AREAS[a].short,'area_'+a));
    topicKeys(a).forEach(k=>g.append(new Option(TOPICS[k].name,k)));
    sel.append(g);
  });
}

// ---------------- Question selection ----------------
function typeFilter(type){return type==='all'?()=>true:type==='quiz'?q=>qType(q)==='mc':type==='calc'?q=>qType(q)==='num':q=>qType(q)==='written';}
function weightedPick(keys){
  const w=keys.map(k=>{const ts=S.topicStats[k];if(!ts||ts.total<3)return 2;return 0.5+3*(1-ts.correct/ts.total);});
  let r=Math.random()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<keys.length;i++){r-=w[i];if(r<=0)return keys[i];}
  return keys[keys.length-1];
}
function pickTopic(t,filter=()=>true){
  const has=k=>TOPICS[k].questions.some(filter);
  let keys;
  if(t==='random'||t==='smart')keys=topicKeys();
  else if(t.startsWith('area_'))keys=topicKeys(t.slice(5));
  else if(TOPICS[t])return t;
  else keys=topicKeys();
  let pool=keys.filter(has);if(!pool.length)pool=topicKeys().filter(has);if(!pool.length)pool=keys;
  return t==='smart'?weightedPick(pool):pool[Math.floor(Math.random()*pool.length)];
}
function pickQuestion(topic,filter){
  const all=TOPICS[topic].questions;
  let pool=all.filter(filter);if(!pool.length)pool=all;
  const fresh=pool.filter(q=>!S.recent.includes(q.q));
  if(fresh.length)pool=fresh;
  const q=pool[Math.floor(Math.random()*pool.length)];
  S.recent.push(q.q);if(S.recent.length>20)S.recent.shift();
  return q;
}
function shuffled(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// ---------------- Answer marking (calculations) ----------------
// '|' separates accepted alternatives.
function norm(s){
  return String(s).toLowerCase().replace(/[−–—‐]/g,'-').replace(/\s+/g,'').replace(/,(?=\d{3}(?!\d))/g,'').replace(/\.$/,'');
}
const isNum=s=>/^-?(\d+\.?\d*|\.\d+)$/.test(s);
// "£6,500", "-£1500", "30%", "1.5:1", "10 times" → plain number
function unitless(s){
  let t=s.replace(/^(-?)£/,'$1').replace(/^\((\d+\.?\d*)\)$/,'-$1').replace(/(%|:1|times|x|pounds?)$/,'').replace(/^£/,'');
  if(/^-?\d+(\.\d+)?k$/.test(t))t=String(parseFloat(t)*1000);
  return isNum(t)?t:s;
}
function partEq(u,c){
  if(u===c)return true;
  const un=unitless(u),cn=unitless(c);
  if(un===cn)return true;
  if(!isNum(cn)||!isNum(un))return false;
  const dp=(cn.split('.')[1]||'').length;
  const tol=dp>0?0.5*Math.pow(10,-dp)+1e-9:1e-9;
  return Math.abs(parseFloat(cn)-parseFloat(un))<=tol;
}
function match(user,correct){
  const u=norm(user);if(!u)return false;
  return String(correct).split('|').some(alt=>partEq(u,norm(alt)));
}
const showAns=a=>{const s=String(a).split('|')[0];return esc(/^-?\d/.test(s)&&!/[:%]/.test(s)?(s.startsWith('-')?'−':'')+Number(s.replace('-','')).toLocaleString('en-GB'):s);};

// ---------------- Shared renderers ----------------
function optsHTML(q,name){
  // first option in the data is the correct one; shuffle for display
  const order=shuffled(q.o.map((_,i)=>i));
  return order.map(i=>`<button type="button" class="opt" data-i="${i}" ${name?`data-name="${name}"`:''}><span class="opt-txt">${esc(q.o[i])}</span></button>`).join('');
}
function pointsHTML(q,id){
  return `<div class="points" id="${id}">
    <div class="points-head"><b>Marking points</b> <span class="muted small">Tick each point your answer makes clearly. Max ${q.m} mark${q.m>1?'s':''}.</span></div>
    ${q.p.map((p,i)=>`<label class="point"><input type="checkbox" data-pt="${i}"><span>${esc(p)}</span></label>`).join('')}
    <div class="points-total muted small">Your mark: <b data-total>0</b> / ${q.m}</div>
  </div>`;
}
function wirePoints(box,max,onChange){
  const upd=()=>{const n=Math.min(max,box.querySelectorAll('input[type=checkbox]:checked').length);box.querySelector('[data-total]').textContent=n;if(onChange)onChange(n);return n;};
  box.addEventListener('change',upd);return upd;
}

// ---------------- Practice ----------------
function setTags(q,topic){
  $('q-topic-label').textContent=TOPICS[topic].name;
  $('q-num').textContent=S.questionNum;
  const lv=$('q-level');lv.textContent=LEVEL_NAMES[q.l]||'Medium';lv.className='tag tag-lvl-'+(q.l||1);
  const ty=qType(q),badge=$('type-badge');
  badge.textContent=ty==='written'?`Exam-style · ${q.m} mark${q.m>1?'s':''}`:TYPE_NAMES[ty];
  badge.className='tag '+(ty==='written'?'tag-given':ty==='num'?'tag-calc':'');
}
function newQuestion(){
  const f=x=>(S.currentDiff==='mixed'||x.l===+S.currentDiff)&&typeFilter(S.currentType)(x);
  const topic=pickTopic(S.currentTopic,f);
  const q=pickQuestion(topic,f);
  const ty=qType(q);
  S.currentQ={...q,topic,type:ty};S.answered=false;
  $('q-text').textContent=q.q;$('q-text').classList.toggle('q-long',q.q.length>200);
  setTags(q,topic);
  $('feedback-area').innerHTML='';
  const opts=$('q-opts'),inp=$('q-input'),wr=$('q-written'),tip=$('cmd-tip');
  opts.hidden=ty!=='mc';inp.hidden=ty!=='num';wr.hidden=ty!=='written';
  tip.hidden=ty!=='written';tip.textContent=ty==='written'?cmdTip(q.q):'';
  if(ty==='mc'){opts.innerHTML=optsHTML(q);}
  else opts.innerHTML='';
  inp.value='';inp.disabled=false;wr.value='';wr.disabled=false;
  $('check-btn').hidden=ty==='mc';
  $('check-btn').textContent=ty==='written'?'Show marking points':'Check answer';
  $('hint-btn').hidden=!q.h;$('skip-btn').hidden=false;
  if(S.panel==='practice'){if(ty==='num')inp.focus({preventScroll:true});}
}
function recordResult(ok,topic){
  recordStudy();
  S.stats.answered++;S.stats.dailyCount++;
  const ts=S.topicStats[topic]||(S.topicStats[topic]={correct:0,total:0});
  ts.total++;
  if(ok){S.stats.correct++;ts.correct++;S.stats.streak++;if(S.stats.streak>S.stats.bestStreak)S.stats.bestStreak=S.stats.streak;}
  else S.stats.streak=0;
  S.questionNum++;save();updateHeader();
  if(ok&&S.stats.dailyCount===(S.settings.goal||10))toast('Daily goal reached — nice work');
  else if(ok&&S.stats.streak>0&&S.stats.streak%5===0)toast(S.stats.streak+' correct in a row');
}
const nextBtn='<button class="btn btn-primary" id="next-btn">Next question<svg class="ico"><use href="#i-arrow"/></svg></button>';
function finishFeedback(html){
  $('feedback-area').innerHTML=html;
  $('next-btn').addEventListener('click',newQuestion);
  $('next-btn').focus({preventScroll:true});
}
function markObjective(ok,given){
  const q=S.currentQ;
  $('check-btn').hidden=true;$('hint-btn').hidden=true;$('skip-btn').hidden=true;
  recordResult(ok,q.topic);
  const run=ok&&S.stats.streak>=3?` <span class="muted">· ${S.stats.streak} in a row</span>`:'';
  const answer=q.type==='mc'?esc(q.o[0]):showAns(q.a);
  finishFeedback(ok
    ?`<div class="fb fb-ok"><div class="fb-head"><svg class="ico"><use href="#i-check"/></svg>Correct${run}</div><div class="fb-exp"><b>Why:</b> ${esc(q.e)}</div>${nextBtn}</div>`
    :`<div class="fb fb-no"><div class="fb-head"><svg class="ico"><use href="#i-x"/></svg>Not quite</div>${given?`You answered <span class="ans">${esc(given)}</span>. `:''}The answer is <span class="ans">${answer}</span>.<div class="fb-exp"><b>Why:</b> ${esc(q.e)}</div>${nextBtn}</div>`);
}
function checkAnswer(){
  const q=S.currentQ;if(!q||S.answered)return;
  if(q.type==='num'){
    const raw=$('q-input').value.trim();if(!raw){$('q-input').focus();return;}
    S.answered=true;$('q-input').disabled=true;markObjective(match(raw,q.a),raw);
  }else if(q.type==='written'){
    S.answered=true;$('q-written').disabled=true;
    $('check-btn').hidden=true;$('hint-btn').hidden=true;$('skip-btn').hidden=true;
    $('feedback-area').innerHTML=`<div class="fb fb-hint">${pointsHTML(q,'q-points')}
      <div class="btn-row"><button class="btn btn-primary" id="save-mark">Save my mark</button></div></div>`;
    const box=$('q-points');const upd=wirePoints(box,q.m);
    $('save-mark').addEventListener('click',()=>{
      const n=upd();box.querySelectorAll('input').forEach(i=>i.disabled=true);
      S.stats.writtenMarks=(S.stats.writtenMarks||0)+n;S.stats.writtenMax=(S.stats.writtenMax||0)+q.m;
      const ok=n>=Math.ceil(q.m/2);recordResult(ok,q.topic);
      $('save-mark').replaceWith(Object.assign(document.createElement('span'),{className:'muted',textContent:`Saved: ${n}/${q.m}. `+(ok?'Good answer.':'Compare your answer with the points above, then try a similar question.')}));
      const wrap=document.createElement('div');wrap.innerHTML=nextBtn;$('feedback-area').firstElementChild.append(wrap.firstElementChild);
      $('next-btn').addEventListener('click',newQuestion);$('next-btn').focus({preventScroll:true});
    });
  }
}
$('q-opts').addEventListener('click',e=>{
  const b=e.target.closest('.opt');const q=S.currentQ;if(!b||!q||S.answered||q.type!=='mc')return;
  S.answered=true;const i=+b.dataset.i,ok=i===0;
  $('q-opts').querySelectorAll('.opt').forEach(o=>{o.disabled=true;if(+o.dataset.i===0)o.classList.add('correct');});
  if(!ok)b.classList.add('wrong');
  markObjective(ok,ok?'':q.o[i]);
});
function skipQuestion(){if(S.answered)return;S.stats.streak=0;updateHeader();save();newQuestion();}
function getHint(){
  if(!S.currentQ||S.answered||!S.currentQ.h)return;
  $('feedback-area').innerHTML=`<div class="fb fb-hint"><div class="fb-head"><svg class="ico"><use href="#i-bulb"/></svg>Hint</div>${esc(S.currentQ.h)}</div>`;
}
function daysToExam(){
  const d=S.settings.examDate;if(!d)return null;
  const ex=new Date(d+'T00:00:00'),now=new Date();now.setHours(0,0,0,0);
  return Math.round((ex-now)/864e5);
}
function updateGreeting(){
  const n=S.settings.name,d=daysToExam();
  let txt=n?`Hi ${n} — let's get some practice in.`:'';
  if(d!==null&&d>=0){
    const dt=new Date(S.settings.examDate+'T09:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'});
    txt+=(txt?' ':'')+(d===0?'Your Higher English exam is today. Good luck!':`${d} day${d===1?'':'s'} until your Higher English exam (${dt}).`);
  }
  $('greeting').textContent=txt;
}
function updateHeader(){
  rollDay();
  const g=S.settings.goal||10,dc=S.stats.dailyCount||0,pct=Math.min(100,dc/g*100);
  $('hdr-days').textContent=S.stats.dayStreak||0;
  $('hdr-daily').textContent=dc;$('hdr-goal').textContent=g;
  $('goal-ring').setAttribute('stroke-dasharray',pct+' 100');
  document.querySelector('.chip-goal').classList.toggle('done',dc>=g);
  $('daily-count').textContent=dc;$('daily-goal-lbl').textContent=g;
  $('goal-fill').style.width=pct+'%';
  $('run-streak').textContent=S.stats.streak;$('best-streak').textContent=S.stats.bestStreak;
}
function setTopic(k){S.currentTopic=k;$('topic-select').value=k;newQuestion();}

$('answer-form').addEventListener('submit',e=>{e.preventDefault();checkAnswer();});
$('hint-btn').addEventListener('click',getHint);
$('skip-btn').addEventListener('click',skipQuestion);
$('topic-select').addEventListener('change',e=>setTopic(e.target.value));
function segHandler(id,attr,fn){
  $(id).addEventListener('click',e=>{
    const b=e.target.closest(`[data-${attr}]`);if(!b)return;
    $(id).querySelectorAll(`[data-${attr}]`).forEach(x=>x.setAttribute('aria-checked',x===b));
    fn(b.dataset[attr]);
  });
}
segHandler('diff-seg','diff',v=>{S.currentDiff=v;newQuestion();});
segHandler('type-seg','type',v=>{S.currentType=v;newQuestion();});
document.addEventListener('keydown',e=>{
  if(S.panel!=='practice'||e.target.closest('input,select,textarea'))return;
  const q=S.currentQ;
  if(e.key==='Enter'&&S.answered&&$('next-btn')&&document.activeElement?.id!=='next-btn'){e.preventDefault();newQuestion();return;}
  if(q&&q.type==='mc'&&!S.answered&&/^[1-4]$/.test(e.key)){const b=$('q-opts').querySelectorAll('.opt')[+e.key-1];if(b)b.click();}
});

// ---------------- Topics ----------------
function accClass(pct,total){return !total?'':pct<50?'acc-low':pct<75?'acc-mid':'acc-high';}
function countTypes(t){const c={mc:0,num:0,written:0};t.questions.forEach(q=>c[qType(q)]++);return c;}
function renderTopics(){
  const g=$('topic-grid');g.innerHTML='';
  AREA_KEYS.forEach(a=>{
    const sec=document.createElement('div');sec.className='topic-section';
    sec.innerHTML=`<h2 class="section-title">${esc(AREAS[a].name)}</h2><div class="topic-grid"></div>`;
    const grid=sec.lastElementChild;
    topicKeys(a).forEach(k=>{
      const t=TOPICS[k],ts=S.topicStats[k]||{correct:0,total:0},c=countTypes(t);
      const pct=ts.total?Math.round(ts.correct/ts.total*100):0;
      const b=document.createElement('button');b.className='tile '+accClass(pct,ts.total);
      b.innerHTML=`<div class="tile-top"><span class="glyph">${esc(GLYPH[k]||'•')}</span><span class="tag">${t.questions.length} Qs</span></div>
        <h3>${esc(t.name)}</h3>
        <div class="tile-meta">${ts.total?`${pct}% correct · ${ts.total} answered`:`${c.mc} quiz${c.written?` · ${c.written} exam-style`:''}`}</div>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>`;
      b.addEventListener('click',()=>{setTopic(k);go('practice');});
      grid.append(b);
    });
    g.append(sec);
  });
}

// ---------------- Worksheets ----------------
const DIFF_TAG={Mixed:'tag-topic',Exam:'tag-given'};
function renderWS(){
  const el=$('sheet-list');el.innerHTML='';
  const filt=$('ws-area').value;
  WORKSHEETS.forEach((ws,i)=>{
    const t=TOPICS[ws.topic];
    if(filt!=='all'&&t.area!==filt)return;
    const b=document.createElement('button');b.className='tile';
    b.innerHTML=`<div class="tile-top"><span class="glyph">${esc(GLYPH[ws.topic]||'•')}</span><span class="tag ${DIFF_TAG[ws.diff]}">${ws.kind==='exam'?'Exam-style':'Quick quiz'}</span></div>
      <h3>${esc(t.name)}</h3><div class="tile-meta">${ws.qs.length} questions · ${esc(AREAS[t.area].short)}</div>`;
    b.addEventListener('click',()=>openWS(i));el.append(b);
  });
}
function openWS(idx){
  const ws=WORKSHEETS[idx],t=TOPICS[ws.topic];
  const qs=ws.qs.map(i=>t.questions[i]).filter(Boolean);
  $('ws-list').hidden=true;
  const av=$('ws-active');av.hidden=false;
  const exam=ws.kind==='exam';
  av.innerHTML=`<div class="card">
    <div class="ws-head">
      <div><h2 class="card-title" style="margin-bottom:6px">${esc(ws.title)}</h2>
        <span class="tag ${DIFF_TAG[ws.diff]}">${exam?'Exam-style — write your answers, then mark them':'Quick quiz'}</span></div>
      <button class="btn btn-ghost btn-sm" data-ws-back><svg class="ico"><use href="#i-back"/></svg>All worksheets</button>
    </div>
    <form id="ws-form" autocomplete="off">
    ${qs.map((q,i)=>{const ty=qType(q);return `<div class="ws-q" data-q="${i}"><p><span class="num">${i+1}</span>${esc(q.q)}${ty==='written'?` <span class="tag tag-given">${q.m} marks</span>`:''}</p>
      ${ty==='mc'?`<div class="opts opts-sm" id="wsq${i}">${optsHTML(q,'ws'+i)}</div>`
       :ty==='num'?`<label class="sr-only" for="wsq${i}">Answer to question ${i+1}</label><input class="input" type="text" id="wsq${i}" placeholder="Your answer" spellcheck="false" autocapitalize="off">`
       :`<p class="cmd-tip">${esc(cmdTip(q.q))}</p><label class="sr-only" for="wsq${i}">Answer to question ${i+1}</label><textarea class="input written-area" id="wsq${i}" rows="5" placeholder="Write your answer…"></textarea>`}
      <div class="ws-fb" id="wsfb${i}"></div></div>`;}).join('')}
    <div class="btn-row" style="margin-top:16px">
      <button type="submit" class="btn btn-primary">${exam?'Show marking points':'Check all answers'}</button>
      <button type="button" class="btn btn-ghost" data-ws-reset>Clear</button>
      <span class="ws-score" id="ws-score"></span>
    </div></form></div>`;
  const form=$('ws-form');const picked={};let checked=false;
  form.querySelectorAll('.opts').forEach(box=>box.addEventListener('click',e=>{
    const b=e.target.closest('.opt');if(!b||checked)return;
    box.querySelectorAll('.opt').forEach(o=>o.classList.toggle('picked',o===b));
    picked[box.id]=+b.dataset.i;
  }));
  const writtenTotals={};
  const totalWritten=()=>{const got=Object.values(writtenTotals).reduce((a,b)=>a+b,0),max=qs.filter(q=>qType(q)==='written').reduce((a,q)=>a+q.m,0);$('ws-score').textContent=`Your mark: ${got} / ${max}`;};
  form.addEventListener('submit',e=>{
    e.preventDefault();if(checked)return;checked=true;
    let n=0,auto=0;
    qs.forEach((q,i)=>{
      const ty=qType(q),fb=$('wsfb'+i);
      if(ty==='mc'){
        auto++;const box=$('wsq'+i),p=picked['wsq'+i];
        box.querySelectorAll('.opt').forEach(o=>{o.disabled=true;if(+o.dataset.i===0)o.classList.add('correct');else if(+o.dataset.i===p)o.classList.add('wrong');});
        if(p===0){n++;fb.innerHTML=`<span class="ok">Correct.</span> <span class="muted">${esc(q.e)}</span>`;}
        else fb.innerHTML=`<span class="no">${p===undefined?'Not answered. ':''}Answer: ${esc(q.o[0])}</span> <span class="muted">— ${esc(q.e)}</span>`;
      }else if(ty==='num'){
        auto++;const user=$('wsq'+i).value.trim();$('wsq'+i).disabled=true;
        const ok=user&&match(user,q.a);if(ok)n++;
        fb.innerHTML=ok?`<span class="ok">Correct.</span> <span class="muted">${esc(q.e)}</span>`:`<span class="no">${user?'':'Not answered. '}Answer: ${showAns(q.a)}</span> <span class="muted">— ${esc(q.e)}</span>`;
      }else{
        $('wsq'+i).readOnly=true;
        fb.innerHTML=pointsHTML(q,'wsp'+i);
        writtenTotals[i]=0;
        wirePoints($('wsp'+i),q.m,v=>{writtenTotals[i]=v;totalWritten();});
      }
    });
    if(auto)$('ws-score').textContent=`${n} / ${auto} correct`;
    else totalWritten();
    recordStudy();save();updateHeader();
  });
  av.querySelector('[data-ws-back]').addEventListener('click',closeWS);
  av.querySelector('[data-ws-reset]').addEventListener('click',()=>openWS(idx));
  window.scrollTo(0,0);
}
function closeWS(){$('ws-list').hidden=false;$('ws-active').hidden=true;$('ws-active').innerHTML='';}
$('ws-area').addEventListener('change',renderWS);

// ---------------- Flashcards ----------------
function loadFC(){S.fcCards=[...(FLASHCARDS[$('fc-topic').value]||FLASHCARDS.all)];S.fcIdx=0;showFC();}
function showFC(){
  const c=S.fcCards[S.fcIdx];if(!c)return;
  $('flashcard').classList.remove('flipped');
  $('fc-term').textContent=c.term;$('fc-term-back').textContent=c.term;$('fc-def').textContent=c.def;
  $('fc-idx').textContent=S.fcIdx+1;$('fc-tot').textContent=S.fcCards.length;
}
function flipCard(){$('flashcard').classList.toggle('flipped');}
function stepFC(d){S.fcIdx=(S.fcIdx+d+S.fcCards.length)%S.fcCards.length;showFC();}
function shuffleFC(){S.fcCards=shuffled(S.fcCards);S.fcIdx=0;showFC();toast('Deck shuffled');}
$('fc-topic').addEventListener('change',loadFC);
$('flashcard').addEventListener('click',flipCard);
$('fc-prev').addEventListener('click',()=>stepFC(-1));
$('fc-next').addEventListener('click',()=>stepFC(1));
$('fc-shuffle').addEventListener('click',shuffleFC);
document.addEventListener('keydown',e=>{
  if(S.panel!=='flashcards'||e.target.closest('input,select,textarea'))return;
  if(e.key==='ArrowRight')stepFC(1);else if(e.key==='ArrowLeft')stepFC(-1);
  else if(e.key===' '&&e.target.id!=='flashcard'){e.preventDefault();flipCard();}
});

// ---------------- Timed challenge ----------------
const timer={interval:null,left:0,secs:0,score:0,topic:'random',q:null,token:0,locked:false};
const timerFilter=q=>qType(q)!=='written';
function startTimer(secs){
  timer.topic=$('timer-topic').value;timer.secs=secs;timer.left=secs;timer.score=0;
  $('timer-setup').hidden=true;$('timer-result').hidden=true;$('timer-game').hidden=false;
  $('timer-score-lbl').textContent='0';
  const d=$('timer-display');d.textContent=secs;d.classList.remove('urgent');
  newTimerQ();
  clearInterval(timer.interval);
  timer.interval=setInterval(()=>{
    timer.left--;d.textContent=timer.left;
    if(timer.left<=10)d.classList.add('urgent');
    if(timer.left<=0)endTimer();
  },1000);
}
function newTimerQ(){
  timer.token++;timer.locked=false;
  const t=pickTopic(timer.topic,timerFilter);
  timer.q=pickQuestion(t,timerFilter);
  $('timer-q').textContent=timer.q.q;
  const mc=qType(timer.q)==='mc',inp=$('timer-input');
  $('timer-opts').hidden=!mc;inp.hidden=mc;$('timer-submit').hidden=mc;
  $('timer-opts').innerHTML=mc?optsHTML(timer.q):'';
  inp.value='';inp.disabled=false;if(!mc)inp.focus({preventScroll:true});
}
function timerResult(ok){
  const fb=$('timer-fb');
  if(ok){timer.score++;$('timer-score-lbl').textContent=timer.score;fb.innerHTML='<span class="ok">Correct</span>';newTimerQ();}
  else{
    timer.locked=true;$('timer-input').disabled=true;
    fb.innerHTML=`<span class="no">Answer: ${qType(timer.q)==='mc'?esc(timer.q.o[0]):showAns(timer.q.a)}</span>`;
    const tk=timer.token;setTimeout(()=>{if(tk===timer.token&&timer.interval)newTimerQ();},1600);
  }
}
function checkTimerAnswer(){
  const raw=$('timer-input').value.trim();
  if(!raw||!timer.q||timer.locked||qType(timer.q)!=='num')return;
  timerResult(match(raw,timer.q.a));
}
$('timer-opts').addEventListener('click',e=>{
  const b=e.target.closest('.opt');if(!b||timer.locked||!timer.interval)return;
  const ok=+b.dataset.i===0;
  $('timer-opts').querySelectorAll('.opt').forEach(o=>{o.disabled=true;if(+o.dataset.i===0)o.classList.add('correct');});
  if(!ok)b.classList.add('wrong');
  timerResult(ok);
});
function endTimer(){
  clearInterval(timer.interval);timer.interval=null;timer.token++;
  $('timer-game').hidden=true;$('timer-result').hidden=false;$('timer-fb').textContent='';
  $('timer-final').textContent=timer.score+' correct';
  const best=S.timerScores.filter(s=>s.secs===timer.secs).reduce((m,s)=>Math.max(m,s.score),0);
  const mins=timer.secs/60;
  $('timer-msg').textContent=timer.score>best?`New personal best for the ${mins}-minute challenge.`:
    `Your best for ${mins} minute${mins>1?'s':''} is ${best}. `+(timer.score>=best*0.8?'Close!':'Keep practising.');
  S.timerScores.push({score:timer.score,secs:timer.secs,date:new Date().toLocaleDateString('en-GB')});
  if(S.timerScores.length>30)S.timerScores=S.timerScores.slice(-30);
  if(timer.score)recordStudy();
  save();updateHeader();
}
function resetTimer(){clearInterval(timer.interval);timer.interval=null;timer.token++;$('timer-setup').hidden=false;$('timer-game').hidden=true;$('timer-result').hidden=true;}
document.querySelectorAll('#timer-setup [data-secs]').forEach(b=>b.addEventListener('click',()=>startTimer(+b.dataset.secs)));
$('timer-form').addEventListener('submit',e=>{e.preventDefault();checkTimerAnswer();});
$('timer-skip').addEventListener('click',()=>{if(!timer.locked){$('timer-fb').textContent='';newTimerQ();}});
$('timer-stop').addEventListener('click',endTimer);
$('timer-again').addEventListener('click',resetTimer);

// ---------------- Mock exams ----------------
// Answer every question, then mark your own paper against the marking points.
const mock={active:false,marking:false,paper:null,questions:[],idx:0,answers:[],marks:[],left:0,interval:null};
const fmtTime=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(sec).padStart(2,'0');};
function caseHTML(c){
  if(c.passages){
    return `${c.note?`<p class="muted small">${esc(c.note)}</p>`:''}${c.passages.map(ps=>`<div class="passage"><h3 class="case-name">${esc(ps.title)}</h3>${ps.intro?`<p class="muted"><em>${esc(ps.intro)}</em></p>`:''}
      ${ps.paras.map((p,i)=>`<p class="para"><span class="para-num" aria-label="Paragraph ${i+1}">${i+1}</span>${esc(p)}</p>`).join('')}</div>`).join('')}`;
  }
  return `<h3 class="case-name">${esc(c.name)}</h3>${c.text.map(p=>`<p>${esc(p)}</p>`).join('')}`;
}
// Knowledge tests: a fresh set of quick-quiz questions each attempt. Easy 1 mark, Medium 2, Hard 3.
function buildQuizPaper(p){
  const keys=Object.keys(TOPICS).filter(k=>p.areas.includes(TOPICS[k].area));
  const pools=keys.map(k=>shuffled(TOPICS[k].questions.filter(q=>q.o).map(q=>({...q,topic:TOPICS[k].name}))));
  const out=[];let i=0;
  while(out.length<p.count&&pools.some(x=>x.length)){const pl=pools[i%pools.length];if(pl.length)out.push(pl.pop());i++;}
  return shuffled(out).map((q,j)=>({...q,n:String(j+1),s:1,m:q.l||1}));
}
const paperTotal=()=>mock.questions.reduce((a,q)=>a+q.m,0);
function renderMockHome(){
  const el=$('mock-papers');el.innerHTML='';
  Object.entries(MOCK_PAPERS).forEach(([n,p])=>{
    const quiz=p.kind==='quiz';
    const d=document.createElement('div');d.className='tile paper';
    d.innerHTML=`<div class="tile-top"><span class="glyph">${quiz?'Q':'M'}${n}</span><span class="tag ${quiz?'tag-topic':'tag-given'}">${quiz?'Auto-marked':'Self-marked'}</span></div>
      <h3>${esc(p.title)}</h3>
      <div class="paper-facts">${quiz?`<span class="tag">${p.count} questions</span><span class="tag">fresh set each time</span>`:`<span class="tag">${p.questions.length} questions</span><span class="tag">${p.totalMarks} marks</span>`}<span class="tag">${p.duration/60} min</span></div>
      <button class="btn btn-primary">${quiz?'Start test':'Start paper'}</button>`;
    d.querySelector('button').addEventListener('click',()=>startMock(n));
    el.append(d);
  });
  const prev=$('mock-prev-scores');
  if(S.mockScores.length){prev.hidden=false;prev.innerHTML='<h2 class="card-title">Recent attempts</h2>'+mockHistoryHTML(5);}
  else prev.hidden=true;
}
function mockHistoryHTML(n){
  if(!S.mockScores.length)return '<p class="empty">No mock tests yet. Try one from the Mock tests page.</p>';
  return [...S.mockScores].slice(-n).reverse().map(s=>`<div class="list-row">
    <span class="rank">${esc(s.grade==='No Award'?'–':s.grade)}</span>
    <span class="grow">${esc((MOCK_PAPERS[s.paper]&&MOCK_PAPERS[s.paper].short)||'Paper '+s.paper)} · ${s.score}/${s.total} (${s.pct}%)</span>
    <span class="muted small">${esc(s.date)}</span></div>`).join('');
}
function showMockScreen(which){['mock-home','mock-exam','mock-mark','mock-results'].forEach(id=>$(id).hidden=id!==which);window.scrollTo(0,0);}
function startMock(n){
  const p=MOCK_PAPERS[n],quiz=p.kind==='quiz';
  const qs=quiz?buildQuizPaper(p):p.questions;
  Object.assign(mock,{active:true,marking:false,paper:n,kind:quiz?'quiz':'ruae',questions:qs,idx:0,answers:new Array(qs.length).fill(''),marks:new Array(qs.length).fill(0),left:p.duration});
  mock.total=paperTotal();
  showMockScreen('mock-exam');
  $('mock-paper-title').textContent=p.title;
  $('mock-case').innerHTML=quiz?'':caseHTML(p.case);
  $('mock-case-wrap').hidden=quiz;
  const clock=$('mock-timer-display');clock.textContent=fmtTime(mock.left);clock.classList.remove('low');
  clearInterval(mock.interval);mock.interval=setInterval(mockTick,1000);
  renderMockNav();showMockQ();
}
function mockTick(){
  mock.left--;
  const clock=$('mock-timer-display');clock.textContent=fmtTime(Math.max(0,mock.left));
  if(mock.left<=600)clock.classList.add('low');
  if(mock.left<=0){toast(mock.kind==='quiz'?"Time's up":"Time's up — now mark your paper");finishMock();}
}
function renderMockNav(){
  $('mock-nav').innerHTML=mock.questions.map((q,i)=>`<button type="button" class="qnav ${i===mock.idx?'current':''} ${mock.answers[i].trim()?'done':''}" data-i="${i}" aria-label="Question ${q.n}">${esc(q.n)}</button>`).join('');
}
function storeMockAnswer(){if(mock.active&&!mock.questions[mock.idx].o)mock.answers[mock.idx]=$('mock-answer').value;}
function showMockQ(){
  const q=mock.questions[mock.idx],total=mock.questions.length,quiz=mock.kind==='quiz';
  $('mock-q-counter').textContent=quiz?`Question ${mock.idx+1} of ${total}`:`Question ${mock.idx+1} of ${total} · ${q.s===2?'Question on both passages':'Passage 1'}`;
  $('mock-topic-label').textContent=q.topic;
  $('mock-marks-label').textContent=q.m+(q.m===1?' mark':' marks');
  $('mock-q-text').textContent=quiz?q.q:`${q.n}.  ${q.q}`;
  const tip=quiz?'':cmdTip(q.q);$('mock-cmd-tip').textContent=tip;$('mock-cmd-tip').hidden=!tip;
  $('mock-sec2-note').hidden=quiz||q.s!==2;
  const a=$('mock-answer'),opts=$('mock-opts');
  if(q.o){
    a.hidden=true;opts.hidden=false;
    opts.innerHTML=optsHTML(q);
    const cur=mock.answers[mock.idx];
    if(cur!=='')opts.querySelectorAll('.opt').forEach(o=>o.classList.toggle('picked',o.dataset.i===cur));
  }else{a.hidden=false;opts.hidden=true;opts.innerHTML='';a.value=mock.answers[mock.idx];}
  $('mock-prev').disabled=mock.idx===0;
  $('mock-next').textContent=mock.idx===total-1?(quiz?'Finish test':'Finish and mark'):'Next question';
  $('mock-prog-bar').style.width=(mock.answers.filter(x=>x.trim()).length/total*100)+'%';
  renderMockNav();
}
function moveMock(d){
  storeMockAnswer();
  const ni=mock.idx+d;
  if(ni>=mock.questions.length){if(confirm(mock.kind==='quiz'?'Finish the test?':'Finish the paper and mark your answers?'))finishMock();return;}
  if(ni<0)return;
  mock.idx=ni;showMockQ();window.scrollTo(0,0);
}
function finishMock(){
  if(!mock.active)return;
  storeMockAnswer();
  clearInterval(mock.interval);mock.interval=null;mock.active=false;
  // auto-mark quick-quiz questions
  mock.questions.forEach((q,i)=>{if(q.o)mock.marks[i]=mock.answers[i]==='0'?q.m:0;});
  if(mock.kind==='quiz'){showMockResults();return;}
  mock.marking=true;
  showMockScreen('mock-mark');
  $('mark-list').innerHTML=mock.questions.map((q,i)=>`<div class="mark-item card">
    <div class="q-meta"><span class="tag tag-topic">Q${esc(q.n)}</span><span class="tag">${esc(q.topic)}</span><span class="tag tag-given">${q.m} mark${q.m>1?'s':''}</span></div>
    <div class="mark-q">${esc(q.q)}</div>
    <div class="mark-ans"><div class="field-label">Your answer</div>${mock.answers[i].trim()?`<div class="ans-text">${esc(mock.answers[i])}</div>`:'<div class="muted">No answer — 0 marks.</div>'}</div>
    ${mock.answers[i].trim()?pointsHTML(q,'mp'+i):''}
  </div>`).join('');
  mock.questions.forEach((q,i)=>{const box=$('mp'+i);if(box)wirePoints(box,q.m,v=>{mock.marks[i]=v;updateMarkTotal();});});
  updateMarkTotal();
}
function updateMarkTotal(){$('mark-running').textContent=mock.marks.reduce((a,b)=>a+b,0);$('mark-total').textContent=mock.total;}
function showMockResults(){
  mock.marking=false;
  showMockScreen('mock-results');$('mock-review-section').hidden=true;
  const p=MOCK_PAPERS[mock.paper],total=mock.total,score=mock.marks.reduce((a,b)=>a+b,0),pct=Math.round(score/total*100);
  let grade,msg;
  if(pct>=70){grade='A';msg="That's A-grade standard. Excellent work.";}
  else if(pct>=60){grade='B';msg='A solid B. Look at the marking points you missed to push for an A.';}
  else if(pct>=50){grade='C';msg='A pass at C. Target your weakest topics to move up a grade.';}
  else if(pct>=40){grade='D';msg='Close to a pass. Use Smart Mix and the quizzes on the topics you found hardest.';}
  else{grade='No Award';msg='Not there yet — that is what practice is for. Review the marking points, then try again.';}
  $('mock-grade-icon').textContent=grade==='No Award'?'–':grade;
  $('mock-grade-title').textContent=grade==='No Award'?'Keep practising':'Grade '+grade;
  $('mock-score-display').textContent=`${score} / ${total}`;
  $('mock-grade-band').textContent=`${pct}% · ${p.title}`;
  $('mock-grade-msg').textContent=msg;
  if(p.sections){
    $('mock-section-split').textContent=p.sections.map(sec=>`${sec.label}: ${mock.questions.reduce((a,q,i)=>a+(q.s===sec.s?mock.marks[i]:0),0)} / ${sec.max}`).join(' · ');
  }else{
    const right=mock.questions.filter((q,i)=>mock.marks[i]>0).length;
    $('mock-section-split').textContent=`${right} of ${mock.questions.length} questions correct`;
  }
  S.mockScores.push({paper:mock.paper,score,total,pct,grade,date:new Date().toLocaleDateString('en-GB')});
  if(S.mockScores.length>50)S.mockScores=S.mockScores.slice(-50);
  recordStudy();save();updateHeader();
}
function showMockReview(){
  const sec=$('mock-review-section');sec.hidden=false;
  $('mock-review-list').innerHTML=mock.questions.map((q,i)=>{
    const ok=mock.marks[i]>=Math.ceil(q.m/2);
    if(q.o){
      const a=mock.answers[i];
      return `<div class="review-item ${mock.marks[i]?'ok':'no'}">
      <div class="meta">Q${esc(q.n)} · ${esc(q.topic)} · ${mock.marks[i]}/${q.m}</div>
      <div class="q">${esc(q.q)}</div>
      <div class="exp">${a===''?'Not answered. ':(a==='0'?'':`You chose: ${esc(q.o[+a])}. `)}<b>Answer:</b> ${esc(q.o[0])} — ${esc(q.e)}</div></div>`;
    }
    return `<div class="review-item ${ok?'ok':'no'}">
      <div class="meta">Q${esc(q.n)} · ${esc(q.topic)} · ${mock.marks[i]}/${q.m}</div>
      <div class="q">${esc(q.q)}</div>
      <div class="exp"><b>Marking points:</b> ${q.p.map(esc).join(' · ')}</div></div>`;
  }).join('');
  sec.scrollIntoView({behavior:'smooth'});
}
function resetMock(){
  clearInterval(mock.interval);mock.interval=null;mock.active=false;mock.marking=false;
  showMockScreen('mock-home');renderMockHome();
}
$('mock-prev').addEventListener('click',()=>moveMock(-1));
$('mock-next').addEventListener('click',()=>moveMock(1));
$('mock-nav').addEventListener('click',e=>{const b=e.target.closest('.qnav');if(!b)return;storeMockAnswer();mock.idx=+b.dataset.i;showMockQ();});
$('mock-opts').addEventListener('click',e=>{
  const b=e.target.closest('.opt');if(!b||!mock.active)return;
  mock.answers[mock.idx]=b.dataset.i;
  $('mock-opts').querySelectorAll('.opt').forEach(o=>o.classList.toggle('picked',o===b));
  const nb=$('mock-nav').querySelector(`[data-i="${mock.idx}"]`);if(nb)nb.classList.add('done');
  $('mock-prog-bar').style.width=(mock.answers.filter(x=>x.trim()).length/mock.questions.length*100)+'%';
});
$('mock-answer').addEventListener('input',()=>{storeMockAnswer();const b=$('mock-nav').querySelector(`[data-i="${mock.idx}"]`);if(b)b.classList.toggle('done',!!mock.answers[mock.idx].trim());});
$('mock-end').addEventListener('click',()=>{if(confirm(mock.kind==='quiz'?'Finish the test now?':'Finish the paper now and mark your answers?'))finishMock();});
$('mark-done').addEventListener('click',showMockResults);
$('mock-review-btn').addEventListener('click',showMockReview);
$('mock-back').addEventListener('click',resetMock);
window.addEventListener('beforeunload',e=>{if(mock.active||mock.marking){e.preventDefault();e.returnValue='';}});

// ---------------- Progress ----------------
function renderProg(){
  rollDay();
  const st=S.stats,acc=st.answered?Math.round(st.correct/st.answered*100)+'%':'–';
  const wr=st.writtenMax?Math.round(st.writtenMarks/st.writtenMax*100)+'%':'–';
  const d=daysToExam();
  $('stats-grid').innerHTML=[
    [st.answered,'Questions answered'],[acc,'Accuracy'],[wr,'Exam-style marks'],[st.dayStreak||0,'Day streak'],
    [st.bestStreak,'Best run in a row'],[S.mockScores.length,'Mock tests taken'],[d!==null&&d>=0?d:'–','Days to exam']
  ].map(([n,l])=>`<div class="stat"><div class="stat-num">${n}</div><div class="stat-lbl">${l}</div></div>`).join('');
  const rows=Object.entries(TOPICS).map(([k,t])=>{const ts=S.topicStats[k]||{correct:0,total:0};return {k,t,ts,pct:ts.total?Math.round(ts.correct/ts.total*100):null};});
  rows.sort((a,b)=>(a.pct===null)-(b.pct===null)||(a.pct??0)-(b.pct??0));
  const list=$('topic-prog');list.innerHTML='';
  rows.forEach(({k,t,ts,pct})=>{
    const r=document.createElement('div');r.className='prog-row '+accClass(pct??0,ts.total);
    r.innerHTML=`<div class="name">${esc(t.name)}<small>${esc(AREAS[t.area].short)} · ${ts.total?`${ts.correct}/${ts.total} correct · ${pct}%`:'Not started'}</small></div>
      <div class="bar"><div class="bar-fill" style="width:${pct??0}%"></div></div>
      <button class="btn btn-ghost">Practise</button>`;
    r.querySelector('button').addEventListener('click',()=>{setTopic(k);go('practice');});
    list.append(r);
  });
  const lb=$('leaderboard');
  if(S.timerScores.length){
    lb.innerHTML=[...S.timerScores].sort((a,b)=>b.score-a.score).slice(0,5).map((s,i)=>`<div class="list-row">
      <span class="rank ${i===0?'r1':''}">${i+1}</span><span class="grow">${s.secs/60}-minute challenge</span>
      <b>${s.score}</b><span class="muted small">${esc(s.date)}</span></div>`).join('');
  }else lb.innerHTML='<p class="empty">No scores yet — try the Timed challenge.</p>';
  $('mock-history').innerHTML=mockHistoryHTML(8);
}
function resetProg(){
  if(!confirm('Reset all progress? This cannot be undone.'))return;
  S.stats={answered:0,correct:0,streak:0,bestStreak:0,dailyCount:0,dailyDate:todayStr(),dayStreak:0,lastStudyDate:'',writtenMarks:0,writtenMax:0};
  S.topicStats={};S.questionNum=1;S.timerScores=[];S.mockScores=[];
  save();renderProg();updateHeader();toast('Progress reset');
}
$('reset-prog').addEventListener('click',resetProg);

// ---------------- Essay planner ----------------
function fillEssayFilter(){const sel=$('essay-filter');ESSAY_GENRES.forEach(([k,l])=>sel.append(new Option(l+(k==='all'?'':' ('+ESSAYS.filter(e=>e.genre===k).length+')'),k)));}
const GENRE_NAMES=Object.fromEntries(ESSAY_GENRES);
function renderEssays(){
  const f=$('essay-filter').value||'all',list=$('essay-list');
  const items=ESSAYS.filter(e=>f==='all'||e.genre===f);
  list.innerHTML=items.map(e=>`<div class="card essay-card">
    <div class="q-meta"><span class="tag tag-topic">${esc(GENRE_NAMES[e.genre]||e.genre)}</span><span class="tag">${esc(e.text)}</span></div>
    <p class="essay-q">${esc(e.q)}</p>
    <details class="howto essay-plan"><summary>Show a plan</summary><ul>${e.plan.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></details>
  </div>`).join('')||'<p class="empty">No plans for this filter yet.</p>';
}
$('essay-filter').addEventListener('change',renderEssays);

// ---------------- Notepad ----------------
let noteTimer;
$('notepad-text').addEventListener('input',e=>{
  S.notepadContent=e.target.value;$('note-status').textContent='Saving…';
  clearTimeout(noteTimer);noteTimer=setTimeout(()=>{save();$('note-status').textContent='Saved on this device';},400);
});
$('note-clear').addEventListener('click',()=>{if(confirm('Clear all notes?')){$('notepad-text').value='';S.notepadContent='';save();}});
$('note-copy').addEventListener('click',()=>{
  const txt=$('notepad-text').value;
  (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Notes copied'),()=>{$('notepad-text').select();toast('Press Ctrl+C to copy');});
});
$('note-download').addEventListener('click',()=>{
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([$('notepad-text').value],{type:'text/plain'}));
  a.download='higher-english-notes.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});

// ---------------- Shop ----------------
const TAG='cazza09-21';
const SHOP=[
  ['Revision guides & practice papers',[
    ['Higher English revision guide','Course notes on RUAE, critical reading and the portfolio','higher+english+revision+guide+sqa'],
    ['Higher English practice papers','Exam-style RUAE and Critical Reading papers with answers','higher+english+practice+papers+sqa'],
    ['How to Pass Higher English','Exam technique for every part of the course','how+to+pass+higher+english'],
    ['Higher English past papers','Official past papers with marking instructions','higher+english+past+papers'],
  ]],
  ['Scottish set texts — drama & prose',[
    ['The Slab Boys — John Byrne','The play text','the+slab+boys+john+byrne'],
    ['Men Should Weep — Ena Lamont Stewart','The play text','men+should+weep+ena+lamont+stewart'],
    ['Sequamur — Donald S Murray','The play text (also free to Scottish schools via ASL)','sequamur+donald+s+murray'],
    ['Dr Jekyll and Mr Hyde — R L Stevenson','The novella','strange+case+of+dr+jekyll+and+mr+hyde+stevenson'],
    ['The Sunlight Pilgrims — Jenni Fagan','The novel','the+sunlight+pilgrims+jenni+fagan'],
    ['Iain Crichton Smith short stories','Collected stories including The Red Door','iain+crichton+smith+short+stories'],
  ]],
  ['Scottish set texts — poetry & study guides',[
    ['Carol Ann Duffy — Selected Poems','Includes the set Duffy poems','carol+ann+duffy+selected+poems'],
    ['Norman MacCaig — poems','Collected or selected poems','norman+maccaig+poems'],
    ['Liz Lochhead — poems','Includes Box Room and other set poems','liz+lochhead+poems'],
    ['Don Paterson — poems','Collections including Landing Light','don+paterson+poems'],
    ['Imtiaz Dharker — poems','Collections including the set poems','imtiaz+dharker+poems'],
    ['Kathleen Jamie — poems','Selected poems','kathleen+jamie+poems'],
    ['Scottish set text study guides','Study guides for your chosen text','higher+english+scottish+set+text+study+guide'],
  ]],
  ['Stationery',[
    ['Revision flashcards','Make cards for quotations and techniques','revision+flashcards+blank+cards'],
    ['Highlighters and pens','Annotate your set text','highlighter+pens+set+revision'],
    ['Sticky index tabs','Mark key quotations in your text','sticky+index+tabs'],
    ['A4 lined refill pad','For timed essays and RUAE practice','a4+lined+refill+pad'],
  ]],
];
function renderShop(){
  $('shop-sections').innerHTML=SHOP.map(([title,items])=>`<div class="shop-section"><h2 class="section-title">${title}</h2><div class="grid-cards">
    ${items.map(([n,d,q])=>`<a class="tile shop-card" href="https://www.amazon.co.uk/s?k=${q}&tag=${TAG}" target="_blank" rel="noopener sponsored"><h3>${esc(n)}</h3><small>${esc(d)}</small><span class="cta">View on Amazon<svg class="ico"><use href="#i-external"/></svg></span></a>`).join('')}
  </div></div>`).join('');
}

// ---------------- Settings ----------------
function setSeg(id,attr,val){$(id).querySelectorAll(`[data-${attr}]`).forEach(b=>b.setAttribute('aria-checked',b.dataset[attr]===String(val)));}
function applySettings(){
  const st=S.settings,root=document.documentElement;
  if(st.mode==='light'||st.mode==='dark')root.dataset.theme=st.mode;else delete root.dataset.theme;
  if(st.accent&&st.accent!=='saltire')root.dataset.accent=st.accent;else delete root.dataset.accent;
  setSeg('goal-seg','goal',st.goal||10);setSeg('mode-seg','mode',st.mode||'system');setSeg('accent-seg','accent',st.accent||'saltire');
  $('student-name').value=st.name||'';
  $('exam-date').value=st.examDate||'';
  updateGreeting();
  const meta=document.querySelector('meta[name="theme-color"]');
  meta.content=getComputedStyle(root).getPropertyValue('--bg').trim()||'#0065bd';
  updateHeader();
}
$('student-name').addEventListener('input',e=>{S.settings.name=e.target.value.trim();save();updateGreeting();});
$('exam-date').addEventListener('change',e=>{S.settings.examDate=e.target.value;save();updateGreeting();});
$('goal-seg').addEventListener('click',e=>{const b=e.target.closest('[data-goal]');if(!b)return;S.settings.goal=+b.dataset.goal;save();applySettings();});
$('mode-seg').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;S.settings.mode=b.dataset.mode;save();applySettings();});
$('accent-seg').addEventListener('click',e=>{const b=e.target.closest('[data-accent]');if(!b)return;S.settings.accent=b.dataset.accent;save();applySettings();});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',applySettings);

// ---------------- PWA ----------------
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
let deferredPrompt=null;
const DISMISS_KEY='heng_install_dismissed';
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;
  let dismissed=false;try{dismissed=localStorage.getItem(DISMISS_KEY)==='1';}catch(_){}
  if(!dismissed)setTimeout(()=>{$('install-banner').hidden=false;},30000);
});
$('install-btn').addEventListener('click',()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();deferredPrompt.userChoice.finally(()=>{deferredPrompt=null;$('install-banner').hidden=true;});
});
$('dismiss-install').addEventListener('click',()=>{$('install-banner').hidden=true;try{localStorage.setItem(DISMISS_KEY,'1');}catch(_){}});
(function(){
  const ua=navigator.userAgent;
  const iOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
  let dismissed=false;try{dismissed=localStorage.getItem(DISMISS_KEY)==='1';}catch(_){}
  if(!iOS||standalone||dismissed)return;
  $('install-text').hidden=true;$('ios-text').hidden=false;
  $('install-btn').hidden=true;$('dismiss-install').textContent='Got it';
  setTimeout(()=>{$('install-banner').hidden=false;},20000);
})();

// ---------------- Init ----------------
fillTopicSelect($('topic-select'));
fillTopicSelect($('timer-topic'),{smart:false});
(function(){const ws=$('ws-area');AREA_KEYS.forEach(a=>ws.append(new Option(AREAS[a].name,a)));
  const fc=$('fc-topic');FC_DECKS.forEach(([k,l])=>fc.append(new Option(l+' ('+FLASHCARDS[k].length+')',k)));})();
fillEssayFilter();renderWS();renderShop();loadFC();
rollDay();applySettings();save();
newQuestion();
route();
