# Segurança, LGPD, auditoria e validação

## Controles obrigatórios

- Negação por padrão em servidor, RLS e Supabase Storage; verificações também para inclusão, alteração, exclusão, listagem e novos valores.
- Isolamento por organização, aluno, vínculo e recurso. UUID não é autorização.
- Funções vêm de atribuições protegidas, nunca de metadados controlados pelo usuário.
- Credenciais privilegiadas apenas em serviços controlados. Ao contornar RLS, o serviço assume a obrigação de verificar cada autorização.
- Sessões verificadas no servidor; poderes vigentes consultados no banco. Revogação não depende de claims antigos ou de esconder botões.
- MFA administrativo, limites de requisição, erros sem enumeração de contas e transações para alterações de autorização com auditoria.
- Recuperação pelo Auth com redirecionamentos permitidos e tokens de uso único. Perda de MFA administrativo exige procedimento verificado, sem endpoint público de promoção.
- Falhas de autorização negam acesso. Falhas parciais não podem deixar concessões ativas sem decisão registrada.

## LGPD e operação

Antes de dados reais: mapear finalidades, categorias, fundamentos jurídicos para dados sensíveis, agentes de tratamento, contratos, direitos, retenção, exclusão e transferências internacionais. A classificação entre controlador e operador depende de cada operação e contrato, não apenas de um papel no software.

Consentimentos, quando aplicáveis, devem ser específicos, informados e rastreáveis. Não usar aceite único para atendimento, compartilhamento, publicidade e treinamento de IA. Recusa ao treinamento não afeta o serviço principal.

Definir canal para titulares, verificação proporcional de identidade, portabilidade, correção, exclusão e resposta a incidentes. Backups, derivados e fornecedores precisam estar incluídos nos procedimentos. Avaliar necessidade de relatório de impacto e revisão jurídica especializada.

Auditar concessões, revogações, transferências, acessos sensíveis relevantes, exportações e operações do Lab. Logs terão acesso restrito, retenção definida e proteção contra alteração. Não incluir senhas, tokens, URLs assinadas, fotografias, conteúdo clínico ou mensagens.

## Matriz mínima de testes futuros

| Cenário | Resultado exigido |
|---|---|
| Cadastro declara papel privilegiado | Nenhuma promoção |
| Autoconcessão ou ampliação de delegação | Negada e auditada |
| API direta, UUID adulterado, escrita em lote ou relação inconsistente | Isolamento mantido |
| Mesmo aluno, dois profissionais | Sem compartilhamento automático |
| Administrador comercial consulta dados clínicos | Negado sem autorização própria |
| Concessão expirada/revogada com sessão antiga | Novas operações bloqueadas |
| Transferência ou encerramento | Histórico preservado; acessos limitados |
| Listagem Storage, caminho adivinhado, original ou derivado | Acesso não autorizado negado |
| URL assinada expirada | Acesso negado; janela anterior à expiração documentada |
| Compartilhamento de foto | Somente recurso e destinatário selecionados |
| Marca-d’água e cache | Sem entrega de versão de outro visualizador |
| Recuperação, token reutilizado ou redirecionamento inválido | Rejeição segura |
| Falha em transação de autorização | Sem estado parcialmente concedido |
| Assinante inicia treinamento ou responsável excede escopo | Negado |
| Dado sem autorização vigente entra em conjunto | Admissão/execução bloqueada |
| Mesmo aluno ou derivados em treino e validação/teste | Vazamento detectado e avaliação bloqueada |
| Retirada após preparação do conjunto | Uso futuro suspenso para reavaliação |
| Sugestão de IA sem aprovação profissional | Não vira conclusão/prescrição aprovada |

Testar com identidades distintas, sessões reais e acesso direto ao Supabase. Testes com credencial privilegiada não demonstram eficácia de RLS. Realtime, se habilitado, deve respeitar as mesmas restrições. Direitos do titular e rotinas de restauração também exigirão validação operacional.
