function installationPrompt(element) {
  const source = new URL(element.dataset.installSource || element.dataset.source, window.location.href);
  if ((source.origin !== window.location.origin && source.origin !== 'https://chunsheng612.github.io') || !source.pathname.endsWith('/SKILL.md')) {
    throw new Error('技能來源網址格式不正確。');
  }
  return `請讀取以下網址的完整 SKILL.md，依內容建立並儲存一個 Gemini Spark 技能，名稱為「${element.dataset.title}」。保留完整任務流程、評分規準與輸出格式。這次只建立技能，先不要執行技能中的任務。若無法讀取網址或無法儲存技能，請明確告訴我，不要宣稱安裝成功。\n${source.href}`;
}

for (const button of document.querySelectorAll('[data-copy-install]')) {
  button.addEventListener('click', async () => {
    const scope = button.closest('[data-skill]');
    const status = scope.querySelector('[data-status]');
    const fallback = scope.querySelector('[data-copy-fallback]');
    const textarea = fallback.querySelector('textarea');
    try {
      const prompt = installationPrompt(button);
      // A visible fallback also lets users inspect exactly what will be installed.
      textarea.value = prompt;
      await navigator.clipboard.writeText(prompt);
      fallback.hidden = true;
      status.textContent = '已複製安裝指令，請貼到 Gemini Spark。';
      button.textContent = '已複製';
      window.setTimeout(() => { button.textContent = '複製安裝'; }, 2500);
    } catch (error) {
      fallback.hidden = false;
      if (!textarea.value) {
        status.textContent = error.message || '無法建立安裝指令。';
        return;
      }
      textarea.focus();
      textarea.select();
      status.textContent = '瀏覽器未允許自動複製，請複製下方已選取的安裝指令。';
    }
  });
}

const viewButton = document.querySelector('[data-view-skill]');
if (viewButton) {
  let loaded = false;
  viewButton.addEventListener('click', async () => {
    const section = document.querySelector('[data-skill-source]');
    section.hidden = !section.hidden;
    viewButton.setAttribute('aria-expanded', String(!section.hidden));
    viewButton.textContent = section.hidden ? '查看 Skill' : '收起 Skill';
    if (section.hidden || loaded) return;
    const pre = section.querySelector('pre');
    pre.textContent = '正在讀取完整技能內容…';
    try {
      const response = await fetch(viewButton.dataset.source);
      if (!response.ok) throw new Error('無法讀取技能內容，請稍後再試。');
      const text = await response.text();
      if (!text.startsWith('---\n')) throw new Error('技能檔案格式不正確，請稍後再試。');
      pre.textContent = text;
      loaded = true;
    } catch (error) {
      pre.textContent = error.message;
    }
  });
}

const search = document.querySelector('[data-search]');
if (viewButton && new URLSearchParams(window.location.search).get('view') === '1') {
  viewButton.click();
}
if (search) {
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const row of document.querySelectorAll('.skill-row')) {
      row.hidden = !row.dataset.search.toLocaleLowerCase().includes(query);
      if (!row.hidden) visible++;
    }
    document.querySelector('[data-count]').textContent = `${visible} 個 Skill`;
  });
}
