"""Testes locais dos limites do executor; não inicia serviços nem usa credenciais."""
from pathlib import Path
from unittest.mock import patch
import json
import subprocess
import unittest
import run


class RunnerSafety(unittest.TestCase):
    def test_only_fixed_loopback_services(self):
        for url in ['https://example.test', 'http://localhost:54321', 'http://127.0.0.1:54322',
                    'http://127.0.0.1:54321@external.test', 'http://user:pass@127.0.0.1:54321',
                    'http://127.0.0.1:54321/#token']:
            with self.assertRaises(run.Failure):
                run.local(url)
        self.assertEqual(run.local(run.API), run.API)
        self.assertEqual(run.local(run.MAIL), run.MAIL)

    def test_redirects_are_not_followed(self):
        self.assertIsNone(run.NoRedirect().redirect_request(None, None, None, None, None, None))

    def test_mail_link_extraction_never_uses_remote_service(self):
        content = json.dumps({'HTML': '<a href="http://127.0.0.1:54321/auth/v1/verify?token=synthetic&amp;type=signup">Confirm</a>'})
        self.assertEqual(run.Stack.extract_link(content), run.API + '/auth/v1/verify?token=synthetic&type=signup')
        self.assertIsNone(run.Stack.extract_link('https://real-project.supabase.co/auth/v1/verify?token=synthetic'))

    def test_config_changes_only_selected_section(self):
        config = '[auth]\nenable_signup = true\n[auth.email]\nenable_confirmations = false\n'
        updated = run.setting(config, 'auth.email', 'enable_confirmations', 'true')
        self.assertIn('[auth]\nenable_signup = true', updated)
        self.assertIn('[auth.email]\nenable_confirmations = true', updated)
        self.assertIn('[auth.mfa.totp]\nenroll_enabled = true', run.setting(updated, 'auth.mfa.totp', 'enroll_enabled', 'true'))

    def test_command_filters_inherited_project_environment(self):
        result = subprocess.CompletedProcess([], 0, stdout='', stderr='')
        with patch.dict(run.os.environ, {'SUPABASE_ACCESS_TOKEN': 'synthetic', 'NEXT_PUBLIC_SUPABASE_URL': 'synthetic', 'DATABASE_URL': 'synthetic'}):
            with patch.object(run.subprocess, 'run', return_value=result) as execute:
                run.command(['supabase', 'status'], 'synthetic test')
                env = execute.call_args.kwargs['env']
                self.assertNotIn('SUPABASE_ACCESS_TOKEN', env)
                self.assertNotIn('NEXT_PUBLIC_SUPABASE_URL', env)
                self.assertNotIn('DATABASE_URL', env)

    def test_failure_never_reproduces_raw_cli_output(self):
        result = subprocess.CompletedProcess([], 1, stdout='synthetic-private', stderr='synthetic-private')
        with patch.object(run.subprocess, 'run', return_value=result):
            with self.assertRaises(run.Failure) as raised:
                run.command(['synthetic'], 'local phase')
            self.assertNotIn('synthetic-private', str(raised.exception))

    def test_no_scaffold_or_external_project_in_workflow(self):
        workflow = (Path(__file__).resolve().parents[3] / '.github/workflows/identity-supabase.yml').read_text()
        self.assertNotIn('${{ secrets.', workflow)
        self.assertNotIn('pull_request_target', workflow)
        self.assertIn('contents: read', workflow)
        self.assertIn('sha256sum --check', workflow)
        self.assertNotIn('supabase link', workflow)
        self.assertNotIn('--linked', workflow)


if __name__ == '__main__':
    unittest.main(verbosity=2)
