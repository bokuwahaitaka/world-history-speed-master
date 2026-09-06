(() => {
  'use strict';
  const app = document.getElementById('app');
  const KEY = 'whsm-article-v1';
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const days = window.WH_DAYS || {};
  const titles = Array.from({length:30},(_,i)=>days[i+1] && days[i+1].title);
  if (titles.some(v=>!v)) { app.innerHTML='<main class="boot"><h1>読み込みエラー</h1><p>DAYデータを読み込めませんでした。再読み込みしてください。</p></main>'; return; }
  const getState=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
  const state=Object.assign({lastDay:1,font:'normal'},getState());
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
  const setFont=()=>document.documentElement.style.setProperty('--reading',state.font==='large'?'21px':'18px');
  setFont();
  const normalize=s=>String(s).normalize('NFKC').toLowerCase().replace(/\s+/g,'');
  const sectionId=(day,i)=>`d${day}-s${i}`;
  function grouped(day){
    const groups=[];
    for(const card of days[day].cards){
      const [sec,title,take,body]=card;
      let g=groups[groups.length-1];
      if(!g || g.sec!==sec){g={sec,items:[]};groups.push(g)}
      g.items.push({title,take,body});
    }
    return groups;
  }
  function mast(){return `<header class="mast"><div class="wide"><a class="brand" href="#home">WORLD HISTORY <span>SPEED MASTER</span></a><nav><a href="#home">DAY一覧</a><button id="fontBtn" type="button">文字 ${state.font==='large'?'標準':'大'}</button></nav></div></header>`}
  function home(){
    document.title='World History Speed Master｜詳説版';
    const cards=Array.from({length:30},(_,i)=>{const d=i+1;return `<a class="daylink" href="#day=${d}"><b>DAY ${String(d).padStart(2,'0')}</b><span>${esc(days[d].title)}</span></a>`}).join('');
    app.innerHTML=`${mast()}<main class="wide home"><section class="hero"><p class="eyebrow">WORLD HISTORY SPEED MASTER</p><h1>世界史を、<br>文章でつなげて理解する。</h1><p>DAY1〜30を、問題形式ではなく詳しい解説記事として読むためのサイト。各DAYは教材の節順に沿って、長文の解説としてまとめています。</p><a class="start" href="#day=${state.lastDay||1}">▶ 続きから読む</a></section><section><h2>DAYを選ぶ</h2><label class="search"><span>用語検索</span><input id="search" type="search" placeholder="例：ロカルノ、ハンムラビ、冷戦"></label><div id="results" class="daygrid">${cards}</div></section></main>`;
    wireCommon();
    const input=document.getElementById('search');
    input.addEventListener('input',()=>renderSearch(input.value));
  }
  function renderSearch(q){
    const box=document.getElementById('results'); if(!box)return;
    const n=normalize(q);
    if(!n){box.innerHTML=Array.from({length:30},(_,i)=>{const d=i+1;return `<a class="daylink" href="#day=${d}"><b>DAY ${String(d).padStart(2,'0')}</b><span>${esc(days[d].title)}</span></a>`}).join('');return;}
    const hits=[];
    for(let d=1;d<=30;d++){
      const gs=grouped(d); let match=-1;
      for(let i=0;i<gs.length;i++){
        const text=[gs[i].sec,...gs[i].items.flatMap(x=>[x.title,x.take,x.body])].join(' ');
        if(normalize(text).includes(n)){match=i;break}
      }
      if(match>=0 || normalize(days[d].title).includes(n)) hits.push(`<a class="daylink" href="#day=${d}${match>=0?`&section=${match}`:''}"><b>DAY ${String(d).padStart(2,'0')}</b><span>${esc(days[d].title)}</span><small>${match>=0?`該当：${esc(gs[match].sec)}`:'タイトルに一致'}</small></a>`);
    }
    box.innerHTML=hits.join('')||'<p class="empty">該当する用語が見つかりませんでした。</p>';
  }
  function article(day,focusSection=null){
    state.lastDay=day; save(); document.title=`DAY${day}｜${days[day].title}`;
    const gs=grouped(day);
    const toc=gs.map((g,i)=>`<li><a href="#${sectionId(day,i)}">${esc(g.sec)}</a></li>`).join('');
    const sections=gs.map((g,i)=>`<section class="chapter" id="${sectionId(day,i)}"><p class="section-no">${esc(g.sec)}</p>${g.items.map(x=>`<div class="subsection"><h3>${esc(x.title)}</h3>${x.take?`<p class="thesis">${esc(x.take)}</p>`:''}<div class="prose">${formatBody(x.body)}</div></div>`).join('')}</section>`).join('');
    app.innerHTML=`${mast()}<main class="article"><aside class="sidebar"><a class="back" href="#home">← DAY一覧</a><p class="daytag">DAY ${String(day).padStart(2,'0')}</p><h2>${esc(days[day].title)}</h2><details open><summary>このDAYの目次</summary><ol>${toc}</ol></details></aside><article class="paper"><header class="article-head"><p class="eyebrow">DAY ${String(day).padStart(2,'0')}</p><h1>${esc(days[day].title)}</h1><p class="intro">このページは一問一答ではなく、教材の節順に沿って流れを文章で理解するための詳説ページです。</p></header>${sections}<nav class="daynav">${day>1?`<a href="#day=${day-1}">← DAY${day-1}</a>`:'<span></span>'}${day<30?`<a href="#day=${day+1}">DAY${day+1} →</a>`:'<a href="#home">DAY一覧へ →</a>'}</nav></article></main>`;
    wireCommon();
    if(focusSection!==null && gs[focusSection]) requestAnimationFrame(()=>document.getElementById(sectionId(day,focusSection))?.scrollIntoView({block:'start'}));
  }
  function formatBody(body){
    return esc(body).split(/\n\n+/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  }
  function wireCommon(){
    document.getElementById('fontBtn')?.addEventListener('click',()=>{state.font=state.font==='large'?'normal':'large';save();setFont();route()});
  }
  function parse(){
    const h=location.hash.replace(/^#/,''); if(!h||h==='home')return {type:'home'};
    const p=new URLSearchParams(h); const day=Number(p.get('day'));
    if(day>=1&&day<=30)return {type:'day',day,section:p.has('section')?Number(p.get('section')):null};
    return {type:'home'};
  }
  function route(){const r=parse(); if(r.type==='day')article(r.day,r.section); else home(); window.scrollTo(0,0)}
  addEventListener('hashchange',route); route();
})();
