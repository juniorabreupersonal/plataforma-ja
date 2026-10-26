# Primeira migração — identidade e vínculos da Plataforma JA

**Estado: minuta para revisão; não aplicada ao Supabase remoto.**

Base: `main` no commit `b96debb`. Considera a inspeção informada pelo proprietário: nenhuma tabela comum, função ou política em `public`, e nenhum trigger personalizado em `auth`/`public`. Essa informação não substitui nova conferência antes da aplicação.

## Arquivos

- `migrations/202610250001_identity_foundation.sql`: instalação transacional das seis tabelas, restrições, RLS, funções, provisionamento e auditoria.
- `tests/identity_security.sql`: cenários de autorização usando oito identidades sintéticas; executado em transação revertida.
- `tests/fixtures/auth_scaffold.sql`: contrato mínimo de Auth, apenas para PostgreSQL descartável. **Nunca executar em projeto Supabase existente.**
- `tests/fixtures/existing_users.sql`: duas identidades sintéticas anteriores à migração para validar o backfill.
- `../scripts/check-identity-migration.py`: verificações estáticas; não interpreta nem executa PostgreSQL.
- `../scripts/test-db-local.sh`: cria e remove exclusivamente contêiner PostgreSQL novo, sem rede, portas publicadas, volumes ou conexão remota.

Nenhum arquivo de aplicação, dependência ou documento oficial em `docs/` é modificado. Não há tabelas de saúde, fotografias, conversas, formação, assinatura, Método JA ou IA nesta entrega.

## Modelo e restrições

| Tabela | Finalidade e proteção |
|---|---|
| `profiles` | Um perfil por UUID do Auth; nome opcional e estado controlado. Sem e-mail duplicado, senha ou papel |
| `platform_role_assignments` | Proprietário ou administrador, concedente, motivo, vigência e revogação. Apenas um proprietário não revogado; proprietário sem expiração |
| `organizations` | Contexto organizacional e estado; criação restrita |
| `organization_memberships` | Papéis independentes `org_admin`, `professional`, `student`; convite explícito e aceite. Uma identidade pode acumular papéis |
| `care_relationships` | Aluno, profissional e participações de mesma organização garantidos por FKs compostas; dois aceites para ativação |
| `audit_events` | Eventos de sucesso, ator, papel de conexão, alvo, contexto, motivo e horário; sem snapshots de dados ou JWTs |

Todos os relacionamentos têm referências explícitas e exclusão restrita. Triggers impedem exclusão operacional e alteração/exclusão da auditoria. A saída de um profissional encerra acompanhamentos ligados àquela participação, preservando registros e outros vínculos do aluno. Reabertura exige novo convite/vínculo, sem reescrever o encerrado.

As restrições de estado exigem campos obrigatórios explicitamente não nulos, evitando que a semântica de NULL em CHECK aceite um encerramento incompleto. Índices parciais impedem duplicidades abertas. Uma atribuição administrativa expirada deve ser formalmente revogada antes de outra equivalente.

O usuário Auth não pode ser excluído por cascata sobre o perfil. Exclusão, anonimização, retenção e transferência de propriedade exigirão procedimento separado e aprovado; esta minuta não pretende resolver essas operações por exclusão física.

## Autorização e RLS

- RLS habilitada e forçada nas seis tabelas; `anon` não recebe acesso.
- Defaults de tabela/função de `PUBLIC`, `anon`, `authenticated` e `service_role` são revogados **somente nos objetos desta entrega**. Não se alteram defaults globais do projeto.
- `authenticated` recebe SELECT sob RLS e UPDATE apenas de `profiles.display_name`, limitado ao próprio perfil ativo.
- Escritas de funções, organizações e vínculos passam por RPCs específicas. Não há escrita direta nem autorização baseada em `user_metadata`.
- Nomeação de administradores globais exige proprietário com sessão `aal2`; poderes organizacionais administrativos também exigem `aal2`.
- Escopo delegado inicial: somente `organizations.manage`. Não equivale a formação, assinatura, licença ou acesso Método JA. Não cria uma segunda fonte de autoridade.
- Nenhuma RPC permite ao chamador conceder funções a si mesmo. Aceitar um convite previamente concedido por outro ator não é autoconcessão.
- O administrador organizacional pode convidar profissionais/alunos, mas não conceder outros administradores organizacionais. Essa concessão exige autoridade global explícita.
- A habilitação profissional é uma decisão explícita de quem tem permissão de gestão, com motivo registrado; validar os critérios operacionais antes de disponibilizar esse fluxo.
- Participantes comuns veem apenas as próprias participações e perfis. Não existe diretório de usuários ou busca por e-mail. Descoberta/convites com identificação segura exigirão integração posterior.
- Apenas os participantes leem `care_relationships`. Proprietário e administradores não ganham acesso por seus papéis, nem acesso indireto a esses vínculos pelos eventos de auditoria de terceiros.
- As operações exigem identidade com e-mail confirmado. As permissões são consultadas no banco; função expirada/revogada ou perfil suspenso não ganha poderes por manter JWT antigo.

O schema `ja_private` não deverá ser adicionado aos schemas expostos pelo PostgREST. Seus helpers têm `search_path` fixo e recebem a identidade de `auth.uid()`, não de parâmetro do cliente. Funções SECURITY DEFINER devem permanecer pertencentes ao papel operacional confiável com BYPASSRLS. A migração verifica esse requisito.

A API de aceites exige os UUIDs corretos e revalida os participantes. Identificador não substitui autorização. Mensagens SQL são genéricas, mas podem distinguir condições de operação; a futura camada de interface deve mapear erros sem expor detalhes internos.

## Provisionamento de perfis

A migração instala `AFTER INSERT` em `auth.users` e preenche somente UUIDs ausentes de usuários existentes, sem metadados ou papéis. O backfill não fabrica eventos históricos anteriores à auditoria. O perfil não representa confirmação de e-mail: a aplicação continua exigindo confirmação por Supabase Auth.

Um lock de curta duração em `auth.users` serializa instalação/backfill com novos cadastros. Isso pode atrasar cadastros enquanto a transação estiver aberta. Planejar janela, volume de usuários e limites de execução. Falha do trigger reverte a operação Auth; não usar captura genérica para esconder erro de provisionamento.

## Inicialização do proprietário — NÃO executada

A migração não contém UUID real nem chamada de bootstrap.

1. Confirmar a identidade do proprietário e o ambiente correto fora do cadastro público.
2. Conferir conta confirmada, perfil ativo e fator MFA verificado em `auth.mfa_factors`.
3. Após aprovação específica, operador autorizado executa `ja_private.bootstrap_owner` por conexão operacional, com UUID verificado e motivo. Não há endpoint público, e EXECUTE não é concedido a `anon`, `authenticated` ou `service_role`.
4. A função serializa inicializações com advisory lock, recusa segunda nomeação e registra evento e justificativa.
5. Conferir nomeação e acesso administrativo exclusivamente com sessão MFA `aal2`.

A presença de fator verificado comprova matrícula de MFA, não um desafio recente do operador. O procedimento humano e o canal operacional seguro continuam obrigatórios. Não usar e-mail, primeiro cadastro ou metadados para decidir propriedade. Transferência/recuperação de proprietário ficam fora desta migração.

## Testes locais e limites

Sem instalar dependências da aplicação:

```bash
python scripts/check-identity-migration.py
bash -n scripts/test-db-local.sh
```

Com Docker e imagem oficial `postgres:17` previamente disponível:

```bash
bash scripts/test-db-local.sh
```

O executor usa autenticação sem senha **apenas dentro do contêiner descartável sem rede e sem portas**, removido ao terminar. Não lê `DATABASE_URL`, arquivos `.env` ou credenciais do projeto. O scaffold simula inclusive defaults amplos de grants para testar sua remoção.

Esses testes exercitam RLS com `SET ROLE` e claims sintéticas, sem credencial privilegiada para as ações de usuário. A conta operacional é usada somente para fixtures e verificações de integridade. Nenhum usuário real ou dado clínico é necessário.

### Estado de validação após GitHub Actions

- **14 verificações estáticas passaram**, incluindo restrições do workflow e espera pelo processo PostgreSQL definitivo.
- **Migração e 62 assertivas SQL executadas com sucesso em PostgreSQL 17 descartável**, no GitHub Actions: [execução do PR](https://github.com/juniorabreupersonal/plataforma-ja/actions/runs/40154854757), commit `73ee8bf`.
- O teste aplica o scaffold Auth sintético, insere duas identidades anteriores, executa a migração transacional e a suíte com papéis distintos, permissões e RLS reais do PostgreSQL. Todos os usuários são sintéticos.
- Nenhuma conexão, secret ou credencial Supabase é utilizada. O PostgreSQL é criado sem rede/portas/volumes e removido ao fim. O checkout usa somente permissão de leitura e não persiste credenciais Git.
- A execução local no Codex continua indisponível por bloqueio de download da imagem. O workflow `.github/workflows/identity-postgres.yml` reproduz a validação no runner GitHub.
- **Supabase isolado com Auth/PostgREST/MFA reais: aprovado em GitHub Actions**, incluindo corridas de bootstrap/convites/vínculos, revogação, suspensão e expiração por passagem de tempo. Ver [detalhamento e limites](tests/integration/README.md). O aceite automatizado da aplicação Next.js em Chromium real também passou; ver [cenários de navegador e API](tests/browser/README.md). Isso não substitui testes em outros navegadores ou revisão visual manual.

### Correções encontradas durante a execução

1. O executor detectava o servidor temporário de inicialização do contêiner como pronto. Agora exige o processo PostgreSQL definitivo como PID 1 antes de executar psql.
2. O teste de FK entre organizações reutilizava uma combinação de aluno/profissional já aberta, disparando a unicidade (`23505`) antes da FK esperada (`23503`). A fixture do cenário foi ajustada para isolar o conflito entre organizações, preservando o erro esperado.
3. O workflow publica erros sintéticos como anotações e mantém `pipefail`/`ON_ERROR_STOP`; falhas não são convertidas em sucesso. Checkout fixado por SHA com runtime atual.

**A migração versionada não precisou de alteração para passar esta execução.** As correções atingiram o executor e a montagem de um cenário de teste; não foram removidas restrições nem desativadas assertivas.

### Aceite obrigatório antes de aplicação remota

1. Manter o check PostgreSQL descartável aprovado no commit final revisado.
2. Manter os workflows de Supabase isolado e Next.js/Chromium aprovados no commit final, sem scaffold Auth. Ampliar cobertura de navegadores e realizar revisão visual/acessibilidade antes de uso real.
3. Verificar versão PostgreSQL do destino, colunas/tipos de `auth.users`/`auth.mfa_factors`, papéis de execução e ausência de colisões de nomes. Não editar objetos internos do Auth.
4. Validar novo cadastro, confirmação PKCE, login, recuperação e logout com o trigger real. Nenhum desses fluxos usa tabelas clínicas.
5. As corridas de bootstrap, convites, solicitações e aceite versus encerramento passaram no teste integrado. Ampliar testes de carga e interleavings conforme a integração; a aplicação deverá tratar deadlocks com rollback seguro e nova tentativa.
6. Expiração com passagem real de tempo e requisições independentes passou no teste integrado; considerar que `now()` tem semântica transacional.
7. RLS por PostgREST com JWTs reais de contas sintéticas, incluindo AAL1/AAL2 e MFA TOTP, passou no stack local. Preservar essa cobertura e as políticas de sessão na aplicação.
8. Aprovar política de retenção/exclusão e procedimento do proprietário; revisar janela de lock, backup e plano de recuperação.

Eventos negados não são persistidos na transação que falha, pois seriam revertidos. Auditoria de tentativas negadas exige canal separado de logs seguros na futura integração. Repetir uma migração já aplicada deve ser controlado pelo histórico versionado, não por `IF NOT EXISTS` que oculte conflitos.

Os vínculos deste escopo contêm somente metadados. Visibilidade histórica de um vínculo não autoriza acesso futuro a dados clínicos: as próximas tabelas precisarão de políticas próprias, consentimentos/autorizações aplicáveis e concessões seletivas. Cursos, assinaturas, Método JA e JA AI Lab continuarão separados.

**Nenhuma aprovação de execução remota é solicitada agora. Primeiro concluir revisão e testes isolados.**
