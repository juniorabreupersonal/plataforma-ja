# Proprietário, recuperação e interrupção

Procedimentos **futuros**, somente no Supabase exclusivo de homologação, com autorização específica. Não foram executados nesta etapa. O painel de administração do provedor não é o painel administrativo da Plataforma JA.

## Inicialização controlada

1. Conferir os projetos, os hashes e as duas migrações aplicadas. Manter apenas revisores autorizados na Vercel e na barreira Basic. Registrar responsável, data e referência do procedimento sem senhas/tokens.
2. Quando o Preview privado estiver autorizado, criar uma conta sintética pelo cadastro, com e-mail/alias controlado dedicado à homologação. Confirmar e-mail no mesmo navegador, preservando o fluxo PKCE. Vercel Authentication e Basic deverão permanecer ativos durante o callback.
3. Entrar na conta. Confirmar que ainda não há painel nem atribuição global. Cadastro público e MFA não concedem privilégios.
4. Em **Minha conta → Configurar autenticador** (`/conta/seguranca`), iniciar TOTP, cadastrar manualmente a chave no autenticador e confirmar os seis dígitos. A chave aparece somente na sessão da própria conta. Não capturar a tela, gravar vídeo, enviar a terceiros ou incluir o seed em tickets/backups sem proteção.
5. Conferir no painel Auth do **projeto novo** a identidade correta, confirmação de e-mail e fator verificado; conferir perfil ativo e ausência de proprietário anterior. Não escolher UUID pelo nome de exibição, query string, metadado `role` ou pedido do navegador.
6. Um operador de banco autorizado executará **somente depois de nova autorização e revisão dos parâmetros** a função privada `ja_private.bootstrap_owner(UUID_VERIFICADO, MOTIVO_DO_CASO)`. Não existe endpoint público nem chamada pela aplicação. Não usar service_role no navegador. Não oferecer botão “tornar administrador”. O procedimento deverá usar papel confiável e registrar quem operou fora da aplicação, além da auditoria mínima do banco.
7. A função exige identidade confirmada, perfil ativo, MFA verificado e inexistência de outro proprietário vigente; duas inicializações concorrentes não criam dois proprietários. A concessão fica em histórico auditado.
8. Fazer logout e login: AAL1 não mostra menu administrativo; a rota direta solicita MFA. Somente após código válido há acesso e registro de leitura administrativa. Confirmar que a atribuição não concedeu vínculo profissional nem dados de alunos.
9. Para o proprietário atuar como profissional, preparar decisão/vínculo separado, auditável e autorizado, sem autoconcessão administrativa. Ainda não há interface completa para essa operação. Não usar SQL improvisado para contornar as regras do PR #8.

A matrícula inicial não substitui fator verificado existente e é bloqueada para conta já proprietária, inclusive com senha válida. Configurações abandonadas podem deixar fatores não verificados no Auth; limpeza é operação controlada do titular/operador e não concede funções. Não há endpoint de recuperação privilegiada nem geração automática de códigos de recuperação nesta entrega. Guardar autenticador/recuperação conforme política aprovada, sem presumir que reset de senha recupere MFA.

## Perda do MFA, suspeita de comprometimento ou perda de acesso

**Não desabilitar MFA e reativar a mesma atribuição imediatamente.** JWT AAL2 emitido pode continuar válido até expirar, principalmente pela API PostgREST. Revogar refresh tokens não revoga instantaneamente todo access token.

1. Suspender uso da homologação pela proteção do provedor; se houver suspeita de vazamento da barreira, rotacionar o token por procedimento aprovado e fechar navegadores. Login/logout da aplicação não apaga necessariamente credenciais Basic memorizadas pelo navegador.
2. Verificar identidade do proprietário por canais independentes, controle do projeto e evidências do caso. Acesso ao e-mail sozinho não autoriza concessão global. Registrar aprovação explícita e operador; não publicar evidências pessoais no repositório.
3. Com autorização específica, um operador confiável suspende o perfil e revoga a atribuição proprietária em transação auditada, preservando históricos. SQL e parâmetros devem ser preparados e revisados para o caso; este guia não é autorização para executá-los. Não apagar o proprietário, auditoria, vínculos ou recriar a conta por coincidência de e-mail.
4. Encerrar sessões/refresh tokens no Auth e bloquear novas emissões indevidas pelo procedimento oficial suportado. Tratar senha, e-mail e fatores comprometidos. Ferramentas administrativas ficam fora do navegador da aplicação e fora da Vercel; nenhuma chave privilegiada é introduzida no frontend.
5. **Aguardar a validade máxima registrada dos JWTs anteriores, com margem para relógios**, antes de reativar o perfil ou conceder acesso novamente. Se o limite não for conhecido ou não houver garantia de que novas emissões foram interrompidas, parar. A suspensão do perfil/atribuição protege o banco durante essa espera; não prometer revogação instantânea apenas por logout ou reset de fator.
6. Após verificação e autorização, remover fatores comprometidos por procedimento Auth administrativo controlado e recuperar a identidade original. Reativar somente o perfil básico, mantendo a atribuição anterior revogada. Garantir que antigos access/refresh tokens não permitem nova operação.
7. Matricular/confirmar novo TOTP pela própria conta, agora sem atribuição proprietária vigente. Reexecutar o bootstrap privado somente após nova revisão da identidade, MFA e caso. O histórico revogado permanece; não criar segundo proprietário vigente.
8. Validar login/MFA, auditoria, negação dos tokens anteriores, não ampliação de funções e reabertura controlada. Rever acessos profissionais separadamente. Se houver dúvida, manter a homologação fechada.

Ainda precisam de homologação operacional: verificação humana de identidade, disponibilidade das operações de encerramento/bloqueio no plano contratado, tempos reais de JWT, aprovação do SQL específico de revogação/reativação e ensaio completo de recuperação. Os testes automatizados da aplicação não certificam esse procedimento manual.

## Erro de implantação/migração

- Falha no preflight: interromper o build; não editar a guarda para liberar o alvo.
- Referência/origem incorreta: não tentar conectar para “ver o que acontece”. Corrigir metadados por PR revisado, conferir novamente todos os escopos e rebuild autorizado.
- Falha de SQL: parar, manter acesso restrito e cadastro fechado; identificar transação/histórico. Não fazer retry cego ou `DROP` de objetos históricos. Transação não substitui backup.
- Nova base descartável com dados exclusivamente sintéticos pode ser recriada somente com aprovação e conferência do alvo. A existência do principal nunca é alternativa de teste/restore.
- Após criar identidades/MFA, backups de homologação continuam sensíveis. Ensaiar recuperação isolada, criptografar pacote e guardar fora do Git/artefatos; procedimentos #5/#6 são referências de ensaio, não autorização de backup remoto.
- Rollback da aplicação para build anterior não reverte migração. Um build anterior sem as guardas não é fallback seguro; manter a barreira do provedor e parar se a versão não corresponder ao plano revisado.
