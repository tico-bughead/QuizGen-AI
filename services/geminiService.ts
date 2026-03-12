import { QuizData, Difficulty, QuizConfig, EssayEvaluation } from "../types";

export const generateImage = async (prompt: string, size: "512px" | "1K" | "2K" | "4K" = "1K"): Promise<string | null> => {
  console.warn("Geração de imagens não é suportada diretamente via OpenRouter no momento.");
  return null;
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  // OpenRouter doesn't have a direct TTS endpoint. 
  // We'll return null and the UI can handle it or we could use a different service.
  // For now, let's log that it's not supported with OpenRouter.
  console.warn("TTS não é suportado diretamente via OpenRouter.");
  return null;
};

const callGemini = async (prompt: string, systemInstruction: string, responseSchema?: any) => {
  const apiKey = process.env.OPENROUTER_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Chave de API do OpenRouter não configurada.");

  let finalPrompt = prompt;
  if (responseSchema) {
    finalPrompt += `\n\nRetorne a resposta estritamente no formato JSON seguindo este esquema: ${JSON.stringify(responseSchema)}`;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.href,
        "X-Title": "QuizGen AI",
      },
      body: JSON.stringify({
        model: "openrouter/free", // Using a free model on OpenRouter
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: finalPrompt }
        ],
        response_format: responseSchema ? { type: "json_object" } : undefined,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || "";
  } catch (error) {
    console.error("Erro na chamada à API do OpenRouter:", error);
    throw error;
  }
};

export const evaluateEssay = async (
  questionText: string,
  userAnswer: string,
  rubric?: string,
  textualGenre?: string
): Promise<EssayEvaluation> => {
  const systemInstruction = "Você é um professor especialista em redação. Use JSON estrito.";
  const prompt = `
    Avalie a seguinte resposta dissertativa para a questão: "${questionText}".
    Gênero Textual esperado: "${textualGenre || 'Dissertativo-argumentativo'}"
    Resposta do aluno: "${userAnswer}"
    ${rubric ? `Rubrica de avaliação: ${rubric}` : ''}

    Forneça uma avaliação construtiva e detalhada, seguindo o padrão ENEM (Competências 1 a 5).
    Retorne um JSON com:
    - score: nota geral de 0 a 1000 (padrão ENEM).
    - feedback: um parágrafo geral sobre a resposta.
    - strengths: lista de pontos fortes.
    - improvements: lista de pontos a melhorar.
    - styleFeedback: sugestões específicas para melhorar o estilo de escrita.
    - structureFeedback: sugestões específicas para melhorar a estrutura.
    - competencies: array com 5 objetos, cada um contendo:
        - id: número da competência (1 a 5).
        - name: nome da competência (Use nomes claros como: "Gramática e Norma Culta", "Compreensão do Tema", "Argumentação e Organização", "Coesão Textual", "Proposta de Intervenção").
        - score: nota na competência (0, 40, 80, 120, 160 ou 200).
        - feedback: breve comentário sobre o desempenho nesta competência.
    - modelEssay: gere um exemplo de redação nota 1000 sobre o mesmo tema para servir de modelo.
  `;

  try {
    const content = await callGemini(prompt, systemInstruction);
    // Extract JSON from content (OpenRouter might return markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const evaluation = JSON.parse(jsonMatch[0]) as EssayEvaluation;
      if (evaluation.score > 100) {
          evaluation.score = Math.round(evaluation.score / 10);
      }
      return evaluation;
    }
    throw new Error("Não foi possível extrair JSON da resposta.");
  } catch (error) {
    console.error("Erro ao avaliar redação:", error);
    throw error;
  }
};

export const generateEssayModel = async (topic: string, genre?: string): Promise<string> => {
  const systemInstruction = "Você é um escritor especialista.";
  const prompt = `
    Escreva uma redação modelo nota 1000 sobre o tema: "${topic}".
    Gênero Textual: "${genre || 'Dissertativo-argumentativo'}".
    A redação deve seguir as características típicas desse gênero.
    Se for dissertativo-argumentativo, deve ter título, introdução, desenvolvimento (2 parágrafos) e conclusão com proposta de intervenção.
    O texto deve ser coeso, coerente e demonstrar domínio da norma culta.
  `;

  try {
    return await callGemini(prompt, systemInstruction);
  } catch (error) {
    console.error("Erro ao gerar modelo de redação:", error);
    throw error;
  }
};

export const generateEssayTopic = async (genre?: string): Promise<string> => {
    const systemInstruction = "Você é um gerador de temas de redação.";
    const prompt = `
      Gere um tema de redação atual e relevante para o gênero textual: "${genre || 'Dissertativo-argumentativo'}".
      Retorne APENAS o título do tema, sem aspas ou explicações.
      Exemplo: "Os desafios da mobilidade urbana no Brasil"
    `;
  
    try {
      const content = await callGemini(prompt, systemInstruction);
      return content.trim().replace(/^"|"$/g, '');
    } catch (error) {
      console.error("Erro ao gerar tema de redação:", error);
      throw error;
    }
  };

export const generateQuiz = async (
  config: QuizConfig
): Promise<QuizData> => {
  let difficultyPrompt = `Nível de Dificuldade: ${config.difficulty}.`;
  
  if (config.gameMode === 'arcade' && config.arcadeMap) {
      switch (config.arcadeMap) {
          case 'overworld':
              difficultyPrompt = `Nível de Dificuldade: Fácil. Foque em perguntas acessíveis e fundamentais.`;
              break;
          case 'underground':
              difficultyPrompt = `Nível de Dificuldade: Médio. Perguntas que exigem algum conhecimento específico.`;
              break;
          case 'athletic':
              difficultyPrompt = `Nível de Dificuldade: Difícil. Perguntas desafiadoras e rápidas.`;
              break;
          case 'boss':
              difficultyPrompt = `Nível de Dificuldade: Muito Difícil (Expert). Perguntas complexas, obscuras e detalhadas para um "Boss Battle".`;
              break;
      }
  }

  const effectiveQuestionCount = config.gameMode === 'speed_run' ? 20 : config.questionCount;
  
  let modeInstruction = "";
  if (config.gameMode === 'speed_run') {
      modeInstruction = "As perguntas devem ser curtas e diretas para leitura rápida.";
  } else if (config.gameMode === 'training') {
      modeInstruction = "Foque em perguntas didáticas e fundamentais. As explicações devem ser detalhadas para facilitar o aprendizado.";
  }

  let teachingStyleInstruction = "";
  switch (config.teachingStyle) {
      case 'socratic':
          teachingStyleInstruction = "Adote um estilo Socrático: nas explicações, faça perguntas retóricas que levem o aluno à resposta, em vez de apenas dar a informação.";
          break;
      case 'humorous':
          teachingStyleInstruction = "Seja bem-humorado e faça piadas leves relacionadas ao tema nas perguntas e explicações.";
          break;
      case 'strict':
          teachingStyleInstruction = "Seja formal, direto e rigoroso. Foque na precisão técnica absoluta.";
          break;
      case 'gamified':
          teachingStyleInstruction = "Use linguagem de jogos (XP, níveis, boss, loot) nas perguntas e explicações.";
          break;
      default:
          teachingStyleInstruction = "Seja claro, didático e encorajador.";
  }

  let storyInstruction = "";
  if (config.isStoryMode && config.arcadeMap) {
      storyInstruction = `
        IMPORTANTE: Este é um nível do Modo História no mapa "${config.arcadeMap}".
        Gere um breve parágrafo narrativo (máx 300 caracteres) introduzindo este nível como parte de uma aventura épica.
        O parágrafo deve estar no campo "storyNarrative" do JSON.
        Contexto do mapa:
        - Overworld: O início da jornada, campos verdes e céus azuis.
        - Underground: Cavernas escuras, minas antigas e mistérios subterrâneos.
        - Athletic: Plataformas nas nuvens, dirigíveis e desafios de agilidade.
        - Boss: O castelo final, lava, trovões e o confronto definitivo.
      `;
  }

  const isEssayMode = config.gameMode === 'essay_challenge';
  let questionTypeInstruction = "";

  if (isEssayMode) {
      questionTypeInstruction = `
        IMPORTANTE: Gere APENAS perguntas dissertativas (ESSAY).
        As perguntas devem exigir reflexão, argumentação e análise profunda do tema.
        Inclua um campo "essayRubric" com critérios de avaliação para a resposta.
      `;
  } else if (config.questionTypes && config.questionTypes.length > 0) {
      const types = config.questionTypes.join(', ');
      questionTypeInstruction = `
        IMPORTANTE: Gere APENAS perguntas dos seguintes tipos: ${types}.
        Distribua as perguntas entre esses tipos de forma equilibrada.
        
        Detalhes por tipo:
        - MULTIPLE_CHOICE: Pergunta com 4 opções e 1 correta.
          - Você pode definir 'optionImages: [true, true, true, true]' para gerar imagens para todas as opções.
          - Exemplo: Qual destes animais é um mamífero? (Opções com imagens de animais).
        - TRUE_FALSE: Pergunta com opções "Verdadeiro" e "Falso".
        - MATCHING: 3 a 4 pares de conceitos para relacionar.
          - Exemplo: Ligar um termo (texto) à sua definição (texto).
          - Apenas pares de texto-texto são permitidos. Não utilize imagens para este tipo de pergunta.
        - FILL_IN_THE_BLANK: Uma frase com uma lacuna (___) e a resposta correta (única palavra ou termo curto).
        - ESSAY: Pergunta dissertativa que exige argumentação. Inclua 'essayRubric'.
      `;
  } else {
      questionTypeInstruction = `
        IMPORTANTE: Varie os tipos de perguntas.
        - A maioria deve ser de Múltipla Escolha (MULTIPLE_CHOICE).
        - Inclua algumas de Verdadeiro ou Falso (TRUE_FALSE).
        - Inclua pelo menos uma de Relacionar Colunas (MATCHING) se o conteúdo permitir.
        - Inclua pelo menos uma de Preencher a Lacuna (FILL_IN_THE_BLANK) se o conteúdo permitir.
        - Você PODE incluir uma pergunta dissertativa (ESSAY) se for muito relevante para o tema, mas priorize as outras.
      `;
  }

  const systemInstruction = "Você é um professor especialista criando quizzes para estudantes. Use JSON estrito.";
  const prompt = `
    Gere um quiz educacional e desafiador sobre o(s) tópico(s): "${config.topic}".
    Se houver múltiplos tópicos separados por vírgula, misture perguntas sobre todos eles de forma equilibrada.
    ${difficultyPrompt}
    Quantidade de perguntas: ${effectiveQuestionCount}.
    Idioma: Português (Brasil).
    Modo de Jogo: ${config.gameMode}.
    ${modeInstruction}
    Estilo de Ensino: ${teachingStyleInstruction}
    ${storyInstruction}
    
    ${questionTypeInstruction}
    
    ${config.textualGenre ? `Para as questões de redação (ESSAY), utilize o gênero textual: "${config.textualGenre}".` : ''}

    Diretrizes Gerais:
    - Certifique-se de que as perguntas sejam claras, as opções sejam plausíveis e a explicação seja útil.
    - O título do quiz deve ser criativo e relacionado ao tópico.
    ${config.generateImages ? "- Utilize 'questionImage: true' para gerar imagens ilustrativas para o enunciado das perguntas sempre que possível.\n    - Utilize 'optionImages' (array de booleanos) para gerar imagens para as alternativas de Múltipla Escolha, se fizer sentido visualmente.\n    - Para perguntas de Relacionar Colunas (MATCHING), você pode definir 'leftImage: true' ou 'rightImage: true' nos pares para gerar imagens correspondentes." : "- NÃO gere imagens para as perguntas, opções ou pares (defina questionImage, optionImages, leftImage e rightImage como false)."}
  `;

  const responseSchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            type: { type: "string", enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "MATCHING", "FILL_IN_THE_BLANK", "ESSAY"] },
            text: { type: "string" },
            questionImage: { type: "boolean" },
            options: { type: "array", items: { type: "string" } },
            optionImages: { type: "array", items: { type: "boolean" } },
            correctAnswerIndex: { type: "integer" },
            explanation: { type: "string" },
            essayRubric: { type: "string" },
            pairs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  left: { type: "string" },
                  right: { type: "string" },
                  leftImage: { type: "boolean" },
                  rightImage: { type: "boolean" }
                }
              }
            }
          },
          required: ["id", "type", "text", "explanation"]
        }
      },
      storyNarrative: { type: "string" }
    },
    required: ["title", "questions", ...(config.isStoryMode ? ["storyNarrative"] : [])]
  };

  try {
    const content = await callGemini(prompt, systemInstruction, responseSchema);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      
      if (!data.questions || !Array.isArray(data.questions)) {
          throw new Error("O quiz gerado não contém perguntas válidas.");
      }

      // Post-process to generate images for questions
      await Promise.all(data.questions.map(async (q: any) => {
          // Question Image
          if (q.questionImage) {
              try {
                  q.image = await generateImage(q.text, "512px");
              } catch (e) {
                  console.error("Failed to generate question image", e);
              }
          }

          if (q.type === 'MULTIPLE_CHOICE' && q.optionImages) {
              q.optionImages = await Promise.all(q.optionImages.map(async (shouldGen: boolean, idx: number) => {
                  if (shouldGen && q.options[idx]) {
                      try {
                          return await generateImage(q.options[idx], "512px");
                      } catch (e) {
                          console.error("Failed to generate option image", e);
                          return null;
                      }
                  }
                  return null;
              }));
          }

          if (q.type === 'MATCHING' && q.pairs) {
              await Promise.all(q.pairs.map(async (pair: any) => {
                  if (pair.leftImage) {
                      try {
                          pair.leftImage = await generateImage(pair.left, "512px");
                      } catch (e) {
                          console.error("Failed to generate left pair image", e);
                          pair.leftImage = undefined;
                      }
                  } else {
                      pair.leftImage = undefined;
                  }
                  
                  if (pair.rightImage) {
                      try {
                          pair.rightImage = await generateImage(pair.right, "512px");
                      } catch (e) {
                          console.error("Failed to generate right pair image", e);
                          pair.rightImage = undefined;
                      }
                  } else {
                      pair.rightImage = undefined;
                  }
              }));
          }
      }));

      return {
        ...data,
        topic: config.topic,
        difficulty: config.difficulty,
        theme: config.theme,
        isTvMode: config.isTvMode,
        gameMode: config.gameMode,
        isMultiplayer: config.isMultiplayer,
        isStoryMode: config.isStoryMode,
        arcadeMap: config.arcadeMap,
        playerNames: config.playerNames,
      };
    }
    throw new Error("Não foi possível extrair JSON da resposta.");
  } catch (error) {
    console.error("Erro ao gerar quiz:", error);
    throw error;
  }
};
