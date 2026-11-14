# Etapa 167 — preparação da homologação

**Preparado no repositório; nenhum serviço contratado, projeto externo criado ou aplicação publicada.** Esta branch depende do PR #8 (`f5c1880`), que incorpora as bases dos PRs #4 e #7. Os PRs anteriores continuam em rascunho e inalterados. O diff contra main inclui essas dependências.

A homologação usará um projeto Vercel separado, somente **Preview**, e um **novo projeto Supabase exclusivo**, sem copiar usuários, chaves, banco, arquivos ou integrações do projeto principal. Somente contas sintéticas e caixas de e-mail de teste controladas. Não usar nomes de alunos, fotografias, prontuários ou conversas reais.

O código bloqueia todos os destinos Supabase remotos enquanto `src/config/homologation.json` estiver incompleto. O estado inicial é intencionalmente fechado, e não deve ser flexibilizado para conseguir um deploy. `git.deploymentEnabled=false` desativa deployments automáticos por Git; não impede um operador de clicar em Deploy ou executar uma CLI, ações que continuam sem autorização nesta etapa.

## Documentos operacionais

1. [Configuração, variáveis e passo a passo](01-configuracao.md).
2. [Proprietário, MFA, recuperação e interrupção](02-proprietario-e-recuperacao.md).
3. [Testes, critérios de liberação e custos](03-validacao-e-custos.md).

## Controles preparados

- Guarda compartilhada antes de criar clientes Supabase SSR/browser e renovar sessões no Proxy.
- Alvo remoto somente na allowlist versionada, diferente das referências protegidas; não basta mudar variáveis do ambiente.
- Em nuvem: `APP_ENV=staging`, Vercel Preview real, origem HTTPS exata e chave **publishable**. Production, origem alternativa, chaves privilegiadas e URLs enganosas são rejeitados.
- Desenvolvimento/testes: somente Supabase em `localhost:54321` ou `127.0.0.1:54321`; não é permitido usar o principal como atalho local.
- Barreira HTTP Basic na homologação, antes de qualquer consulta ao Supabase, cobrindo páginas, callbacks, APIs e assets pelo Proxy. Ela **não concede identidade nem função**. Secret somente no servidor.
- Exigir adicionalmente Vercel Authentication/Deployment Protection, configurada pelo proprietário. O repositório não consegue atestar essa configuração externa.
- Cabeçalhos privados/sem cache e `noindex`; indexação desativada não substitui autenticação.
- Proprietário exclusivo e MFA AAL2 do PR #8 preservados. Matrícula inicial TOTP na própria conta não cria funções e não permite substituir fator de conta já proprietária.
- Manifesto de hashes das duas migrações; nenhuma migração ou seed automático em build/deploy.
- CI sem deploy, secrets ou projeto remoto. Supabase/Docker somente no runner descartável, nunca no Windows do proprietário.

A proteção cobre erros de configuração nos caminhos de acesso existentes. Não substitui revisão humana da identidade dos projetos, RLS, controle das contas dos provedores ou proteção do repositório. Quem altera código/política ou possui administração do provedor pode mudar os controles. A indicação `syntheticDataOnly` é uma regra operacional, não um detector automático de dados reais.

## Arquivos principais

`vercel.json`, `src/config/homologation.json`, `src/lib/environment/`, `scripts/homologation/`, `.github/workflows/homologation-readiness.yml`, `tests/homologation/` e matrícula inicial em `/conta/seguranca`. O executor integrado recebeu somente adaptações para copiar o preflight, isolar variáveis e testar a matrícula. As duas migrações do PR #8 e os logotipos não foram alterados.
