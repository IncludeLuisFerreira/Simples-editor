"""Reads issue state from gh CLI and rewrites PROGRESS.md checkboxes."""
import json
import subprocess
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent

def fetch_issues():
    """Returns list of {number, title, state, milestone, labels}."""
    result = subprocess.run(
        ["gh", "issue", "list", "--state", "all", "--limit", "200",
         "--json", "number,title,state,milestone,labels"],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)

def render_progress_md(issues):
    by_sprint = {n: [] for n in range(1, 7)}
    for issue in issues:
        for label in issue["labels"]:
            if label["name"].startswith("sprint-"):
                n = int(label["name"].split("-")[1])
                by_sprint[n].append(issue)
                break

    lines = ["# 📊 Simples Editor — Progresso de Implementação\n"]
    lines.append(f"**Última atualização:** {datetime.now():%Y-%m-%d %H:%M}\n")
    
    # Estatísticas gerais
    total = len(issues)
    closed = sum(1 for i in issues if i["state"] == "CLOSED")
    lines.append(f"**Progresso geral:** {closed}/{total} issues ({closed*100//total if total else 0}%)\n")
    lines.append("---\n")
    
    # Sprints
    sprint_names = {
        1: "Sprint 1 — Fundação e Autenticação",
        2: "Sprint 2 — Editor e Compilador",
        3: "Sprint 3 — Execução e Terminal",
        4: "Sprint 4 — Segurança e Limites",
        5: "Sprint 5 — Observabilidade e Deploy",
        6: "Sprint 6 — Testes e Documentação",
    }
    
    for n in range(1, 7):
        sprint_issues = by_sprint[n]
        if not sprint_issues:
            continue
            
        sprint_closed = sum(1 for i in sprint_issues if i["state"] == "CLOSED")
        sprint_total = len(sprint_issues)
        lines.append(f"\n## {sprint_names[n]} ({sprint_closed}/{sprint_total})\n")
        
        for issue in sorted(sprint_issues, key=lambda x: x["number"]):
            checkbox = "[x]" if issue["state"] == "CLOSED" else "[ ]"
            lines.append(f"- {checkbox} #{issue['number']} {issue['title']}\n")
    
    return "".join(lines)

if __name__ == "__main__":
    issues = fetch_issues()
    (REPO_ROOT / "PROGRESS.md").write_text(render_progress_md(issues))