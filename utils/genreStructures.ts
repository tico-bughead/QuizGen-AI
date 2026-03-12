export const getDraftStructureForGenre = (genre?: string) => {
  if (!genre) return [];
  const g = genre.toLowerCase();
  
  if (g.includes('carta')) {
    return [
      { id: 'local_data', label: 'Local e Data', placeholder: 'Ex: São Paulo, 12 de Março de 2026' },
      { id: 'vocativo', label: 'Vocativo', placeholder: 'Ex: Prezado Senhor Diretor,' },
      { id: 'corpo', label: 'Corpo do Texto', placeholder: 'Desenvolva o assunto da carta...' },
      { id: 'despedida', label: 'Despedida', placeholder: 'Ex: Atenciosamente,' },
      { id: 'assinatura', label: 'Assinatura', placeholder: 'Ex: João da Silva' }
    ];
  }
  
  if (g.includes('artigo de opinião') || g.includes('artigo')) {
    return [
      { id: 'titulo', label: 'Título', placeholder: 'Crie um título chamativo' },
      { id: 'introducao', label: 'Introdução (Tese)', placeholder: 'Apresente o tema e seu ponto de vista (tese)' },
      { id: 'desenvolvimento', label: 'Desenvolvimento (Argumentos)', placeholder: 'Apresente argumentos que sustentam sua tese' },
      { id: 'conclusao', label: 'Conclusão', placeholder: 'Reforce a tese e feche o raciocínio' }
    ];
  }
  
  if (g.includes('crônica') || g.includes('cronica')) {
    return [
      { id: 'titulo', label: 'Título', placeholder: 'Título da crônica' },
      { id: 'fato', label: 'Fato do Cotidiano', placeholder: 'Qual situação do dia a dia inspirou a crônica?' },
      { id: 'reflexao', label: 'Reflexão / Desenvolvimento', placeholder: 'Desenvolva a história com um tom pessoal/crítico' },
      { id: 'desfecho', label: 'Desfecho', placeholder: 'Conclusão ou reflexão final' }
    ];
  }
  
  if (g.includes('conto') || g.includes('narrativa')) {
    return [
      { id: 'situacao_inicial', label: 'Situação Inicial', placeholder: 'Apresente os personagens e o cenário' },
      { id: 'conflito', label: 'Conflito', placeholder: 'Qual é o problema ou evento que muda a situação?' },
      { id: 'climax', label: 'Clímax', placeholder: 'O ponto de maior tensão da história' },
      { id: 'desfecho', label: 'Desfecho', placeholder: 'Como a história termina?' }
    ];
  }
  
  if (g.includes('resumo')) {
    return [
      { id: 'referencia', label: 'Referência', placeholder: 'Dados da obra original' },
      { id: 'apresentacao', label: 'Apresentação', placeholder: 'Tema principal e objetivo da obra' },
      { id: 'ideias', label: 'Ideias Principais', placeholder: 'Resuma os pontos principais sem dar opinião' },
      { id: 'conclusao_autor', label: 'Conclusão do Autor', placeholder: 'Como o autor original conclui a obra?' }
    ];
  }
  
  if (g.includes('resenha')) {
    return [
      { id: 'referencia', label: 'Referência', placeholder: 'Dados da obra original' },
      { id: 'resumo', label: 'Resumo da Obra', placeholder: 'Apresente brevemente do que se trata' },
      { id: 'avaliacao', label: 'Avaliação Crítica', placeholder: 'Sua opinião fundamentada sobre a obra' },
      { id: 'recomendacao', label: 'Recomendação', placeholder: 'Para quem você recomenda esta obra?' }
    ];
  }
  
  if (g.includes('notícia') || g.includes('noticia')) {
    return [
      { id: 'manchete', label: 'Manchete', placeholder: 'Título principal (chamativo)' },
      { id: 'lide', label: 'Lide (Lead)', placeholder: 'Quem? O que? Quando? Onde? Como? Por quê?' },
      { id: 'corpo', label: 'Corpo da Notícia', placeholder: 'Detalhes adicionais e desdobramentos' }
    ];
  }
  
  if (g.includes('reportagem')) {
    return [
      { id: 'manchete', label: 'Manchete', placeholder: 'Título principal' },
      { id: 'lide', label: 'Lide (Lead)', placeholder: 'Resumo do assunto abordado' },
      { id: 'desenvolvimento', label: 'Desenvolvimento', placeholder: 'Dados, entrevistas, aprofundamento do tema' },
      { id: 'conclusao', label: 'Conclusão', placeholder: 'Fechamento da reportagem' }
    ];
  }

  // Generic fallback for unknown genres
  return [
    { id: 'introducao', label: 'Introdução / Apresentação', placeholder: 'Apresente o tema principal' },
    { id: 'desenvolvimento', label: 'Desenvolvimento / Corpo', placeholder: 'Desenvolva as ideias principais' },
    { id: 'conclusao', label: 'Conclusão / Fechamento', placeholder: 'Finalize o texto' }
  ];
};
