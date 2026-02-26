import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty, QuizConfig } from "../types";

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

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Erro ao gerar áudio:", error);
    return null;
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
  const speedRunInstruction = config.gameMode === 'speed_run' ? "As perguntas devem ser curtas e diretas para leitura rápida." : "";

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

  const prompt = `
    Gere um quiz educacional e desafiador sobre o(s) tópico(s): "${config.topic}".
    Se houver múltiplos tópicos separados por vírgula, misture perguntas sobre todos eles de forma equilibrada.
    ${difficultyPrompt}
    Quantidade de perguntas: ${effectiveQuestionCount}.
    Idioma: Português (Brasil).
    Modo de Jogo: ${config.gameMode}.
    ${speedRunInstruction}
    Estilo de Ensino: ${teachingStyleInstruction}
    ${storyInstruction}
    
    IMPORTANTE: Varie os tipos de perguntas.
    - A maioria deve ser de Múltipla Escolha (MULTIPLE_CHOICE).
    - Inclua algumas de Verdadeiro ou Falso (TRUE_FALSE).
    - Inclua pelo menos uma de Relacionar Colunas (MATCHING) se o conteúdo permitir.
    - Inclua pelo menos uma de Preencher a Lacuna (FILL_IN_THE_BLANK) se o conteúdo permitir.
    
    Diretrizes Gerais:
    - Certifique-se de que as perguntas sejam claras, as opções sejam plausíveis e a explicação seja útil.
    - O título do quiz deve ser criativo e relacionado ao tópico.
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
                    enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "MATCHING", "FILL_IN_THE_BLANK"],
                    description: "O tipo da pergunta"
                  },
                  text: { type: Type.STRING, description: "O enunciado da pergunta. Para FILL_IN_THE_BLANK, use '___' para indicar a lacuna." },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Lista de opções (para MC e TF). Para TF, use ['Verdadeiro', 'Falso']. Para FILL_IN_THE_BLANK, inclua APENAS a resposta correta como único item. Deixe vazio para MATCHING.",
                  },
                  correctAnswerIndex: {
                    type: Type.INTEGER,
                    description: "Índice da resposta correta (para MC e TF). Deixe null/0 para MATCHING e FILL_IN_THE_BLANK.",
                  },
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            left: { type: Type.STRING },
                            right: { type: Type.STRING }
                        },
                        required: ["left", "right"]
                    },
                    description: "Pares para relacionar (apenas para MATCHING). Max 4 pares."
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Uma breve explicação de por que a resposta está correta. Para FILL_IN_THE_BLANK, a resposta correta deve estar claramente indicada aqui.",
                  },
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