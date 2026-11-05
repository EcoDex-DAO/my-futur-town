#!/usr/bin/env python3
"""Prepare a reviewable application rollback; never rewind Git or database history."""
import argparse
from datetime import datetime, timezone
from pathlib import Path
import re
import subprocess
import uuid

SCOPES = ('frontend', 'backend', 'docker-compose.yml')

def git(repo, *args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True, stderr=subprocess.PIPE).strip()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version', help='Existing release tag, e.g. v0.1.0')
    parser.add_argument('--repo', type=Path, default=Path.cwd())
    parser.add_argument('--base', default='origin/main', help='Base containing the current migrations')
    parser.add_argument('--prepare', action='store_true', help='Actually create the branch and stage application files; otherwise inspect only')
    args = parser.parse_args()
    if not re.fullmatch(r'v\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?', args.version):
        parser.error('Use an explicit version tag, e.g. v0.1.0')
    repo = Path(git(args.repo, 'rev-parse', '--show-toplevel'))
    target = git(repo, 'rev-parse', '--verify', f'refs/tags/{args.version}^{{commit}}')
    base = git(repo, 'rev-parse', '--verify', args.base+'^{commit}')
    for scope in SCOPES:
        git(repo, 'cat-file', '-e', f'{target}:{scope}')
    print(f'Target {args.version}: {target}\nBase: {base}\nApplication paths: '+', '.join(SCOPES))
    print('Preserved: supabase/migrations, database data, scenarios, Git history, ignored environment files.')
    if not args.prepare:
        print('Inspection only. Add --prepare to create a review branch; no commit, push or deployment is automatic.')
        return
    if git(repo, 'status', '--porcelain'):
        raise SystemExit('Refusing rollback preparation: commit or preserve existing tracked/untracked changes first.')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    branch=f'rollback/{args.version}-{stamp}-{uuid.uuid4().hex[:6]}'
    git(repo,'switch','--create',branch,base)
    # Explicit scope deliberately excludes migrations, import snapshots and secrets.
    git(repo,'restore','--source',target,'--staged','--worktree','--',*SCOPES)
    plan=repo/'docs'/'rollbacks'/f'{stamp}-{uuid.uuid4().hex[:6]}.md'
    plan.parent.mkdir(parents=True,exist_ok=True)
    plan.write_text(f'# Application rollback to {args.version}\n\nBase: `{base}`\n\nTarget: `{target}`\n\nOnly frontend, backend and Docker Compose are restored. Database migrations and scenario data are retained. Run the build, relevant tests and compatibility checks before committing and opening a PR. This plan does not deploy anything.\n')
    git(repo,'add','--',str(plan.relative_to(repo)))
    print(f'Prepared {branch}. Review staged changes, test, commit and open a PR. No reset, force-push or SQL rollback was performed.')

if __name__=='__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit('Git operation failed: '+error.stderr.strip())
