# Identidade, produtos e governança

## Identidade e modalidades

A JÚNIOR ABREU PERFORMANCE organiza sua atuação em avaliação, treinamento personalizado e acompanhamento da evolução. O Método JA corresponde à metodologia oficial; sua presença comercial não significa que todos os protocolos já estejam definidos, validados ou implementados.

| Oferta | Finalidade | Independência obrigatória |
|---|---|---|
| JA Software | Plataforma para profissionais, inclusive com metodologias próprias | Não exige formação no Método JA |
| Curso Método JA | Formação profissional comercializada separadamente | Conclusão não inclui assinatura nem libera o módulo automaticamente |
| Módulo oficial Método JA | Recursos e protocolos oficiais de acesso restrito | Exige autorização administrativa vigente e demais permissões operacionais |
| JA AI Lab | Desenvolvimento e aperfeiçoamento de modelos | Exclusivo ao proprietário e responsáveis explicitamente designados |

Avaliação JA, JA Personal Online, JA 90 Dias e Treinamento Online aparecem como serviços na interface. Catálogo, preços, contratos, limites e relação com os planos ainda precisam de definição comercial.

## Autorização do Método JA

Requisitos definidos:

1. Conclusão verificada do curso é a elegibilidade padrão, nunca uma concessão automática.
2. A decisão final pertence ao proprietário ou pessoa formalmente delegada para essa atividade.
3. É permitida concessão excepcional sem formação concluída, com motivo explícito.
4. Formação concluída não impede negativa, suspensão ou revogação.
5. Autorizações podem ter prazo ou vigorar até revogação.
6. Toda decisão registra destinatário, autor, data, motivo, fundamento, validade, delegação utilizada e histórico.
7. Nenhum profissional concede acesso a si mesmo, inclusive quando acumula função administrativa.
8. Assinatura, formação e autorização são verificadas separadamente.
9. Servidor e políticas do Supabase verificam a autorização; interface e claims antigos não bastam.
10. Administração comercial ou de autorizações não concede acesso aos dados privados dos alunos.
11. Revogação bloqueia novas operações exclusivas, preservando o histórico conforme finalidade, retenção e direitos aplicáveis.

## Desenho proposto para fases futuras

- Formação: `training_courses`, `training_course_versions`, `training_enrollments`, `training_completion_records`, `training_record_events`.
- Comercial: `software_plans`, `software_plan_features`, `software_subscriptions`, `software_licenses`, `software_license_assignments`, `billing_events`.
- Método JA: `method_access_requests`, `method_access_authorizations`, `method_access_decisions`, `method_access_decision_evidence`.
- Protocolos: `methodologies`, `methodology_versions`, `methodology_resources`.

A fonte de autoridade administrativa será única. O desenho de `platform_role_assignments` da Fase 1 deve evoluir para delegações com escopo e validade, sem criar uma segunda tabela concorrente de poderes.

As verificações compõem-se: identidade ativa, vínculo organizacional, licença aplicável, autorização do módulo e acesso ao aluno/recurso. Nenhuma delas substitui as demais. A formação fundamenta a concessão padrão, mas não pode ser exigida de modo a invalidar uma exceção administrativa legítima.

Históricos de avaliação referenciam a versão do protocolo utilizada. Revogação não reescreve avaliações anteriores nem libera reutilização da biblioteca oficial.
