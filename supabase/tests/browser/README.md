# Next.js end-to-end com Supabase local

Workflow: `.github/workflows/identity-browser.yml`.

## Resultado executado

A [execução no GitHub Actions](https://github.com/juniorabreupersonal/plataforma-ja/actions/runs/40420662770)
passou no commit `ba113ea`, com Chromium real headless, Next.js em build de produção
e Supabase local descartável com a primeira migração instalada. Não houve alteração
na aplicação nem na migração para obter esse resultado.

### Executado no navegador real

- Cadastro de duas contas sintéticas pelo formulário Next.js.
- Bloqueio de `/conta` antes da confirmação.
- Abertura do link de confirmação capturado no SMTP local no mesmo contexto de
  navegador; troca PKCE e página de conta autenticada.
- Login por e-mail/senha pelo formulário.
- Recuperação pelo formulário, link de recuperação e definição de nova senha.
- Rejeição da senha antiga e acesso com a nova senha.
- Logout, navegação direta a `/conta` e `/redefinir-senha` e retorno pelo histórico sem restaurar a área
  autenticada; remoção dos cookies de sessão.
- Cookies de produção HttpOnly/Secure/SameSite=Lax e ausência dos cookies de sessão
  em `document.cookie`.

São assertivas de comportamento/DOM em Chromium, **não revisão estética manual,
comparação de pixels ou certificação de todos os navegadores**.

### Executado somente por HTTP/SQL automatizado

O controlador do teste lê os cookies HttpOnly em memória para extrair o JWT da
sessão real. O código JavaScript da página não recebe esse token.

- PostgREST retorna somente o próprio perfil básico, com estado ativo e sem nome
  importado de metadados; filtrar o UUID da outra conta retorna lista vazia.
- Ausência de atribuições globais e participações organizacionais automáticas.
- PATCH de `status`, `user_id` e `created_at` rejeitado com HTTP 403.
- INSERT para autoconceder papel global ou participação profissional rejeitado
  com HTTP 403; tentativas não alteram a identidade ou o estado do perfil.
- Consulta SQL local confirma ausência de papéis globais após todo o ciclo.

Não existe interface completa de perfil/organizações/alunos nesta entrega; a
aprovação de API não é apresentada como uma interface visual implementada.

## Isolamento e evidências

- Projeto Supabase criado em diretório temporário, com CLI fixada e checksum validado.
- Mesma migração do PR, Auth/PostgREST/SMTP reais; sem scaffold e sem projeto vinculado.
- Aplicação copiada por lista explícita de arquivos e pastas. Nunca copia `.env`, Git,
  dependências, build anterior ou estado Auth do checkout.
- `APP_URL`, URL e chave pública são definidos apenas no subprocesso de teste, com
  origens loopback. Variáveis de projeto herdadas são removidas.
- Browser bloqueia tráfego fora dos serviços loopback esperados. A API usada pelo
  teste também valida o destino. Mensagens vão apenas para a captura SMTP local.
- Sem screenshots, vídeos, traces, exportação de cookies ou storage state. Somente
  rótulos, resultados e resumo de assertivas são registrados no check.
- Next.js é encerrado e Supabase parado sem backup; diretórios e runner descartados.
- A única alteração no setup local compartilhado foi permitir também o redirect de
  recuperação `?flow=recovery`. Não se altera configuração hospedada.

Os cinco testes em `test_browser_safety.py` verificam limites do executor sem
iniciar navegador/serviços. Não contam como execução end-to-end:

```bash
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s supabase/tests/browser -p 'test_*.py' -v
```

## Pendências

- Firefox, WebKit, navegadores móveis e revisão manual de acessibilidade/layout.
- Configuração HTTPS/domínios/cookies fora da exceção loopback do Chromium.
- Interfaces futuras de perfil e gestão de organizações e seus testes próprios.
- Revisão operacional/jurídica, backup, retenção e autorização separada para qualquer
  aplicação no projeto principal. Este resultado não autoriza migração remota ou merge.
