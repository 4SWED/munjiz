/* مُنجز — UI. Data, dates, parsing and sheets live in core.js; every visible string comes from i18n.js. */
(function () {
  'use strict';
  const { store, D, TYPES, PRIORITY, PALETTE, MONTHS, DAYS, icon, esc, toast, sheet, confirmSheet, toICS, saveFile, scheduleReminders, parseQuick } = Munjiz;
  const { t, lang, rtl } = MunjizI18n;
  const $ = (s, r = document) => r.querySelector(s);
  const VERSION = '1.3.0';
  // "forward" in time points left in Arabic, right in English
  const FWD = rtl ? 'arrow-left' : 'arrow-right';

  const now = new Date();
  const ui = {
    tab: sessionStorage.getItem('munjiz.tab') || 'agenda',
    y: now.getFullYear(), m: now.getMonth(), selected: D.todayKey(),
    showDone: false, showLater: false,
  };
  const view = () => store.settings().view || 'month';
  const dismissed = (w) => { try { return localStorage.getItem('munjiz.dismiss.' + w) === '1'; } catch (e) { return false; } };
  const dismiss = (w) => { try { localStorage.setItem('munjiz.dismiss.' + w, '1'); } catch (e) {} };

  // ---------- theme ----------
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const th = store.settings().theme || 'auto';
    const mode = th === 'auto' ? (darkMQ.matches ? 'dark' : 'light') : th;
    document.documentElement.dataset.theme = mode;
    $('#themeColor').content = mode === 'dark' ? '#1A2030' : '#FFFCF5';
    $('#themeBtn').innerHTML = mode === 'dark' ? `${icon('sun', 17)}${t('themeDay')}` : `${icon('moon', 17)}${t('themeNight')}`;
    $('#themeBtn').setAttribute('aria-label', mode === 'dark' ? t('themeToDay') : t('themeToNight'));
  }
  darkMQ.addEventListener('change', applyTheme);

  // ---------- static chrome ----------
  document.title = t('brand');
  $('#brandName').textContent = t('brand');
  $('#menuBtn').innerHTML = icon('menu', 22); $('#menuBtn').setAttribute('aria-label', t('menu'));
  $('#pv').innerHTML = icon(rtl ? 'chev-right' : 'chev-left', 20); $('#pv').setAttribute('aria-label', t('prev'));
  $('#nx').innerHTML = icon(rtl ? 'chev-left' : 'chev-right', 20); $('#nx').setAttribute('aria-label', t('next'));
  $('#addBtn').innerHTML = icon('plus', 28, 'stroke-width="2.4"'); $('#addBtn').setAttribute('aria-label', t('newTask'));
  $('#todayBtn').textContent = t('today');
  $('#vMonth').textContent = t('month'); $('#vWeek').textContent = t('week');
  $('#viewSeg').setAttribute('aria-label', t('viewMode'));
  $('#grid').setAttribute('aria-label', t('daysGrid'));
  $('#tabbar').setAttribute('aria-label', t('nav'));
  $('#agendaPane').setAttribute('aria-label', t('agendaAria'));
  $('#calPane').setAttribute('aria-label', t('calAria'));
  $('#qaAgendaIn').placeholder = t('qaPlaceholder');
  $('label[for=qaAgendaIn]').textContent = t('addTaskSr');
  $('label[for=qaDayIn]').textContent = t('addThisDaySr');
  document.querySelectorAll('.qa .qi').forEach((e) => (e.innerHTML = icon('plus', 20)));
  document.querySelectorAll('.qa [data-more]').forEach((e) => { e.innerHTML = icon('note', 19); e.setAttribute('aria-label', t('details')); });
  document.querySelectorAll('.qa .go').forEach((e) => (e.textContent = t('go')));
  $('#wd').innerHTML = D.weekdayNames(true).map((n) => `<div>${n}</div>`).join('');

  // ---------- task row (shared by every list) ----------
  function rowHTML(x, { showDate = false } = {}) {
    const s = store.subject(x.subject), today = D.todayKey();
    const late = !x.done && x.date < today;
    const when = showDate ? `<span class="${late ? 'late' : 'when'}">${D.relative(x.date)}</span>` : '';
    return `<li class="row p${x.priority || 0} ${x.done ? 'done' : ''} ${x.type === 'exam' ? 'exam' : ''}" data-id="${x.id}">
      <span class="rv rv-done">${icon('check', 18)}${t('swDone')}</span><span class="rv rv-later">${icon('calendar', 17)}${t('swLater')}</span>
      <div class="row-in">
        <button class="ck" data-act="toggle" data-id="${x.id}" aria-pressed="${x.done}" aria-label="${x.done ? t('unmarkDone') : t('markDone')}: ${esc(x.title)}"><i>${icon('check', 14, 'stroke-width="3"')}</i></button>
        <button class="rb" data-act="edit" data-id="${x.id}"><span class="tt">${esc(x.title)}</span>
          <span class="mt">${when}${x.type === 'exam' ? `<span class="ex">${t('exam')}</span>` : ''}${x.time ? `<span>${D.fmtTime(x.time)}</span>` : ''}${x.subject ? `<span class="sd"><i style="background:${s.color}"></i>${esc(s.name)}</span>` : ''}${x.type !== 'exam' && x.type !== 'task' ? `<span>${TYPES[x.type].label}</span>` : ''}${x.series ? icon('repeat', 13) : ''}${x.notes ? icon('note', 13) : ''}</span></button>
        <button class="pf" data-act="prio" data-id="${x.id}" aria-label="${t('prioAria', PRIORITY[x.priority || 0].label)}">${x.priority ? `<span class="stamp">${PRIORITY[x.priority].label}</span>` : icon('flag', 18)}</button>
      </div></li>`;
  }
  const listHTML = (arr, opt) => `<ul class="list">${arr.map((x) => rowHTML(x, opt)).join('')}</ul>`;

  // ---------- render ----------
  function render() {
    const a = document.activeElement;
    const refocus = a && a.dataset && a.dataset.act && !a.closest('dialog') ? `[data-act="${a.dataset.act}"]${a.dataset.id ? `[data-id="${a.dataset.id}"]` : a.dataset.key ? `[data-key="${a.dataset.key}"]` : a.dataset.t ? `[data-t="${a.dataset.t}"]` : ''}` : null;
    applyTheme();
    document.body.dataset.tab = ui.tab;
    renderTabs(); renderAgenda(); renderCal();
    holdHeight();
    $('#recent').innerHTML = store.recentTitles().map((x) => `<option value="${esc(x)}">`).join('');
    if (refocus && !document.querySelector('dialog[open]')) { const el = document.querySelector(refocus); if (el) el.focus({ preventScroll: true }); }
  }

  // Tapping between days (or ticking tasks off) changes how long the page is; when it gets shorter
  // the browser yanks the scroll position and the screen seems to jump. Let the visible pane only grow,
  // and start over when the tab, view or month changes.
  function holdHeight(reset) {
    const pane = ui.tab === 'cal' ? $('#calPane') : $('#agendaPane');
    if (reset || matchMedia('(min-width:900px)').matches) { $('#calPane').style.minHeight = $('#agendaPane').style.minHeight = ''; if (reset) return; }
    pane.style.minHeight = Math.max(pane.offsetHeight, parseFloat(pane.style.minHeight) || 0) + 'px';
  }

  function renderTabs() {
    const open = store.on(D.todayKey()).filter((x) => !x.done).length + store.overdue().length;
    $('#tAgenda').innerHTML = `<span class="tw">${icon('check-square', 22)}${open ? `<span class="b">${open}</span>` : ''}</span><span class="tl">${t('myTasks')}</span>`;
    $('#tCal').innerHTML = `${icon('calendar', 22)}<span class="tl">${t('calendar')}</span>`;
    $('#tAgenda').setAttribute('aria-current', ui.tab === 'agenda' ? 'page' : 'false');
    $('#tCal').setAttribute('aria-current', ui.tab === 'cal' ? 'page' : 'false');
  }

  function renderAgenda() {
    const td = D.todayKey(), dt = D.parse(td);
    const todayAll = store.on(td), todayOpen = todayAll.filter((x) => !x.done), todayDone = todayAll.filter((x) => x.done);
    const over = store.overdue(), ex = store.nextExam(), streak = store.streak();
    const tomorrow = store.on(D.addDays(td, 1)).filter((x) => !x.done);
    const week = store.range(D.addDays(td, 2), D.addDays(td, 7)).filter((x) => !x.done);
    const later = store.range(D.addDays(td, 8), D.addDays(td, 400)).filter((x) => !x.done);

    // glance: one line answers "how's today?"
    const left = todayOpen.length;
    const line = !todayAll.length ? t('lineEmpty') : left ? t('lineLeft', left, todayAll.length) : t('lineAllDone');
    let stamps = '';
    if (streak >= 2) stamps += `<span class="stampx streak">${icon('flame', 14)}${t('streak', streak)}</span>`;
    if (todayAll.length && !left) stamps += `<span class="stampx done">${icon('check', 14)}${t('dayComplete')}</span>`;
    let sticky = '';
    if (ex) {
      const n = D.diffDays(td, ex.date);
      sticky = `<button class="sticky" data-act="edit" data-id="${ex.id}"><div class="cd">${n === 0 ? t('todayExcl') : D.relative(ex.date)}</div><span class="h">${t('nextExam')}</span>
        <div class="t">${esc(ex.title)}</div><div class="s">${D.fmtDay(ex.date)}${ex.time ? ' · ' + D.fmtTime(ex.time) : ''}</div></button>`;
    }
    $('#glance').innerHTML = `<div class="glance"><span class="num">${dt.getDate()}</span><div><h1>${DAYS[dt.getDay()]}</h1><p>${MONTHS[dt.getMonth()]} · ${line}</p></div></div>
      ${todayAll.length ? `<div class="tally" aria-hidden="true">${todayAll.map((x) => `<i class="${x.done ? 'on' : ''}"></i>`).join('')}<span>${todayDone.length}/${todayAll.length}</span></div>` : ''}
      ${stamps ? `<div class="stamps">${stamps}</div>` : ''}`;
    $('#examNote').innerHTML = sticky;

    if (!store.all().length) {
      $('#agenda').innerHTML = `<div class="welcome"><h2>${t('welcomeTitle')}</h2>
        <p>${t('welcomeText')}</p>
        <div class="ex">${t('examples').map((e) => `<button data-act="try" data-text="${esc(e)}">“${esc(e)}”</button>`).join('')}</div>
        <button class="lbtn" data-act="sample">${icon('sparkle', 18)}${t('trySample')}</button></div>`;
      return;
    }

    let h = '';
    if (over.length) h += `<div class="sec over"><div class="sec-h">${icon('alert', 18)}<b>${t('overdue')}</b> <span class="n">${over.length}</span><button class="act" data-act="move-overdue">${t('moveToday')}</button></div>${listHTML(over, { showDate: true })}</div>`;
    h += `<div class="sec"><div class="sec-h"><b>${t('today')}</b> <span class="n">${todayOpen.length ? t('nLeft', todayOpen.length) : ''}</span></div>`;
    if (todayOpen.length || todayDone.length) {
      h += `<ul class="list">${todayOpen.map((x) => rowHTML(x)).join('')}${todayDone.length ? `<li><button class="fold" data-act="fold-done" aria-expanded="${ui.showDone}">${icon('chev-down', 16)}${t('doneToday', todayDone.length)}</button></li>${ui.showDone ? todayDone.map((x) => rowHTML(x)).join('') : ''}` : ''}</ul>`;
    } else h += `<div class="list"><div class="empty-day">${t('noTasksToday')}</div></div>`;
    h += '</div>';
    if (tomorrow.length) h += `<div class="sec"><div class="sec-h"><b>${t('tomorrow')}</b> <span class="n">${tomorrow.length}</span></div>${listHTML(tomorrow)}</div>`;
    if (week.length) h += `<div class="sec"><div class="sec-h"><b>${t('thisWeek')}</b> <span class="n">${week.length}</span></div>${listHTML(week, { showDate: true })}</div>`;
    if (later.length) {
      h += `<div class="sec"><div class="sec-h"><b>${t('later')}</b> <span class="n">${later.length}</span></div>${ui.showLater ? listHTML(later, { showDate: true }) : `<div class="list"><button class="fold" data-act="fold-later" aria-expanded="false">${icon('chev-down', 16)}${t('showN', later.length)}</button></div>`}</div>`;
    }
    if (!dismissed('swipe')) h += `<div class="tip">${icon('sparkle', 18)}<p>${t('swipeTip')}</p><button class="x" data-act="dismiss" data-what="swipe" aria-label="${t('hide')}">${icon('x', 16)}</button></div>`;
    if (!isStandalone() && !dismissed('install')) h += `<div class="tip">${icon('phone', 18)}<p>${t('installTip')}</p><button class="lbtn" data-act="install" style="min-height:36px;padding:0 10px">${t('how')}</button><button class="x" data-act="dismiss" data-what="install" aria-label="${t('hide')}">${icon('x', 16)}</button></div>`;
    $('#agenda').innerHTML = h;
  }

  function dotsHTML(k, max = 3) {
    const d = store.dots(k, max);
    return d.items.map((x) => `<i class="dot ${x.done ? 'done' : ''} ${x.type === 'exam' ? 'exam' : ''}" style="background:${x.color};color:${x.color}"></i>`).join('') + (d.extra ? `<span class="pl">+${d.extra}</span>` : '');
  }

  function renderCal() {
    const wk = view() === 'week', k = ui.selected, td = D.todayKey();
    $('#vMonth').setAttribute('aria-pressed', !wk); $('#vWeek').setAttribute('aria-pressed', wk);
    $('#wd').hidden = wk;
    let from, to;
    if (wk) {
      const keys = D.weekKeys(k); from = keys[0]; to = keys[6];
      const a = D.parse(from), b = D.parse(to);
      $('#mt').innerHTML = a.getMonth() === b.getMonth() ? `${MONTHS[a.getMonth()]}<small>${a.getFullYear()}</small>` : `${MONTHS[a.getMonth()]}–${MONTHS[b.getMonth()]}<small>${b.getFullYear()}</small>`;
      const names = D.weekdayNames(true);
      $('#grid').className = 'wstrip';
      $('#grid').innerHTML = keys.map((key, i) => {
        const d = store.dots(key), dn = D.parse(key).getDate();
        return `<button class="w ${key === td ? 'today' : ''} ${key === k ? 'sel' : ''}" role="gridcell" data-act="day" data-key="${key}" aria-selected="${key === k}" aria-label="${D.fmtDay(key)}${d.total ? t('openOf', d.open, d.total) : ''}">
          <span class="wn">${names[i]}</span><span class="dn">${dn}</span><span class="dd">${dotsHTML(key)}</span></button>`;
      }).join('');
    } else {
      from = D.keyOf(new Date(ui.y, ui.m, 1)); to = D.keyOf(new Date(ui.y, ui.m + 1, 0));
      $('#mt').innerHTML = `${MONTHS[ui.m]}<small>${ui.y}</small>`;
      $('#grid').className = 'mgrid';
      $('#grid').innerHTML = D.monthGrid(ui.y, ui.m).map((c) => {
        const d = store.dots(c.key);
        return `<button class="d ${c.inMonth ? '' : 'out'} ${c.isToday ? 'today' : ''} ${c.key === k ? 'sel' : ''}" role="gridcell" data-act="day" data-key="${c.key}" aria-selected="${c.key === k}" aria-label="${D.fmtDay(c.key)}${d.total ? t('openOf', d.open, d.total) : ''}" ${c.key === k ? '' : 'tabindex="-1"'}>
          <span class="dn">${c.day}</span><span class="dd">${dotsHTML(c.key)}</span></button>`;
      }).join('');
    }
    const used = new Set(store.range(from, to).map((x) => x.subject).filter(Boolean));
    const subs = store.subjects().filter((s) => used.has(s.id));
    $('#legend').innerHTML = subs.length ? subs.map((s) => `<span><i class="dot" style="background:${s.color}"></i>${esc(s.name)}</span>`).join('') + `<span><i class="dot exam" style="background:var(--muted)"></i>${t('exam')}</span>` : '';
    $('#legend').hidden = !subs.length;

    const list = store.on(k), dt = D.parse(k);
    $('#dayHead').innerHTML = `<span class="num">${dt.getDate()}</span><div><h2>${DAYS[dt.getDay()]}</h2><span class="r">${MONTHS[dt.getMonth()]} · ${D.relative(k)}</span></div>${list.length ? `<span class="c">${t('doneCount', list.filter((x) => x.done).length, list.length)}</span>` : ''}`;
    $('#dayList').innerHTML = list.length ? listHTML(list) : '';
    $('#qaDayIn').placeholder = list.length ? t('addThisDay') : t('noTasksHere', k === td);
  }

  // ---------- navigation ----------
  function setTab(x) { ui.tab = x; try { sessionStorage.setItem('munjiz.tab', x); } catch (e) {} holdHeight(true); render(); scrollTo({ top: 0 }); }
  function select(k) { ui.selected = k; const d = D.parse(k); ui.y = d.getFullYear(); ui.m = d.getMonth(); render(); }
  function step(dir) {
    holdHeight(true);
    if (view() === 'week') { select(D.addDays(ui.selected, dir * 7)); return; }
    const d = new Date(ui.y, ui.m + dir, 1); ui.y = d.getFullYear(); ui.m = d.getMonth();
    const td = new Date();
    ui.selected = td.getFullYear() === ui.y && td.getMonth() === ui.m ? D.todayKey() : D.keyOf(d);
    render();
  }
  function goToday() { select(D.todayKey()); }

  // ---------- adding: one sentence is enough ----------
  function afterAdd(task) {
    const where = D.relative(task.date);
    if (task.type === 'exam' && store.settings().examCal !== false) {
      toast(t('addedExam', where), { label: t('toCal'), icon: 'calendar-plus', run: () => exportICS([task], `munjiz-${task.date}.ics`) });
    } else toast(t('addedTo', where, task.time ? D.fmtTime(task.time) : ''), { label: t('edit'), icon: 'edit', run: () => openTask({ id: task.id }) });
  }

  function heardHTML(p, base) {
    const bits = [];
    if (p.date !== base) bits.push(`${icon('calendar', 13)}${D.relative(p.date)}`);
    if (p.time) bits.push(`${icon('clock', 13)}${D.fmtTime(p.time)}`);
    if (p.subject) { const s = store.subject(p.subject); bits.push(`<i class="dot" style="background:${s.color}"></i>${esc(s.name)}`); }
    if (p.type) bits.push(TYPES[p.type].label);
    if (p.priority) bits.push(`${icon('flag', 13)}${PRIORITY[p.priority].label}`);
    return bits.map((b) => `<span class="chip-s">${b}</span>`).join('');
  }

  function wireQuick(form) {
    const inp = $('input', form), go = $('.go', form), prev = $('.qprev', form);
    const base = () => (form.dataset.default === 'selected' ? ui.selected : D.todayKey());
    const update = () => {
      const v = inp.value.trim(); go.hidden = !v;
      const p = v ? parseQuick(v, base()) : null;
      prev.hidden = !(p && p.found);
      if (p && p.found) prev.innerHTML = heardHTML(p, base());
    };
    inp.addEventListener('input', update);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = inp.value.trim(); if (!v) return;
      const p = parseQuick(v, base());
      const task = store.add({ title: p.title || v, date: p.date, time: p.time || '', subject: p.subject || '', type: p.type || 'task', priority: p.priority || 0 });
      inp.value = ''; update(); inp.focus();
      afterAdd(task);
    });
    $('[data-more]', form).addEventListener('click', () => { const v = inp.value; inp.value = ''; update(); openTask({ text: v, date: base() }); });
  }
  wireQuick($('#qaAgenda')); wireQuick($('#qaDay'));

  // ---------- task sheet: big title field + one-line choice rows ----------
  function openTask({ id, date, text } = {}) {
    const editing = id ? store.get(id) : null;
    const base = date || ui.selected;
    const tk = editing ? { ...editing } : { title: '', date: base, time: '', type: 'task', subject: '', priority: 0, notes: '' };
    const n = store.seriesCount(editing);
    const touched = new Set(); // fields the user picked by hand win over what the parser hears
    const T0 = D.todayKey();
    const opt = (grp, val, label, on, cls = '') => `<button type="button" class="opt ${cls}" data-g="${grp}" data-v="${val}" aria-pressed="${on}">${label}</button>`;

    const { dlg, close } = sheet(`<form novalidate>
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head"><h2>${editing ? t('editTask') : t('newTask')}</h2><button type="button" class="ibtn" data-close aria-label="${t('close')}">${icon('x', 22)}</button></div>
      <div class="sh-body">
        <div class="field"><label class="sr" for="f-title">${t('taskLabel')}</label>
          <input class="big-in" id="f-title" list="recent" maxlength="140" autocomplete="off" enterkeyhint="done" placeholder="${t('titlePh')}" value="${esc(editing ? tk.title : '')}">
          <div class="heard" id="f-heard"></div><div class="err" id="f-err" role="alert"></div></div>
        <div class="field"><span class="lab">${t('when')}</span><div class="scroller" id="r-date"></div>
          <div class="trow"><label class="lab" for="f-time">${t('time')}</label><input class="in sm" type="time" id="f-time" value="${tk.time || ''}"><button type="button" class="clr" data-clrtime aria-label="${t('noTime')}">${icon('x', 16)}</button><span class="hint">${t('optional')}</span></div></div>
        <div class="field"><span class="lab">${t('subject')}</span><div class="scroller" id="r-subject"></div></div>
        <div class="field"><span class="lab">${t('type')}</span><div class="scroller">${Object.entries(TYPES).map(([k, v]) => opt('type', k, icon(v.icon, 16) + v.label, tk.type === k)).join('')}</div></div>
        <div class="field"><span class="lab">${t('priority')}</span><div class="scroller">${PRIORITY.map((p, i) => opt('priority', i, (i ? icon('flag', 15, 'fill="currentColor"') : '') + p.label, (tk.priority || 0) === i, 'p' + i)).join('')}</div></div>
        <details class="more" ${editing && (tk.notes || n > 1) ? 'open' : ''}><summary>${icon('chev-down', 16)}${editing ? t('notesOnly') : t('notesRepeat')}</summary><div class="inner">
          <textarea class="in" id="f-notes" placeholder="${t('notesPh')}">${esc(tk.notes)}</textarea>
          ${editing ? '' : `<div class="field"><span class="lab">${t('repeat')}</span><div class="scroller">${opt('repeat', 'none', t('once'), true)}${opt('repeat', 'weekly', icon('repeat', 14) + t('weekly'), false)}${opt('repeat', 'daily', t('daily'), false)}</div>
            <div id="f-untilw" hidden style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="lab">${t('until')}</span><input class="in sm" type="date" id="f-until"><span class="hint" id="f-ucount"></span></div></div>`}
          ${n > 1 ? `<label class="check"><input type="checkbox" id="f-all" checked> ${t('applyAll', n - 1)}</label>` : ''}
        </div></details>
      </div>
      <div class="sh-foot">
        ${editing ? `<button type="button" class="btn danger" data-del aria-label="${t('del')}">${icon('trash', 19)}</button>
          <button type="button" class="btn ghost" data-later>${icon(FWD, 17)}${t('swLater')}</button>
          <button type="button" class="btn ghost" data-ics aria-label="${t('addToPhoneCal')}">${icon('calendar-plus', 18)}</button>` : `<button type="button" class="btn ghost" data-again>${icon('plus', 17)}${t('andAnother')}</button>`}
        <span class="sp"></span>
        <button type="submit" class="btn primary">${icon('check', 18)}${editing ? t('save') : t('add')}</button>
      </div></form>`, { label: editing ? t('editTask') : t('newTask') });

    const f = $('form', dlg), title = $('#f-title', dlg);
    let repeat = 'none';

    const drawDate = () => {
      const quick = [[T0, t('today')], [D.addDays(T0, 1), t('tomorrow')], [D.addDays(T0, 2), t('dayAfter')]];
      const isQuick = quick.some(([k]) => k === tk.date);
      $('#r-date', dlg).innerHTML = quick.map(([k, l]) => opt('date', k, l, tk.date === k)).join('') +
        `<input class="in sm" type="date" id="f-date" value="${tk.date}" aria-label="${t('otherDate')}" style="${isQuick ? '' : 'border-color:var(--sel);font-weight:700'}">`;
      const ti = $('#f-time', dlg); if (ti && ti.value !== (tk.time || '')) ti.value = tk.time || '';
    };
    const drawSubjects = () => {
      $('#r-subject', dlg).innerHTML = opt('subject', '', t('none'), !tk.subject) + store.subjects().map((s) => opt('subject', s.id, `<span class="sw" style="background:${s.color}"></span>${esc(s.name)}`, tk.subject === s.id)).join('') +
        `<button type="button" class="opt" data-addsubj>${icon('plus', 15)}${t('subjectBtn')}</button>`;
    };
    const syncPressed = (g) => dlg.querySelectorAll(`[data-g="${g}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v) === String(tk[g] ?? '')));
    drawDate(); drawSubjects();

    // live: what the parser understood flows into the choices (unless picked by hand)
    const heard = () => {
      if (editing) return;
      const p = parseQuick(title.value, base);
      if (!touched.has('date')) tk.date = p.date;
      if (!touched.has('time')) tk.time = p.time || '';
      if (!touched.has('subject')) tk.subject = p.subject || '';
      if (!touched.has('type')) tk.type = p.type || 'task';
      if (!touched.has('priority')) tk.priority = p.priority || 0;
      drawDate(); syncPressed('subject'); syncPressed('type'); syncPressed('priority');
      $('#f-heard', dlg).innerHTML = p.found && title.value.trim() ? `${t('heard')} ${heardHTML(p, '')}` : '';
      updUntil();
    };
    title.addEventListener('input', () => { $('#f-err', dlg).textContent = ''; heard(); });

    dlg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-g]');
      if (b) {
        const g = b.dataset.g;
        if (g === 'repeat') { repeat = b.dataset.v; dlg.querySelectorAll('[data-g=repeat]').forEach((x) => x.setAttribute('aria-pressed', x === b)); updUntil(); return; }
        touched.add(g);
        tk[g] = g === 'priority' ? Number(b.dataset.v) : b.dataset.v;
        if (g === 'date') drawDate(); else syncPressed(g);
        return;
      }
      if (e.target.closest('[data-clrtime]')) { tk.time = ''; touched.add('time'); $('#f-time', dlg).value = ''; return; }
      if (e.target.closest('[data-addsubj]')) {
        const btn = e.target.closest('[data-addsubj]'), inp = document.createElement('input');
        inp.className = 'in sm'; inp.placeholder = t('subjectNamePh'); inp.style.width = '140px'; inp.enterKeyHint = 'done'; inp.setAttribute('aria-label', t('newSubjectAria'));
        btn.replaceWith(inp); inp.focus();
        let done = false;
        const commit = () => { if (done) return; done = true; const s = store.addSubject(inp.value); if (s) { tk.subject = s.id; touched.add('subject'); } drawSubjects(); };
        inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); commit(); } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done = true; drawSubjects(); } });
        inp.addEventListener('blur', commit);
      }
    });
    dlg.addEventListener('change', (e) => {
      if (e.target.id === 'f-date' && e.target.value) { tk.date = e.target.value; touched.add('date'); drawDate(); updUntil(); }
      if (e.target.id === 'f-time') { tk.time = e.target.value; touched.add('time'); }
      if (e.target.id === 'f-until') updUntil(true);
    });

    function updUntil(keep) {
      const w = $('#f-untilw', dlg); if (!w) return;
      w.hidden = repeat === 'none'; w.style.display = repeat === 'none' ? 'none' : 'flex';
      if (repeat === 'none') return;
      const u = $('#f-until', dlg);
      if (!keep || !u.value || u.value <= tk.date) u.value = D.addDays(tk.date, repeat === 'daily' ? 6 : 7 * 11);
      const cnt = Math.min(120, Math.floor(D.diffDays(tk.date, u.value) / (repeat === 'daily' ? 1 : 7)) + 1);
      $('#f-ucount', dlg).textContent = t('times', cnt);
    }

    function collect() {
      const raw = title.value.trim();
      if (!raw) { $('#f-err', dlg).textContent = t('writeFirst'); title.focus(); return null; }
      const p = editing ? null : parseQuick(raw, base);
      return { title: (p && p.title) || raw, date: tk.date, time: tk.time || '', type: tk.type, subject: tk.subject || '', priority: Number(tk.priority || 0), notes: ($('#f-notes', dlg).value || '').trim() };
    }
    function save(again) {
      const data = collect(); if (!data) return;
      if (editing) {
        if ($('#f-all', dlg) && $('#f-all', dlg).checked) store.updateSeries(editing.id, data); else store.update(editing.id, data);
        toast(t('saved')); close(); return;
      }
      const u = $('#f-until', dlg);
      if (repeat !== 'none' && u && u.value > data.date) {
        const out = store.addSeries(data, repeat, u.value);
        toast(t('addedRepeat', out.length), { label: t('undo'), run: () => out.forEach((x) => store.remove(x.id)) });
      } else afterAdd(store.add(data));
      if (again) {
        // keep date/subject/type for a burst of similar entries; clear only the text
        title.value = ''; touched.add('date'); touched.add('subject'); touched.add('type'); $('#f-heard', dlg).innerHTML = ''; title.focus();
      } else close();
    }
    f.addEventListener('submit', (e) => { e.preventDefault(); save(false); });
    const again = $('[data-again]', dlg); if (again) again.onclick = () => save(true);

    const del = $('[data-del]', dlg);
    if (del) del.onclick = async () => {
      let removed;
      if (n > 1) {
        const all = await confirmSheet(t('deleteSeriesQ', n - 1), { ok: t('deleteAllNext'), danger: true });
        removed = all ? store.removeSeriesFrom(editing.id) : store.remove(editing.id);
      } else removed = store.remove(editing.id);
      close();
      toast(removed.length > 1 ? t('deletedN', removed.length) : t('deletedOne'), { label: t('undo'), run: () => store.restore(removed) });
    };
    const later = $('[data-later]', dlg);
    if (later) later.onclick = () => { postpone(editing.id); close(); };
    const ics = $('[data-ics]', dlg);
    if (ics) ics.onclick = () => exportICS([store.get(editing.id)], `munjiz-${editing.date}.ics`);

    if (text) { title.value = text; heard(); }
    if (!editing) setTimeout(() => { title.focus(); const l = title.value.length; title.setSelectionRange(l, l); }, 60);
  }

  function postpone(id) {
    const from = store.postpone(id, 1); if (!from) return;
    const x = store.get(id);
    toast(t('postponedTo', D.relative(x.date)), { label: t('undo'), run: () => store.update(id, { date: from }) });
  }

  function exportICS(tasks, name) {
    if (!tasks.length) { toast(t('noUpcoming')); return; }
    saveFile(name, toICS(tasks), 'text/calendar').then((r) => { if (r === 'downloaded') toast(t('icsHint')); });
  }

  // ---------- swipe a row: left = done, right = tomorrow (same physical gesture in both languages) ----------
  let sw = null;
  document.addEventListener('touchstart', (e) => {
    const inr = e.target.closest('.row-in'); if (!inr || e.touches.length > 1) return;
    const row = inr.parentElement; if (row.classList.contains('done')) return;
    sw = { row, inr, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, on: false };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!sw) return;
    const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
    if (!sw.on) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; } if (Math.abs(dx) < 12) return; sw.on = true; sw.row.classList.add('dragging'); }
    sw.dx = Math.max(-140, Math.min(140, dx));
    sw.inr.style.transform = `translateX(${sw.dx}px)`;
    sw.row.classList.toggle('sw-done', sw.dx < -20); sw.row.classList.toggle('sw-later', sw.dx > 20);
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!sw) return;
    const { row, inr, dx, on } = sw; sw = null;
    row.classList.remove('dragging'); inr.style.transform = '';
    setTimeout(() => row.classList.remove('sw-done', 'sw-later'), 180);
    if (!on) return;
    row.dataset.swiped = '1'; setTimeout(() => delete row.dataset.swiped, 400); // swallow the click that follows
    const id = row.dataset.id;
    if (dx <= -80) { complete(id); dismiss('swipe'); }
    else if (dx >= 80) { postpone(id); dismiss('swipe'); }
  });

  function complete(id) {
    const x = store.toggle(id); if (!x) return;
    if (!x.done) return;
    navigator.vibrate && navigator.vibrate(12);
    const left = store.on(D.todayKey()).filter((y) => !y.done).length;
    toast(x.date === D.todayKey() && left === 0 ? t('dayCompleteMsg') : t('wellDone'), { label: t('undo'), run: () => store.toggle(x.id) });
  }

  // ---------- settings ----------
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
  window.addEventListener('appinstalled', () => { installEvt = null; toast(t('installed')); render(); });
  function isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function installHTML() {
    if (isStandalone()) return `<p class="status"><i></i>${t('installedStatus')}</p>`;
    if (installEvt) return `<button class="btn primary wide" data-x="install">${icon('download', 18)}${t('installApp')}</button>`;
    return isIOS() ? t('iosSteps') : t('androidSteps');
  }

  function openMenu(focus) {
    const s = store.settings();
    const offline = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    const th = s.theme || 'auto';
    const { dlg, close } = sheet(`<div class="wrapf">
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head"><h2>${t('settings')}</h2><button type="button" class="ibtn" data-close aria-label="${t('close')}">${icon('x', 22)}</button></div>
      <div class="sh-body set">
        <section><h3>${icon('globe', 19)}${lang === 'ar' ? 'اللغة · Language' : 'Language · اللغة'}</h3>
          <div class="seg" role="group" aria-label="${t('language')}"><button data-x="lang" data-v="ar" lang="ar" aria-pressed="${lang === 'ar'}">العربية</button><button data-x="lang" data-v="en" lang="en" aria-pressed="${lang === 'en'}">English</button></div></section>

        <section><h3>${icon('moon', 19)}${t('appearance')}</h3>
          <div class="seg" role="group" aria-label="${t('appearance')}">${[['auto', t('auto')], ['light', t('light')], ['dark', t('dark')]].map(([v, l]) => `<button data-x="theme" data-v="${v}" aria-pressed="${th === v}">${l}</button>`).join('')}</div>
          <p class="hint">${t('autoHint')}</p></section>

        <section id="s-remind"><h3>${icon('bell', 19)}${t('reminders')}</h3>
          <div class="note">${t('iphoneNote')}</div>
          <div class="field" style="margin:10px 0"><span class="lab">${t('remindBefore')}</span>
            <select class="in" id="s-remind-min">${[10, 30, 60, 120, 1440].map((m) => `<option value="${m}" ${s.remind === m ? 'selected' : ''}>${t('remindOpt', m)}</option>`).join('')}</select></div>
          <button class="btn wide" data-x="ics-all">${icon('calendar-plus', 18)}${t('icsAll')}</button>
          <label class="check"><input type="checkbox" id="s-examcal" ${s.examCal !== false ? 'checked' : ''}> ${t('examCalOpt')}</label>
          ${'Notification' in window ? `<label class="check"><input type="checkbox" id="s-notify" ${s.notify && Notification.permission === 'granted' ? 'checked' : ''}> ${t('inAppNotify')}</label>` : ''}
        </section>

        <section id="s-install"><h3>${icon('phone', 19)}${t('installSection')}</h3>${installHTML()}
          <p class="status ${offline ? '' : 'off'}"><i></i>${offline ? t('offlineReady') : t('offlineLater')}</p></section>

        <section><h3>${icon('tag', 19)}${t('subjects')}</h3><div id="s-subj"></div>
          <form id="s-addsubj" class="subj" style="grid-template-columns:1fr auto"><input class="in" placeholder="${t('newSubjectPh')}" aria-label="${t('newSubjectAria2')}" enterkeyhint="done"><button class="btn" type="submit">${icon('plus', 18)}${t('addBtn')}</button></form>
          <p class="hint">${t('subjectHint', esc(store.subjects()[0]?.name || t('defaultSubjects').math))}</p></section>

        <section><h3>${icon('download', 19)}${t('backup')}</h3>
          <p class="hint">${t('backupHint')}</p>
          <div class="btns" style="margin-top:8px"><button class="btn" data-x="export">${icon('download', 18)}${t('saveCopy')}</button>
            <button class="btn" data-x="import">${icon('upload', 18)}${t('restore')}</button><input type="file" id="s-file" accept=".json,application/json" hidden></div>
          ${s.lastBackup ? `<p class="hint" style="margin-top:6px">${t('lastBackup', D.fmtDay(s.lastBackup))}</p>` : ''}</section>

        <section><h3>${icon('trash', 19)}${t('data')}</h3>
          <div class="btns">${store.all().length ? '' : `<button class="btn" data-x="sample">${t('sampleData')}</button>`}<button class="btn danger" data-x="clear" style="border:1px solid var(--red)">${t('clearAll')}</button></div>
          <p class="hint" style="margin-top:10px">${t('versionLine', VERSION, store.all().length)}</p></section>
      </div></div>`, { label: t('settings') });

    function drawSubjects() {
      $('#s-subj', dlg).innerHTML = store.subjects().map((x) => `<div class="subj" data-sid="${x.id}">
        <button type="button" class="swb" data-x="color" aria-label="${t('colorOf', esc(x.name))}"><i style="background:${x.color}"></i></button>
        <input class="in" value="${esc(x.name)}" aria-label="${t('subjectNameAria')}" data-x="rename">
        <button type="button" class="ibtn" data-x="del-subj" aria-label="${t('deleteX', esc(x.name))}">${icon('trash', 18)}</button>
        <div class="palette" hidden style="grid-column:1/-1">${PALETTE.map((c) => `<button type="button" data-x="pick" data-c="${c}" style="background:${c}" aria-label="${t('color')}" aria-pressed="${c === x.color}"></button>`).join('')}</div></div>`).join('');
    }
    drawSubjects();

    dlg.addEventListener('change', async (e) => {
      const id = e.target.id;
      if (id === 's-remind-min') { store.setSetting('remind', Number(e.target.value)); toast(t('savedShort')); }
      if (id === 's-examcal') store.setSetting('examCal', e.target.checked);
      if (e.target.dataset.x === 'rename') { const sid = e.target.closest('[data-sid]').dataset.sid, v = e.target.value.trim(); if (v) store.updateSubject(sid, { name: v }); }
      if (id === 's-notify') {
        if (e.target.checked) {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') { e.target.checked = false; toast(t('notifDenied')); return; }
          store.setSetting('notify', true);
        } else store.setSetting('notify', false);
      }
      if (id === 's-file' && e.target.files[0]) {
        const text = await e.target.files[0].text();
        if (!(await confirmSheet(t('replaceQ'), { ok: t('restore'), danger: true }))) return;
        try { const c = store.importJSON(text); close(); toast(t('restoredN', c)); } catch (err) { toast(t('badFile')); }
      }
    });
    dlg.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const x = b.dataset.x, row = b.closest('[data-sid]');
      if (x === 'lang') { if (b.dataset.v !== lang) { store.setLang(b.dataset.v); location.reload(); } }
      else if (x === 'theme') { store.setSetting('theme', b.dataset.v); dlg.querySelectorAll('[data-x=theme]').forEach((y) => y.setAttribute('aria-pressed', y === b)); }
      else if (x === 'install') doInstall();
      else if (x === 'color') { const p = $('.palette', row); p.hidden = !p.hidden; }
      else if (x === 'pick') { store.updateSubject(row.dataset.sid, { color: b.dataset.c }); drawSubjects(); }
      else if (x === 'del-subj') {
        const used = store.subjectUse(row.dataset.sid);
        if (await confirmSheet(t('deleteSubjectQ', $('input', row).value, used), { ok: t('del'), danger: true })) { store.removeSubject(row.dataset.sid); drawSubjects(); }
      }
      else if (x === 'ics-all') exportICS(store.range(D.todayKey(), D.addDays(D.todayKey(), 365)).filter((y) => !y.done), 'munjiz-tasks.ics');
      else if (x === 'export') {
        const r = await saveFile(`munjiz-backup-${D.todayKey()}.json`, store.exportJSON(), 'application/json');
        if (r !== 'cancelled') { store.setSetting('lastBackup', D.todayKey()); toast(r === 'shared' ? t('sentCopy') : t('savedCopy')); }
      }
      else if (x === 'import') $('#s-file', dlg).click();
      else if (x === 'sample') { store.loadSample(); close(); goToday(); }
      else if (x === 'clear') {
        if (await confirmSheet(t('clearQ'), { ok: t('clearAllBtn'), danger: true })) { const bk = store.all().slice(); store.clearTasks(); close(); toast(t('clearedAll'), { label: t('undo'), run: () => store.restore(bk) }); }
      }
    });
    $('#s-addsubj', dlg).addEventListener('submit', (e) => { e.preventDefault(); const inp = $('input', e.target); if (store.addSubject(inp.value)) { inp.value = ''; drawSubjects(); } });
    if (focus) $('#s-' + focus, dlg)?.scrollIntoView({ block: 'start' });
  }

  async function doInstall() {
    if (!installEvt) { openMenu('install'); return; }
    installEvt.prompt();
    const r = await installEvt.userChoice; installEvt = null;
    if (r.outcome === 'accepted') toast(t('installing'));
    document.querySelector('dialog.sheet[open]')?.close();
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el || el.closest('dialog')) return;
    if (el.closest('.row') && el.closest('.row').dataset.swiped) { e.preventDefault(); return; }
    const a = el.dataset.act, id = el.dataset.id;
    if (a === 'tab') setTab(el.dataset.t);
    else if (a === 'prev') step(-1);
    else if (a === 'next') step(1);
    else if (a === 'today') goToday();
    else if (a === 'day') select(el.dataset.key);
    else if (a === 'view') { holdHeight(true); store.setSetting('view', el.dataset.v); }
    else if (a === 'new') openTask({ date: ui.tab === 'cal' ? ui.selected : D.todayKey() });
    else if (a === 'edit') openTask({ id });
    else if (a === 'toggle') { const x = store.get(id); if (x && !x.done) complete(id); else store.toggle(id); }
    else if (a === 'prio') { const x = store.cyclePriority(id); toast(t('prioToast', PRIORITY[x.priority].label)); }
    else if (a === 'fold-done') { ui.showDone = !ui.showDone; render(); }
    else if (a === 'fold-later') { ui.showLater = true; render(); }
    else if (a === 'move-overdue') { const moved = store.moveOverdueToToday(); toast(t('movedN', moved.length), { label: t('undo'), run: () => store.undoMove(moved) }); }
    else if (a === 'theme') { const dark = document.documentElement.dataset.theme === 'dark'; store.setSetting('theme', dark ? 'light' : 'dark'); }
    else if (a === 'menu') openMenu();
    else if (a === 'install') { if (installEvt) doInstall(); else openMenu('install'); }
    else if (a === 'dismiss') { dismiss(el.dataset.what); render(); }
    else if (a === 'sample') { store.loadSample(); goToday(); }
    else if (a === 'try') { const i = $('#qaAgendaIn'); i.value = el.dataset.text; i.dispatchEvent(new Event('input')); i.focus(); }
  });

  // swipe the calendar: the next page comes from the reading direction's far side
  let cs = null;
  $('#calbox').addEventListener('touchstart', (e) => { const p = e.touches[0]; cs = { x: p.clientX, y: p.clientY, at: Date.now() }; }, { passive: true });
  $('#calbox').addEventListener('touchend', (e) => {
    if (!cs) return; const p = e.changedTouches[0], dx = p.clientX - cs.x, dy = p.clientY - cs.y, quick = Date.now() - cs.at < 700; cs = null;
    if (quick && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step((dx > 0) === rtl ? 1 : -1);
  }, { passive: true });

  // keyboard (desktop): arrows follow what you see on screen
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const side = rtl ? 1 : -1;
    const mv = { ArrowLeft: side, ArrowRight: -side, ArrowDown: 7, ArrowUp: -7 }[e.key];
    if (mv) { e.preventDefault(); select(D.addDays(ui.selected, mv)); return; }
    if (e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.code === 'KeyN') { e.preventDefault(); openTask({}); }
    else if (e.code === 'KeyT') { e.preventDefault(); goToday(); }
    else if (e.key === '/') { e.preventDefault(); $('#qaAgendaIn').focus(); }
  });

  // phones keep the app suspended for days: re-check "today" whenever it comes back
  let lastDay = D.todayKey();
  function dayCheck() {
    if (D.todayKey() === lastDay) return;
    const wasToday = ui.selected === lastDay; lastDay = D.todayKey();
    if (wasToday) goToday(); else render();
    scheduleReminders();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) dayCheck(); });
  setInterval(dayCheck, 60000);

  store.onChange(render);
  render();
  scheduleReminders();
  if (new URLSearchParams(location.search).has('new')) { history.replaceState(null, '', location.pathname); openTask({}); }

  // ---------- offline: service worker + persistent storage ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // first visit: the new worker just claims the page — only an accepted update reloads
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) toast(t('updateAvail'), { label: t('update'), icon: 'download', run: () => nw.postMessage('skip') });
        });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
