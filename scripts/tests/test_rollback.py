"""Exercise rollback protection in a disposable Git repository only."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'prepare-rollback.py'

class RollbackTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.repo=Path(self.temp.name)
  self.git('init','-b','main');self.git('config','user.name','Rollback test');self.git('config','user.email','test@example.invalid')
  for folder in ['frontend','backend','supabase/migrations']:(self.repo/folder).mkdir(parents=True)
  (self.repo/'frontend/app.txt').write_text('stable')
  (self.repo/'backend/app.txt').write_text('stable')
  (self.repo/'docker-compose.yml').write_text('stable')
  (self.repo/'supabase/migrations/001.sql').write_text('-- existing')
  self.git('add','.');self.git('commit','-m','stable');self.git('tag','v0.1.0')
  (self.repo/'frontend/app.txt').write_text('new')
  (self.repo/'supabase/migrations/002.sql').write_text('-- must survive rollback')
  self.git('add','.');self.git('commit','-m','next')
 def tearDown(self):self.temp.cleanup()
 def git(self,*args):return subprocess.check_output(['git',*args],cwd=self.repo,text=True,stderr=subprocess.PIPE).strip()
 def run_script(self,*args):return subprocess.run([sys.executable,str(SCRIPT),'v0.1.0','--repo',str(self.repo),'--base','main',*args],text=True,capture_output=True)
 def test_inspection_makes_no_changes(self):
  before=self.git('rev-parse','HEAD');result=self.run_script()
  self.assertEqual(result.returncode,0,result.stderr)
  self.assertEqual(self.git('rev-parse','HEAD'),before)
  self.assertEqual(self.git('status','--porcelain'),'')
 def test_prepared_rollback_keeps_migration_history(self):
  before=self.git('rev-parse','HEAD');result=self.run_script('--prepare')
  self.assertEqual(result.returncode,0,result.stderr)
  self.assertEqual((self.repo/'frontend/app.txt').read_text(),'stable')
  self.assertTrue((self.repo/'supabase/migrations/002.sql').exists())
  self.assertEqual(self.git('rev-parse','HEAD'),before)
  self.assertTrue(self.git('branch','--show-current').startswith('rollback/'))
  self.assertNotIn('supabase/',self.git('diff','--cached','--name-only'))
 def test_refuses_dirty_checkout(self):
  (self.repo/'frontend/app.txt').write_text('user changes')
  result=self.run_script('--prepare')
  self.assertNotEqual(result.returncode,0)
  self.assertEqual((self.repo/'frontend/app.txt').read_text(),'user changes')
  self.assertEqual(self.git('branch','--show-current'),'main')
