"""Unit safety checks; not a substitute for the restore rehearsal."""
from pathlib import Path
import hashlib
import unittest
import local_stack as local

BASE = Path(__file__).resolve().parent


class Safety(unittest.TestCase):
    def test_external_http_rejected(self):
        for url in ['https://example.com', 'http://localhost:54321', 'http://127.0.0.1:80', 'http://a:b@127.0.0.1:54321']:
            with self.assertRaises(local.Failure):
                local.local(url)

    def test_local_http_allowed(self):
        self.assertEqual(local.local('http://127.0.0.1:54321/auth/v1/health'), 'http://127.0.0.1:54321/auth/v1/health')

    def test_workflow_no_secrets_or_artifacts(self):
        workflow = (BASE.parents[1] / '.github/workflows/backup-rehearsal.yml').read_text()
        self.assertNotIn('secrets.', workflow)
        self.assertNotIn('upload-artifact', workflow)
        self.assertIn('persist-credentials: false', workflow)

    def test_only_explicit_local_dumps(self):
        runner = (BASE / 'run.py').read_text()
        self.assertIn("'dump', '--local'", runner)
        self.assertNotIn('--db-url', runner)
        self.assertNotIn('--linked', runner)
        self.assertIn("'ja-backup-source'", runner)
        self.assertIn("'ja-backup-target'", runner)

    def test_fixture_is_frozen(self):
        self.assertEqual(hashlib.sha256((BASE / 'fixtures/identity.sql').read_bytes()).hexdigest(),
                         '11a9c36267d91e59df44aa0ad4863598c397954c5e4a4758913b5f6c9e0629e2')

    def test_no_env_loading_and_no_raw_logging(self):
        helper = (BASE / 'local_stack.py').read_text()
        self.assertIn("k.startswith(('SUPABASE_', 'NEXT_PUBLIC_SUPABASE_'))", helper)
        self.assertNotIn('load_dotenv', helper)
        self.assertIn('capture_output=True', helper)


if __name__ == '__main__':
    unittest.main()
