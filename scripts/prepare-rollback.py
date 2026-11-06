#!/usr/bin/env python3
"""Prepare a reviewable application rollback; never rewind Git or database history."""
import argparse
from datetime import datetime, timezone
from pathlib import Path
import re
import subprocess
import uuid

LEGACY_SCOPES = ('frontend', 'backend', 'docker-compose.yml')
NEXT_SCOPES = ('src', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
               'next.config.ts', 'tsconfig.json', 'next-env.d.ts', 'Dockerfile',
               'docker-compose.yml', 'vercel.json')

def git(repo, *args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True, stderr=subprocess.PIPE).strip()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version', help='Existing release tag, e.g. v0.1.0')
    parser.add_argument('--repo', type=Path, default=Path.cwd())
    parser.add_argument('--base', default='HEAD', help='Base retaining the current migrations and reference archives (default: HEAD)')
    parser.add_argument('--prepare', action='store_true', help='Actually create the branch and stage application files; otherwise inspect only')
    args = parser.parse_args()
    if not re.fullmatch(r'v\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?', args.version):
        parser.error('Use an explicit version tag, e.g. v0.1.0')
    repo = Path(git(args.repo, 'rev-parse', '--show-toplevel'))
    target = git(repo, 'rev-parse', '--verify', f'refs/tags/{args.version}^{{commit}}')
    base = git(repo, 'rev-parse', '--verify', args.base+'^{commit}')
    # A deployed DB may already contain migrations that main does not yet track.
    # Never base a rollback on a tree that omits or rewrites current protected files.
    def protected_tree(ref):
        output=git(repo,'ls-tree','-r',ref,'--','supabase/migrations','data/reference')
        return {line.split('\t',1)[1]:line.split('\t',1)[0] for line in output.splitlines() if '\t' in line}
    current=protected_tree('HEAD'); proposed=protected_tree(base)
    if any(proposed.get(path)!=object_id for path,object_id in current.items()):
        raise SystemExit('Refusing rollback base: current migrations or reference archives would be lost/changed. Use HEAD or a base retaining them.')
    def has_path(ref, path):
        return subprocess.run(['git', 'cat-file', '-e', f'{ref}:{path}'], cwd=repo,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if has_path(base, 'frontend') and has_path(target, 'frontend'):
        scopes = LEGACY_SCOPES
    elif has_path(base, 'next.config.ts') and has_path(target, 'next.config.ts'):
        scopes = NEXT_SCOPES
    else:
        raise SystemExit('Refusing rollback across application layouts; prepare a manual migration-aware rollback.')
    for scope in scopes:
        git(repo, 'cat-file', '-e', f'{target}:{scope}')
    print(f'Target {args.version}: {target}\nBase: {base}\nApplication paths: '+', '.join(scopes))
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
    git(repo,'restore','--source',target,'--staged','--worktree','--',*scopes)
    plan=repo/'docs'/'rollbacks'/f'{stamp}-{uuid.uuid4().hex[:6]}.md'
    plan.parent.mkdir(parents=True,exist_ok=True)
    plan.write_text(f'# Application rollback to {args.version}\n\nBase: `{base}`\n\nTarget: `{target}`\n\nApplication paths restored: {", ".join(scopes)}. Database migrations and scenario data are retained. Run the build, relevant tests and compatibility checks before committing and opening a PR. This plan does not deploy anything.\n')
    git(repo,'add','--',str(plan.relative_to(repo)))
    print(f'Prepared {branch}. Review staged changes, test, commit and open a PR. No reset, force-push or SQL rollback was performed.')

if __name__=='__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit('Git operation failed: '+error.stderr.strip())
