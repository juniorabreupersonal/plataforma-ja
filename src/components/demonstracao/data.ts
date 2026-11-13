export type DemoProfile = "administrador" | "profissional" | "aluno";
export type DemoItem = { title: string; description: string; status: string };
export type DemoSection = { id: string; title: string; description: string; items: DemoItem[] };
export type DemoDashboard = {
  profile: DemoProfile;
  title: string;
  description: string;
  highlight: string;
  metrics: { label: string; value: string; detail: string }[];
  sections: DemoSection[];
};

export const profiles = [
  { id: "administrador", title: "Administrador", description: "Organização, profissionais e decisões de acesso.", marker: "01" },
  { id: "profissional", title: "Profissional", description: "Alunos, avaliações e próximos acompanhamentos.", marker: "02" },
  { id: "aluno", title: "Aluno", description: "Sua jornada, avaliações e acompanhamento.", marker: "03" },
] as const;

// Conteúdo editorial fictício. Não representa usuários, permissões ou registros do Supabase.
export const dashboards: Record<DemoProfile, DemoDashboard> = {
  administrador: {
    profile: "administrador", title: "Organize o próximo passo.",
    description: "Uma visão da gestão de organizações e profissionais, com decisões de acesso sempre explícitas.",
    highlight: "Acompanhar profissionais de exemplo",
    metrics: [
      { label: "Organizações", value: "02", detail: "Cenários fictícios de gestão" },
      { label: "Profissionais", value: "03", detail: "Perfis ilustrativos" },
      { label: "Decisões pendentes", value: "01", detail: "Solicitação de exemplo" },
    ],
    sections: [
      { id: "organizacoes", title: "Organizações", description: "Exemplos de espaços de trabalho independentes.", items: [
        { title: "Organização Demo 01", description: "Espaço fictício com dois profissionais de exemplo.", status: "Exemplo ativo" },
        { title: "Organização Demo 02", description: "Espaço fictício em preparação.", status: "Em preparação" },
      ] },
      { id: "profissionais", title: "Profissionais", description: "Estados ilustrativos; nenhuma autorização é concedida por esta tela.", items: [
        { title: "Profissional Demo 01", description: "Organização Demo 01 • perfil fictício.", status: "Exemplo ativo" },
        { title: "Profissional Demo 02", description: "Organização Demo 01 • solicitação fictícia para revisão.", status: "Revisão pendente" },
        { title: "Profissional Demo 03", description: "Organização Demo 02 • perfil fictício em preparação.", status: "Em preparação" },
      ] },
      { id: "atividade", title: "Atividade de gestão", description: "Uma prévia do acompanhamento de decisões administrativas.", items: [
        { title: "Solicitação de exemplo recebida", description: "Profissional Demo 02 aguarda uma decisão administrativa fictícia.", status: "Demonstração" },
        { title: "Espaço de trabalho preparado", description: "Organização Demo 02 ilustra uma etapa de organização inicial.", status: "Demonstração" },
      ] },
    ],
  },
  profissional: {
    profile: "profissional", title: "Cada aluno, uma jornada.",
    description: "Uma prévia da sua rotina de avaliação e acompanhamento, com atenção a cada etapa.",
    highlight: "Explorar avaliações de exemplo",
    metrics: [
      { label: "Alunos", value: "03", detail: "Personagens fictícios" },
      { label: "Avaliações em andamento", value: "02", detail: "Etapas ilustrativas" },
      { label: "Revisões pendentes", value: "01", detail: "Cenário de exemplo" },
    ],
    sections: [
      { id: "alunos", title: "Meus alunos", description: "Esta lista é fictícia e não consulta cadastros reais.", items: [
        { title: "Aluno Demo 01", description: "Jornada fictícia na etapa de triagem.", status: "Em andamento" },
        { title: "Aluno Demo 02", description: "Jornada fictícia na etapa de anamnese.", status: "Revisão pendente" },
        { title: "Aluno Demo 03", description: "Jornada fictícia aguardando início.", status: "A iniciar" },
      ] },
      { id: "avaliacoes", title: "Avaliações", description: "Estados de exemplo, sem respostas ou informações de saúde.", items: [
        { title: "Triagem • Aluno Demo 01", description: "Exemplo da organização das primeiras informações.", status: "Em andamento" },
        { title: "Anamnese • Aluno Demo 02", description: "Exemplo de uma etapa que aguarda revisão profissional.", status: "Revisão pendente" },
      ] },
      { id: "agenda", title: "Próximos acompanhamentos", description: "Sugestões ilustrativas de organização; nenhum agendamento é criado.", items: [
        { title: "Revisar a jornada Demo 02", description: "Cenário fictício de acompanhamento de uma avaliação.", status: "Demonstração" },
        { title: "Preparar a jornada Demo 03", description: "Cenário fictício de início do acompanhamento.", status: "Demonstração" },
      ] },
    ],
  },
  aluno: {
    profile: "aluno", title: "Sua evolução começa aqui.",
    description: "Conheça uma prévia do espaço para acompanhar suas etapas e conversar sobre sua evolução com o profissional.",
    highlight: "Conhecer avaliações de exemplo",
    metrics: [
      { label: "Jornadas", value: "01", detail: "Jornada fictícia" },
      { label: "Etapas apresentadas", value: "03", detail: "Prévia do acompanhamento" },
      { label: "Profissional", value: "01", detail: "Personagem de exemplo" },
    ],
    sections: [
      { id: "jornada", title: "Minha jornada", description: "Um exemplo de como suas etapas poderão ser organizadas.", items: [
        { title: "01 • Conhecer seus objetivos", description: "Etapa fictícia de apresentação inicial.", status: "Exemplo concluído" },
        { title: "02 • Triagem inicial", description: "Etapa fictícia para reunir informações para revisão.", status: "Em andamento" },
        { title: "03 • Anamnese", description: "Etapa futura desta jornada de exemplo.", status: "A iniciar" },
      ] },
      { id: "avaliacoes", title: "Minhas avaliações", description: "Nenhum questionário, resposta ou resultado real é exibido nesta demonstração.", items: [
        { title: "Avaliação Demo 01", description: "Prévia de uma avaliação em andamento, sem conclusão clínica.", status: "Em andamento" },
      ] },
      { id: "acompanhamento", title: "Meu acompanhamento", description: "Um espaço de exemplo para identificar quem acompanha sua jornada.", items: [
        { title: "Profissional Demo 01", description: "Personagem fictício • Organização Demo 01.", status: "Demonstração" },
        { title: "Próxima etapa", description: "Nesta prévia, a revisão profissional é apresentada apenas como exemplo.", status: "A iniciar" },
      ] },
    ],
  },
};
