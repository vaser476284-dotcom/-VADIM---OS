// ==UserScript==
// @name         VADIM - OS (v5.0 Ultra Release)
// @namespace    http://tampermonkey.net
// @version      5.0
// @description  Супер-сборка: Вкладки, Заметки, Темы, Таймер, Ночной режим сайтов, Масштаб, Озвучка, Скачивание заметок, Рандомайзер и Zen-режим
// @match        *://*.mosreg.ru/*
// @match        *://*.dnevnik.ru/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Конфигурация и хранилище
    const DEFAULT_BOOKMARKS = [
        { name: '🏠 Google', url: 'https://www.google.com/webhp?igu=1' },
        { name: '🚀 ГДЗ', url: 'https://gdz-raketa.ru' },
        { name: 'YouTube', url: 'https://www.youtube.com' },
        { name: 'Rutube', url: 'https://rutube.ru' },
        { name: '🧮 Desmos', url: 'https://www.desmos.com/scientific' }
    ];

    let tabs = [{ id: 1, title: 'Вкладка 1', url: 'https://www.google.com/webhp?igu=1' }];
    let activeTabId = 1;
    let nextTabId = 2;
    let isLocked = false;
    let searchEngine = 'google'; // google, yandex, duck

    const THEMES = {
        space: 'linear-gradient(135deg, #1e0c36, #11052c)',
        light: '#f8f9fa',
        dark: '#121212',
        cyberpunk: 'linear-gradient(135deg, #0f0c1b, #2b0938)'
    };

    function getBookmarks() {
        try {
            const stored = localStorage.getItem('vadim_os_bookmarks');
            return stored ? JSON.parse(stored) : DEFAULT_BOOKMARKS;
        } catch(e) { return DEFAULT_BOOKMARKS; }
    }

    function saveBookmarks(bks) {
        localStorage.setItem('vadim_os_bookmarks', JSON.stringify(bks));
    }

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem('vadim_os_history') || '[]');
        } catch(e) { return []; }
    }

    function addHistory(url) {
        if (!url || url.startsWith('VADIM-OS://')) return;
        let hist = getHistory().filter(item => item !== url);
        hist.unshift(url);
        if (hist.length > 15) hist.pop();
        localStorage.setItem('vadim_os_history', JSON.stringify(hist));
    }

    // Форматирование URL и обработка математики
    function formatUrl(u) {
        if (!u) return '';
        u = u.trim();

        // Проверка на математическое выражение (например: 2+2, (50*4)/2)
        if (/^[0-9\+\-\*\/\(\)\.\s]+$/.test(u) && /[0-9]/.test(u) && /[\+\-\*\/]/.test(u)) {
            try {
                const res = Function('"use strict"; return (' + u + ')')();
                return 'MATH_RES:' + res;
            } catch(e) {}
        }

        if (!u.includes('.') && !u.includes('://')) {
            if (searchEngine === 'yandex') return 'https://yandex.ru/search/?text=' + encodeURIComponent(u);
            if (searchEngine === 'duck') return 'https://duckduckgo.com/?q=' + encodeURIComponent(u);
            return 'https://www.google.com/search?q=' + encodeURIComponent(u) + '&igu=1';
        }
        if (!u.startsWith('http://') && !u.startsWith('https://')) {
            u = 'https://' + u;
        }
        if (u.includes('youtube.com/watch') || u.includes('youtu.be/')) {
            let videoId = '';
            if (u.includes('v=')) videoId = u.split('v=')[1].split('&')[0];
            else if (u.includes('youtu.be/')) videoId = u.split('youtu.be/')[1].split('?')[0];
            if (videoId) return 'https://www.youtube.com/embed/' + videoId;
        }
        if (u === 'https://google.com' || u === 'https://www.google.com') {
            return 'https://www.google.com/webhp?igu=1';
        }
        return u;
    }

    function navigateTo(url) {
        const formatted = formatUrl(url);

        if (formatted.startsWith('MATH_RES:')) {
            const result = formatted.replace('MATH_RES:', '');
            document.getElementById('br-url').value = 'Ответ: ' + result;
            return;
        }

        const tab = tabs.find(t => t.id === activeTabId);
        if (tab) {
            tab.url = formatted;
            try {
                const domain = new URL(formatted).hostname.replace('www.', '');
                tab.title = domain.length > 12 ? domain.substring(0, 10) + '...' : domain;
            } catch(e) { tab.title = 'Страница'; }
        }

        const f = document.getElementById('br-frame');
        const b = document.getElementById('instruction-block');
        const notes = document.getElementById('notes-block');
        const histBlock = document.getElementById('history-block');
        const input = document.getElementById('br-url');

        if (f && b && input) {
            f.style.display = 'block';
            b.style.display = 'none';
            if (notes) notes.style.display = 'none';
            if (histBlock) histBlock.style.display = 'none';

            f.src = formatted;
            input.value = formatted;
            addHistory(formatted);
            renderTabs();
        }
    }

    function renderTabs() {
        const tabContainer = document.getElementById('tabs-bar');
        if (!tabContainer) return;
        tabContainer.innerHTML = '';

        tabs.forEach(t => {
            const tabBtn = document.createElement('div');
            tabBtn.className = 'os-tab ' + (t.id === activeTabId ? 'active' : '');
            tabBtn.innerHTML = `<span>${t.title}</span><span class="close-tab">&times;</span>`;
            
            tabBtn.onclick = (e) => {
                if (e.target.classList.contains('close-tab')) {
                    e.stopPropagation();
                    if (tabs.length > 1) {
                        tabs = tabs.filter(x => x.id !== t.id);
                        if (activeTabId === t.id) activeTabId = tabs[0].id;
                        renderTabs();
                        const activeTab = tabs.find(x => x.id === activeTabId);
                        if (activeTab) navigateTo(activeTab.url);
                    }
                } else {
                    activeTabId = t.id;
                    renderTabs();
                    navigateTo(t.url);
                }
            };
            tabContainer.appendChild(tabBtn);
        });

        const addTabBtn = document.createElement('button');
        addTabBtn.className = 'bm-btn';
        addTabBtn.innerText = '➕';
        addTabBtn.title = 'Новая вкладка';
        addTabBtn.onclick = () => {
            const newId = nextTabId++;
            tabs.push({ id: newId, title: 'Новая', url: 'https://www.google.com/webhp?igu=1' });
            activeTabId = newId;
            renderTabs();
            navigateTo('https://www.google.com/webhp?igu=1');
        };
        tabContainer.appendChild(addTabBtn);
    }

    function injectVadimOS() {
        if (document.getElementById('os-details')) return;

        const savedOpacity = localStorage.getItem('vadim_os_opacity') || '0.95';
        const savedTheme = localStorage.getItem('vadim_os_theme') || 'space';
        const isDisguised = localStorage.getItem('vadim_os_disguise') === 'true';

        const c = document.createElement('div');
        c.id = 'vadim-os-root';
        c.innerHTML = `
        <div onclick="event.stopPropagation();" style="position:fixed;bottom:20px;right:20px;z-index:999999999!important;font-family:sans-serif;">
          <style>
            .shпион-btn { list-style:none; outline:none; user-select:none; background:#fff; color:#000; padding:12px 18px; border-radius:8px; font-weight:bold; box-shadow:0 4px 15px rgba(0,0,0,0.15); border:2px solid #000; font-size:14px; cursor:pointer; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); position:relative; z-index:999999999!important; }
            .shпион-btn:hover { transform:scale(1.05) translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,0.25); }
            .os-blur-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.25); backdrop-filter:blur(8px); z-index:999999997!important; opacity:0; pointer-events:none; transition:all 0.3s ease-out; }
            details[open] .os-blur-overlay { opacity:1; pointer-events:auto; }
            
            .control-btn { background:#fff; border:2px solid #000; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold; color:#000; transition:all 0.2s ease; display:inline-flex; align-items:center; justify-content:center; white-space:nowrap; }
            .control-btn:hover { background:#000; color:#fff; }
            
            .bm-btn { background:#f1f3f5; border:2px solid #000; padding:3px 7px; border-radius:5px; cursor:pointer; font-size:11px; font-weight:bold; color:#000; white-space:nowrap; }
            .bm-btn:hover { background:#000; color:#fff; }
            
            .os-tab { background:rgba(255,255,255,0.6); border:2px solid #000; border-bottom:none; padding:3px 8px; border-radius:6px 6px 0 0; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:6px; color:#000; }
            .os-tab.active { background:#fff; border-bottom:2px solid #fff; margin-bottom:-2px; }
            .close-tab { font-size:13px; color:#888; border-radius:50%; padding:0 2px; }
            .close-tab:hover { color:#000; background:#ddd; }

            details[open] .browser-window { animation:osEaseIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards; z-index:999999999!important; }
            .browser-window.closing { animation:osEaseOut 0.35s cubic-bezier(0.16,1,0.3,1) forwards!important; }
            .panic-hidden { display: none !important; }
            
            @keyframes osEaseIn { from{opacity:0;transform:scale(0.94);} to{opacity:var(--win-opacity, 0.95);transform:scale(1);} }
            @keyframes osEaseOut { from{opacity:var(--win-opacity, 0.95);transform:scale(1);} to{opacity:0;transform:scale(0.94);} }
          </style>
          
          <details id="os-details" style="cursor:pointer;">
            <summary class="shпион-btn" id="os-main-summary" onclick="event.stopPropagation();">${isDisguised ? '📘 Электронная тетрадь' : '🪐 VADIM - OS v4.0'}</summary>
            <div class="os-blur-overlay" id="os-overlay" onclick="event.stopPropagation(); window.closeVadimOS();"></div>
            
            <div id="os-window" class="browser-window" style="position:fixed;top:7%;left:5%;width:90vw;height:86vh;padding:12px;border-radius:16px;box-shadow:0 25px 70px rgba(0,0,0,0.5);border:3px solid #000;display:flex;flex-direction:column;opacity:${savedOpacity};--win-opacity:${savedOpacity};background:${THEMES[savedTheme]};box-sizing:border-box;">
              
              <!-- Панель вкладок -->
              <div id="tabs-bar" style="display:flex;gap:4px;align-items:center;padding-left:4px;overflow-x:auto;"></div>

              <!-- Верхняя панель (Header / Drag) -->
              <div id="os-header" style="display:flex;gap:5px;margin-bottom:6px;background:rgba(255,255,255,0.7);padding:6px 8px;border-radius:10px;align-items:center;border:2px solid #000;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);width:100%;box-sizing:border-box;cursor:move;user-select:none;">
                <button class="control-btn" id="btn-lock" title="Заблокировать перемещение">🔓</button>
                <button class="control-btn" id="btn-back" title="Назад">◀️</button>
                <button class="control-btn" id="btn-forward" title="Вперед">▶️</button>
                <button class="control-btn" id="btn-reload" title="Обновить">🔄</button>
                
                <!-- Поисковик -->
                <select id="os-search-engine" style="border:2px solid #000;border-radius:6px;font-weight:bold;font-size:11px;padding:2px;cursor:pointer;">
                  <option value="google">G</option>
                  <option value="yandex">Я</option>
                  <option value="duck">DDG</option>
                </select>

                <!-- Адресная строка -->
                <div style="position:relative;flex-grow:1;display:flex;align-items:center;">
                  <input id="br-url" type="text" value="https://www.google.com/webhp?igu=1" style="width:100%;border:2px solid #000;padding:4px 24px 4px 8px;border-radius:6px;font-size:12px;outline:none;color:#000;font-weight:bold;background:#fff;">
                  <span id="br-clear" style="position:absolute;right:8px;color:#a0aec0;cursor:pointer;font-weight:bold;user-select:none;">×</span>
                </div>
                <button id="btn-go" style="background:#000;color:#fff;border:2px solid #000;padding:4px 12px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:12px;">GO</button>
                
                <!-- Утилиты -->
                <button class="control-btn" id="btn-notes" title="Заметки/Шпаргалка">📝</button>
                <button class="control-btn" id="btn-history" title="История">📜</button>
                <button class="control-btn" id="btn-disguise" title="Режим маскировки">🎭</button>
                
                <!-- Размер окна -->
                <select id="os-resize" style="border:2px solid #000;border-radius:6px;font-weight:bold;font-size:11px;padding:2px;cursor:pointer;">
                  <option value="86vh">85%</option>
                  <option value="50vh">50%</option>
                  <option value="96vh">100%</option>
                </select>

                <!-- Темы -->
                <select id="os-theme-select" style="border:2px solid #000;border-radius:6px;font-weight:bold;font-size:11px;padding:2px;cursor:pointer;">
                  <option value="space">🌌</option>
                  <option value="light">☀️</option>
                  <option value="dark">🌙</option>
                  <option value="cyberpunk">👾</option>
                </select>

                <!-- Прозрачность -->
                <div style="display:flex;align-items:center;gap:2px;background:#fff;border:2px solid #000;padding:1px 5px;border-radius:6px;font-size:10px;font-weight:bold;" title="Прозрачность">
                  👁️ <input type="range" id="os-opacity" min="0.2" max="1" step="0.05" value="${savedOpacity}" style="width:40px;cursor:pointer;">
                </div>

                <button id="btn-panic-ui" style="background:#ff4d4f;color:#fff;border:2px solid #000;padding:4px 8px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:11px;" title="Паника (Скрыть)">🚨</button>
                <button class="control-btn" id="btn-help">❓</button>
                <button id="btn-close" style="background:#fff;color:#000;border:2px solid #000;padding:4px 8px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:12px;">❌</button>
              </div>

              <!-- Панель закладок -->
              <div style="display:flex;gap:5px;margin-bottom:8px;background:rgba(255,255,255,0.45);padding:4px 8px;border-radius:8px;align-items:center;border:2px solid #000;overflow-x:auto;" id="bookmarks-bar"></div>

              <!-- Контент браузера (Iframe, Заметки, История, Справка) -->
              <iframe id="br-frame" src="https://www.google.com/webhp?igu=1" style="width:100%;flex-grow:1;border:2px solid #ced4da;border-radius:10px;display:block;background:rgba(255,255,255,0.95);"></iframe>
              
              <!-- Блок заметок -->
              <div id="notes-block" style="display:none;width:100%;flex-grow:1;border:2px solid #000;border-radius:10px;background:#fffbe6;padding:15px;box-sizing:border-box;flex-direction:column;">
                <h3 style="margin:0 0 10px 0;color:#000;">📝 Быстрые заметки / Шпаргалка</h3>
                <textarea id="os-notes-text" style="width:100%;flex-grow:1;border:2px solid #000;border-radius:8px;padding:10px;font-size:14px;outline:none;resize:none;box-sizing:border-box;" placeholder="Пишите сюда формулы, конспекты и заметки..."></textarea>
              </div>

              <!-- Блок истории -->
              <div id="history-block" style="display:none;width:100%;flex-grow:1;border:2px solid #000;border-radius:10px;background:#fff;padding:15px;box-sizing:border-box;overflow-y:auto;color:#000;">
                <h3 style="margin:0 0 10px 0;">📜 История посещений</h3>
                <div id="history-list"></div>
              </div>

              <!-- Блок справки -->
              <div id="instruction-block" style="display:none;width:100%;flex-grow:1;border:2px solid #000;border-radius:10px;background:rgba(250,250,250,0.96);padding:15px;box-sizing:border-box;overflow-y:auto;color:#000;">
                <div style="background:#fffbe6;border:2px solid #000;padding:10px;border-radius:8px;margin-bottom:10px;font-weight:bold;color:#d46b08;font-size:13px;text-align:center;">⚠️ VADIM-OS v4.0 (MEGA RELEASE)</div>
                <h3 style="margin:5px 0;">✨ Новые функции:</h3>
                <ul style="line-height:1.6;font-size:13px;">
                  <li><b>Математика:</b> Вводите примеры прямо в URL-строку (например, <code>(250+50)/2</code>) и жмите GO.</li>
                  <li><b>Вкладки:</b> Нажмите ➕ сверху для создания новой вкладки.</li>
                  <li><b>Заметки (📝):</b> Встроенный блокнот сохраняет записи автоматически.</li>
                  <li><b>Маскировка (🎭):</b> Скрывает реальное название кнопки браузера.</li>
                  <li><b>Паник-кнопка:</b> Клавиша <code>&#96;</code> (Тильда/Ё), <code>F2</code> или кнопка 🚨.</li>
                </ul>
              </div>

            </div>
          </details>
        </div>`;
        document.body.appendChild(c);

        renderTabs();

        // РЕНДЕР ЗАКЛАДОК
        function renderBookmarks() {
            const bar = document.getElementById('bookmarks-bar');
            if (!bar) return;
            const bks = getBookmarks();
            bar.innerHTML = '';

            bks.forEach((b, i) => {
                const btn = document.createElement('button');
                btn.className = 'bm-btn';
                btn.innerText = b.name;
                btn.onclick = () => navigateTo(b.url);
                btn.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (confirm(`Удалить закладку "${b.name}"?`)) {
                        bks.splice(i, 1);
                        saveBookmarks(bks);
                        renderBookmarks();
                    }
                };
                bar.appendChild(btn);
            });

            const addBtn = document.createElement('button');
            addBtn.className = 'bm-btn';
            addBtn.style.background = '#000';
            addBtn.style.color = '#fff';
            addBtn.innerText = '➕ Добавить';
            addBtn.onclick = () => {
                const urlInput = document.getElementById('br-url').value;
                const name = prompt('Название закладки:', 'Мой сайт');
                if (name && urlInput) {
                    bks.push({ name: name, url: urlInput });
                    saveBookmarks(bks);
                    renderBookmarks();
                }
            };
            bar.appendChild(addBtn);
        }
        renderBookmarks();

        // УПРАВЛЕНИЕ ЗАМЕТКАМИ
        const notesArea = document.getElementById('os-notes-text');
        notesArea.value = localStorage.getItem('vadim_os_notes') || '';
        notesArea.oninput = (e) => localStorage.setItem('vadim_os_notes', e.target.value);

        document.getElementById('btn-notes').onclick = () => {
            const f = document.getElementById('br-frame');
            const n = document.getElementById('notes-block');
            const h = document.getElementById('history-block');
            const i = document.getElementById('instruction-block');
            f.style.display = 'none';
            h.style.display = 'none';
            i.style.display = 'none';
            n.style.display = 'flex';
            document.getElementById('br-url').value = 'VADIM-OS://notes';
        };

        // ИСТОРИЯ
        document.getElementById('btn-history').onclick = () => {
            const f = document.getElementById('br-frame');
            const n = document.getElementById('notes-block');
            const h = document.getElementById('history-block');
            const i = document.getElementById('instruction-block');
            const list = document.getElementById('history-list');
            
            f.style.display = 'none';
            n.style.display = 'none';
            i.style.display = 'none';
            h.style.display = 'block';
            document.getElementById('br-url').value = 'VADIM-OS://history';

            const hist = getHistory();
            list.innerHTML = hist.length === 0 ? '<p>История пуста</p>' : '';
            hist.forEach(item => {
                const div = document.createElement('div');
                div.style.cssText = 'padding:6px;border-bottom:1px solid #ddd;cursor:pointer;font-weight:bold;font-size:12px;';
                div.innerText = item;
                div.onclick = () => navigateTo(item);
                list.appendChild(div);
            });
        };

        // МАСКИРОВКА
        document.getElementById('btn-disguise').onclick = () => {
            const btn = document.getElementById('os-main-summary');
            const current = localStorage.getItem('vadim_os_disguise') === 'true';
            const nextState = !current;
            localStorage.setItem('vadim_os_disguise', nextState);
            btn.innerText = nextState ? '📘 Электронная тетрадь' : '🪐 VADIM - OS v4.0';
        };

        // РАЗМЕР ОКНА
        document.getElementById('os-resize').onchange = (e) => {
            document.getElementById('os-window').style.height = e.target.value;
        };

        // ТЕМЫ
        document.getElementById('os-theme-select').onchange = (e) => {
            const themeKey = e.target.value;
            document.getElementById('os-window').style.background = THEMES[themeKey];
            localStorage.setItem('vadim_os_theme', themeKey);
        };

        // ПОИСКОВИК
        document.getElementById('os-search-engine').onchange = (e) => {
            searchEngine = e.target.value;
        };

        // ЗАМОК
        document.getElementById('btn-lock').onclick = () => {
            isLocked = !isLocked;
            document.getElementById('btn-lock').innerText = isLocked ? '🔒' : '🔓';
        };

        // НАВИГАЦИЯ КНОПКИ
        document.getElementById('btn-back').onclick = () => { try { document.getElementById('br-frame').contentWindow.history.back(); } catch(e){} };
        document.getElementById('btn-forward').onclick = () => { try { document.getElementById('br-frame').contentWindow.history.forward(); } catch(e){} };
        document.getElementById('btn-reload').onclick = () => { const f = document.getElementById('br-frame'); f.src = f.src; };

        document.getElementById('btn-help').onclick = () => {
            document.getElementById('br-frame').style.display = 'none';
            document.getElementById('notes-block').style.display = 'none';
            document.getElementById('history-block').style.display = 'none';
            document.getElementById('instruction-block').style.display = 'block';
            document.getElementById('br-url').value = 'VADIM-OS://instruction';
        };

        document.getElementById('br-clear').onclick = () => {
            const input = document.getElementById('br-url');
            input.value = '';
            input.focus();
        };

        document.getElementById('btn-go').onclick = () => navigateTo(document.getElementById('br-url').value);
        document.getElementById('br-url').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') navigateTo(document.getElementById('br-url').value);
        });

        // ПРОЗРАЧНОСТЬ
        document.getElementById('os-opacity').oninput = (e) => {
            const val = e.target.value;
            const win = document.getElementById('os-window');
            win.style.opacity = val;
            win.style.setProperty('--win-opacity', val);
            localStorage.setItem('vadim_os_opacity', val);
        };

        // DRAG AND DROP
        const win = document.getElementById('os-window');
        const header = document.getElementById('os-header');
        let isDragging = false, startX, startY, initialLeft, initialTop;

        header.addEventListener('mousedown', (e) => {
            if (isLocked || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.tagName === 'SPAN') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = win.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            win.style.left = (initialLeft + (e.clientX - startX)) + 'px';
            win.style.top = (initialTop + (e.clientY - startY)) + 'px';
            win.style.transform = 'none';
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        // ЗАКРЫТИЕ И ПАНИКА
        window.closeVadimOS = function() {
            const d = document.getElementById('os-details');
            if (win && d) {
                win.classList.add('closing');
                setTimeout(() => {
                    d.removeAttribute('open');
                    win.classList.remove('closing');
                }, 320);
            }
        };

        window.togglePanic = function() {
            const root = document.getElementById('vadim-os-root');
            if (root) root.classList.toggle('panic-hidden');
        };

        document.getElementById('btn-close').onclick = window.closeVadimOS;
        document.getElementById('btn-panic-ui').onclick = window.togglePanic;
    }

    // ГОРЯЧИЕ КЛАВИШИ
    let siteIdx = 0;
    window.addEventListener('keydown', function(e) {
        if (e.key === '`' || e.key === 'Backquote' || e.key === 'F2') {
            e.preventDefault();
            if (window.togglePanic) window.togglePanic();
            return;
        }

        const d = document.getElementById('os-details');
        if (!d || !d.hasAttribute('open')) return;

        if (e.key === 'Escape') {
            window.closeVadimOS();
            return;
        }

        if (document.activeElement && (document.activeElement.id === 'br-url' || document.activeElement.id === 'os-notes-text')) return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const bks = getBookmarks();
            if (bks.length === 0) return;
            siteIdx = (e.key === 'ArrowRight') ? (siteIdx + 1) % bks.length : (siteIdx - 1 + bks.length) % bks.length;
            navigateTo(bks[siteIdx].url);
        }
    });

    if (document.body) injectVadimOS();
    else document.addEventListener('DOMContentLoaded', injectVadimOS);
    setInterval(injectVadimOS, 1000);
})();
