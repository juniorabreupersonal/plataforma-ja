# Estado atual, fases e pendências

## Estado observado no repositório

A base inspecionada nesta consolidação é o commit `935a806` da `main`. A inspeção foi do código local, não do esquema remoto do Supabase.

| Recurso | Estado |
|---|---|
| Next.js App Router, React, TypeScript estrito e Tailwind | Base instalada e estruturada |
| Página inicial | Apresentação e cartões; áreas profissionais/alunos não implementadas |
| Cadastro inicial | Estado local, validações e UUID temporário; sem conta ou persistência |
| Triagem | Dez perguntas, detalhes e classificação preliminar local; não é protocolo oficial validado |
| Jornada na URL | Preservada na triagem; não autentica nem comprova vínculo |
| Retorno ao cadastro | Usa histórico do navegador; não garante recuperação dos dados |
| Login | Formulário demonstrativo; envio não autentica |
| Supabase | Fábrica de cliente disponível; teste de saúde separado, sem operações de conta ou banco |
| Autorização, RLS, organizações, fotos e Lab | Requisitos/desenhos futuros; não demonstrados pelo código |

Verificações anteriores nesta conversa: build passou após correção de Suspense; lint passou com dois avisos de imports não usados. A consulta HTTPS ao serviço de autenticação retornou HTTP 200 com variáveis disponíveis. Isso não comprova login, RLS, banco, sessão no navegador ou autorização clínica. Esses testes não foram repetidos na consolidação documental.

## Fase 1 proposta — depende de aprovação de implementação

1. Identidade Supabase Auth, confirmação de e-mail, login, logout e recuperação.
2. Nomeação segura do proprietário, administração principal e funções separadas.
3. Organizações, vínculos e habilitação controlada de profissionais.
4. Vínculos assistenciais com aceite, isolamento e encerramento.
5. Persistência mínima do histórico e compartilhamento seletivo.
6. Proteção de registros, fotografias e conversas antes de receber esses dados reais.
7. Canal de acesso/exportação do titular, auditoria e testes de segurança.

A Fase 1 não inclui desenvolver o motor completo de avaliação ou prescrições. Se upload/visualização de fotos e mensagens forem entregues nela, todos os controles correspondentes são pré-requisitos, não melhorias opcionais posteriores.

## Fases posteriores

- Avaliação postural e funcional completa, metodologias versionadas, prescrição e evolução.
- Assinaturas, licenças, pagamentos e catálogo comercial.
- Curso, comprovação de formação e módulo oficial Método JA com decisões administrativas.
- IA assistencial, com validação e aprovação profissional.
- Governança do JA AI Lab antes de qualquer conjunto real; depois experimentos, modelos e publicação controlada.
- Automação avançada de portabilidade, retenção e relatórios; aplicativos nativos.
- Divulgação publicitária somente com fluxo específico; nunca tornar o acervo clínico público por padrão.

## Pendências antes da implementação/produção

| Área | Decisões necessárias |
|---|---|
| Técnica | Aprovar esquema final, matriz de acesso, escopos, estados, transações, RLS e estratégia de sessão/cache |
| Identidade | Identificar proprietário, nomeação/delegação, MFA, habilitação profissional e recuperação privilegiada |
| Histórico | Definir leitura após encerramento, correção, transferência, exportação e retenção por categoria |
| Fotografias | Definir entrega autenticada/URLs, validade, resolução, marca-d’água, backups e processamento seguro |
| Jurídica | Bases legais, agentes de tratamento, termos, consentimentos, contratos, menores e responsáveis quando aplicável |
| Profissional | Validar protocolos, classificações, limites e aprovação dos resultados |
| Comercial | Produtos, planos, licenças, inadimplência e relação independente com formação/autorização |
| IA | Finalidades, admissibilidade, critérios de avaliação, separação por aluno, fornecedores e resposta à retirada |
| Operacional | Canal do titular, incidentes, retenção/exclusão, restauração e responsáveis pelas decisões |

A documentação não afirma conformidade jurídica concluída nem segurança já implementada. Cada fase exige aprovação específica, controles verificáveis e testes adequados antes da utilização de dados reais.
