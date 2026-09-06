(() => {
  'use strict';
  const app = document.getElementById('app');
  const toastElement = document.getElementById('toast');
  const KEY = 'whsm-course-v1';
  let toastTimer;
  let storageWarningShown = false;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const integer = value => typeof value === 'number' && Number.isInteger(value);
  const href = (day, card = 0) => `#day=${day}&card=${card}`;
  const readStorage = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  function notify(message) {
    clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.hidden = false;
    toastTimer = setTimeout(() => { toastElement.hidden = true; }, 4500);
  }
  try {
    const days = window.WH_DAYS;
    if (!days || Array.from({length:30}, (_, i) => i + 1).some(n => !days[n] || !Array.isArray(days[n].cards) || !days[n].cards.length)) {
      throw new Error('DAYデータの読み込みに失敗しました。');
    }
    for (let n = 1; n <= 30; n++) {
      if (typeof days[n].title !== 'string' || days[n].cards.some(c => !Array.isArray(c) || c.length !== 6 || c.some(v => typeof v !== 'string'))) {
        throw new Error(`DAY${n}のデータ形式を確認してください。`);
      }
    }
    const totalCards = Object.values(days).reduce((sum, d) => sum + d.cards.length, 0);
    const validDay = n => integer(n) && n >= 1 && n <= 30;
    const validCard = (n, c, allowSummary = true) => validDay(n) && integer(c) && c >= 0 && c < days[n].cards.length + (allowSummary ? 1 : 0);
    const fresh = () => ({version:1, last:null, positions:{}, viewed:{}, done:[], bookmarks:[], font:'normal'});
    function normalize(raw) {
      const clean = fresh();
      if (!raw || typeof raw !== 'object' || raw.version !== 1) return clean;
      for (let n = 1; n <= 30; n++) {
        const p = raw.positions && raw.positions[n];
        if (validCard(n, p)) clean.positions[n] = p;
        const seen = raw.viewed && raw.viewed[n];
        if (Array.isArray(seen)) clean.viewed[n] = [...new Set(seen.filter(c => validCard(n, c, false)))].sort((a, b) => a - b);
      }
      if (raw.last && validCard(raw.last.day, raw.last.card)) clean.last = {day:raw.last.day, card:raw.last.card};
      if (Array.isArray(raw.done)) clean.done = [...new Set(raw.done.filter(validDay))].sort((a, b) => a - b);
      if (Array.isArray(raw.bookmarks)) {
        clean.bookmarks = [...new Set(raw.bookmarks.filter(value => {
          if (typeof value !== 'string' || !/^\d{1,2}:\d{1,3}$/.test(value)) return false;
          const [n, c] = value.split(':').map(Number);
          return validCard(n, c, false);
        }).map(value => value.split(':').map(Number).join(':')))];
      }
      if (raw.font === 'large') clean.font = 'large';
      return clean;
    }
    function load() {
      const saved = readStorage(KEY);
      if (saved) {
        try { return normalize(JSON.parse(saved)); } catch (_) { return fresh(); }
      }
      const clean = fresh();
      // The earlier hosted DAY27 prototype used the same 12 cards + summary order.
      const oldCard = readStorage('whsm-day27-card');
      if (oldCard !== null && validCard(27, Number(oldCard))) {
        clean.last = {day:27, card:Number(oldCard)};
        clean.positions[27] = Number(oldCard);
        if (readStorage('whsm-completed-days') === '1') clean.done = [27];
      }
      return clean;
    }
    let state = load();
    let current = {type:'home'};
    let range = 'all';
    let query = '';
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (_) {
        if (!storageWarningShown) {
          storageWarningShown = true;
          notify('このブラウザでは進捗を保存できません。学習は続けられます。');
        }
      }
    }
    function fontSize() { document.documentElement.style.setProperty('--reading', state.font === 'large' ? '21px' : '18px'); }
    function readCount() { return Object.values(state.viewed).reduce((sum, a) => sum + a.length, 0); }
    function masthead() {
      return `<header class="masthead"><div class="shell"><a class="brand" href="#home">WORLD HISTORY<span>SPEED MASTER</span></a><div class="mast-actions"><span class="badge">30 DAYS · 要点整理版</span><a class="small-link" href="#review">あとで復習 ${state.bookmarks.length ? `(${state.bookmarks.length})` : ''}</a></div></div></header>`;
    }
    function sourceNote(n) {
      return `<aside class="source-note"><p>参照：ユーザー提供『世界史スピマ 2.pdf』DAY${n} ／ PDF ${2*n-1}–${2*n}ページ（紙面 ${4*n+2}–${4*n+3}ページ）。</p><p>Summaryの構成に沿った学習用の要点整理です。全語句を転載・網羅したものではありません。元のページ画像やPDFは公開していません。</p></aside>`;
    }
    function about() {
      return `<details class="about"><summary>このサイトと学習記録について</summary><p>ユーザー提供『世界史スピマ 2.pdf』のDAY1〜30、PDF 1〜60ページを参照し、内容を学習用の言葉で整理した非公式の学習メモです。教材の原文・ページ画像の公開ではなく、全語句の網羅を保証するものでもありません。確認問題は各カードの内容から作成しています。</p><p>DAY番号と主要な節の順序を保っています。小項目は読みやすい長さにまとめ直しています。教材にない最新情報で書き換えず、DAY30も教材が扱う歴史の範囲で整理しています。</p><p>学習記録は、このサイトを開いたブラウザの端末内に保存します。サーバーへの送信や、別端末との自動同期はありません。プライベートブラウズやブラウザデータの削除で記録が失われる場合があるため、下のバックアップ機能を使えます。</p><p><a href="day27.html">以前のDAY27試作版を開く</a>（試作版の学習記録は別形式です）</p></details><section class="settings"><h2 class="sr-only">学習記録の管理</h2><div class="settings-actions"><button class="button" type="button" data-action="export">記録を保存</button><button class="button" type="button" data-action="import">記録を読み込む</button><button class="button danger" type="button" data-action="reset">記録をリセット</button></div><p class="quiet">「記録を保存」でバックアップ用JSONファイルを作成します。別端末では同じサイトで「記録を読み込む」を使います。</p></section><footer class="site-footer">WORLD HISTORY SPEED MASTER · DAY 01–30 · 要点整理版</footer>`;
    }
    function renderHome() {
      current = {type:'home'};
      document.title = '世界史を、次へ進むだけで。｜World History Speed Master';
      const resume = state.last;
      const url = resume ? href(resume.day, resume.card) : href(1);
      const resumeText = resume ? `DAY ${resume.day} · ${resume.card === days[resume.day].cards.length ? 'まとめ' : `${resume.card + 1}枚目から`}` : 'まずはDAY1から。どのDAYからでも始められます。';
      app.innerHTML = `${masthead()}<main id="main" class="shell"><section class="hero"><p class="eyebrow">一つのカードから、歴史をつなぐ。</p><h1 id="page-title" tabindex="-1">世界史を、<br>次へ進むだけで。</h1><p class="lead">古代から現代まで、DAY1〜30をボタンで読み進める。${totalCards}枚の解説・確認問題と、30枚のDAYまとめ。</p><div class="hero-actions"><a class="button primary" id="resume" href="${escape(url)}">${resume ? '続きから読む' : 'DAY1から読む'} →</a><span class="quiet">${escape(resumeText)}</span></div></section><section class="stats" aria-label="学習の進捗"><div class="stat-line"><span><strong>${state.done.length}</strong> / 30 DAY 完了</span><span><strong>${readCount()}</strong> / ${totalCards} カードを表示済み</span><span>保存先：このブラウザ</span></div><div class="track" role="progressbar" aria-label="完了したDAY" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${state.done.length}"><i style="width:${state.done.length / 30 * 100}%"></i></div>${state.done.length === 30 ? '<p class="quiet">全30DAYを一周しました。「あとで復習」や目次から、もう一度確かめたいところへ。</p>' : ''}</section><section aria-labelledby="all-days-title"><div class="section-head"><h2 id="all-days-title">DAYを選ぶ</h2><span class="quiet" id="results-count" aria-live="polite"></span></div><div class="tools"><label class="search-label"><span class="sr-only">DAY・用語で検索</span><input id="search" type="search" placeholder="DAY・用語で探す（例：ロカルノ）" autocomplete="off" value="${escape(query)}"></label><div class="filters" aria-label="DAYの範囲">${[['all','すべて'],['1','01–10'],['11','11–20'],['21','21–30']].map(([value,label]) => `<button class="filter" type="button" data-action="filter" data-range="${value}" aria-pressed="${range===value}">${label}</button>`).join('')}</div></div><div class="day-grid" id="day-grid"></div></section>${about()}</main>`;
      renderGrid();
    }
    const searchable = text => String(text).normalize('NFKC').toLowerCase().replace(/\s+/g, '');
    function renderGrid() {
      const container = document.getElementById('day-grid');
      if (!container) return;
      const needle = searchable(query);
      const items = [];
      for (let n = 1; n <= 30; n++) {
        if (range !== 'all' && (n < Number(range) || n >= Number(range) + 10)) continue;
        const day = days[n];
        const titleMatch = searchable(`DAY${n} ${day.title}`).includes(needle);
        const found = needle ? day.cards.findIndex(card => searchable(card.join(' ')).includes(needle)) : -1;
        if (needle && !titleMatch && found < 0) continue;
        const c = needle && !titleMatch && found >= 0 ? found : (state.done.includes(n) ? 0 : state.positions[n] || 0);
        const viewed = (state.viewed[n] || []).length;
        const done = state.done.includes(n);
        items.push(`<a class="day-tile" data-day="${n}" href="${escape(href(n,c))}"><div class="tile-top"><span class="day-number">DAY ${String(n).padStart(2,'0')}</span><span class="tile-status ${done?'complete':''}">${done?'✓ 完了':viewed?'学習中':'未読'}</span></div><h3>${escape(day.title)}</h3>${needle && !titleMatch && found >= 0 ? `<p class="match">該当：${escape(day.cards[found][1])}</p>` : ''}<div class="tile-bottom"><span>${day.cards.length}枚 ＋ まとめ</span><span>${done?'もう一度読む':viewed?`${viewed}/${day.cards.length}枚 表示済み`:'学習を始める'} →</span></div><div class="track" aria-hidden="true"><i style="width:${viewed/day.cards.length*100}%"></i></div></a>`);
      }
      container.innerHTML = items.join('') || '<p class="empty">該当するDAYがありません。用語を短くするか、範囲を「すべて」にしてください。</p>';
      document.getElementById('results-count').textContent = `${items.length} / 30 DAY`;
      document.querySelectorAll('[data-action="filter"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.range === range)));
    }
    function renderReview() {
      current = {type:'review'};
      document.title = 'あとで復習｜World History Speed Master';
      const list = [...state.bookmarks].sort((a,b) => {
        const [ad,ac] = a.split(':').map(Number), [bd,bc] = b.split(':').map(Number);
        return ad-bd || ac-bc;
      });
      app.innerHTML = `${masthead()}<main id="main" class="shell"><section class="hero"><p class="eyebrow">REVIEW</p><h1 id="page-title" tabindex="-1">あとで復習。</h1><p class="lead">カードの「あとで復習」で保存した項目です。何度読み返しても、DAYの完了記録はそのまま残ります。</p><a class="button" href="#home">← DAY一覧へ</a></section><ul class="review-list">${list.map(key => {
        const [n,c] = key.split(':').map(Number), card=days[n].cards[c];
        return `<li class="review-item"><div><a href="${escape(href(n,c))}"><small>DAY ${n} · ${escape(card[0])}</small>${escape(card[1])}</a><p>${escape(card[2])}</p></div><button type="button" data-action="remove" data-key="${escape(key)}" aria-label="${escape(card[1])}を復習リストから外す">外す</button></li>`;
      }).join('') || '<li class="empty">まだ保存した項目はありません。解説カード右上の「あとで復習」を押すと、ここに並びます。</li>'}</ul>${about()}</main>`;
    }
    function renderLesson(n, c, record = true) {
      const day = days[n], len = day.cards.length, summary = c === len;
      current = {type:'lesson', day:n, card:c};
      if (record) {
        state.last = {day:n,card:c};
        state.positions[n] = c;
        if (!summary) state.viewed[n] = [...new Set([...(state.viewed[n] || []), c])].sort((a,b)=>a-b);
        save();
      }
      const item = summary ? null : day.cards[c];
      const marked = state.bookmarks.includes(`${n}:${c}`);
      document.title = `DAY${n} ${summary?'まとめ':item[1]}｜World History Speed Master`;
      const notice = n === 30 ? '<aside class="history-notice">教材に収録された時点までの歴史を整理しています。現在の政権・情勢の説明ではありません。</aside>' : '';
      let lesson;
      if (summary) {
        lesson = `<article class="lesson"><div class="lesson-top"><p class="eyebrow">DAY ${n} · SUMMARY</p><span class="badge">${state.done.includes(n)?'✓ 完了済み':'振り返り'}</span></div><h1 id="lesson-title" tabindex="-1">DAY ${n} のまとめ</h1><div class="takeaway"><span class="take-label">振り返るテーマ</span>${escape(day.title)}</div><p class="quiet">見直したい見出しを押すと、そのカードへ戻れます。画面下のボタンで、このDAYを完了として記録します。</p><ol class="summary-list">${day.cards.map((card,i) => `<li><a href="${escape(href(n,i))}">${escape(card[1])}</a><p>${escape(card[2])}</p></li>`).join('')}</ol></article>`;
      } else {
        lesson = `<article class="lesson"><div class="lesson-top"><p class="eyebrow">${escape(item[0])}</p><button class="bookmark" type="button" data-action="bookmark" aria-pressed="${marked}">${marked?'★ 復習に保存済み':'☆ あとで復習'}</button></div><h1 id="lesson-title" tabindex="-1">${escape(item[1])}</h1><div class="takeaway"><span class="take-label">ここを押さえる</span>${escape(item[2])}</div><div class="prose">${item[3].split('\n\n').map(p=>`<p>${escape(p)}</p>`).join('')}</div><details class="quiz"><summary><span class="quiz-label">確認問題</span>${escape(item[4])}<span class="quiz-hint">タップして答えを見る ＋</span></summary><div class="answer"><strong>答え</strong>${escape(item[5])}</div></details></article>`;
      }
      const nextLabel = summary ? (n===30?'DAY30を完了して一覧へ →':`DAY${n}を完了して次へ →`) : c===len-1?'DAYのまとめへ →':'次へ進む →';
      const previousLabel = c===0 && n>1 ? `← DAY${n-1}` : '← 前へ';
      app.innerHTML = `<header class="reader-head"><div class="reader-head-inner"><a class="home-link" href="#home">← DAY一覧</a><span class="counter">DAY ${n} · ${summary?'まとめ':`${c+1}枚目`} / ${len+1}枚</span></div></header><main id="main" class="reader"><div class="track" role="progressbar" aria-label="DAY内の表示位置" aria-valuemin="1" aria-valuemax="${len+1}" aria-valuenow="${c+1}"><i style="width:${(c+1)/(len+1)*100}%"></i></div><div class="reader-tools"><details class="toc"><summary>このDAYの目次</summary><ol class="toc-list">${day.cards.map((card,i)=>`<li><a href="${escape(href(n,i))}"${i===c?' aria-current="page"':''}>${String(i+1).padStart(2,'0')} · ${escape(card[1])}</a></li>`).join('')}<li><a href="${escape(href(n,len))}"${summary?' aria-current="page"':''}>まとめ・DAYを完了する</a></li></ol></details><button class="font-button" type="button" data-action="font" aria-label="文字を${state.font==='large'?'標準サイズに戻す':'大きくする'}" aria-pressed="${state.font==='large'}">${state.font==='large'?'文字 標準へ':'文字 大きく'}</button></div>${notice}${lesson}${sourceNote(n)}</main><nav class="reader-nav" aria-label="学習カードを移動"><div class="reader-nav-inner"><button id="previous" type="button" data-action="previous"${n===1&&c===0?' disabled':''}>${previousLabel}</button><button id="next" type="button" class="next ${summary?'final-next':''}" data-action="next">${nextLabel}</button></div></nav>`;
    }
    function go(n,c) {
      const target = href(n,c);
      if (location.hash === target) { renderLesson(n,c); afterRoute(); }
      else location.hash = target;
    }
    function previous() {
      if (current.type !== 'lesson') return;
      const {day:n,card:c} = current;
      if (c>0) go(n,c-1);
      else if (n>1) go(n-1,days[n-1].cards.length);
    }
    function next() {
      if (current.type !== 'lesson') return;
      const {day:n,card:c} = current;
      if (c<days[n].cards.length) go(n,c+1);
      else {
        state.done = [...new Set([...state.done,n])].sort((a,b)=>a-b);
        save();
        if (n<30) go(n+1,0);
        else { location.hash = '#home'; notify('DAY30を完了として記録しました。'); }
      }
    }
    function afterRoute() {
      fontSize();
      window.scrollTo(0,0);
      const title = document.getElementById('lesson-title') || document.getElementById('page-title');
      if (title) title.focus({preventScroll:true});
    }
    function route(record = true) {
      const hash = location.hash.slice(1);
      if (hash === 'review') renderReview();
      else if (/^day=\d{1,2}&card=\d{1,3}$/.test(hash)) {
        const params = new URLSearchParams(hash);
        const n = Number(params.get('day')), c = Number(params.get('card'));
        if (validCard(n,c)) renderLesson(n,c,record); else renderHome();
      } else renderHome();
      afterRoute();
    }
    function exportProgress() {
      const payload = {app:'world-history-speed-master',version:1,exportedAt:new Date().toISOString(),progress:state};
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json;charset=utf-8'});
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url;
      a.download = `world-history-progress-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      notify('学習記録のバックアップを作成しました。');
    }
    const fileInput = document.getElementById('progress-file');
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      try {
        if (file.size>1024*1024) throw new Error('ファイルが大きすぎます。学習記録のJSONを選んでください。');
        const payload = JSON.parse(await file.text());
        if (!payload || payload.app!=='world-history-speed-master' || payload.version!==1 || !payload.progress || payload.progress.version!==1) throw new Error('このサイトの学習記録ファイルではありません。');
        const incoming = normalize(payload.progress);
        if (!window.confirm(`現在の記録を読み込んだ記録で置き換えます。\n完了 ${incoming.done.length} DAY / 復習 ${incoming.bookmarks.length} 件\nよろしいですか？`)) return;
        state=incoming; save();
        if (location.hash==='#home') route(false); else location.hash='#home';
        notify('学習記録を読み込みました。');
      } catch (error) { notify(error instanceof SyntaxError ? 'JSONファイルを読み取れませんでした。' : error.message); }
    });
    app.addEventListener('input', event => { if (event.target.id==='search') {query=event.target.value;renderGrid();} });
    app.addEventListener('click', event => {
      const button=event.target.closest('button[data-action]');
      if (!button || button.disabled) return;
      switch(button.dataset.action) {
        case 'previous': previous(); break;
        case 'next': next(); break;
        case 'font': {
          state.font=state.font==='large'?'normal':'large'; save();fontSize();
          button.textContent=state.font==='large'?'文字 標準へ':'文字 大きく';
          button.setAttribute('aria-pressed',String(state.font==='large'));
          button.setAttribute('aria-label',state.font==='large'?'文字を標準サイズに戻す':'文字を大きくする');
          break;
        }
        case 'bookmark': {
          if (current.type!=='lesson' || current.card===days[current.day].cards.length) break;
          const key=`${current.day}:${current.card}`, exists=state.bookmarks.includes(key);
          state.bookmarks=exists?state.bookmarks.filter(k=>k!==key):[...state.bookmarks,key];save();
          button.setAttribute('aria-pressed',String(!exists));button.textContent=exists?'☆ あとで復習':'★ 復習に保存済み';
          notify(exists?'復習リストから外しました。':'「あとで復習」に保存しました。');break;
        }
        case 'remove': state.bookmarks=state.bookmarks.filter(k=>k!==button.dataset.key);save();renderReview();break;
        case 'filter': range=button.dataset.range;renderGrid();break;
        case 'export': exportProgress();break;
        case 'import': fileInput.click();break;
        case 'reset':
          if(window.confirm('このブラウザの学習位置・完了記録・復習リストをリセットします。先に「記録を保存」でバックアップできます。リセットしますか？')) {
            state=fresh();query='';range='all';save();
            if(location.hash==='#home')route(false);else location.hash='#home';
            notify('学習記録をリセットしました。');
          }
          break;
      }
    });
    document.addEventListener('keydown', event => {
      if (current.type!=='lesson' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key==='ArrowRight') {event.preventDefault();next();}
      if (event.key==='ArrowLeft') {event.preventDefault();previous();}
    });
    window.addEventListener('hashchange',()=>route());
    window.addEventListener('storage',event=>{if(event.key===KEY){state=load();route(false);}});
    route();
    window.WH_READY = true;
  } catch (error) {
    console.error(error);
    app.innerHTML = '<main class="boot"><h1>学習データを読み込めませんでした。</h1><p>通信を確認してページを再読み込みしてください。更新直後の場合は、少し時間を置くと新しいファイルが読み込まれます。</p><p><a href="day27.html">DAY27の試作版を開く</a></p></main>';
  }
})();
