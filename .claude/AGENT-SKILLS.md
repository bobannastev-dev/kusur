# agent-skills (Addy Osmani)

Извор: https://github.com/addyosmani/agent-skills, commit `2686b62` (2026-09-25, верзија 0.6.11), MIT лиценца (`AGENT-SKILLS-LICENSE`).

Инсталирано само за овој проект:

- `skills/` — 25 вештини (spec, plan, TDD, review, ship…)
- `commands/` — `/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, `/ship`, `/constraints`, `/webperf`
- `agents/` — code-reviewer, security-auditor, test-engineer, web-performance-auditor (ги користи `/ship`)
- `references/` — заеднички листи за проверка

Локални измени при инсталација:

- префиксот `agent-skills:` (име на plugin) е отстранет, за вештините да се повикуваат по име;
- патеките `references/<x>.md` кон заедничките листи се сменети во `.claude/references/<x>.md`.

Не се инсталирани: `hooks/` (shell скрипти што се извршуваат автоматски на секоја сесија), `evals/`, `scripts/`, документацијата за други алатки.

Ажурирање: повторно клонирај го repo-то, копирај ги истите папки и повтори ги двете локални измени.
