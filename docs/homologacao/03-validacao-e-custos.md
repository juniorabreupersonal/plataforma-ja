# Validação, liberação e custos indicativos

## Automação no repositório

```text
npm ci --include=dev
npm run test:homologation
npm run verify:migrations
npm run lint
npm run build
```

Para build local, somente configuração de processo loopback: `APP_ENV=local`, `APP_URL=http://localhost:3000` (ou `127.0.0.1:3000/3210`), Supabase em `http://127.0.0.1:54321` e chave local sintética. Não copiar `.env` real. O build não exige Supabase local em execução, mas um teste de login real precisa do stack descartável no CI. Nenhuma das instruções exige Docker no Windows.

`prebuild` e `next.config.ts` validam o ambiente; a segunda verificação também cobre variáveis carregadas pelo Next de arquivos locais. `npm run verify:homologation` exige contexto de Preview aprovado e não deve passar nesta branch ainda não configurada. Na Vercel futura, executar no processo de build configurado, sem falsificar variáveis reservadas. Ele valida configuração **sem fazer rede**; não atesta o estado real dos provedores.

O workflow `homologation-readiness.yml` testa política em memória com identificadores fictícios, host/origem, chave pública, destinos proibidos, modo Production, downgrade por env, barreira Basic, callbacks/assets/APIs, segredo ausente, factories antes de rede, regressão Auth/MFA/funções e manifesto. Não contém deploy, secrets de projeto ou artefatos. As falhas não imprimem valores do ambiente.

Os workflows herdados continuam validando PostgreSQL, Supabase real descartável e Auth/Next.js/Chromium. O ensaio dos painéis agora cobre matrícula TOTP real de conta comum e tentativa de proprietário AAL1 acessar a matrícula, além dos cenários de MFA, RLS e isolamento já existentes. Chaves TOTP/sessões são mantidas em memória, sem screenshots/traces/artefatos desses testes. As demonstrações públicas mantêm seus ensaios de navegação, marca, contraste selecionado e responsividade.

**Não confundir testes de política/Proxy com uma implantação Vercel real.** Os testes de infraestrutura são offline/com adaptadores. Os fluxos da aplicação rodam no Supabase local descartável. Não houve acesso a um projeto hospedado, verificação da conta/plano da Vercel ou comprovação externa de Deployment Protection.

## Checklist para futura autorização de Preview privado

Tudo abaixo exige evidência e aprovação; não está marcado como concluído:

- [ ] Projeto Supabase criado exclusivamente para homologação, vazio de dados reais e distinto do principal.
- [ ] Referências protegidas e referência/origem de homologação revisadas no JSON; chaves provenientes apenas do novo projeto.
- [ ] Projeto Vercel separado, Preview, Node 24, Git deploy desligado, escopos de variáveis conferidos, sem Marketplace/variáveis de produção.
- [ ] Vercel Authentication cobrindo todos os endereços pretendidos; revisores autorizados e token Basic distribuído em canal seguro.
- [ ] Custos/limites, disponibilidade do plano, SMTP e destinatários de teste aprovados.
- [ ] Duas migrações com hashes conferidos, histórico/privilégios corretos, autorização específica e plano de parada/recuperação.
- [ ] Auth confirmado, redirects exatos, TOTP, JWT TTL conhecido, signup controlado e RLS/grants conferidos.
- [ ] Nenhum proprietário automático; operação separada de bootstrap aprovada e recuperação revisada.
- [ ] Todos os checks do commit candidato aprovados, incluindo integração descartável; nenhum `.env`, dump, credencial, seed real ou artefato de produção.
- [ ] Autorização explícita para o primeiro Preview privado. Aprovar este PR ou passar testes não publica automaticamente.

Depois do Preview **privado autorizado**, em navegador novo: validar bloqueio anônimo de raiz/URL direta/callback/assets; depois SSO+Basic, cadastro/PKCE/confirmação/recuperação com e-mails sintéticos e mesma origem; conta básica sem papéis; matrícula sem promoção; proprietário MFA; profissionais/alunos sintéticos distintos; isolamento via API; revogação/suspensão e logout. Nenhuma proteção pode ser desativada para fazer o callback funcionar. Não declarar aprovado o ambiente hospedado com base apenas no CI local. Gestão completa de alunos, avaliação persistente, Safari/Firefox/mobile físico, acessibilidade completa, SMTP real e recuperação manual continuam dependendo de outras validações.

## Custos — orçamento, não contratação

Referências oficiais abaixo foram indicadas, mas o acesso aos sites foi bloqueado no ambiente desta etapa. **Preços, limites e funcionalidades não foram confirmados online em 14/11/2026.** Valores históricos indicativos em USD, antes de câmbio, impostos, adicionais e consumo; reconferir no painel e na página vigente antes de qualquer ação.

| Item | Referência indicativa para planejar | Condição |
|---|---|---|
| Vercel Hobby | US$ 0 | Não presumir adequação comercial; conferir restrições de uso pessoal/não comercial, repositório privado, equipe e proteção |
| Vercel Pro | Cerca de US$ 20 por assento/mês, mais consumo/adicionais | Opção a avaliar para Plataforma JA comercial; conferir créditos, limites e acesso de revisores |
| Supabase Free isolado | US$ 0 se houver vaga/limites disponíveis | Sem assumir backup gerenciado; pode haver pausa por inatividade, limites de banco, egress, Auth e número de projetos |
| Supabase Pro opcional | Referência inicial de cerca de US$ 25/mês, com compute/projetos/adicionais a conferir | Cobrança depende de organização, projetos e créditos. Não atualizar a organização principal sem autorização |
| SMTP/domínio/monitoramento | Variável | Subdomínio Vercel pode evitar domínio pago; SMTP separado pode exigir aprovação e custo |
| GitHub Actions | Dentro da cota disponível ou cobrado por uso | Repositório privado; suites descartáveis usam minutos/armazenamento de imagens do runner. Conferir cota antes de repetir em escala |

Cenário enxuto possível: Supabase Free isolado + plano Vercel elegível; para planejamento comercial, reservar aproximadamente US$ 20/mês por assento Vercel se esse for o preço vigente, sem incluir consumo/SMTP. Com Supabase pago, referência combinada a partir de aproximadamente US$ 45/mês para um assento, **não garantida**: compute extra/organizações/overage podem mudar o total. Nenhuma despesa foi autorizada ou realizada.

Free não implica disponibilidade, backup ou SLA de produção. Bloquear avanço se a opção gratuita não oferecer acesso restrito, recebimento de e-mail de teste ou recursos suficientes. Não resolver restrições de custo expondo a homologação ou compartilhando o principal.

## Fontes oficiais para conferência manual

- [Vercel: Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel: configuração de projeto e deploymentEnabled](https://vercel.com/docs/project-configuration)
- [Vercel: variáveis e ambientes](https://vercel.com/docs/environment-variables)
- [Vercel: Deployment Protection](https://vercel.com/docs/deployment-protection)
- [Vercel: Hobby](https://vercel.com/docs/plans/hobby), [preços](https://vercel.com/pricing)
- [Supabase: preços](https://supabase.com/pricing), [backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase: gerenciamento de ambientes/migrações](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase: redirecionamentos](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: MFA](https://supabase.com/docs/guides/auth/auth-mfa), [sessões e revogação](https://supabase.com/docs/guides/auth/sessions)
