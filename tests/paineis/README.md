# Etapa 166 — painéis autorizados

## Dependências e escopo

Branch `feat/paineis-autorizados`, criada da main `b96debb`, incorpora **somente nesta branch de trabalho**:

- PR #4, `1841a93`: seis tabelas, RLS, funções transacionais, auditoria, provisionamento e bootstrap restrito.
- PR #7, `f29de9e`: estrutura visual aprovada, tokens Roxo Equilibrado e arquivos de marca preservados.

Nenhum desses PRs foi mesclado na main ou alterado. O novo PR depende da revisão integrada de ambos; seu diff contra main inclui essas bases. Os PRs #5/#6 não são dependências de código e permanecem intactos. Nenhuma implantação é autorizada por este trabalho.

A nova migração `202611140001_exclusive_owner_panels.sql` deve vir **depois** da fundação. A fundação permanece intacta. O novo SQL desativa `ja_grant_admin`, mantém atribuições históricas e torna `platform_manager` exclusivo do proprietário. Não inicializa proprietário nem cria contas. Não há interface ou endpoint de bootstrap.

## Comportamento entregue

- `/administrador`: proprietário ativo/confirmado, atribuição vigente, JWT AAL2; leitura auditada, listagem e criação de organizações com auditoria transacional existente.
- `/profissional` e `/aluno`: exigem participação ativa da função correspondente em organização ativa; mostram somente vínculos de que a identidade é participante. Sem busca de perfis alheios ou dados assistenciais.
- `/conta`: navegação derivada do banco e aceite de convites previamente autorizados, sem escolher funções pelo formulário. Conta básica não recebe painel automaticamente.
- `/seguranca/mfa`: acessível somente à identidade proprietária vigente; confirma TOTP previamente matriculado pelo procedimento restrito. Não oferece matrícula de proprietário, promoção, reset privilegiado ou recuperação automática de MFA.
- Público: acessos de profissional/aluno e demonstrações desses dois perfis. Demonstração administrativa removida, inclusive acesso direto retorna página inexistente. Capturas históricas no repositório privado são evidência de revisão, não rotas públicas da aplicação.

O proprietário não recebe função profissional automaticamente. É possível acumular mediante vínculo separado, emitido por processo autorizado sem autoconcessão. A fixture integrada simula essa decisão operacional separada, no banco descartável, sem criar endpoint de concessão. O procedimento operacional real de habilitação profissional do proprietário requer revisão específica antes de produção.

`ja_panel_context` usa SECURITY INVOKER, RLS e identidade do JWT; não recebe UUID nem função do chamador. Não há cache de autorização compartilhado ou `service_role`. Cada Server Action revalida a identidade/permissões e o RPC repete a autorização no banco. O contexto não substitui RLS dos registros. Claims de usuário, cookies `role`, query strings e campos escondidos não são autoridades.

Falhas de Auth/banco negam acesso; conta válida permanece com mensagem de indisponibilidade. Falha de auditoria impede renderizar painel administrativo. Mensagens não refletem erros brutos do provedor. Next.js mantém proteção de origem das Server Actions. Não há nova API HTTP privilegiada; os RPCs PostgREST continuam sujeitos a grants e autorização própria.

## Verificações

- `node --test tests/auth.test.mjs tests/paineis/access.test.mjs tests/demonstracao/brand-assets.test.mjs`: adaptadores simulados para guardas, ações, MFA; regressão Auth e hashes dos originais.
- `python3 tests/demonstracao/refine_brand.py`: integridade das cópias sem regravação.
- `npm run lint`, `npm run build`, usando somente configuração loopback fictícia; não escrever `.env`.
- `CHROMIUM_PATH=/usr/bin/chromium python3 tests/demonstracao/browser.py`: demos públicas de profissional/aluno, cores, imagens, navegação e negativas anônimas; não usa Auth real.
- `.github/workflows/authorized-panels.yml`: runner descartável aplica **as duas migrações** no Supabase real local, copia aplicação sem `.env`, executa Next.js/Chromium. Não usa projeto vinculado, secrets, contas reais ou artefatos contendo tokens.
- Workflows herdados do PR #4 continuam validando a fundação isoladamente. Seu sucesso não substitui o workflow novo, que aplica também a restrição de administrador exclusivo.

O executor integrado restringe chamadas a loopback fixo, ignora proxies e só inicia com `GITHUB_ACTIONS=true`. O bootstrap existe apenas na fixture sintética. Segredos TOTP e sessões locais ficam em memória e não são registrados; não há screenshots/traces/storage state no workflow integrado. Uma falha registra somente etapa e rótulo controlados.

Cenários integrados previstos: conta básica/metadados hostis, admin legado AAL2 sem poderes, proprietário AAL1/AAL2, MFA inválido/válido pelo formulário, criação de organização por ação servidor, aceite legítimo e ID adulterado, profissional em cada organização, aluno com dois vínculos independentes, proprietário profissional sem acesso a vínculos alheios, encerramento de participação, suspensão de organizações/perfil com JWT antigo e logout.

## Limites

Entrega pequena: listas de até 100 vínculos/organizações recentes, identificadores técnicos em vez de nomes privados. Não há busca geral de alunos, edição de papéis/status, cadastro assistencial, interface completa de habilitação profissional, gestão de MFA, encerramento de vínculos pela interface, triagem persistente, anamnese ou dados clínicos. Cadastro/login/confirmação/recuperação existentes foram preservados.

Não pronta para produção: migrações não implantadas; dependências ainda em revisão; bootstrap real e MFA operacional pendentes; plano de backup/restauração e autorização específica necessários antes do projeto principal. Somente dados sintéticos em homologação. Safari/Firefox, aparelhos físicos e auditoria completa WCAG não são demonstrados por Chromium headless. Auditoria mínima cobre decisões/escritas da fundação e leituras administrativas; monitoração operacional de tentativas negadas e limitação de requisições requerem definição antes de produção.

Resultados da execução serão registrados no PR, distinguindo verificações locais simuladas e integração real descartável.

Proxy estendido aos painéis e `/seguranca`, preservando renovação de sessão, `Cache-Control: private, no-store` e `Referrer-Policy: no-referrer`. O ensaio integrado também repete uma Server Action real com sessão profissional e com origem externa, verificando ausência de escrita.

## Evidência local e ajustes do ensaio

No código da entrega: 34 testes Node, 26 verificações Python da fundação/executores, build de produção, verificação pixel a pixel e 199 assertivas Chromium públicas aprovados. Lint sem erros, com o aviso preexistente de import não usado em `/teste-supabase`.

As duas migrações chegaram à fase de navegador no stack real descartável. A primeira tentativa sofreu falha de inicialização da CLI; a repetição iniciou o stack. Ensaios seguintes localizaram problemas na sincronização do teste de aceite: o teste atual captura a ação real e repete um POST com um convite pendente de terceiro, confirma persistência separadamente por HTTP e aguarda a renderização dinâmica antes de verificar menus/negativas. As falhas anteriores não são classificadas como validação completa dos painéis. O resultado integrado definitivo deve constar no PR e no workflow do commit final.
