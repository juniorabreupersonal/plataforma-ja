"""Verificações estáticas de escopo e segurança. NÃO é parser nem executor PostgreSQL."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "supabase/migrations/202610250001_identity_foundation.sql"
SQL = MIGRATION.read_text()
TESTS = (ROOT / "supabase/tests/identity_security.sql").read_text()
TABLES = {
    "profiles", "platform_role_assignments", "organizations",
    "organization_memberships", "care_relationships", "audit_events",
}


class IdentityMigrationChecks(unittest.TestCase):
    def test_exact_six_tables(self):
        self.assertEqual(set(re.findall(r"create table public\.(\w+)", SQL)), TABLES)

    def test_atomic_and_non_destructive(self):
        self.assertIn("begin;", SQL)
        self.assertTrue(SQL.rstrip().endswith("commit;"))
        self.assertNotRegex(SQL, r"(?i)drop\s+(table|schema)|truncate\s+")
        self.assertNotIn("on delete cascade", SQL.lower())

    def test_no_auth_identity_creation(self):
        self.assertNotRegex(SQL, r"(?i)(insert\s+into|update|delete\s+from)\s+auth\.users")
        self.assertIn("select id from auth.users on conflict (user_id) do nothing", SQL)
        self.assertNotIn("raw_user_meta_data", SQL)

    def test_rls_and_grants(self):
        self.assertIn("enable row level security", SQL)
        self.assertIn("force row level security", SQL)
        self.assertIn("from public, anon, authenticated, service_role", SQL)
        self.assertIn("grant update(display_name)", SQL)
        self.assertNotRegex(SQL, r"(?i)grant\s+(all|insert|delete|truncate)\s+on")
        for table in TABLES:
            self.assertRegex(SQL, rf"create policy \w+ on public\.{table}\b")

    def test_definer_search_path(self):
        definitions = re.findall(r"create function ([\s\S]+?)\n\$\$;", SQL)
        self.assertGreater(len(definitions), 10)
        for definition in definitions:
            if "security definer" in definition:
                self.assertIn("set search_path = pg_catalog", definition)

    def test_bootstrap_not_public_rpc(self):
        self.assertIn("create function ja_private.bootstrap_owner", SQL)
        grants = re.findall(r"grant execute[\s\S]+?;", SQL)
        self.assertTrue(all("bootstrap_owner" not in grant for grant in grants))
        self.assertIn("pg_advisory_xact_lock", SQL)
        self.assertIn("one_current_owner", SQL)
        self.assertIn("auth.mfa_factors", SQL)
        self.assertIn("email_confirmed_at is not null", SQL)

    def test_roles_are_not_method_authorization(self):
        self.assertIn("role in ('owner', 'admin')", SQL)
        self.assertIn("role in ('org_admin', 'professional', 'student')", SQL)
        self.assertIn("array['organizations.manage']", SQL)
        self.assertNotRegex(SQL, r"create table public\.(health|photo|method|ai)_")

    def test_care_read_is_participant_only(self):
        policy = re.search(r"create policy care_read[\s\S]+?;", SQL).group()
        self.assertIn("auth.uid() in (professional_user_id, student_user_id)", policy)
        self.assertNotIn("is_owner", policy)
        self.assertNotIn("org_manager", policy)
        self.assertIn("foreign key (professional_membership_id, organization_id", SQL)
        self.assertIn("foreign key (student_membership_id, organization_id", SQL)

    def test_boundary_checks_do_not_accept_null_reasons(self):
        self.assertIn("end_reason is not null", SQL)
        self.assertIn("revocation_reason is not null", SQL)
        self.assertIn("started_at is not null", SQL)

    def test_security_tests_have_distinct_identities_and_rollback(self):
        ids = set(re.findall(r"00000000-0000-4000-8000-00000000000[1-9]", TESTS))
        self.assertGreaterEqual(len(ids), 7)
        self.assertIn("set local role anon", TESTS)
        self.assertIn("set local role authenticated", TESTS)
        self.assertTrue(TESTS.rstrip().endswith("rollback;"))
        self.assertGreaterEqual(TESTS.count("ja_test.assert_true("), 15)
        self.assertGreaterEqual(TESTS.count("ja_test.expect_error("), 20)

    def test_runner_cannot_connect_to_remote(self):
        runner = (ROOT / "scripts/test-db-local.sh").read_text()
        self.assertIn("--network none", runner)
        self.assertIn("--pull never", runner)
        self.assertIn("--set ON_ERROR_STOP=on", runner)
        self.assertNotRegex(runner, r"--publish|--host|--volume|postgres(?:ql)?://")

    def test_runner_waits_for_final_server(self):
        runner = (ROOT / "scripts/test-db-local.sh").read_text()
        self.assertIn('/proc/1/comm', runner)
        self.assertIn('= postgres && pg_isready', runner)

    def test_ci_is_restricted_to_disposable_database(self):
        workflow = (ROOT / ".github/workflows/identity-postgres.yml").read_text()
        self.assertIn("contents: read", workflow)
        self.assertIn("persist-credentials: false", workflow)
        self.assertIn("bash scripts/test-db-local.sh", workflow)
        self.assertIn("set -euo pipefail", workflow)
        self.assertNotIn("${{ secrets.", workflow)
        self.assertNotIn("pull_request_target", workflow)
        self.assertNotIn("self-hosted", workflow)
        self.assertNotRegex(workflow, r"postgres(?:ql)?://|supabase db push|supabase link")

    def test_no_credentials_in_artifacts(self):
        for path in [MIGRATION, *list((ROOT / "supabase/tests").rglob("*.sql"))]:
            content = path.read_text()
            self.assertNotRegex(content, r"sb_secret_[A-Za-z0-9]+|eyJ[A-Za-z0-9_-]{20,}|-----BEGIN .*PRIVATE KEY")
            self.assertNotRegex(content, r"(?i)password\s*=")


if __name__ == "__main__":
    unittest.main(verbosity=2)
