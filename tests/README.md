# Verificação da primeira entrega de autenticação

## Execução local

- `node --test tests/auth.test.mjs`: testes do código de ações, callback, validação, cookies SSR e Proxy com adaptadores simulados. Não cria contas, envia e-mails ou acessa dados reais.
- `npm run lint`
- `npm run build`
- `node tests/smoke-auth.mjs`: após o build, inicia e encerra um servidor local na porta 3101; verifica páginas, bloqueio anônimo e callback inválido, sem criar usuários.

Os testes simulados não demonstram entrega de e-mail, configuração do projeto remoto, renovação real de sessão ou comportamento integral do navegador.

## Pré-requisitos operacionais

Nenhuma configuração do Supabase foi alterada por esta entrega.

- As variáveis existentes `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` são necessárias. Não utilizar credencial privilegiada.
- Definir `APP_URL` no servidor com a origem HTTPS oficial, sem caminho ou parâmetros. Em desenvolvimento, aceita `http://localhost:porta` e `http://127.0.0.1:porta`. A origem não é inferida de cabeçalhos enviados pelo cliente.
- Verificar, mediante aprovação do responsável, Site URL e lista de redirecionamentos do Supabase para essa origem: `/auth/callback` e `/auth/callback?flow=recovery`.
- Manter confirmação de e-mail habilitada. Os templates precisam preservar o fluxo de confirmação PKCE do Supabase e seu redirecionamento; um template personalizado que envie apenas `token_hash` não é atendido por este callback.
- Verificar SMTP, limites de envio, políticas de senha e conectividade HTTPS do runtime. O código não modifica esses controles.
- PKCE exige abrir o link no mesmo navegador em que foi iniciado o cadastro ou a recuperação. Não desabilitar essa proteção para contornar links inválidos.

Na instância inspecionada, a leitura pública de `/auth/v1/settings` retornou HTTP 200, confirmação habilitada e cadastro permitido. `APP_URL` não estava definida. Não se considera o fluxo real de e-mail validado.

## Aceite integrado pendente

Usar somente conta de teste e caixa postal controlada, sem dados clínicos:

1. Acessar `/criar-conta`, enviar cadastro e confirmar que não há acesso antes da confirmação.
2. Abrir o e-mail no mesmo navegador, confirmar e acessar `/conta`. Não deve existir atribuição de função profissional ou administrativa.
3. Sair por POST; verificar bloqueio da conta por nova requisição. Logout normal encerra esta sessão, não promete encerrar outras sessões.
4. Entrar com senha correta e testar senha incorreta sem exposição de detalhes do provedor.
5. Solicitar recuperação, abrir link no mesmo navegador e definir senha com confirmação. Verificar que a senha anterior deixa de funcionar e é necessário entrar novamente.
6. Testar link expirado, reutilizado, sem verificador PKCE e aberto em outro navegador: falha segura.
7. Testar cookies de sessão adulterados, sessão expirada e renovação real. Verificar propagação dos cookies renovados e ausência de cache compartilhado.
8. Testar POST de outra origem: a proteção de origem de Server Actions do Next.js deve rejeitá-lo. Não ampliar `allowedOrigins` sem análise.
9. Conferir em HTTPS os cookies HttpOnly, Secure e SameSite=Lax e a ausência de tokens na interface ou nos logs da aplicação.

A troca de senha solicita encerramento global via Supabase. Tokens de acesso já emitidos podem permanecer válidos até expirar conforme a semântica do provedor; esta entrega não implementa revogação administrativa de sessões.

`/cadastro` e `/triagem` permanecem demonstrações independentes; não persistem dados e não foram convertidos em prontuário. `/conta` contém somente confirmação de sessão, sem papel ou dados sensíveis. Perfis, organizações, MFA administrativo, auditoria de domínio e RLS de dados assistenciais pertencem a entregas posteriores.
