# Configuração futura — passo a passo do proprietário

**Não executar criação, publicação ou SQL com base apenas neste guia.** Cada operação externa depende de autorização posterior. Nenhuma etapa externa abaixo foi realizada. Windows 10 precisa apenas de navegador; Node.js 24/Git e Supabase CLI oficiais são opcionais para o operador. Não instalar Docker Desktop.

## 1. Conferir a revisão e separar recursos

1. Revisar este PR e suas dependências #8/#4/#7. Não mesclar nem ativar deploy automático.
2. Reservar nomes claramente distintos, por exemplo `plataforma-ja-homologacao`, para novos projetos Vercel e Supabase. Não reutilizar o projeto principal, nem schema dentro dele.
3. Após autorização específica, o proprietário cria o Supabase de homologação no painel. Confirmar o project ref do **novo projeto**, plano, região, limites e cobrança. Se não houver vaga gratuita, parar; não atualizar o plano da organização principal para contornar o limite.
4. Registrar a referência protegida do projeto principal a partir de informação administrativa já conhecida, sem acessar tabelas ou copiar suas chaves. Project ref é identificador público, não senha. A equipe desta etapa não consultou essa referência.
5. Não usar restore/clone/export do principal. Não ativar integração automática Supabase–Vercel/Marketplace que distribua variáveis a outros projetos ou ambientes.
6. Separar contas dos provedores, projeto, chaves, Auth, SMTP, registros e permissões de equipe. Proteger as contas de administração dos provedores com MFA; elas são diferentes do usuário proprietário dentro da aplicação.

## 2. Aprovar a política versionada

Em um PR revisável, preencher `src/config/homologation.json`:

| Campo | Origem e regra |
|---|---|
| `schemaVersion` | Manter `1` |
| `stagingProjectRef` | Referência de 20 caracteres do novo Supabase de homologação |
| `protectedProjectRefs` | Lista das referências de produção protegidas; obrigatória e sem a referência de homologação |
| `stagingAppOrigin` | Origem HTTPS fixa do **Preview protegido** na Vercel, sem caminho, query ou porta |
| `syntheticDataOnly` | Manter `true`; não representa comprovação automática dos dados |

Não preencher com valores fictícios apenas para passar o build de nuvem. Não colocar senhas ou chaves neste JSON. Um operador deve conferir as duas referências lado a lado e registrar aprovação de que são projetos diferentes. A origem deverá ser um alias estável de Preview; URLs de deployments alternativos são negadas, não redirecionadas. Confirmar no painel a origem atribuída antes de aprová-la, sem publicar para descobrir o endereço.

## 3. Preparar Vercel sem publicar

1. Após autorização, criar **projeto separado**, preset Next.js, raiz do repositório, Node.js 24.x, instalação `npm ci --include=dev`, build `npm run build`.
2. O arquivo `vercel.json` mantém deploy Git desativado. Desativar quaisquer automações/integradores externos equivalentes no projeto de homologação.
3. Configurar Deployment Protection com Vercel Authentication para todos os Previews, incluindo o alias escolhido. Convidar somente revisores autorizados. Confirmar disponibilidade/custo do plano e cobertura de domínios, assets e callbacks.
4. Se o assistente de importação exigir clicar em **Deploy** antes de permitir configurar os controles, **parar**. Solicitar procedimento assistido de criação sem deployment; não usar uma primeira publicação pública como teste.
5. Inserir as variáveis abaixo somente no escopo **Preview**, preferencialmente limitado à branch aprovada. Não copiar para Production, nem usar variáveis compartilhadas da produção. Não desabilitar Vercel Authentication para facilitar o e-mail.
6. Não executar CLI de deploy ou clicar em Deploy nesta etapa. O futuro operador deverá selecionar Preview; `--prod`/Production é bloqueado pelo código mesmo com destino Supabase correto.

### Variáveis

| Variável | Visibilidade | Conteúdo futuro |
|---|---|---|
| `APP_ENV` | Servidor | `staging` |
| `APP_URL` | Servidor | Exatamente a origem HTTPS aprovada no JSON |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL HTTPS padrão do novo projeto, `https://REF_APROVADA.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Pública | **Publishable key** do mesmo projeto; não usar `service_role`, secret key ou JWT legado na nuvem |
| `STAGING_GATE_SECRET` | Segredo de servidor | Token aleatório base64url de 32–128 caracteres, guardado em gerenciador de senhas e no escopo Preview |
| `VERCEL`, `VERCEL_ENV` | Automáticas do provedor | Vercel fornece `1` / `preview`; não inventar essas variáveis para simular autorização |
| `NODE_ENV` | Automática do build | Production mesmo no Preview, preservando cookies Secure; não mudar para development |

A barreira HTTP Basic usa usuário fixo **`ja-homologacao`** e o token como senha. Ela protege a entrada na homologação, não substitui login individual/MFA. Distribuir o token por canal privado e revogável aos revisores; nunca no PR, URL, capturas ou logs. Gerar em gerenciador de senhas confiável; não reaproveitar senha pessoal, chave Supabase ou segredo de produção.

Não configurar `DATABASE_URL`, senha de banco, `SUPABASE_ACCESS_TOKEN`, `SERVICE_ROLE`, chave secret ou credenciais SMTP na aplicação/Vercel. Migração, backup e recuperação são operações separadas de um operador autorizado. Não adicionar bypass de Deployment Protection na URL ou em links de confirmação.

Modificar `NEXT_PUBLIC_*` exige novo build autorizado: são incorporadas ao bundle. Não reutilizar build/artefatos de produção. Não salvar `.env` ou `.vercel` no Git. Os exemplos deste guia não são valores utilizáveis.

## 4. Configurar somente o Auth de homologação

Após autorização específica para esse novo projeto:

1. Ativar confirmação de e-mail; mínimo de senha 8, mantendo a regra da aplicação de 8–128 caracteres.
2. Habilitar matrícula/verificação TOTP. Registrar a validade máxima dos JWTs e as configurações de sessão para o plano de recuperação; não presumir revogação imediata de JWT emitido.
3. Site URL igual a `stagingAppOrigin`.
4. Permitir apenas os callbacks exatos:
   - `ORIGEM_APROVADA/auth/callback`
   - `ORIGEM_APROVADA/auth/callback?flow=recovery`
5. Não usar wildcard amplo de Vercel, domínio principal ou localhost nas configurações deste projeto de nuvem.
6. Usar caixas/aliases controlados exclusivos de testes e SMTP separado, se necessário e aprovado. O serviço padrão de e-mail do Supabase tem restrições de destinatários/volume; conferir antes de contratar SMTP. Nenhum e-mail foi enviado nesta etapa.
7. Vercel/Basic não protegem os endpoints públicos do Supabase. A publishable key não é segredo; manter grants/RLS, nenhuma escrita privilegiada anônima e controlar inscrições no Auth. Desabilitar inscrições entre janelas de teste ou preparar allowlist por mecanismo oficial aprovado. Não considerar a tela protegida como bloqueio de signup direto na API.
8. `ja_private` não deve ser schema exposto pelo PostgREST. Não habilitar Realtime, buckets ou integrações clínicas por conveniência. Esta entrega não usa Storage.

## 5. Aplicar a fundação — somente com nova autorização

Ordem imutável:

1. `202610250001_identity_foundation.sql`.
2. `202611140001_exclusive_owner_panels.sql`.

`npm run verify:migrations` verifica o conjunto e os hashes, sem conectar ao banco. O manifesto em `scripts/homologation/migrations.json` corresponde ao PR #8; divergência exige revisão. Não há seed, usuário proprietário nem execução automática em build.

O operador deve trabalhar em diretório novo e exclusivo, sem vínculo CLI anterior com o principal. Se usar Supabase CLI oficial: inicializar apenas o workspace operacional, copiar somente as duas migrações conferidas, autenticar pelo fluxo oficial, vincular **explicitamente a referência aprovada**, conferir projeto vinculado, consultar o histórico e executar um dry-run antes de solicitar a aplicação. Não usar URL com senha em argumentos, histórico do terminal, GitHub Actions ou documentação. A CLI não precisa de Docker para a operação remota de migração; não executar `supabase start` no Windows.

A execução real de `db push` exige autorização específica, papel com privilégios compatíveis/BYPASSRLS, plano de interrupção e backup aplicável. Parar se o histórico não estiver vazio/compatível, se aparecerem outras migrações ou se o alvo divergir. Não misturar aplicação manual no SQL Editor com controle CLI sem registrar corretamente o histórico: executar SQL manual não registra automaticamente o histórico da CLI.

Aplicar as duas migrações **antes do bootstrap** e antes de permitir uso da aplicação. A primeira bloqueia temporariamente inserções em `auth.users` durante trigger/backfill: manter cadastro fechado durante a instalação. Neste novo projeto, apenas identidades sintéticas podem existir. Conferir seis tabelas, RLS forçada, grants, funções, trigger `ja_provision_profile`, ausência de funções automáticas e delegação global desativada. Não repetir testes destructive/fixtures SQL no projeto hospedado; eles pertencem ao runner descartável.

Depois seguir [inicialização do proprietário](02-proprietario-e-recuperacao.md). Convites/vínculos sintéticos dependem de preparação operacional revisada; não há interface completa de habilitação de profissionais nesta entrega.
