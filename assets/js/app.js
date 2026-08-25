import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// ⚠️ 1. 您的 Firebase 設定
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDZCPINzOhuohHBqdvThiHAM0Z9I6o4wGk",
    authDomain: "funfun-ai-tools.firebaseapp.com",
    projectId: "funfun-ai-tools",
    storageBucket: "funfun-ai-tools.firebasestorage.app",
    messagingSenderId: "240849963300",
    appId: "1:240849963300:web:5d11251b34e3ea80410bb1",
    measurementId: "G-PGFBT4728X"
};

// ==========================================
// ⚠️ 2. 您的 Google Sheet CSV/TSV 網址
// ==========================================
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRvCdiSmDl50u_UubeTSYR5zKqOtZgVZjOV52kR1gVX2QD6KLzdQ9fqHL7o6Hp9x7F4y8aYXJaqV1xP/pub?output=csv';
const TOOL_CACHE_KEY = 'funfun-ai-tools.csv.v2';
const SHEET_FETCH_TIMEOUT_MS = 8000;

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 全域狀態管理
let currentUser = null;
let favorites = [];
let availableCategories = new Set();
window.activeFilter = '新手推薦'; // 讓全域可讀取

const categoryIcons = {
    "我的收藏": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    "全部工具": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
    "新手推薦": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    "精選必備": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>`,
    "課程與教案設計": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    "評量與作業批改": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    "班級經營與互動": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    "親師溝通與行政": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    "學習遊戲": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h2"/><path d="M16 6h3a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-2"/><path d="M12 13v5"/><path d="M9 21h6"/></svg>`,
    "學生自學工具": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"/><path d="M6 12h4"/><path d="M8 10v4"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/></svg>`,
    "Skill 專區": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 14.24l-4.8 2.52.92-5.34-3.88-3.78 5.36-.78L12 2z"/><path d="M8 21h8"/><path d="M10 18h4"/></svg>`,
    "特殊教育類別": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M4 8h16"/><path d="M12 6v8"/><path d="M12 14l-4 7"/><path d="M12 14l4 7"/><path d="M9 13h6"/></svg>`,
    "專業進修與生活": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`
};
categoryIcons["特殊教育種類"] = categoryIcons["特殊教育類別"];

const categoryAliases = {
    "學生自學與遊戲": "學生自學工具"
};

const orderedCategories = ["我的收藏", "新手推薦", "精選必備", "Skill 專區", "課程與教案設計", "評量與作業批改", "班級經營與互動", "親師溝通與行政", "學習遊戲", "學生自學工具", "特殊教育類別", "專業進修與生活", "全部工具"];

function getCategoryIcon(categoryName) {
    const normalizedName = categoryAliases[categoryName] || categoryName;
    return categoryIcons[normalizedName] || categoryIcons["全部工具"];
}

function getVisibleCategories() {
    const lastCategory = "全部工具";
    const fixedCategories = orderedCategories.filter(category => category !== lastCategory);
    const dynamicCategories = Array.from(availableCategories)
        .filter(category => category && !orderedCategories.includes(category))
        .sort((a, b) => a.localeCompare(b, 'zh-Hant'));

    return [...fixedCategories, ...dynamicCategories, lastCategory];
}

function splitCategoryNames(categoryValue) {
    const categories = (categoryValue || '未分類')
        .split(/[、,，]/)
        .map(category => categoryAliases[category.trim()] || category.trim())
        .filter(Boolean);

    return categories.length ? categories : ['未分類'];
}

function parseCSVRow(str) {
    const result =[];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && str[i+1] === '"') {
            current += '"'; i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function getSafeExternalUrl(value) {
    const trimmedValue = String(value || '').trim();
    if (!trimmedValue) return null;

    try {
        const url = new URL(trimmedValue, window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

function openExternalLink(value) {
    const safeUrl = getSafeExternalUrl(value);
    if (!safeUrl) return;

    const openedWindow = window.open(safeUrl, '_blank', 'noopener,noreferrer');
    if (openedWindow) openedWindow.opener = null;
}

function createIconNode(categoryName) {
    const template = document.createElement('template');
    template.innerHTML = getCategoryIcon(categoryName).trim();
    return template.content.firstElementChild || document.createTextNode('');
}

function setSectionTitle(categoryName) {
    const sectionTitle = document.getElementById('section-title');
    const titleText = document.createElement('span');
    titleText.textContent = categoryName;
    sectionTitle.replaceChildren(createIconNode(categoryName), titleText);
}

function showReadyUI() {
    generateNavButtons();
    setSectionTitle(window.activeFilter);
    document.getElementById('main-footer').classList.remove('is-hidden');
}

function readCachedSheetText() {
    try {
        const cached = JSON.parse(localStorage.getItem(TOOL_CACHE_KEY) || 'null');
        if (!cached || typeof cached.csvText !== 'string') return null;
        return cached;
    } catch {
        localStorage.removeItem(TOOL_CACHE_KEY);
        return null;
    }
}

function writeCachedSheetText(csvText) {
    try {
        localStorage.setItem(TOOL_CACHE_KEY, JSON.stringify({
            csvText,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('工具資料快取寫入失敗', error);
    }
}

async function fetchSheetText(sheetUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SHEET_FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(sheetUrl, {
            cache: 'no-store',
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
        return await response.text();
    } finally {
        clearTimeout(timeoutId);
    }
}

function registerServiceWorker() {
    const canRegister = 'serviceWorker' in navigator &&
        (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname));

    if (!canRegister) return;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(error => {
            console.warn('Service worker 註冊失敗', error);
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    initializeSidebarToggle();
    initializeMobileSearch();
    initializeExternalLinks();
    initializeSearch();
    initializeSkillGuide();
    setupAuth(); // 啟動 Firebase 監聽
    registerServiceWorker();

    showReadyUI();
    await loadToolsFromSheet(GOOGLE_SHEET_URL);
});

// ==========================
// 登入驗證與 Firebase 同步
// ==========================
function setupAuth() {
    const authBtn = document.getElementById('auth-btn');
    const authText = document.getElementById('auth-text');
    const userAvatar = document.getElementById('user-avatar');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    function setAuthButtonBusy(isBusy) {
        authBtn.disabled = isBusy;
        authBtn.classList.toggle('is-loading', isBusy);
        if (isBusy) authText.textContent = "登入中...";
    }

    function getAuthErrorMessage(error) {
        console.error("Firebase Auth Error Full:", error);
        const code = error?.code || '';
        const message = error?.message || '';
        console.error("Firebase Auth Error Code:", code, "Message:", message);

        if (code === 'auth/popup-blocked') return '瀏覽器擋下登入彈跳視窗，請允許彈跳視窗後再試。';
        if (code === 'auth/popup-closed-by-user') return '登入視窗已關閉，尚未完成登入。';
        if (code === 'auth/unauthorized-domain') return '目前網站網域尚未加入 Firebase Authentication 授權網域。';
        if (code === 'auth/internal-error') return '登入初始化失敗，請重新整理後再試。';
        if (code === 'auth/operation-not-allowed') return '此登入方式尚未啟用，請至 Firebase Console 開啟 Google 登入。';
        if (code === 'auth/network-request-failed') return '網路連線異常，請檢查網路後再試。';
        if (code === 'auth/cancelled-popup-request') return '登入視窗已被新的登入要求取代，請稍後再試。';
        return '登入失敗，請稍後再試。';
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            authText.textContent = "登出";
            userAvatar.src = user.photoURL;
            userAvatar.style.display = "block";

            const docSnap = await getDoc(doc(db, "users", user.uid));
            favorites = docSnap.exists() ? (docSnap.data().favorites || []) : [];
            updateAllHearts();

            if (window.activeFilter === '我的收藏') executeSearch();
        } else {
            currentUser = null;
            favorites = [];
            authText.textContent = "登入收藏";
            userAvatar.style.display = "none";
            updateAllHearts();

            if (window.activeFilter === '我的收藏') {
                switchCategory('新手推薦');
                executeSearch();
            }
        }
    });

    authBtn.addEventListener('click', async () => {
        if (authBtn.disabled) return;

        if (currentUser) {
            signOut(auth).then(() => alert("已登出！"));
        } else {
            setAuthButtonBusy(true);
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("彈跳視窗登入失敗", error);
                if (error?.code !== 'auth/popup-closed-by-user') {
                    alert(getAuthErrorMessage(error));
                }
            } finally {
                setAuthButtonBusy(false);
            }
        }
    });
}

function initializeExternalLinks() {
    document.getElementById('facebook-link-btn').addEventListener('click', () => {
        openExternalLink('https://www.facebook.com/FunFun.AI.Teacher/');
    });
}

function initializeSkillGuide() {
    document.querySelectorAll('.skill-copy-btn').forEach(button => {
        const defaultLabel = button.querySelector('span')?.textContent || '複製路徑';

        button.addEventListener('click', async () => {
            const value = button.dataset.copyValue || '';
            const label = button.querySelector('span');

            try {
                await navigator.clipboard.writeText(value);
                if (label) label.textContent = '已複製';
            } catch {
                if (label) label.textContent = '請手動複製';
            }

            window.setTimeout(() => {
                if (label) label.textContent = defaultLabel;
            }, 1800);
        });
    });
}

function updateSkillGuideVisibility() {
    const guide = document.getElementById('skill-guide');
    if (!guide) return;

    const isSkillSection = window.activeFilter === 'Skill 專區';
    const hasSearchTerm = document.getElementById('search-input').value.trim().length > 0;
    guide.classList.toggle('is-hidden', !isSkillSection || hasSearchTerm);
}

// ==========================
// 愛心點擊邏輯 (掛載到 window)
// ==========================
window.toggleFavorite = async function(toolName, btnElement) {
    if (!currentUser) {
        alert("💡 請先點擊右上角「登入收藏」，才能將工具加入您的專屬清單喔！");
        return;
    }

    const isFav = favorites.includes(toolName);
    if (isFav) {
        favorites = favorites.filter(n => n !== toolName);
        btnElement.classList.remove('active');
    } else {
        favorites.push(toolName);
        btnElement.classList.add('active');
    }
    try {
        await setDoc(doc(db, "users", currentUser.uid), { favorites }, { merge: true });
    } catch (error) {
        console.error("收藏同步失敗", error);
    }
    
    // 若在收藏頁取消，動畫隱藏
    if(window.activeFilter === '我的收藏' && !favorites.includes(toolName)) {
        btnElement.closest('.tool-card').style.opacity = '0';
        setTimeout(() => {
            executeSearch(); 
        }, 300);
    }
};

// 更新全部愛心 UI
function updateAllHearts() {
    document.querySelectorAll('.tool-card').forEach(card => {
        const btn = card.querySelector('.fav-btn');
        const name = card.dataset.name;
        if (btn) {
            if (favorites.includes(name)) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

// ==========================
// 以下為原版邏輯 (Sheet 讀取 / 搜尋 / 側邊欄)
// ==========================
function initializeSidebarToggle() {
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleMenu() {
        if(window.innerWidth > 768) {
            sidebar.classList.toggle('collapsed-desktop');
        } else {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    }

    hamburger.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
}

function initializeMobileSearch() {
    const searchBtn = document.getElementById('mobile-search-btn');
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('search-input');
    const backBtn = document.getElementById('mobile-search-back');
    const clearBtn = document.getElementById('clear-btn');

    searchBtn.addEventListener('click', () => {
        searchContainer.classList.add('mobile-active');
        searchInput.focus();
    });

    backBtn.addEventListener('click', () => {
        searchContainer.classList.remove('mobile-active');
        searchInput.value = '';
        clearBtn.style.display = 'none';
        executeSearch();
    });
}

const themeSwitcher = document.getElementById('theme-switcher');
const body = document.body;
const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const moonIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function setTheme(theme) {
    localStorage.setItem('theme', theme);
    body.classList.toggle('light-mode', theme === 'light');
    themeSwitcher.innerHTML = theme === 'light' ? moonIcon : sunIcon;
    initializeParticles(theme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const currentTheme = savedTheme || (prefersLight ? 'light' : 'dark');
    setTheme(currentTheme);
    themeSwitcher.addEventListener('click', () => setTheme(body.classList.contains('light-mode') ? 'dark' : 'light'));
}

function parseToolsFromCSV(csvText) {
    const toolMap = new Map();
    availableCategories = new Set();

    csvText.trim().split(/\r?\n/).slice(1).forEach(row => {
        const columns = row.indexOf('\t') > -1 ? row.split('\t') : parseCSVRow(row);
        let[name, description, category, url1, url1Name, url2, url2Name, url3, url3Name, url4, url4Name] = columns;

        name = (name || '').trim();
        if (!name) return;

        const normalizedCategories = splitCategoryNames(category);
        normalizedCategories.forEach(categoryName => availableCategories.add(categoryName));

        if (toolMap.has(name)) {
            normalizedCategories.forEach(categoryName => {
                if (!toolMap.get(name).categories.includes(categoryName)) {
                    toolMap.get(name).categories.push(categoryName);
                }
            });
        } else {
            toolMap.set(name, {
                description: description || '',
                categories: normalizedCategories,
                url1,
                url1Name,
                url2,
                url2Name,
                url3,
                url3Name,
                url4,
                url4Name
            });
        }
    });

    return toolMap;
}

function createToolCard(name, data) {
    const card = document.createElement('div');
    card.className = 'tool-card glass-panel';
    card.dataset.category = data.categories.join('\u001f');
    card.dataset.name = name;
    card.dataset.search = [
        name,
        data.description || '',
        data.categories.join(' '),
        data.url1Name || '',
        data.url2Name || '',
        data.url3Name || '',
        data.url4Name || ''
    ].join(' ').toLowerCase();

    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = favorites.includes(name) ? 'fav-btn active' : 'fav-btn';
    favBtn.setAttribute('aria-label', `加入收藏：${name}`);
    favBtn.title = '加入我的收藏';
    favBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    favBtn.addEventListener('click', () => window.toggleFavorite(name, favBtn));

    const header = document.createElement('div');
    header.className = 'card-header';

    const icon = document.createElement('div');
    icon.className = 'card-icon';
    icon.appendChild(createIconNode(data.categories[0]));

    if (data.categories[0].includes('新手推薦') || data.categories[0].includes('精選必備')) {
        icon.style.color = 'var(--color-background)';
        icon.style.background = 'var(--color-text-primary)';
        icon.style.borderColor = 'transparent';
        icon.title = '精選推薦';
        icon.replaceChildren(createIconNode('新手推薦'));
    }

    const title = document.createElement('h4');
    title.className = 'tool-name';
    title.textContent = name;

    header.append(icon, title);

    const description = document.createElement('p');
    description.className = 'tool-description';
    description.title = data.description || '';
    description.textContent = data.description || '';

    const buttons = document.createElement('div');
    buttons.className = 'card-buttons';

    for(let i = 1; i <= 4; i++) {
        const safeUrl = getSafeExternalUrl(data[`url${i}`]);
        if (safeUrl) {
            const wrap = document.createElement('div');
            wrap.className = 'button-wrap';

            const button = document.createElement('button');
            button.type = 'button';
            button.addEventListener('click', () => openExternalLink(safeUrl));

            const label = document.createElement('span');
            label.textContent = data[`url${i}Name`] || '開啟工具';

            button.appendChild(label);
            wrap.appendChild(button);
            buttons.appendChild(wrap);
        }
    }

    card.append(favBtn, header, description, buttons);
    return card;
}

function renderToolsFromCSV(csvText) {
    const toolGrid = document.getElementById('tool-grid');
    const toolMap = parseToolsFromCSV(csvText);
    const sortedTools = Array.from(toolMap.entries());
    const fragment = document.createDocumentFragment();

    sortedTools.forEach(([name, data]) => {
        fragment.appendChild(createToolCard(name, data));
    });

    toolGrid.replaceChildren(fragment);
    showReadyUI();
    updateAllHearts();
    executeSearch();

    return Array.from(toolMap.values());
}

async function loadToolsFromSheet(sheetUrl) {
    let renderedTools = [];
    const cachedSheet = readCachedSheetText();

    if (cachedSheet) {
        renderedTools = renderToolsFromCSV(cachedSheet.csvText);
    }

    try {
        const csvText = await fetchSheetText(sheetUrl);
        if (!cachedSheet || cachedSheet.csvText !== csvText) {
            renderedTools = renderToolsFromCSV(csvText);
        }
        writeCachedSheetText(csvText);
        return renderedTools;
    } catch (error) {
        console.warn('工具資料讀取失敗，改用快取資料', error);
        if (renderedTools.length > 0) return renderedTools;

        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = '資料載入失敗，請確認網路或 Google Sheet 發佈設定。';
        }
        return [];
    }
}

window.switchCategory = function(categoryName) {
    if (categoryName === '我的收藏' && !currentUser) {
        alert('💡 請先點擊右上角登入，才能查看專屬收藏清單喔！');
        return;
    }

    const navContainer = document.getElementById('nav-container');
    const btns = navContainer.querySelectorAll('.nav-btn');
    
    btns.forEach(t => {
        t.classList.remove('active');
        if(t.dataset.filter === categoryName) {
            t.classList.add('active');
        }
    });
    
    window.activeFilter = categoryName;
    setSectionTitle(window.activeFilter);
    updateSkillGuideVisibility();
    document.getElementById('content-area').scrollTo(0,0);
}

function generateNavButtons() {
    const navContainer = document.getElementById('nav-container');
    const fragment = document.createDocumentFragment();
    
    getVisibleCategories().forEach(category => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = category === window.activeFilter ? 'nav-btn active' : 'nav-btn';
        btn.dataset.filter = category;
        btn.appendChild(createIconNode(category));

        const label = document.createElement('span');
        label.textContent = category;
        btn.appendChild(label);

        btn.addEventListener('click', (e) => {
            const targetCat = e.currentTarget.dataset.filter;
            const searchInput = document.getElementById('search-input');
            if(searchInput.value !== '') {
                searchInput.value = '';
                document.getElementById('clear-btn').style.display = 'none';
            }

            window.switchCategory(targetCat);
            
            // 手機版自動收起選單
            if(window.innerWidth <= 768 && targetCat !== '我的收藏' || (targetCat === '我的收藏' && currentUser)) {
                document.getElementById('sidebar').classList.remove('active');
                document.getElementById('sidebar-overlay').classList.remove('active');
            }
            
            executeSearch();
        });

        fragment.appendChild(btn);
    });

    navContainer.replaceChildren(fragment);
}

let searchFrame = null;
function scheduleSearch() {
    if (searchFrame) cancelAnimationFrame(searchFrame);
    searchFrame = requestAnimationFrame(() => {
        searchFrame = null;
        executeSearch();
    });
}

function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-btn');
    
    searchInput.addEventListener('input', () => {
        const isTyping = searchInput.value.trim().length > 0;
        clearBtn.style.display = isTyping ? 'block' : 'none';
        
        if (isTyping && window.activeFilter !== '全部工具') {
            window.switchCategory('全部工具');
        }
        
        scheduleSearch();
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        scheduleSearch();
        searchInput.focus();
    });
}

window.executeSearch = function() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const toolCards = document.querySelectorAll('.tool-card');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let hasVisible = false;
    let delayIndex = 0;

    toolCards.forEach(card => {
        const categories = (card.dataset.category || '').split('\u001f');
        const name = card.dataset.name;
        const text = card.dataset.search || '';
        
        let filterMatch = false;
        if(window.activeFilter === '我的收藏') {
            filterMatch = favorites.includes(name);
        } else {
            filterMatch = (window.activeFilter === '全部工具' || categories.includes(window.activeFilter));
        }

        const searchMatch = (searchTerm === '' || text.includes(searchTerm));
        
        if (filterMatch && searchMatch) {
            card.classList.remove('hidden');
            card.style.opacity = '';
            if (!reduceMotion && delayIndex < 24) {
                card.style.animation = `fadeSlideUp 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) forwards ${delayIndex * 0.025}s`;
            } else {
                card.style.animation = 'none';
                card.style.opacity = '1';
            }
            delayIndex++;
            hasVisible = true;
        } else {
            card.classList.add('hidden');
            card.style.animation = 'none'; 
            card.style.opacity = '0';
        }
    });

    let noMsg = document.getElementById('no-results');
    if (!hasVisible) {
        if (!noMsg) {
            const grid = document.getElementById('tool-grid');
            noMsg = document.createElement('h3');
            noMsg.id = 'no-results';
            Object.assign(noMsg.style, {
                textAlign: 'center',
                gridColumn: '1 / -1',
                opacity: '0.6',
                paddingTop: '40px',
                fontWeight: '400',
                animation: 'fadeIn 0.5s forwards'
            });
            grid.appendChild(noMsg);
        }

        noMsg.textContent = window.activeFilter === 'Skill 專區'
            ? 'Skill 即將上架，敬請期待。'
            : window.activeFilter === '學習遊戲'
                ? '請在 Google Sheet 的「分類標籤」填寫「學習遊戲」，這裡就會顯示遊戲。'
                : '尚未收藏工具，或找不到符合的結果。';
    } else if (hasVisible && noMsg) {
        noMsg.remove();
    }
    
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) loadingMsg.remove();
}

function initializeParticles(theme = 'dark') {
    if (!window.tsParticles || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const container = window.tsParticles.domItem(0);
    if(container) container.destroy();

    const baseConfig = {
        fpsLimit: 60, background: { color: { value: "transparent" } },
        particles: {
            number: { value: 15, density: { enable: true, area: 800 } },
            shape: { type: "circle" },
            opacity: { value: { min: 0.05, max: 0.15 } },
            size: { value: { min: 1, max: 2 } },
            links: { enable: true, distance: 150, opacity: 0.05, width: 1 },
            move: { enable: true, speed: 0.5, direction: "none", random: true }
        },
        detectRetina: true,
    };
    if (theme === 'light') {
        baseConfig.particles.color = { value:["#3E2723", "#6F4E37"] };
        baseConfig.particles.links.color = "#6F4E37";
        baseConfig.particles.opacity = { value: { min: 0.1, max: 0.2 } };
    } else {
        baseConfig.particles.color = { value:["#ffffff"] };
        baseConfig.particles.links.color = "#ffffff";
    }
    window.tsParticles.load({ id: "tsparticles", options: baseConfig });
}
