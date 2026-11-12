# Painéis de demonstração

Rotas públicas e isoladas: `/demonstracao`, `/demonstracao/administrador`, `/demonstracao/profissional`, `/demonstracao/aluno`. Não são painéis autenticados: todo conteúdo é editorial fictício, sem consultas ao Supabase, formulários ou operações. A escolha de um exemplo não usa sessão/cookies/query para conceder funções. Não são criadas as rotas reais `/administrador`, `/profissional` ou `/aluno`; `/conta` e recuperação mantêm as verificações existentes.

Os Server Components e dados reutilizáveis estão em `src/components/demonstracao/`. Não importar estes dados na futura autorização. `noindex` evita indexação solicitada, não é mecanismo de segurança. A demonstração não aparece como funcionalidade pronta na página inicial; acesso pelo endereço de demonstração.

Verificações:

- `node --test tests/auth.test.mjs`: regressão da autenticação, com adaptadores simulados.
- `npm run lint` e `npm run build`.
- `python3 tests/demonstracao/browser.py`: após build, inicia Next.js local na porta 3210, sem servidor Supabase. Requer Playwright Python + Chromium (local: 1.62.0; CI fixado em 1.64.1); `CHROMIUM_PATH` permite usar Chromium já instalado.

O build deve receber apenas `APP_URL=http://127.0.0.1:3210`, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` e chave pública fictícia `sb_publishable_demo_not_a_real_key`, sem carregar credenciais de ambiente real. Não escrever `.env`. O workflow aplica esses valores no runner descartável.

O navegador permite tráfego só para a aplicação loopback, testa desktop 1440px e telas 390px/320px, navegação de todos os perfis/seções/retorno, overflow, atalho de teclado, ausência de formulários e cookies, manipulação de papel e bloqueio das rotas existentes. Não usa contas, não chama Supabase real e não exporta sessões. Não confundir verificações de viewport Chromium com validação em aparelhos físicos, Safari/Firefox ou auditoria completa de acessibilidade.

Não foram implementados MFA visual, autorização por função, gestão, cadastro de alunos, avaliações ou persistência. Esses recursos dependem das próximas entregas e da migração revisada, com RLS e autorização servidor. Não publicar esta demonstração como atendimento real.

Validação inicial: build aprovado, 18 testes existentes de autenticação aprovados e 131 assertivas em Chromium real nas três larguras. Lint sem erros; permanece o aviso anterior de import não usado em `src/app/teste-supabase/page.tsx`. A inspeção visual de capturas desktop/celular foi realizada; não equivale a auditoria completa de acessibilidade. Identificadores de âncoras são únicos por painel para conviver com páginas preservadas pelo cache do Next.js.

## Paleta Roxo Equilibrado

A atualização visual usa a fonte única `tokens.ts` e classes prefixadas em `theme.css`, devido ao loader CSS atual. O CSS não altera as páginas fora de `.ja-demo`. O logotipo gráfico original não foi encontrado: permanece a identificação textual, sem redesenho ou recoloração de marca original.

Nova página `/demonstracao/identidade` e [exemplos visuais para revisão](VISUAL.md), com capturas estáticas fictícias versionadas. O workflow continua sem upload de capturas/traces/sessões. A versão atual do navegador executa 178 assertivas, acrescentando paleta, ação azul, contrastes selecionados de texto (mínimo 4,5:1), contraste não textual do detalhe roxo (mínimo 3:1) e revisão da página de identidade em 1440/390/320 px. Isso não autoriza atendimento, publicação ou aprovação definitiva dos painéis.
