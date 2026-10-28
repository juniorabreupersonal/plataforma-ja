# Ensaio sintético de backup e restauração

Exclusivamente operacional, em branch/PR independente do PR #4. Não autoriza acesso ao Supabase principal.

## Proveniência e isolamento

A fixture `fixtures/identity.sql` é cópia byte a byte da migração do PR #4 no commit `1841a93f5571d6e3d092fc3191a0182010068085`. Não é uma segunda migração de produção. `local_stack.py` congela os helpers de Auth/SMTP/MFA daquele commit, sem importar configuração ou `.env` da aplicação. A fixture e o helper não serão sincronizados automaticamente: mudanças exigem nova revisão.

O workflow usa CLI 2.122.0 verificada por checksum, PostgreSQL 17, projetos locais `ja-backup-source` e `ja-backup-target` com volumes separados. Utiliza as mesmas portas em momentos diferentes: origem é parada, preservando seu volume até a limpeza final; destino é criado vazio. Não há `link`, `--db-url`, secrets do repositório, acesso ao Supabase hospedado ou upload de dumps/artefatos. SQL e saída da CLI são capturados e nunca reproduzidos. Credenciais sintéticas ficam somente em memória/arquivos temporários do runner.

## Procedimento automatizado

1. Iniciar Supabase local real; cadastrar e confirmar quatro contas `@example.test` pelo SMTP local, incluindo usuário anterior à migração.
2. Aplicar apenas a fixture local; testar MFA e criar organização, participações, vínculo aluno-profissional e auditoria sintéticos. Criar papel NOLOGIN e um registro sintético no formato do histórico CLI (não representa execução de `db push`).
3. Parar Auth/PostgREST da origem, evitando escritores durante os dumps. Obter definição do trigger personalizado de `auth.users` pelo catálogo.
4. Executar `supabase db dump --local --file ... --role-only`; dump de estrutura dos schemas `public,ja_private,supabase_migrations`; dump de dados com `--data-only --use-copy` incluindo também `auth`. Os schemas internos nativos são fornecidos pelo destino da mesma versão; não copiar o tracker interno de migrações do Auth.
5. Calcular hashes SHA-256, parar origem e iniciar destino com outro identificador/volume. Validar destino vazio e hashes antes da carga.
6. Restaurar papéis, estrutura e dados em transação com `ON_ERROR_STOP`. Revogar previamente defaults de tabelas `public` de anon/authenticated, conforme alerta oficial. Restabelecer `session_replication_role=origin` e restaurar explicitamente o trigger personalizado do Auth antes do commit.
7. Comparar catálogos, digests e contagens em memória. Validar Auth, PostgREST e RLS; criar conta nova para comprovar execução do trigger. Remover ambos os stacks e arquivos temporários.

`backup_seconds`: apenas exportações CLI; `restore_sql_seconds`: carga transacional; `restore_and_validation_seconds`: carga e verificações posteriores. Instalação/download/start dos serviços não estão incluídos nesses tempos. Não são RTO de produção.

## Execução e evidências

Executar somente pelo workflow `Synthetic backup and restore`, em runner descartável. Checks unitários locais: `python3 -m unittest discover -s ops/backup-rehearsal -p 'test_*.py' -v`.

Resultados integrados e tempos serão registrados após a execução. Anotações e resumo contêm somente rótulos, contagens e tempos; não contêm registros, dumps, tokens, hashes de senhas ou links de confirmação.

## Limitações

- Storage está desabilitado: arquivos, buckets, políticas e recuperação de objetos não são validados.
- Não inclui SMTP externo, OAuth, webhooks, Edge Functions, Vault/pgsodium, chaves de assinatura hospedadas ou configurações do painel.
- O destino usa a mesma versão/infraestrutura local. Não prova restauração entre versões, em projeto hospedado Free ou sobre banco com conteúdo.
- Ensaio sintético não mede volume, bloqueios ou RTO reais. Não é backup nem ensaio de contas reais.
- MFA: matrícula/desafio na origem e novo desafio do fator original no destino, com acesso administrativo AAL2 e negação AAL1. Não implica migração de chaves de projetos hospedados.
- Checks de integridade são explícitos, pois a carga com replication role replica ignora triggers. Não tornar `replica` uma configuração permanente.

## Referências oficiais

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/supabase-db-dump
- https://github.com/supabase/cli/blob/v2.122.0/apps/cli/docs/supabase/db/dump.md
