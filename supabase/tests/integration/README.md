# Integração com Supabase local descartável

Esta suíte é executada exclusivamente no GitHub Actions, pelo workflow
`.github/workflows/identity-supabase.yml`. Não aceita URL, senha, ref ou token de
projeto externo, não lê `.env` e remove variáveis Supabase herdadas dos subprocessos.

## Ambiente

- Supabase CLI **2.122.0**, distribuição oficial com checksum verificado.
- Projeto novo em diretório temporário, sem link com projeto hospedado.
- PostgreSQL 17, Auth, PostgREST e SMTP de captura reais do Supabase local.
- TOTP habilitado somente na configuração temporária. Não é usado o scaffold Auth.
- Somente endpoints `http://127.0.0.1:54321` e `http://127.0.0.1:54324`; sem proxy HTTP
  e sem seguir redirecionamentos. O redirecionamento PKCE é inspecionado em memória.
- Oito identidades sintéticas em `example.test`; senhas, verificadores PKCE, tokens
  e segredos TOTP gerados/obtidos em memória, nunca publicados como logs ou artefatos.
- SQL operacional executado apenas por `docker exec` no contêiner de nome fixo desse
  projeto local. O bootstrap ocorre somente nesse contêiner de testes.
- Limpeza por `supabase stop --no-backup`, com resultado verificado. O runner inteiro
  também é descartável. Nenhum estado é enviado a cache ou artefatos.

O executor recusa execução fora de `GITHUB_ACTIONS=true`. Mesmo nesse contexto,
os destinos HTTP e o contêiner são fixos e não vêm de secrets ou parâmetros externos.
O workflow usa apenas `contents: read` para checkout e não persiste credenciais Git.

## Cenários

1. Cadastro de duas contas antes da migração, com confirmação por mensagem capturada
   no SMTP local e troca PKCE real. Login antes da confirmação é negado.
2. Aplicação da migração no esquema Auth nativo, backfill e cadastro posterior de
   outras seis contas. Perfil restrito ao titular; metadados hostis não geram papéis.
3. Matrícula, desafio e verificação TOTP; JWTs AAL1/AAL2 efetivamente emitidos pelo Auth
   e validados pelo PostgREST. Administração negada em AAL1.
4. Bootstrap concorrente do mesmo proprietário: uma decisão e uma rejeição, sem
   endpoint público ou atribuição pelo cadastro.
5. Convites e solicitações de acompanhamento concorrentes: uma criação e um conflito
   de unicidade, sem duplicação.
6. Aceite concorrente com encerramento: resultados serializados ou falha transacional
   segura; eventual deadlock é tratado somente pelo SQLSTATE específico, com nova
   tentativa de encerramento. Nenhum vínculo ativo com participação encerrada.
7. Múltiplos profissionais e organizações para um aluno, preservação de histórico e
   ausência de compartilhamento automático com outro profissional ou outro aluno.
8. Ausência de acesso assistencial automático para proprietário/administrador e
   rejeição de autoconcessão direta pela API.
9. Revogação, expiração por passagem de tempo e suspensão com o mesmo JWT, usando
   requisições HTTP independentes.
10. Encerramento do stack sem backup e registro somente de rótulos, status e códigos
    de erro sanitizados. Não são reproduzidos corpos HTTP ou saída bruta da CLI.

## Estado e correções

A [execução integrada](https://github.com/juniorabreupersonal/plataforma-ja/actions/runs/40156821535)
passou no commit `a231fe2`. A primeira execução encontrou uma expectativa incorreta
no teste: RPCs `void` retornam **HTTP 204**, não 200. A expectativa foi corrigida;
a migração não precisou de alteração.

Os sete testes em `test_runner.py` verificam limites de destino, redirecionamento,
extração de link sintético, edição restrita de configuração, remoção de variáveis
herdadas e sanitização de erros. Eles rodam localmente sem iniciar serviços:

```bash
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s supabase/tests/integration -p 'test_*.py' -v
```

## Limites e pendências

- O teste integrado chama diretamente Auth e PostgREST. Não substitui o aceite do
  navegador/Next.js com a migração instalada (cookies, Proxy e Server Actions).
- A matrícula TOTP local não valida procedimentos humanos de identificação,
  recuperação ou delegação do proprietário.
- Foram executadas corridas concorrentes concretas, não uma prova exaustiva de todas
  as interleavings nem teste de carga. Deadlocks requerem tratamento na integração.
- Confirmar versão/contrato do projeto de destino, backup, retenção/exclusão e janela
  de aplicação antes de qualquer autorização para o projeto principal.
- Nenhum resultado autoriza aplicar SQL no Supabase principal ou realizar merge.
