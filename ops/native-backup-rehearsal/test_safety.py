"""Pure unit checks. Integrated recovery is executed only on a disposable runner."""
from pathlib import Path
import hashlib
import io
import os
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import local_stack as local
import native

BASE = Path(__file__).resolve().parent


class Safety(unittest.TestCase):
    def test_external_database_rejected(self):
        for value in ['postgresql://postgres:fake@db.example.test:5432/postgres',
                      'postgresql://postgres:fake@127.0.0.1:5432/postgres',
                      'postgresql://postgres:fake@127.0.0.1:54322/postgres?host=example.test',
                      'postgresql://other:fake@127.0.0.1:54322/postgres']:
            with self.assertRaises(local.Failure):
                native.connection(value)

    def test_local_database_allowed(self):
        self.assertEqual(native.connection('postgresql://postgres:synthetic@127.0.0.1:54322/postgres'), 'synthetic')

    def test_inherited_credentials_removed(self):
        with patch.dict(os.environ, {'PGHOST': 'external', 'PGPASSWORD': 'synthetic', 'SUPABASE_ACCESS_TOKEN': 'synthetic', 'DATABASE_URL': 'synthetic'}):
            env = native.clean_environment()
            self.assertTrue(all(k not in env for k in ('PGHOST', 'PGPASSWORD', 'SUPABASE_ACCESS_TOKEN', 'DATABASE_URL')))

    def test_http_external_rejected(self):
        with self.assertRaises(local.Failure):
            local.local('https://example.test/auth/v1/signup')

    def test_toc_separates_managed_objects(self):
        toc = '''1; 2615 123 SCHEMA - auth supabase_auth_admin
2; 1259 124 TABLE auth users supabase_auth_admin
3; 0 124 TABLE DATA auth users supabase_auth_admin
4; 0 125 TABLE DATA auth schema_migrations supabase_auth_admin
5; 2620 126 TRIGGER auth users ja_provision_profile postgres
6; 1259 127 TABLE public profiles postgres
7; 0 0 ACL - SCHEMA public pg_database_owner
'''
        selected = native.select_toc(toc)
        self.assertNotIn('TABLE auth users', selected)
        self.assertNotIn('schema_migrations', selected)
        self.assertIn('TABLE DATA auth users', selected)
        self.assertIn('TRIGGER auth users ja_provision_profile', selected)
        self.assertIn('ACL - SCHEMA public', selected)

    def test_unknown_toc_fails_closed(self):
        with self.assertRaises(local.Failure):
            native.select_toc('1; 0 0 UNREVIEWED auth object postgres')

    def test_reserved_roles_not_restored(self):
        raw = 'CREATE ROLE "postgres";\nCREATE ROLE "ja_native_synthetic";\nALTER ROLE "ja_native_synthetic" WITH NOSUPERUSER NOLOGIN NOBYPASSRLS;\n'
        selected = native.custom_roles(raw)
        self.assertNotIn('"postgres"', selected)
        self.assertIn('NOLOGIN', selected)

    def test_role_password_rejected(self):
        with self.assertRaises(local.Failure):
            native.custom_roles('CREATE ROLE "ja_native_synthetic";\nALTER ROLE "ja_native_synthetic" WITH NOLOGIN PASSWORD \'synthetic\';\n')

    def test_tar_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with tarfile.open(base / 'bad.tar', 'w') as out:
                member = tarfile.TarInfo('../escape')
                member.size = 1
                out.addfile(member, io.BytesIO(b'x'))
            with self.assertRaises(local.Failure):
                native.unpack_bundle(base / 'bad.tar', base)
            self.assertFalse((base.parent / 'escape').exists())

    def test_fixture_frozen(self):
        self.assertEqual(hashlib.sha256((BASE / 'fixtures/identity.sql').read_bytes()).hexdigest(), '11a9c36267d91e59df44aa0ad4863598c397954c5e4a4758913b5f6c9e0629e2')

    def test_workflow_no_secrets_or_artifacts(self):
        text = (BASE.parents[1] / '.github/workflows/native-backup-rehearsal.yml').read_text()
        self.assertNotIn('secrets.', text)
        self.assertNotIn('upload-artifact', text)
        self.assertIn('persist-credentials: false', text)

    def test_native_tools_no_cli_dump_or_docker_exec(self):
        text = (BASE / 'native.py').read_text()
        self.assertNotIn('docker', text)
        self.assertNotIn("'db', 'dump'", text)
        self.assertIn("'--format=custom'", text)
        self.assertIn("'--passphrase-fd', '0'", text)
        self.assertIn("'--no-role-passwords'", text)


if __name__ == '__main__':
    unittest.main()
