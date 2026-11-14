"""Verificações unitárias do executor; não são evidência de navegador real."""
import base64
import json
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch
import unittest
import run_browser as runner


class BrowserSafety(unittest.TestCase):
    def test_copy_does_not_contain_environment_files(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(runner.os.environ, {'APP_URL': 'https://external.test', 'DATABASE_URL': 'synthetic', 'NEXT_PUBLIC_SUPABASE_URL': 'https://external.test'}):
                application = runner.Application(directory, 'synthetic-local-key')
            self.assertEqual(list(Path(directory).rglob('.env*')), [])
            self.assertEqual(application.env['APP_URL'], runner.APP)
            self.assertEqual(application.env['NEXT_PUBLIC_SUPABASE_URL'], runner.API)
            self.assertEqual(application.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'], 'synthetic-local-key')
            self.assertNotIn('DATABASE_URL', application.env)
            self.assertFalse((Path(directory) / 'supabase').exists())

    def test_browser_network_guard(self):
        for url, allowed in [(runner.APP + '/login', True), (runner.API + '/auth/v1/verify', True),
                             ('https://external.test', False), ('http://127.0.0.1:9999', False)]:
            route = SimpleNamespace(request=SimpleNamespace(url=url), continue_=Mock(), abort=Mock())
            runner.guard(route)
            self.assertEqual(route.continue_.called, allowed)
            self.assertEqual(route.abort.called, not allowed)

    def test_cookie_decoding_is_controller_only_and_never_logs_value(self):
        value = base64.urlsafe_b64encode(json.dumps({'access_token': 'synthetic'}).encode()).decode().rstrip('=')
        context = SimpleNamespace(cookies=lambda origin: [{'name': 'sb-loopback-auth-token', 'value': 'base64-' + value,
                                                          'httpOnly': True, 'secure': True, 'sameSite': 'Lax'}])
        with patch.object(runner, 'check') as check:
            self.assertEqual(runner.token(context), 'synthetic')
            self.assertTrue(check.call_args.args[0])
            self.assertNotIn('synthetic', check.call_args.args[2])

    def test_runner_refuses_non_github_environment(self):
        with patch.dict(runner.os.environ, {'GITHUB_ACTIONS': 'false'}):
            with self.assertRaises(runner.Failure):
                runner.main()

    def test_workflow_does_not_use_real_secrets_or_record_browser_state(self):
        workflow = (runner.ROOT / '.github/workflows/identity-browser.yml').read_text()
        self.assertNotIn('${{ secrets.', workflow)
        self.assertNotIn('pull_request_target', workflow)
        self.assertIn('persist-credentials: false', workflow)
        self.assertIn('sha256sum --check', workflow)
        source = Path(runner.__file__).read_text()
        for forbidden in ['record_video_dir=', '.tracing.start(', '.storage_state(', '.screenshot(']:
            self.assertNotIn(forbidden, source)


if __name__ == '__main__':
    unittest.main(verbosity=2)
