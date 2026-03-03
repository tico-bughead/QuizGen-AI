import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty, QuizConfig, EssayEvaluation } from "../types";

export const generateImage = async (prompt: string, size: "512px" | "1K" | "2K" | "4K" = "1K"): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
            // imageSize is not supported in gemini-2.5-flash-image
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is generally calm and clear
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("Erro ao gerar áudio:", error);
    return null;
  }
};

export const evaluateEssay = async (
  questionText: string,
  userAnswer: string,
  rubric?: string,
  textualGenre?: string
): Promise<EssayEvaluation> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-2.5-flash";

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
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            styleFeedback: { type: Type.STRING },
            structureFeedback: { type: Type.STRING },
            competencies: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.INTEGER },
                        name: { type: Type.STRING },
                        score: { type: Type.INTEGER },
                        feedback: { type: Type.STRING }
                    },
                    required: ["id", "name", "score", "feedback"]
                }
            },
            modelEssay: { type: Type.STRING }
          },
          required: ["score", "feedback", "strengths", "improvements", "competencies", "modelEssay"],
        },
      },
    });

    if (response.text) {
      const evaluation = JSON.parse(response.text) as EssayEvaluation;
      // Normalize score to 0-100 for internal consistency if needed, or keep 0-1000 for display
      // Let's keep 0-1000 for ENEM style if it's an essay, but the app expects 0-100 for progress bars.
      // We'll map 0-1000 to 0-100 internally for the progress bar, but display the raw score.
      // Actually, let's just return it as is and handle display in UI.
      // Wait, the interface says score: number. If I change it to 1000, I need to make sure other parts handle it.
      // The progress bar in QuizResults uses percentage calculation based on correct count, not raw score.
      // But for the specific essay result card, it shows score/100. I should probably normalize it to 0-100 there or here.
      // Let's normalize here to 0-100 for compatibility, but keep the competencies scores as is (0-200).
      // Or better: update the UI to handle 0-1000 for essays.
      // For now, I'll normalize the main score to 0-100 to avoid breaking the "passed" logic (>= 60).
      // 600/1000 = 60/100.
      if (evaluation.score > 100) {
          evaluation.score = Math.round(evaluation.score / 10);
      }
      return evaluation;
    }
    throw new Error("Resposta vazia da IA na avaliação.");
  } catch (error) {
    console.error("Erro ao avaliar redação:", error);
    throw error;
  }
};

export const generateEssayModel = async (topic: string, genre?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-2.5-flash";

  const prompt = `
    Escreva uma redação modelo nota 1000 sobre o tema: "${topic}".
    Gênero Textual: "${genre || 'Dissertativo-argumentativo'}".
    A redação deve seguir as características típicas desse gênero.
    Se for dissertativo-argumentativo, deve ter título, introdução, desenvolvimento (2 parágrafos) e conclusão com proposta de intervenção.
    O texto deve ser coeso, coerente e demonstrar domínio da norma culta.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    if (response.text) {
      return response.text;
    }
    throw new Error("Resposta vazia da IA ao gerar modelo de redação.");
  } catch (error) {
    console.error("Erro ao gerar modelo de redação:", error);
    throw error;
  }
};

export const generateEssayTopic = async (genre?: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = "gemini-2.5-flash";
  
    const prompt = `
      Gere um tema de redação atual e relevante para o gênero textual: "${genre || 'Dissertativo-argumentativo'}".
      Retorne APENAS o título do tema, sem aspas ou explicações.
      Exemplo: "Os desafios da mobilidade urbana no Brasil"
    `;
  
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
  
      if (response.text) {
        return response.text.trim();
      }
      throw new Error("Resposta vazia da IA ao gerar tema.");
    } catch (error) {
      console.error("Erro ao gerar tema de redação:", error);
      throw error;
    }
  };

export const generateQuiz = async (
  config: QuizConfig
): Promise<QuizData> => {
  // Inicializa o cliente dentro da função para garantir que process.env.GEMINI_API_KEY esteja disponível
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-2.5-flash";

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
          IMPORTANTE: Utilize imagens para tornar o quiz mais visual.
          - Você pode definir 'leftIsImage: true' ou 'rightIsImage: true' para gerar imagens.
          - Exemplo: Ligar uma imagem de um animal (leftIsImage: true) ao seu habitat (texto).
          - Exemplo: Ligar um termo (texto) à sua definição (texto).
          - Misture pares de texto-texto e imagem-texto.
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
    - Utilize 'questionImage: true' para gerar imagens ilustrativas para o enunciado das perguntas sempre que possível, especialmente para perguntas que descrevem cenários, objetos ou animais.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "Você é um professor especialista criando quizzes para estudantes. Use JSON estrito.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Um título criativo para o quiz" },
            storyNarrative: { type: Type.STRING, description: "Narrativa introdutória para o modo história (opcional)" },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  type: { 
                    type: Type.STRING, 
                    enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "MATCHING", "FILL_IN_THE_BLANK", "ESSAY"],
                    description: "O tipo da pergunta"
                  },
                  text: { type: Type.STRING, description: "O enunciado da pergunta. Para FILL_IN_THE_BLANK, use '___' para indicar a lacuna." },
                  questionImage: { type: Type.BOOLEAN, description: "Defina como true se a pergunta deve ter uma imagem gerada a partir do enunciado." },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Lista de opções (para MC e TF). Para TF, use ['Verdadeiro', 'Falso']. Para FILL_IN_THE_BLANK, inclua APENAS a resposta correta como único item. Deixe vazio para MATCHING e ESSAY.",
                  },
                  optionImages: {
                      type: Type.ARRAY,
                      items: { type: Type.BOOLEAN },
                      description: "Array de 4 booleanos. Defina como true se a opção correspondente deve ser uma imagem gerada a partir do texto da opção (apenas para MULTIPLE_CHOICE)."
                  },
                  correctAnswerIndex: {
                    type: Type.INTEGER,
                    description: "Índice da resposta correta (para MC e TF). Deixe null/0 para MATCHING, FILL_IN_THE_BLANK e ESSAY.",
                  },
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            left: { type: Type.STRING, description: "Texto ou prompt da imagem para o lado esquerdo." },
                            right: { type: Type.STRING, description: "Texto ou prompt da imagem para o lado direito." },
                            leftIsImage: { type: Type.BOOLEAN, description: "Defina como true se o lado esquerdo deve ser uma imagem gerada a partir do texto em 'left'." },
                            rightIsImage: { type: Type.BOOLEAN, description: "Defina como true se o lado direito deve ser uma imagem gerada a partir do texto em 'right'." }
                        },
                        required: ["left", "right"]
                    },
                    description: "Pares para relacionar (apenas para MATCHING). Max 4 pares."
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Uma breve explicação de por que a resposta está correta. Para FILL_IN_THE_BLANK, a resposta correta deve estar claramente indicada aqui. Para ESSAY, forneça pontos-chave que deveriam ser abordados.",
                  },
                  essayRubric: {
                      type: Type.STRING,
                      description: "Critérios de avaliação para a resposta dissertativa (apenas para ESSAY)."
                  },
                  textualGenre: {
                      type: Type.STRING,
                      description: "O gênero textual esperado para a redação (apenas para ESSAY)."
                  }
                },
                required: ["id", "type", "text", "explanation"],
              },
            },
          },
          required: ["title", "questions"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      
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

          if (q.type === 'MATCHING' && q.pairs) {
              await Promise.all(q.pairs.map(async (pair: any) => {
                  if (pair.leftIsImage) {
                      try {
                          pair.leftImage = await generateImage(pair.left, "512px");
                      } catch (e) {
                          console.error("Failed to generate left image", e);
                      }
                  }
                  if (pair.rightIsImage) {
                      try {
                          pair.rightImage = await generateImage(pair.right, "512px");
                      } catch (e) {
                          console.error("Failed to generate right image", e);
                      }
                  }
              }));
          } else if (q.type === 'MULTIPLE_CHOICE' && q.optionImages) {
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
      };
    }
    
    throw new Error("Resposta vazia da IA.");
  } catch (error) {
    console.error("Erro ao gerar quiz:", error);
    throw error;
  }
};