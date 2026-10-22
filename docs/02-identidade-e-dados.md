# Identidade, organizações e histórico do aluno

## Requisitos definidos

A identidade pertence ao Supabase Auth; funções e permissões ficam separadas. Uma pessoa pode ser aluno e profissional em contextos distintos. Cadastro público não atribui privilégios profissionais, administrativos ou acesso ao Método JA.

O proprietário inicial será associado a uma identidade verificada por procedimento operacional restrito, sem endpoint público de inicialização. O administrador principal depende de concessão explícita do proprietário; não pode se promover ou ampliar sua delegação. MFA será exigido para funções privilegiadas.

Organizações delimitam o contexto de trabalho, mas administrar uma organização não autoriza consultar saúde, fotografias ou conversas. Cada vínculo aluno–profissional é individual. Um aluno pode manter vários vínculos, inclusive em organizações distintas, sem compartilhamento automático.

## Autonomia, portabilidade e encerramento

O histórico pessoal deve permanecer associado ao aluno, preservando autoria profissional e contexto de origem. Troca de profissional, encerramento de vínculo ou saída de uma organização não apagam automaticamente os registros.

O aluno poderá consultar seu histórico, gerenciar compartilhamentos e solicitar acesso, exportação, correção e exclusão conforme os direitos e limites aplicáveis. Correções clínicas preservam autoria e rastreabilidade; não autorizam apagar ou reescrever silenciosamente registros profissionais. Autonomia do titular não elimina obrigações legítimas de retenção.

- Compartilhamento: seleção explícita de recursos, profissional destinatário, finalidade, prazo e revogação. Sem inclusão automática de registros futuros ou recompartilhamento.
- Transferência: novo vínculo; registros antigos mantêm origem e autoria. Recursos necessários são disponibilizados mediante autorização específica, sem transferir automaticamente conversas ou todo o prontuário.
- Encerramento: bloqueia novas operações assistenciais e concessões operacionais associadas. Acesso histórico posterior requer finalidade e permissão próprias, a definir antes da produção.
- Recuperação: perder acesso à conta não elimina o histórico nem permite apropriá-lo criando outra conta com o mesmo e-mail.

## Entidades mínimas propostas da Fase 1

| Entidade | Campos essenciais e relações |
|---|---|
| `auth.users` | Identidade e credenciais gerenciadas pelo Auth |
| `profiles` | `user_id` → Auth, nome de exibição, estado, datas; sem senha ou papel privilegiado |
| `platform_role_assignments` | usuário, função, concedente, motivo, início, validade, revogação |
| `organizations` | identificador, nome, estado, criador e data |
| `organization_memberships` | organização, usuário, função, estado, concedente, aceite e encerramento |
| `care_relationships` | organização, aluno, profissional, solicitante, aceites de ambos, estado, início, encerramento e motivo |
| `data_access_grants` | vínculo de origem/destino, recurso, escopo, concedente, finalidade, validade e revogação |
| `health_records` | aluno, vínculo original, autor, tipo, conteúdo versionado, datas, registro substituído e retenção |
| `private_files` | aluno, vínculo original, organização, autor, caminho privado, categoria, datas, estado e retenção |
| `private_messages` | vínculo, remetente, conteúdo, data e retenção |
| `audit_events` | ator, ação, alvo, contexto, resultado, motivo, data e identificador da requisição |

Funções organizacionais podem coexistir por atribuições distintas. A ativação assistencial exige profissional habilitado naquele contexto e aceite dos dois participantes. O procedimento de habilitação profissional continua pendente.

Identificadores, autoria e vínculos serão derivados ou verificados no servidor. Restrições relacionais impedirão combinar recursos e participantes de organizações incompatíveis. Referências ao aluno serão estáveis e não dependerão de um vínculo continuar ativo.

A Fase 1 inclui solicitar portabilidade por fluxo controlado. Automatização de pacotes completos e resolução de situações complexas poderá ser posterior, sem retirar o canal de atendimento ao titular.
