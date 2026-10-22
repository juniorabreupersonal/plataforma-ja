# IA assistencial e JA AI Lab

## IA como apoio

IA poderá auxiliar análise e prescrição, sempre com interpretação e aprovação do profissional responsável. Sugestão não equivale a diagnóstico, avaliação concluída ou prescrição aprovada.

Os registros distinguirão entrada autorizada, modelo/versão, sugestão, revisão ou rejeição, profissional aprovador e data. Assinantes poderão usar funcionalidades autorizadas, mas não terão ferramentas ou permissões para treinar, ajustar ou desenvolver modelos com dados dos alunos.

## JA AI Lab exclusivo

Somente o proprietário ou responsáveis explicitamente designados por atividade, projeto e prazo poderão administrar dados, experimentos, treinamento, avaliação e publicação. Permissões de curadoria, execução e publicação serão separadas. Acesso ao Lab não concede acesso geral aos registros clínicos.

Dados de atendimentos de outros profissionais não serão incorporados automaticamente. Cada admissão exige análise de legitimidade, fundamento jurídico adequado, finalidade específica, transparência e autorização aplicável. A autorização do titular, isoladamente, não substitui os demais requisitos jurídicos e profissionais.

Recusar uso para IA não prejudica o serviço principal. Atendimento, compartilhamento profissional, publicidade e desenvolvimento de IA terão autorizações separadas. Inferências e logs do produto não alimentarão treinamento automaticamente.

## Entidades futuras propostas

| Entidade | Conteúdo essencial |
|---|---|
| `ai_lab_assignments` | responsável, concedente, atividade, projeto, validade e revogação |
| `ai_projects` | finalidade específica, responsável, categorias, usos e retenção |
| `ai_data_use_permissions` | titular, escopo, finalidade, fundamento documentado, aviso versionado, evidência, vigência e retirada |
| `ai_data_admission_reviews` | origem candidata, verificações, decisão, motivo e responsável |
| `ai_dataset_versions` | projeto, versão, estado, manifesto, integridade e finalidade |
| `ai_dataset_items` | origem/versionamento, transformações, permissões, grupo de separação e elegibilidade |
| `ai_experiments` | objetivo, responsável, conjuntos, código, ambiente, configuração e estado |
| `ai_model_versions` | experimento, artefato, métricas, limitações e usos permitidos |
| `ai_model_release_decisions` | decisão, aprovador, justificativa, avaliações e retirada |
| `ai_data_withdrawal_cases` | solicitação, escopo, conjuntos/modelos afetados, ações e conclusão |
| `ai_external_processors` | fornecedor, finalidade, região, retenção, uso para treinamento e condições contratuais |

## Segregação e rastreabilidade

O Lab terá armazenamento, credenciais e execução separados do atendimento, sem leitura irrestrita de tabelas clínicas. Um processo controlado admite apenas recursos aprovados. Identidades e correspondências de pesquisa ficam restritas, separadas dos conjuntos acessíveis aos pesquisadores.

Cadeia obrigatória: origem autorizada → transformação → versão do conjunto → experimento → modelo → decisão de publicação. Imutabilidade de versões não autoriza retenção indevida: conjuntos podem ser bloqueados ou eliminados, mantendo somente evidências permitidas.

Minimização e desidentificação serão avaliadas. Fotografias podem continuar identificáveis sem nome ou rosto; pseudonimização não equivale a anonimização.

## Separação de treinamento, validação e teste

- Particionar por aluno, não por fotografia. Todas as sessões, recortes, aumentos, derivados e registros associados ao mesmo aluno permanecem no mesmo grupo para cada protocolo de avaliação.
- Usar correspondência restrita e estável para detectar o mesmo aluno atendido por diferentes profissionais ou organizações. Não fornecer essa correspondência aos pesquisadores.
- Detectar duplicatas e derivados entre conjuntos. Se a identidade/duplicidade não puder ser esclarecida, bloquear a admissão ou a avaliação afetada.
- Ajustar normalizações, seleção de características e demais transformações aprendidas somente no treinamento; aplicar depois à validação e ao teste.
- Validação orienta escolhas; teste final permanece reservado. Reutilização para ajuste exige novo protocolo e novo teste independente.
- Registrar critérios de separação, versões, sementes quando aplicáveis, sobreposições detectadas e aprovação. Avaliar separações temporais ou por organização conforme o uso pretendido.
- Métricas devem considerar o aluno como unidade de independência e limitações de representatividade; múltiplas fotos não contam como alunos independentes.

Nenhum experimento ou publicação poderá prosseguir com vazamento conhecido ou permissões inválidas. Avaliações de desempenho e risco de exposição de dados precederão a liberação assistencial.

## Retirada e fornecedores

Retirada bloqueia usos futuros, identifica cópias e dependências, interrompe tarefas quando aplicável e exige tratamento documentado de conjuntos e modelos afetados. Possíveis medidas incluem substituição do conjunto, restrição do modelo, retirada de publicação e novo treinamento.

Não se promete remoção exata ou imediata de contribuição individual em modelo treinado. As limitações serão explicadas previamente, sem afastar obrigações de avaliação e mitigação.

Fornecedores externos exigem análise de necessidade, retenção, suboperadores, segurança, transferências internacionais, exclusão e atendimento a retiradas. Não haverá envio automático nem permissão padrão de treinamento pelo fornecedor.
