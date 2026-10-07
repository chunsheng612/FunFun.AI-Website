"""Build all skill detail pages with the shared four-action controls."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
catalogs = ['spark-skills/catalog.json', 'skill-pages/catalog.json']
rows = [row for path in catalogs for row in json.loads((ROOT / path).read_text()) if row.get('skill')]
def escape(value):
    return html.escape(value, quote=True)

for row in rows:
    title = escape(row['display_name'])
    config = {key: row[key] for key in ['skill', 'page_path', 'repository_url', 'folder_url']}
    if row.get('original_prompt_path'):
        config['original_prompt_path'] = row['original_prompt_path']
    if row.get('original_prompt_origin'):
        config['original_prompt_origin'] = row['original_prompt_origin']
    page = f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><link rel="stylesheet" href="../../spark-skills/skill-page.css"><script src="../../spark-skills/skill-page.js" type="module"></script></head><body><main data-skill-config="{escape(json.dumps(config, ensure_ascii=False))}"><a class="back" href="../../?category=Skill%20%E5%B0%88%E5%8D%80">← Skill 專區</a><p class="eyebrow">AI / SKILL</p><h1>{title}</h1><p class="intro">{escape(row['short_description'])}</p><div class="actions"></div><p class="hint">「Gemini生成技能」複製完整 SKILL.md 內容，貼到 Gemini 後請它生成技能。「Agent安裝技能」複製 GitHub 技能資料夾連結。「原始來源」開啟 GitHub 原始專案。提供原始 prompt 的技能，也可點「複製原始prompt」複製提示詞全文。</p><section class="source" data-skill-source><h2>完整 Skill 內容</h2><pre tabindex="0" aria-label="完整技能內容">正在讀取 SKILL.md…</pre></section><p class="secondary"><a href="SKILL.md">開啟 SKILL.md 檔案</a></p></main></body></html>'''
    destination = ROOT / row['page_path']
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'index.html').write_text(page, encoding='utf-8')
print(f'Built {len(rows)} pages with four skill actions.')
