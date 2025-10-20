// app.js - beginner friendly version
// Shows a list of Q/A items, supports category chips, search and "load more".

// CONFIG
const STEP = 8; // how many items to show each "load more" step

// ---------- Build the knowledge base ----------
// If KB (array) exists, use it. Otherwise build from dataByCategory object.
// This part is written as small, named functions so it's easy to read.

function normalizeItem(item, fallbackId) {
  return {
    id: item.id || fallbackId,
    cat: String(item.cat || '').trim(),
    q: item.q,
    a: item.a,
    
  };
}

function buildFromKB(KB) {
  return KB.map(item => {
    const catKey = String(item.cat || '').toLowerCase().slice(0, 4);
    const randomId = `${catKey}_${Math.floor(Math.random() * 1000)}`;
    return normalizeItem(item, randomId);
  });
}

function buildFromDataByCategory(dataByCategory) {
  if (typeof dataByCategory === 'undefined') return [];
  const out = [];
  Object.keys(dataByCategory).forEach(catKey => {
    const list = dataByCategory[catKey] || [];
    list.forEach((entry, index) => {
      const id = entry.id || `${String(catKey).toLowerCase().slice(0,4)}_${String(index+1).padStart(2,'0')}`;
      out.push(normalizeItem({
        id,
        cat: catKey,
        q: entry.q,
        a: entry.a,
        tags: entry.tags || []
      }, id));
    });
  });
  return out;
}

const APP_KB = (typeof KB !== 'undefined' && Array.isArray(KB) && KB.length > 0)
  ? buildFromKB(KB)
  : buildFromDataByCategory(typeof dataByCategory !== 'undefined' ? dataByCategory : undefined);

// ---------- Simple helpers ----------
function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function showToast(msg, ms = 1200) {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed',
    right: '18px',
    bottom: '18px',
    background: 'rgba(0,0,0,0.8)',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '8px',
    zIndex: 9999,
    fontSize: '14px'
  });
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 300ms';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, ms);
}

function getUrlParam(name) {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  } catch (e) {
    return null;
  }
}

// ---------- App state ----------
let activeCat = 'All';
const showCount = {}; // e.g. showCount['All'] = 8

// ---------- DOM references (filled on DOMContentLoaded) ----------
let chipsWrap, qaList, searchBox, searchBtn, statCount, emptyNote, loadMoreWrap;

// ---------- Render and helpers ----------
function filterListByCategoryAndSearch(kb, category, searchTerm) {
  let list = kb.slice(); // copy
  if (category && category !== 'All') {
    const want = category.trim().toLowerCase();
    list = list.filter(it => String(it.cat || '').trim().toLowerCase() === want);
  }
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(it => {
      const hay = (it.q + ' ' + it.a + ' ' + (it.tags || []).join(' ')).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }
  return list;
}

function createCardElement(item) {
  const wrap = document.createElement('div');
  wrap.className = 'card-fix';
  wrap.dataset.cat = item.cat;

  wrap.innerHTML = `
    <div class="d-flex justify-content-between align-items-start">
      <div style="flex:1">
        <div class="qa-title">${escapeHtml(item.q)}</div>
        <div class="qa-meta">${escapeHtml(item.cat)} · ${escapeHtml((item.tags||[]).join(', '))}</div>
      </div>
      <div class="text-end">
        <button class="btn btn-sm btn-outline-light me-2" data-copy="${encodeURIComponent(item.a)}">Copy</button>
        <button class="btn btn-sm btn-outline-secondary btn-show" data-id="${item.id}">Show</button>
      </div>
    </div>
    <div id="ans_${item.id}" class="mt-3 answer" style="display:none;">${escapeHtml(item.a)}</div>
  `;

  
  const showBtn = wrap.querySelector('.btn-show');
  const ansEl = wrap.querySelector(`#ans_${item.id}`);
  showBtn && showBtn.addEventListener('click', (e) => {
    const nowVisible = ansEl.style.display === 'block';
    ansEl.style.display = nowVisible ? 'none' : 'block';
    e.currentTarget.textContent = nowVisible ? 'Show' : 'Hide';
  });

  
  const copyBtn = wrap.querySelector('[data-copy]');
  copyBtn && copyBtn.addEventListener('click', (e) => {
    const txt = decodeURIComponent(e.currentTarget.getAttribute('data-copy'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => showToast('Answer copied to clipboard')).catch(() => showToast('Copy failed'));
    } else {
      
      try {
        const ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('Answer copied to clipboard');
      } catch (err) {
        showToast('Copy not supported');
      }
    }
  });

  return wrap;
}

function render() {
  if (!qaList || !statCount) return;

  const q = (searchBox && searchBox.value) ? searchBox.value.trim() : '';
  const list = filterListByCategoryAndSearch(APP_KB, activeCat, q);

  
  const key = activeCat || 'All';
  if (!(key in showCount)) showCount[key] = STEP;
  let visible = list;
  if (!q) visible = list.slice(0, showCount[key]);

  
  qaList.innerHTML = '';
  if (visible.length === 0) {
    if (emptyNote) emptyNote.style.display = 'block';
  } else {
    if (emptyNote) emptyNote.style.display = 'none';
    visible.forEach(item => qaList.appendChild(createCardElement(item)));
  }

  
  if (loadMoreWrap) loadMoreWrap.innerHTML = '';
  if (!q && list.length > visible.length && loadMoreWrap) {
    const more = document.createElement('button');
    more.className = 'btn btn-outline-light';
    more.type = 'button';
    more.textContent = `Load more (${list.length - visible.length})`;
    more.addEventListener('click', () => {
      showCount[key] = (showCount[key] || STEP) + STEP;
      render();
    });
    loadMoreWrap.appendChild(more);
  }

  
  statCount.textContent = list.length;
}


function initChips() {
  const chipEls = Array.from(document.querySelectorAll('.chip'));
  if (!chipEls.length) return;

  chipEls.forEach(chip => {
    chip.addEventListener('click', () => {
      chipEls.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      activeCat = String(chip.dataset.cat || 'All').trim();
      showCount[activeCat] = STEP;
      if (searchBox) searchBox.value = '';
      render();

      
      try {
        const u = new URL(window.location.href);
        if (activeCat && activeCat !== 'All') u.searchParams.set('device', activeCat.toLowerCase());
        else u.searchParams.delete('device');
        window.history.replaceState({}, '', u.toString());
      } catch (e) {}
    });
  });


  const dev = (getUrlParam('device') || '').toLowerCase();
  if (dev) {
    const match = chipEls.find(c => String(c.dataset.cat || '').trim().toLowerCase() === dev);
    if (match) {
      match.click();
      return;
    }
  }

  
  const allChip = chipEls.find(c => String(c.dataset.cat || '').trim() === 'All');
  if (allChip) {
    allChip.classList.add('active');
    activeCat = 'All';
    showCount[activeCat] = STEP;
  }
}


function wireEvents() {
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      showCount[activeCat] = STEP;
      render();
    });
  }

  if (searchBox) {
    searchBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        showCount[activeCat] = STEP;
        render();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  chipsWrap = document.getElementById('chipsWrap');
  qaList = document.getElementById('qaList');
  searchBox = document.getElementById('searchBox');
  searchBtn = document.getElementById('searchBtn');
  statCount = document.getElementById('statCount');
  emptyNote = document.getElementById('emptyNote');
  loadMoreWrap = document.getElementById('loadMoreWrap');

  initChips();
  wireEvents();
  render();

  window.FixLib = { KB: APP_KB, render, _rawCount: APP_KB.length };
});
