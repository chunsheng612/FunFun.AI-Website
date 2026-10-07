let skills = [];

export async function loadSparkSkills() {
    try {
        const catalogs = await Promise.allSettled(['spark-skills/catalog.json', 'skill-pages/catalog.json'].map(async path => {
            const response = await fetch(new URL(path, document.baseURI), { signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error(`Skill 目錄讀取失敗：${path}`);
            return (await response.json()).filter(row => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.skill));
        }));
        skills = catalogs.flatMap(result => {
            if (result.status === 'fulfilled') return result.value;
            console.warn('Skill 目錄暫時無法讀取', result.reason);
            return [];
        });
    } catch (error) {
        console.warn('Skill 目錄暫時無法讀取', error);
        skills = [];
    }
}

export function mergeSparkSkills(toolMap) {
    for (const skill of skills) {
        const match = Array.from(toolMap.values()).find(data => [1, 2, 3, 4].some(i => {
            try {
                const url = new URL(data[`url${i}`]);
                return url.href === skill.page_url || (skill.aliases || []).includes(url.href.replace(/\/$/, '')) ||
                    url.pathname.includes(`/spark-skills/${skill.skill}/`);
            }
            catch { return false; }
        }));
        const data = match || { description: skill.short_description, categories: [...(skill.categories || ['Skill 專區'])] };
        data.displayName = skill.display_name || skill.name.replace(/^FunFun\.AI[\s-]*/i, '').trim() + '-Skill';
        data.sparkSkill = skill;
        if (!data.categories.includes('Skill 專區')) data.categories.push('Skill 專區');
        if (!match) toolMap.set(`spark:${skill.skill}`, data);
    }
    return toolMap;
}

export function appendSparkSkillActions(buttons, skill, openLink) {
    buttons.dataset.sparkSkill = skill.skill;
    const status = document.createElement('p');
    status.className = 'spark-install-status';
    status.setAttribute('role', 'status');
    const fallback = document.createElement('textarea');
    fallback.className = 'spark-install-fallback';
    fallback.readOnly = true;
    fallback.hidden = true;
    fallback.setAttribute('aria-label', '可手動複製的技能內容或資料夾連結');
    for (const action of ['Gemini生成技能', 'Agent安裝技能', '原始來源', '複製原始prompt']) {
        const wrap = document.createElement('div');
        wrap.className = 'button-wrap';
        const button = document.createElement('button');
        button.type = 'button';
        const label = document.createElement('span');
        label.textContent = action;
        button.append(label);
        button.title = action === 'Gemini生成技能' ? '複製完整 SKILL.md 內容，貼到 Gemini'
            : action === 'Agent安裝技能' ? '複製 GitHub 技能資料夾連結'
            : action === '複製原始prompt' ? '複製原始 prompt 文字' : '開啟原始 GitHub 專案';
        if (action === '複製原始prompt' && !skill.original_prompt_path) {
            button.disabled = true;
            button.title = '此技能未提供原始 prompt';
            button.setAttribute('aria-description', button.title);
            wrap.classList.add('skill-action-unavailable');
            const note = document.createElement('small');
            note.className = 'skill-prompt-unavailable';
            note.textContent = '未提供原始 prompt';
            wrap.append(note);
        }
        if (action === 'Gemini生成技能' || action === '複製原始prompt' && skill.original_prompt_path) {
            const preload = () => (action === 'Gemini生成技能' ? readSkillMarkdown(skill) : readOriginalPrompt(skill)).catch(() => {});
            button.addEventListener('pointerenter', preload);
            button.addEventListener('focus', preload);
        }
        button.addEventListener('click', async () => {
            if (action === '原始來源') {
                window.location.assign(githubLink(skill.repository_url));
                return;
            }
            button.disabled = true;
            fallback.value = '';
            fallback.hidden = true;
            status.textContent = action === 'Gemini生成技能' ? '正在讀取完整 SKILL.md…'
                : action === '複製原始prompt' ? '正在讀取原始 prompt…' : '正在複製 GitHub 資料夾連結…';
            try {
                const text = action === 'Gemini生成技能'
                    ? await readSkillMarkdown(skill)
                    : action === '複製原始prompt' ? await readOriginalPrompt(skill) : githubLink(skill.folder_url);
                fallback.value = text;
                await navigator.clipboard.writeText(text);
                fallback.hidden = true;
                status.textContent = action === 'Gemini生成技能'
                    ? '已複製完整 SKILL.md 內容，請貼到 Gemini 生成技能。'
                    : action === '複製原始prompt' ? '已複製原始 prompt。'
                    : '已複製 GitHub 技能資料夾連結，請貼到你的 Agent 安裝。';
            } catch (error) {
                if (!fallback.value) {
                    status.textContent = error.message || '無法讀取技能內容，請稍後再試。';
                    return;
                }
                fallback.hidden = false;
                fallback.focus();
                fallback.select();
                status.textContent = '瀏覽器未允許自動複製，請複製下方已選取的內容。';
            } finally {
                button.disabled = false;
            }
        });
        wrap.prepend(button);
        buttons.append(wrap);
    }
    buttons.append(status, fallback);
}

function githubLink(value) {
    const url = new URL(value);
    if (url.origin !== 'https://github.com' || url.username || url.password) throw new Error('GitHub 來源網址格式不正確。');
    return url.href;
}

const markdownCache = new Map();
export async function readSkillMarkdown(skill) {
    const path = skill.page_path || `spark-skills/${skill.skill}/`;
    const url = new URL(path + 'SKILL.md', new URL('../../', import.meta.url));
    if (url.origin !== location.origin || !url.pathname.endsWith('/SKILL.md')) throw new Error('技能來源網址格式不正確。');
    if (!markdownCache.has(url.href)) {
        const request = fetch(url, {signal: AbortSignal.timeout(15000)})
            .then(async response => {
                if (!response.ok) throw new Error('無法讀取 SKILL.md，請稍後再試。');
                const text = await response.text();
                if (!/^---\r?\n/.test(text)) throw new Error('技能檔案格式不正確。');
                return text;
            }).catch(error => {
                markdownCache.delete(url.href);
                if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('讀取 SKILL.md 逾時，請再按一次重試。');
                throw error;
            });
        markdownCache.set(url.href, request);
    }
    return markdownCache.get(url.href);
}

const promptCache = new Map();
export async function readOriginalPrompt(skill) {
    if (!skill.original_prompt_path) throw new Error('此技能未提供原始 prompt。');
    const url = new URL(skill.original_prompt_path, new URL('../../', import.meta.url));
    if (url.origin !== location.origin || !url.pathname.endsWith('/original-prompt.txt')) throw new Error('原始 prompt 來源網址格式不正確。');
    if (!promptCache.has(url.href)) {
        const request = fetch(url, {signal: AbortSignal.timeout(15000)})
            .then(async response => {
                if (!response.ok) throw new Error('無法讀取原始 prompt，請稍後再試。');
                const text = await response.text();
                if (!text.trim()) throw new Error('此技能未提供原始 prompt。');
                return text;
            }).catch(error => {
                promptCache.delete(url.href);
                if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('讀取原始 prompt 逾時，請再按一次重試。');
                throw error;
            });
        promptCache.set(url.href, request);
    }
    return promptCache.get(url.href);
}
