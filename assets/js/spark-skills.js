let skills = [];

export async function loadSparkSkills() {
    try {
        const response = await fetch(new URL('spark-skills/catalog.json', document.baseURI), { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('Skill 目錄讀取失敗');
        skills = (await response.json()).filter(row => /^funfun-gem-[a-f0-9]+$/.test(row.skill));
    } catch (error) {
        console.warn('Skill 目錄暫時無法讀取', error);
        skills = [];
    }
}

export function mergeSparkSkills(toolMap) {
    for (const skill of skills) {
        const match = Array.from(toolMap.values()).find(data => [1, 2, 3, 4].some(i => {
            try { return new URL(data[`url${i}`]).pathname.includes(`/spark-skills/${skill.skill}/`); }
            catch { return false; }
        }));
        const data = match || { description: skill.short_description, categories: ['Skill 專區'] };
        data.displayName = skill.display_name || skill.name.replace(/^FunFun\.AI[\s-]*/i, '').trim() + '-Skill';
        data.sparkSkill = skill;
        if (!data.categories.includes('Skill 專區')) data.categories.push('Skill 專區');
        if (!match) toolMap.set(`spark:${skill.skill}`, data);
    }
    return toolMap;
}

export function appendSparkSkillActions(buttons, skill, openLink) {
    const page = new URL(`spark-skills/${skill.skill}/`, document.baseURI);
    const source = skill.planned_url;
    const name = skill.display_name || skill.name;
    const prompt = `請讀取以下網址的完整 SKILL.md，依內容建立並儲存一個 Gemini Spark 技能，名稱為「${name}」。保留完整任務流程、評分規準與輸出格式。這次只建立技能，先不要執行技能中的任務。若無法讀取網址或無法儲存技能，請明確告訴我，不要宣稱安裝成功。\n${source}`;
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
                openLink(page.href + '?view=1');
                return;
            }
            fallback.value = prompt;
            try {
                await navigator.clipboard.writeText(prompt);
                fallback.hidden = true;
                status.textContent = '已複製安裝指令，請貼到 Gemini Spark。';
                label.textContent = '已複製';
                setTimeout(() => { label.textContent = action; }, 2500);
            } catch {
                fallback.hidden = false;
                fallback.focus();
                fallback.select();
                status.textContent = '請複製下方已選取的安裝指令，貼到 Gemini Spark。';
            }
        });
        wrap.append(button);
        buttons.append(wrap);
    }
    buttons.append(status, fallback);
}
