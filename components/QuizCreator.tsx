import React, { useState } from 'react';
import { QuizData, Question, Difficulty, QuizTheme, GameMode, QuestionType } from '../types';
import { Button } from './Button';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Save, ArrowLeft, CheckCircle2, ArrowRight, Image as ImageIcon, Video, Search, Sparkles, Loader2, X, HelpCircle, Link } from 'lucide-react';
import { ImageSearchModal } from './ImageSearchModal';
import { PromptModal } from './PromptModal';
import { AlertModal } from './AlertModal';
import { generateImage } from '../services/geminiService';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

import { getYouTubeEmbedUrl } from '../utils/media';

interface QuizCreatorProps {
  onSave: (quizData: QuizData) => void;
  onCancel: () => void;
}

export const QuizCreator: React.FC<QuizCreatorProps> = ({ onSave, onCancel }) => {
  const [runTutorial, setRunTutorial] = useState(false);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [theme, setTheme] = useState<QuizTheme>('light');
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      type: 'MULTIPLE_CHOICE',
      text: '',
      options: ['', '', '', ''],
      optionImages: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: ''
    }
  ]);

  const steps: Step[] = [
    {
      target: '.tour-metadata',
      content: 'Comece dando um título e um tópico para o seu quiz. Você também pode escolher um tema visual!',
      disableBeacon: true,
    },
    {
      target: '.tour-question-type',
      content: 'Escolha o tipo de pergunta: Múltipla Escolha, Verdadeiro/Falso, Preencher Lacunas, etc.',
    },
    {
      target: '.tour-question-text',
      content: 'Digite a pergunta aqui. Você também pode adicionar uma imagem para ilustrar!',
    },
    {
      target: '.tour-options',
      content: 'Preencha as opções de resposta e marque qual é a correta clicando no círculo ao lado dela.',
    },
    {
      target: '.tour-explanation',
      content: 'Adicione uma explicação que será mostrada após o jogador responder. Isso ajuda no aprendizado!',
    },
    {
      target: '.tour-add-question',
      content: 'Clique aqui para adicionar mais perguntas ao seu quiz.',
    },
    {
      target: '.tour-save',
      content: 'Quando terminar, salve e jogue seu quiz recém-criado!',
    }
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTutorial(false);
    }
  };

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchTarget, setSearchTarget] = useState<{
    type: 'question' | 'option' | 'pair';
    qIndex: number;
    oIndex?: number;
    pIndex?: number;
    side?: 'left' | 'right';
  } | null>(null);

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateTarget, setGenerateTarget] = useState<{
    type: 'question' | 'option' | 'pair';
    qIndex: number;
    oIndex?: number;
    side?: 'left' | 'right';
  } | null>(null);
  const [generatePrompt, setGeneratePrompt] = useState('');

  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    placeholder: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    placeholder: '',
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: '',
  });

  const showAlert = (message: string) => {
    setAlertModal({ isOpen: true, message });
  };

  const handleImageSelect = (imageUrl: string) => {
    if (!searchTarget) return;

    const newQuestions = [...questions];
    const qIndex = searchTarget.qIndex;

    if (searchTarget.type === 'question') {
      newQuestions[qIndex].image = imageUrl;
    } else if (searchTarget.type === 'option' && searchTarget.oIndex !== undefined) {
      const newOptionImages = [...(newQuestions[qIndex].optionImages || ['', '', '', ''])];
      newOptionImages[searchTarget.oIndex] = imageUrl;
      newQuestions[qIndex].optionImages = newOptionImages;
    } else if (searchTarget.type === 'pair' && searchTarget.pIndex !== undefined && searchTarget.side) {
      const newPairs = [...(newQuestions[qIndex].pairs || [])];
      const field = searchTarget.side === 'left' ? 'leftImage' : 'rightImage';
      newPairs[searchTarget.pIndex] = { ...newPairs[searchTarget.pIndex], [field]: imageUrl };
      newQuestions[qIndex].pairs = newPairs;
    }

    setQuestions(newQuestions);
  };

  const handleImageUpload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUploadForPair = async (qIndex: number, pIndex: number, side: 'left' | 'right', file: File) => {
      try {
          const imageUrl = await handleImageUpload(file);
          const field = side === 'left' ? 'leftImage' : 'rightImage';
          const newQuestions = [...questions];
          const newPairs = [...(newQuestions[qIndex].pairs || [])];
          newPairs[pIndex] = { ...newPairs[pIndex], [field]: imageUrl };
          newQuestions[qIndex].pairs = newPairs;
          setQuestions(newQuestions);
      } catch (e) {
          console.error("Upload failed", e);
      }
  };

  const handleUploadForOption = async (qIndex: number, oIndex: number, file: File) => {
      try {
          const imageUrl = await handleImageUpload(file);
          const newQuestions = [...questions];
          const newOptionImages = [...(newQuestions[qIndex].optionImages || ['', '', '', ''])];
          newOptionImages[oIndex] = imageUrl;
          newQuestions[qIndex].optionImages = newOptionImages;
          setQuestions(newQuestions);
      } catch (e) {
          console.error("Upload failed", e);
      }
  };

  const handleRemoveOptionImage = (qIndex: number, oIndex: number) => {
      const newQuestions = [...questions];
      const newOptionImages = [...(newQuestions[qIndex].optionImages || ['', '', '', ''])];
      newOptionImages[oIndex] = '';
      newQuestions[qIndex].optionImages = newOptionImages;
      setQuestions(newQuestions);
  };

  const openGenerateModal = (qIndex: number, type: 'question' | 'option' | 'pair', oIndex?: number, side?: 'left' | 'right') => {
      const q = questions[qIndex];
      let initialPrompt = '';
      
      if (type === 'question') {
          initialPrompt = q.text || topic || 'Uma imagem educacional';
      } else if (type === 'option' && oIndex !== undefined) {
          initialPrompt = q.options?.[oIndex] || q.text || 'Uma opção educacional';
      } else if (type === 'pair' && oIndex !== undefined && side) {
          initialPrompt = side === 'left' ? q.pairs?.[oIndex]?.left : q.pairs?.[oIndex]?.right;
          initialPrompt = initialPrompt || 'Um conceito educacional';
      }

      setGenerateTarget({ type, qIndex, oIndex, side });
      setGeneratePrompt(initialPrompt);
      setGenerateModalOpen(true);
  };

  const submitGenerateImage = async () => {
      if (!generateTarget || !generatePrompt.trim()) return;
      
      const { qIndex, type, oIndex, side } = generateTarget;
      const loadingKey = `${qIndex}-${type}-${oIndex}-${side}`;
      
      setIsGeneratingImage(loadingKey);
      setGenerateModalOpen(false);
      
      try {
          const imageUrl = await generateImage(generatePrompt, "512px");
          if (imageUrl) {
              const newQuestions = [...questions];
              if (type === 'question') {
                  newQuestions[qIndex].image = imageUrl;
              } else if (type === 'option' && oIndex !== undefined) {
                  const newOptionImages = [...(newQuestions[qIndex].optionImages || ['', '', '', ''])];
                  newOptionImages[oIndex] = imageUrl;
                  newQuestions[qIndex].optionImages = newOptionImages;
              } else if (type === 'pair' && oIndex !== undefined && side) {
                  const newPairs = [...(newQuestions[qIndex].pairs || [])];
                  const field = side === 'left' ? 'leftImage' : 'rightImage';
                  newPairs[oIndex] = { ...newPairs[oIndex], [field]: imageUrl };
                  newQuestions[qIndex].pairs = newPairs;
              }
              setQuestions(newQuestions);
          } else {
              showAlert("Não foi possível gerar a imagem. Verifique se a chave QUIZ_GEN_IMAGES está configurada.");
          }
      } catch (error) {
          console.error("Erro ao gerar imagem:", error);
          showAlert("Erro ao gerar imagem. Verifique o console para mais detalhes.");
      } finally {
          setIsGeneratingImage(null);
          setGenerateTarget(null);
          setGeneratePrompt('');
      }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: questions.length + 1,
        type: 'MULTIPLE_CHOICE',
        text: '',
        options: ['', '', '', ''],
        correctAnswerIndex: 0,
        explanation: ''
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
    }
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleTypeChange = (index: number, newType: QuestionType) => {
    const newQuestions = [...questions];
    const q = newQuestions[index];
    q.type = newType;
    
    // Reset/Init based on type
    if (newType === 'TRUE_FALSE') {
        q.options = ['Verdadeiro', 'Falso'];
        q.correctAnswerIndex = 0;
        q.pairs = undefined;
        q.essayRubric = undefined;
        q.textualGenre = undefined;
    } else if (newType === 'FILL_IN_THE_BLANK') {
        q.options = [''];
        q.correctAnswerIndex = undefined;
        q.pairs = undefined;
        q.essayRubric = undefined;
        q.textualGenre = undefined;
    } else if (newType === 'MATCHING') {
        q.pairs = [{ left: '', right: '' }, { left: '', right: '' }]; // Start with 2 pairs
        q.options = undefined;
        q.correctAnswerIndex = undefined;
        q.essayRubric = undefined;
        q.textualGenre = undefined;
    } else if (newType === 'MULTIPLE_CHOICE') {
        q.options = ['', '', '', ''];
        q.correctAnswerIndex = 0;
        q.pairs = undefined;
        q.essayRubric = undefined;
        q.textualGenre = undefined;
    } else if (newType === 'ESSAY') {
        q.options = undefined;
        q.correctAnswerIndex = undefined;
        q.pairs = undefined;
        q.essayRubric = '';
        q.textualGenre = 'Dissertativo-argumentativo';
    }
    
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    const newOptions = [...(newQuestions[qIndex].options || [])];
    newOptions[oIndex] = value;
    newQuestions[qIndex].options = newOptions;
    setQuestions(newQuestions);
  };

  const handlePairChange = (qIndex: number, pIndex: number, side: 'left' | 'right', value: string) => {
    const newQuestions = [...questions];
    const newPairs = [...(newQuestions[qIndex].pairs || [])];
    newPairs[pIndex] = { ...newPairs[pIndex], [side]: value };
    newQuestions[qIndex].pairs = newPairs;
    setQuestions(newQuestions);
  };

  const handleAddPair = (qIndex: number) => {
    const newQuestions = [...questions];
    const newPairs = [...(newQuestions[qIndex].pairs || [])];
    if (newPairs.length < 5) {
        newPairs.push({ left: '', right: '' });
        newQuestions[qIndex].pairs = newPairs;
        setQuestions(newQuestions);
    }
  };

  const handleRemovePair = (qIndex: number, pIndex: number) => {
    const newQuestions = [...questions];
    const newPairs = [...(newQuestions[qIndex].pairs || [])];
    if (newPairs.length > 2) {
        newPairs.splice(pIndex, 1);
        newQuestions[qIndex].pairs = newPairs;
        setQuestions(newQuestions);
    }
  };

  const handleSave = () => {
    // Basic validation
    if (!title.trim() || !topic.trim()) {
      showAlert("Por favor, preencha o título e o tópico do quiz.");
      return;
    }

    for (const q of questions) {
      if (!q.text.trim()) {
        showAlert(`A pergunta ${q.id} deve ter um enunciado.`);
        return;
      }

      if (q.type === 'MULTIPLE_CHOICE') {
          if (q.options?.some(opt => !opt.trim())) {
            showAlert(`Todas as opções da pergunta ${q.id} devem ser preenchidas.`);
            return;
          }
      } else if (q.type === 'FILL_IN_THE_BLANK') {
          if (!q.options?.[0]?.trim()) {
              showAlert(`A resposta correta da pergunta ${q.id} deve ser preenchida.`);
              return;
          }
      } else if (q.type === 'MATCHING') {
          if (q.pairs?.some(p => !p.left.trim() || !p.right.trim())) {
              showAlert(`Todos os pares da pergunta ${q.id} devem ser preenchidos.`);
              return;
          }
          if ((q.pairs?.length || 0) < 2) {
              showAlert(`A pergunta ${q.id} deve ter pelo menos 2 pares.`);
              return;
          }
      }
    }

    const quizData: QuizData = {
      title,
      topic,
      difficulty,
      questions,
      theme, // Selected theme
      isTvMode: false,
      gameMode: 'classic',
      isMultiplayer: false
    };

    onSave(quizData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto w-full bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100"
    >
      <div className="bg-indigo-600 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold">Criar Novo Quiz</h2>
        </div>
        <Button 
          onClick={handleSave} 
          className="bg-white text-black hover:bg-indigo-50 border-indigo-600 shadow-none tour-save w-full sm:w-auto"
          icon={<Save className="w-5 h-5" />}
        >
          Salvar e Jogar
        </Button>
      </div>

      <div className="p-8 space-y-8">
        {/* Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 tour-metadata">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Título do Quiz</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Desafio de Matemática"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Tópico Principal</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Matemática"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Tema Visual</label>
            <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as QuizTheme)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
                <option value="light">Claro (Padrão)</option>
                <option value="dark">Escuro</option>
                <option value="vibrant">Vibrante</option>
                <option value="retro">Retrô</option>
                <option value="neon">Neon</option>
                <option value="summer">Verão</option>
                <option value="autumn">Outono</option>
                <option value="winter">Inverno</option>
                <option value="spring">Primavera</option>
                <option value="random">Aleatório</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-500" />
            Perguntas ({questions.length})
          </h3>

          <div className="space-y-8">
            <AnimatePresence>
              {questions.map((q, qIndex) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 p-6 rounded-3xl border border-slate-200 relative group"
                >
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Remover pergunta"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm mt-1">
                        {qIndex + 1}
                      </span>
                      <div className="flex-grow space-y-4">
                        <div className="flex justify-between items-center gap-4">
                            <select
                                value={q.type}
                                onChange={(e) => handleTypeChange(qIndex, e.target.value as QuestionType)}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none tour-question-type"
                            >
                                <option value="MULTIPLE_CHOICE">Múltipla Escolha</option>
                                <option value="TRUE_FALSE">Verdadeiro ou Falso</option>
                                <option value="FILL_IN_THE_BLANK">Resposta Curta / Lacuna</option>
                                <option value="MATCHING">Relacionar Colunas</option>
                                <option value="ESSAY">Redação</option>
                            </select>
                            <div className="flex-grow"></div>
                        </div>

                        {/* ESSAY GENRE */}
                        {q.type === 'ESSAY' && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Gênero Textual</label>
                                <input 
                                    type="text"
                                    value={q.textualGenre || ''}
                                    onChange={(e) => handleQuestionChange(qIndex, 'textualGenre', e.target.value)}
                                    placeholder="Ex: Dissertativo-argumentativo, Artigo de Opinião, Carta..."
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                />
                            </div>
                        )}

                        <div className="flex gap-2 items-start">
                            <div className="flex-grow space-y-2">
                                <input
                                  type="text"
                                  value={q.text}
                                  onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                                  placeholder={q.type === 'ESSAY' ? "Digite o tema da redação ou enunciado..." : (q.type === 'FILL_IN_THE_BLANK' ? "Digite a frase com a lacuna (Ex: O céu é ___)" : "Digite a pergunta aqui...")}
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium tour-question-text"
                                />
                                <div className="flex gap-2 items-center">
                                    {q.image || q.video ? (
                                        <div className="flex flex-wrap gap-4">
                                            {q.image && (
                                                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 group/img">
                                                    <img src={q.image} alt="Question" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    <button 
                                                        onClick={() => handleQuestionChange(qIndex, 'image', undefined)}
                                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity text-white"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                            {q.video && (
                                                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 group/video bg-black">
                                                    {getYouTubeEmbedUrl(q.video) ? (
                                                        <iframe 
                                                            src={getYouTubeEmbedUrl(q.video)!} 
                                                            className="w-full h-full object-cover pointer-events-none"
                                                            allowFullScreen
                                                        />
                                                    ) : (
                                                        <video src={q.video} className="w-full h-full object-cover" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                                                        <Video className="w-8 h-8 text-white opacity-50" />
                                                    </div>
                                                    <button 
                                                        onClick={() => handleQuestionChange(qIndex, 'video', undefined)}
                                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity text-white"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            <label className="text-xs flex items-center gap-1 text-slate-600 bg-slate-50 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 font-medium">
                                                <ImageIcon className="w-4 h-4" />
                                                Subir Imagem
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            handleImageUpload(e.target.files[0]).then(url => {
                                                                handleQuestionChange(qIndex, 'image', url);
                                                            });
                                                        }
                                                    }}
                                                />
                                            </label>
                                            <button
                                                onClick={() => {
                                                    setSearchTarget({ type: 'question', qIndex });
                                                    setSearchModalOpen(true);
                                                }}
                                                className="text-xs flex items-center gap-1 text-slate-600 bg-slate-50 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 font-medium"
                                            >
                                                <Search className="w-4 h-4" />
                                                Pesquisar Imagem
                                            </button>
                                            <button
                                                onClick={() => openGenerateModal(qIndex, 'question')}
                                                disabled={isGeneratingImage === `${qIndex}-question-undefined-undefined`}
                                                className="text-xs flex items-center gap-1 text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200 font-medium disabled:opacity-50"
                                            >
                                                {isGeneratingImage === `${qIndex}-question-undefined-undefined` ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-4 h-4" />
                                                )}
                                                Gerar com IA
                                            </button>
                                            <label className="text-xs flex items-center gap-1 text-slate-600 bg-slate-50 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 font-medium">
                                                <Video className="w-4 h-4" />
                                                Subir Vídeo
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="video/*"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            handleImageUpload(e.target.files[0]).then(url => {
                                                                handleQuestionChange(qIndex, 'video', url);
                                                            });
                                                        }
                                                    }}
                                                />
                                            </label>
                                            <button
                                                onClick={() => {
                                                    setPromptModal({
                                                        isOpen: true,
                                                        title: "Link do Vídeo",
                                                        placeholder: "Cole o link do vídeo (Ex: YouTube, Shorts, MP4)",
                                                        onConfirm: (url) => {
                                                            if (url) {
                                                                handleQuestionChange(qIndex, 'video', url);
                                                            }
                                                            setPromptModal(prev => ({ ...prev, isOpen: false }));
                                                        }
                                                    });
                                                }}
                                                className="text-xs flex items-center gap-1 text-slate-600 bg-slate-50 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 font-medium"
                                            >
                                                <Link className="w-4 h-4" />
                                                Link de Vídeo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* MULTIPLE CHOICE */}
                        {q.type === 'MULTIPLE_CHOICE' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 tour-options">
                              {q.options?.map((opt, oIndex) => (
                                <div key={oIndex} className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="radio"
                                        name={`correct-${qIndex}`}
                                        checked={q.correctAnswerIndex === oIndex}
                                        onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', oIndex)}
                                        className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 flex-shrink-0"
                                      />
                                      <div className="flex-grow relative flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                            placeholder={`Opção ${oIndex + 1}`}
                                            className={`w-full px-4 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm pr-20 ${q.correctAnswerIndex === oIndex ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'}`}
                                          />
                                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                              <button
                                                  onClick={() => {
                                                      setSearchTarget({ type: 'option', qIndex, oIndex });
                                                      setSearchModalOpen(true);
                                                  }}
                                                  className="cursor-pointer text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                                  title="Pesquisar Imagem"
                                              >
                                                  <Search className="w-4 h-4" />
                                              </button>
                                              <button
                                                  onClick={() => openGenerateModal(qIndex, 'option', oIndex)}
                                                  disabled={isGeneratingImage === `${qIndex}-option-${oIndex}-undefined`}
                                                  className="cursor-pointer text-indigo-400 hover:text-indigo-600 transition-colors p-1 disabled:opacity-50"
                                                  title="Gerar com IA"
                                              >
                                                  {isGeneratingImage === `${qIndex}-option-${oIndex}-undefined` ? (
                                                      <Loader2 className="w-4 h-4 animate-spin" />
                                                  ) : (
                                                      <Sparkles className="w-4 h-4" />
                                                  )}
                                              </button>
                                              <label className="cursor-pointer text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Subir Imagem">
                                                  <ImageIcon className="w-4 h-4" />
                                                  <input 
                                                      type="file" 
                                                      className="hidden" 
                                                      accept="image/*"
                                                      onChange={(e) => {
                                                          if (e.target.files?.[0]) {
                                                              handleUploadForOption(qIndex, oIndex, e.target.files[0]);
                                                          }
                                                      }}
                                                  />
                                              </label>
                                          </div>
                                      </div>
                                    </div>
                                    {q.optionImages?.[oIndex] && (
                                        <div className="ml-8 relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 group/img">
                                            <img src={q.optionImages[oIndex]} alt={`Option ${oIndex + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            <button 
                                                onClick={() => handleRemoveOptionImage(qIndex, oIndex)}
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity text-white"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                              ))}
                            </div>
                        )}

                        {/* TRUE / FALSE */}
                        {q.type === 'TRUE_FALSE' && (
                            <div className="flex gap-4 p-2 tour-options">
                                {['Verdadeiro', 'Falso'].map((opt, oIndex) => (
                                    <label key={oIndex} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${q.correctAnswerIndex === oIndex ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                        <input 
                                            type="radio" 
                                            name={`tf-${qIndex}`}
                                            checked={q.correctAnswerIndex === oIndex}
                                            onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', oIndex)}
                                            className="w-4 h-4 text-indigo-600"
                                        />
                                        <span className="font-medium">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* FILL IN THE BLANK */}
                        {q.type === 'FILL_IN_THE_BLANK' && (
                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 tour-options">
                                <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Resposta Correta</label>
                                <input 
                                    type="text"
                                    value={q.options?.[0] || ''}
                                    onChange={(e) => handleOptionChange(qIndex, 0, e.target.value)}
                                    placeholder="Digite a palavra ou termo exato..."
                                    className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                />
                                <p className="text-xs text-indigo-600/70 mt-2">
                                    O aluno deverá digitar exatamente esta resposta (não diferencia maiúsculas/minúsculas).
                                </p>
                            </div>
                        )}

                        {/* MATCHING */}
                        {q.type === 'MATCHING' && (
                            <div className="space-y-3 bg-slate-100/50 p-4 rounded-2xl border border-slate-200 tour-options">
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Pares (Item → Correspondência)</label>
                                <div className="space-y-4">
                                    {q.pairs?.map((pair, pIndex) => (
                                        <div key={pIndex} className="flex gap-2 items-start">
                                            <div className="flex-1 space-y-2">
                                                <input 
                                                    placeholder="Item (Ex: Brasil)" 
                                                    value={pair.left} 
                                                    onChange={(e) => handlePairChange(qIndex, pIndex, 'left', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                                 <div className="flex gap-2 items-center">
                                                    {pair.leftImage ? (
                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group/img">
                                                            <img src={pair.leftImage} alt="Left" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            <button 
                                                                onClick={() => {
                                                                    const newQuestions = [...questions];
                                                                    const newPairs = [...(newQuestions[qIndex].pairs || [])];
                                                                    newPairs[pIndex] = { ...newPairs[pIndex], leftImage: undefined };
                                                                    newQuestions[qIndex].pairs = newPairs;
                                                                    setQuestions(newQuestions);
                                                                }}
                                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity text-white"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setSearchTarget({ type: 'pair', qIndex, pIndex, side: 'left' });
                                                                    setSearchModalOpen(true);
                                                                }}
                                                                className="text-xs flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                                                            >
                                                                <Search className="w-3 h-3" />
                                                                Pesquisar
                                                            </button>
                                                            <button
                                                                onClick={() => openGenerateModal(qIndex, 'pair', pIndex, 'left')}
                                                                disabled={isGeneratingImage === `${qIndex}-pair-${pIndex}-left`}
                                                                className="text-xs flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200 disabled:opacity-50"
                                                            >
                                                                {isGeneratingImage === `${qIndex}-pair-${pIndex}-left` ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <Sparkles className="w-3 h-3" />
                                                                )}
                                                                Gerar
                                                            </button>
                                                            <label className="text-xs flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200">
                                                                <ImageIcon className="w-3 h-3" />
                                                                Subir
                                                                <input 
                                                                    type="file" 
                                                                    className="hidden" 
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) {
                                                                            handleUploadForPair(qIndex, pIndex, 'left', e.target.files[0]);
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-3" />
                                            
                                            <div className="flex-1 space-y-2">
                                                <input 
                                                    placeholder="Correspondência (Ex: Brasília)" 
                                                    value={pair.right} 
                                                    onChange={(e) => handlePairChange(qIndex, pIndex, 'right', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                                 <div className="flex gap-2 items-center">
                                                    {pair.rightImage ? (
                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group/img">
                                                            <img src={pair.rightImage} alt="Right" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            <button 
                                                                onClick={() => {
                                                                    const newQuestions = [...questions];
                                                                    const newPairs = [...(newQuestions[qIndex].pairs || [])];
                                                                    newPairs[pIndex] = { ...newPairs[pIndex], rightImage: undefined };
                                                                    newQuestions[qIndex].pairs = newPairs;
                                                                    setQuestions(newQuestions);
                                                                }}
                                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity text-white"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setSearchTarget({ type: 'pair', qIndex, pIndex, side: 'right' });
                                                                    setSearchModalOpen(true);
                                                                }}
                                                                className="text-xs flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                                                            >
                                                                <Search className="w-3 h-3" />
                                                                Pesquisar
                                                            </button>
                                                            <button
                                                                onClick={() => openGenerateModal(qIndex, 'pair', pIndex, 'right')}
                                                                disabled={isGeneratingImage === `${qIndex}-pair-${pIndex}-right`}
                                                                className="text-xs flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200 disabled:opacity-50"
                                                            >
                                                                {isGeneratingImage === `${qIndex}-pair-${pIndex}-right` ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <Sparkles className="w-3 h-3" />
                                                                )}
                                                                Gerar
                                                            </button>
                                                            <label className="text-xs flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200">
                                                                <ImageIcon className="w-3 h-3" />
                                                                Subir
                                                                <input 
                                                                    type="file" 
                                                                    className="hidden" 
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) {
                                                                            handleUploadForPair(qIndex, pIndex, 'right', e.target.files[0]);
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleRemovePair(qIndex, pIndex)}
                                                disabled={(q.pairs?.length || 0) <= 2}
                                                className={`p-2 rounded-lg transition-colors mt-1 ${
                                                    (q.pairs?.length || 0) <= 2 
                                                        ? 'text-slate-300 cursor-not-allowed' 
                                                        : 'text-red-400 hover:bg-red-50 hover:text-red-600'
                                                }`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {(q.pairs?.length || 0) < 5 && (
                                    <button 
                                        onClick={() => handleAddPair(qIndex)}
                                        className="text-xs flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors mt-2"
                                    >
                                        <Plus className="w-3 h-3" /> Adicionar Par
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="tour-explanation">
                          <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">
                              {q.type === 'ESSAY' ? "Rubrica / Critérios de Avaliação (Opcional)" : "Explicação (Opcional)"}
                          </label>
                          <textarea
                            value={q.type === 'ESSAY' ? (q.essayRubric || '') : q.explanation}
                            onChange={(e) => handleQuestionChange(qIndex, q.type === 'ESSAY' ? 'essayRubric' : 'explanation', e.target.value)}
                            placeholder={q.type === 'ESSAY' ? "Descreva o que é esperado na resposta para guiar a IA..." : "Explique por que a resposta está correta..."}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm h-20 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex justify-center">
            <Button 
              onClick={handleAddQuestion}
              variant="outline"
              className="border-dashed border-2 border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 tour-add-question"
              icon={<Plus className="w-5 h-5" />}
            >
              Adicionar Pergunta
            </Button>
          </div>
        </div>
      </div>

      <ImageSearchModal 
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelect={handleImageSelect}
      />

      <AnimatePresence>
        {generateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  Gerar Imagem com IA
                </h3>
                <button 
                  onClick={() => setGenerateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Descreva a imagem desejada:
                  </label>
                  <textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="Ex: Um cachorro astronauta em marte..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm h-32 resize-none"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setGenerateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={submitGenerateImage}
                  disabled={!generatePrompt.trim()}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Gerar Imagem
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PromptModal
        isOpen={promptModal.isOpen}
        title={promptModal.title}
        placeholder={promptModal.placeholder}
        onConfirm={promptModal.onConfirm}
        onCancel={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
      />
    </motion.div>
  );
};
