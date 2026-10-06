import { appendSparkSkillActions, readSkillMarkdown } from '../assets/js/spark-skills.js';
const main = document.querySelector('[data-skill-config]');
if (main) {
    const skill = JSON.parse(main.dataset.skillConfig);
    appendSparkSkillActions(main.querySelector('.actions'), skill);
    const pre = main.querySelector('[data-skill-source] pre');
    readSkillMarkdown(skill).then(text => { pre.textContent = text; })
        .catch(error => { pre.textContent = error.message; });
}
