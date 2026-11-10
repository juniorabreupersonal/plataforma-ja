# Backup nativo e recuperação criptografada — somente ensaio sintético

PR independente dos PRs #4 e #5. Não autoriza acesso, backup ou implantação no Supabase principal.

## Isolamento e ferramentas

O workflow `Native PostgreSQL encrypted recovery` executa em runner GitHub descartável Ubuntu 24.04. Supabase CLI 2.122.0 com checksum prepara dois Supabase locais reais, PostgreSQL 17, Auth, SMTP de captura, MFA TOTP e PostgREST. **Os serviços ainda usam contêineres no runner**; não há Docker/instalação no computador Windows do proprietário.

`pg_dump`, `pg_restore`, `psql` e `pg_dumpall` são executáveis **nativos no host**, em `/usr/lib/postgresql/17/bin`, não `docker exec` nem `supabase db dump`. A versão efetiva dos clientes é registrada no log. O workflow instala o cliente 17 do repositório oficial PGDG se necessário. GnuPG gera e recupera pacote simétrico AES-256.

Projetos `ja-native-source` e `ja-native-target` usam volumes diferentes e as mesmas portas em momentos diferentes. Origem fica parada e seu volume é preservado até o fim. O destino é inicializado vazio. Conexões PostgreSQL limitadas a `127.0.0.1:54322/postgres`; HTTP só 127.0.0.1:54321/54324. Variáveis de credenciais externas são descartadas; não se lê `.env`, não há `link`, secrets do repositório ou upload de artefatos. A conexão sem TLS é exclusivamente loopback do runner, não uma recomendação para projeto hospedado.

## Proveniência

`fixtures/identity.sql`: cópia byte a byte da migração de identidade em `1841a93f5571d6e3d092fc3191a0182010068085`, protegida por teste de hash. Não é outra migração de produção. `local_stack.py` e cenários de `run.py` derivam do PR #5, commit `f77b7be961155c0117ee772ca448fcded2f1d600`, com adaptações explícitas para clientes nativos e criptografia. Não alteram esses PRs. Nenhum arquivo de aplicação ou documentação oficial é modificado.

## Procedimento e cobertura

1. Criar quatro contas sintéticas confirmadas, uma anterior à fixture. Provisionar perfis, proprietário **somente sintético**, MFA, organização, participações aluno/profissional e vínculo, mais auditoria.
2. Criar papel personalizado NOLOGIN e um registro sintético de histórico no formato CLI. Parar Auth/PostgREST da origem para evitar escritores durante captura/dumps.
3. Gerar `database.dump` com `pg_dump --format=custom`, incluindo schemas `auth`, `public`, `ja_private`, `supabase_migrations`. Capturar configuração de propriedade dos três schemas da aplicação. Exportar `roles.sql` com `pg_dumpall --roles-only --no-role-passwords`.
4. Empacotar arquivo custom, papéis, preparação e manifesto SHA-256. Criptografar com GnuPG AES-256, senha aleatória em memória enviada por stdin, nunca em argumentos/logs. Diretório GPG temporário e sem cache simétrico.
5. Apagar os originais em claro antes de recuperar. Comprovar falha com senha errada e pacote adulterado; rejeitar/apagar saídas desses testes. Descriptografar o original e validar todos os hashes. Extração aceita apenas quatro nomes fixos e arquivos regulares.
6. Inicializar outro Supabase. Comprovar que falta o papel global: o arquivo de banco não cria papéis e um grant para esse papel falha. Recriar **somente o papel sintético permitido**, nunca todos os papéis reservados exportados.
7. Usar `pg_restore --list` e lista revisada de objetos para distinguir definições nativas do Auth de dados/customizações. Deixar o schema nativo e `auth.schema_migrations` sob responsabilidade do destino da mesma versão. Restaurar dados Auth, posições de sequências e explicitamente `auth.users/ja_provision_profile`.
8. `pg_restore` gera SQL pré-dados/dados/pós-dados a partir do archive recuperado. **A execução final é por `psql` nativo**, em transação única e `ON_ERROR_STOP`. Manter restrição de defaults; carregar dados com replication role replica na sessão de teste e voltar a origin antes dos objetos pós-dados. Não ignorar erros nem descartar ACL/owners para forçar sucesso.
9. Comparar dados/digests, schemas/owners/grants, permissões de colunas, funções/search_path/SECURITY DEFINER, RLS, constraints, índices, triggers, defaults de privilégios e histórico. Comparar definições/grants/RLS nativos do Auth para detectar incompatibilidade entre os stacks. Validar rejeição de FK/PK/CHECK/exclusão e novas operações de auditoria.
10. Testar Auth e PostgREST com JWT real: senha original, refresh anterior ao backup, desafio do fator MFA original, AAL2 permitido/AAL1 negado, perfis/vínculos isolados e novo cadastro/confirmacão com criação de perfil sem privilégios.
11. Encerrar ambos os projetos com `--no-backup` e remover diretórios/credenciais sintéticas/agente GPG. Somente rótulos, contagens, versões e tempos vão para logs/resumo; nenhum dump é publicado.

## Diferenças em relação ao PR #5

| Aspecto | PR #5 | Este ensaio |
|---|---|---|
| Exportação | Supabase CLI, arquivos SQL | `pg_dump` nativo, archive custom |
| Schema Auth | Definições nativas excluídas do dump de estrutura | Definições capturadas no archive, excluídas da restauração seletiva |
| Trigger JA/Auth | Arquivo SQL separado | Entrada explícita na lista TOC do archive |
| Papéis | CLI filtra papéis gerenciados | Exportação nativa complementar; restaura só papel sintético permitido |
| Carga | SQL CLI + psql no contêiner | SQL selecionado por `pg_restore` + psql no host |
| Criptografia | Pendente | Pacote AES-256, recuperação, senha incorreta e adulteração |
| Windows | Não executado | Também não executado; este teste é Linux nativo |

## Execução e resultados

Verificações locais sem serviços: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s ops/native-backup-rehearsal -p 'test_*.py' -v`.

O executor integrado exige `GITHUB_ACTIONS=true` e runner descartável. Resultados, falhas/ajustes e tempos serão registrados após execução. Não reutilizar este script com dados reais nem adaptar endpoints para o projeto principal.

Medidas: exportação nativa; criptografia/descriptografia/testes; carga SQL; carga + verificações; inicialização do destino + carga + verificações. Nenhuma é promessa de RTO/RPO real.

## Limitações e operação manual futura

- Mesmo build de Supabase e configurações/chaves locais compatíveis. Não valida transferência de chaves, MFA/sessões entre projetos hospedados ou versões diferentes.
- Storage, Vault/pgsodium, OAuth/SMTP externos, webhooks, Realtime e Edge Functions não são recuperados/testados. Arquivos Storage e configurações externas exigem procedimento separado.
- Escopo fechado de schemas e um trigger JA conhecido, com política TOC revisada. Não é restaurador universal: customizações novas exigem inventário/revisão; não se deve sobrescrever schemas gerenciados ou aplicar roles.sql inteiro em projeto hospedado.
- Papel sintético NOLOGIN sem memberships; não valida senha de LOGIN, hierarquias complexas ou permissões do operador hospedado. Auth superuser local não prova que o papel disponível em produção pode ler/restaurar tudo.
- Histórico sintético, não execução por `db push`. Base pequena, sem carga representativa nem falha durante restauração/commit ambíguo. O modo replica pula triggers durante carga; igualdade dos dados e testes explícitos não substituem plano de integridade de toda futura base.
- Remover arquivos temporários não prova apagamento físico de SSD. No runner descartável há somente dados sintéticos; no backup real o volume de trabalho deverá estar criptografado desde o início.
- O teste comprova algoritmo/pacote e senha gerada em memória, não armazenamento externo, recuperação de cofre, retenção ou operação humana. GnuPG não é 7-Zip: o pacote testado é `.gpg`, sem alegação de validar formato 7z.
- Sem Next.js/navegador/mobile/acessibilidade nesta etapa. Nenhuma configuração Windows é alterada.

Antes de operação manual: Windows/máquina suportada e atualizada; clientes compatíveis e testados; TLS verify-full/CA/endpoint apropriados; autorização de acesso e papel operacional verificado; senha por prompt/cofre, nunca argumento de comando; volume criptografado, chave separada recuperável, retenção e cópias externas; destino isolado protegido e ensaio próprio; procedimento de interrupção/recuperação e autorização específica. No Windows, usar `--file`, não pipeline de SQL/binários pelo PowerShell. Não transferir a configuração sem TLS do loopback para o projeto hospedado.

## Referências oficiais

- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/platform/backups
- https://www.postgresql.org/docs/17/app-pgdump.html
- https://www.postgresql.org/docs/17/app-pgrestore.html
- https://www.postgresql.org/docs/17/app-pg-dumpall.html
- https://www.postgresql.org/docs/17/libpq-pgpass.html
- https://www.gnupg.org/documentation/manuals/gnupg/GPG-Options.html
