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
    const page = new URL(skill.page_path || `spark-skills/${skill.skill}/`, document.baseURI);
    const source = skill.planned_url;
    const name = skill.display_name || skill.name;
    const prompt = skill.install_type === 'repository'
        ? repositoryInstallationPrompt(skill)
        : `請讀取以下網址的完整 SKILL.md，依內容建立並儲存一個 Gemini Spark 技能，名稱為「${name}」。保留完整任務流程、評分規準與輸出格式。這次只建立技能，先不要執行技能中的任務。若無法讀取網址或無法儲存技能，請明確告訴我，不要宣稱安裝成功。\n${source}`;
    const nextStep = skill.install_type === 'repository' ? '你的 AI 助手' : 'Gemini Spark';
    buttons.dataset.sparkSkill = skill.skill;
    const status = document.createElement('p');
    status.className = 'spark-install-status';
    status.setAttribute('role', 'status');
    const fallback = document.createElement('textarea');
    fallback.className = 'spark-install-fallback';
    fallback.readOnly = true;
    fallback.hidden = true;
    fallback.setAttribute('aria-label', '可手動複製的安裝指令');
    for (const action of ['查看 Skill', '複製安裝']) {
        const wrap = document.createElement('div');
        wrap.className = 'button-wrap';
        const button = document.createElement('button');
        button.type = 'button';
        const label = document.createElement('span');
        label.textContent = action;
        button.append(label);
        button.addEventListener('click', async () => {
            if (action === '查看 Skill') {
                window.location.assign(page.href + '?view=1');
                return;
            }
            fallback.value = prompt;
            try {
                await navigator.clipboard.writeText(prompt);
                fallback.hidden = true;
                status.textContent = `已複製安裝指令，請貼到${nextStep}。`;
                label.textContent = '已複製';
                setTimeout(() => { label.textContent = action; }, 2500);
            } catch {
                fallback.hidden = false;
                fallback.focus();
                fallback.select();
                status.textContent = `請複製下方已選取的安裝指令，貼到${nextStep}。`;
            }
        });
        wrap.append(button);
        buttons.append(wrap);
    }
    buttons.append(status, fallback);
}

export function repositoryInstallationPrompt(skill) {
    return `請從以下 GitHub 專案安裝技能「${skill.display_name || skill.name}」。先閱讀 SKILL.md 與 README，僅安裝下列技能資料夾及必要的附屬檔案，保留完整流程與輸出格式，勿安裝專案中的其他技能。請依目前 AI 平台支援的方式安裝；若在 Gemini Spark，請依內容建立並儲存技能，缺少本機工具或附件時明確說明。這次只安裝，先不要執行技能中的任務。確認可使用後再回報；無法讀取來源或安裝時，請說明原因，不要宣稱安裝成功。\n專案：${skill.repository_url}\n技能檔：${skill.planned_url}\n技能資料夾：${skill.skill_folder}`;
}
