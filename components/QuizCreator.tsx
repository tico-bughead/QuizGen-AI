import React, { useState } from 'react';
import { QuizData, Question, Difficulty, QuizTheme, GameMode, QuestionType } from '../types';
import { Button } from './Button';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Save, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface QuizCreatorProps {
  onSave: (quizData: QuizData) => void;
  onCancel: () => void;
}

export const QuizCreator: React.FC<QuizCreatorProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      type: 'MULTIPLE_CHOICE',
      text: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: ''
    }
  ]);

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
    } else if (newType === 'FILL_IN_THE_BLANK') {
        q.options = [''];
        q.correctAnswerIndex = undefined;
        q.pairs = undefined;
        q.essayRubric = undefined;
    } else if (newType === 'MATCHING') {
        q.pairs = [{ left: '', right: '' }, { left: '', right: '' }]; // Start with 2 pairs
        q.options = undefined;
        q.correctAnswerIndex = undefined;
        q.essayRubric = undefined;
    } else if (newType === 'MULTIPLE_CHOICE') {
        q.options = ['', '', '', ''];
        q.correctAnswerIndex = 0;
        q.pairs = undefined;
        q.essayRubric = undefined;
    } else if (newType === 'ESSAY') {
        q.options = undefined;
        q.correctAnswerIndex = undefined;
        q.pairs = undefined;
        q.essayRubric = '';
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
      alert("Por favor, preencha o título e o tópico do quiz.");
      return;
    }

    for (const q of questions) {
      if (!q.text.trim()) {
        alert(`A pergunta ${q.id} deve ter um enunciado.`);
        return;
      }

      if (q.type === 'MULTIPLE_CHOICE') {
          if (q.options?.some(opt => !opt.trim())) {
            alert(`Todas as opções da pergunta ${q.id} devem ser preenchidas.`);
            return;
          }
      } else if (q.type === 'FILL_IN_THE_BLANK') {
          if (!q.options?.[0]?.trim()) {
              alert(`A resposta correta da pergunta ${q.id} deve ser preenchida.`);
              return;
          }
      } else if (q.type === 'MATCHING') {
          if (q.pairs?.some(p => !p.left.trim() || !p.right.trim())) {
              alert(`Todos os pares da pergunta ${q.id} devem ser preenchidos.`);
              return;
          }
          if ((q.pairs?.length || 0) < 2) {
              alert(`A pergunta ${q.id} deve ter pelo menos 2 pares.`);
              return;
          }
      }
    }

    const quizData: QuizData = {
      title,
      topic,
      difficulty,
      questions,
      theme: 'light', // Default theme
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
      <div className="bg-indigo-600 p-8 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold">Criar Novo Quiz</h2>
        </div>
        <Button 
          onClick={handleSave} 
          className="bg-white text-indigo-600 hover:bg-indigo-50 border-transparent shadow-none"
          icon={<Save className="w-5 h-5" />}
        >
          Salvar e Jogar
        </Button>
      </div>

      <div className="p-8 space-y-8">
        {/* Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="MULTIPLE_CHOICE">Múltipla Escolha</option>
                                <option value="TRUE_FALSE">Verdadeiro ou Falso</option>
                                <option value="FILL_IN_THE_BLANK">Resposta Curta / Lacuna</option>
                                <option value="MATCHING">Relacionar Colunas</option>
                                <option value="ESSAY">Redação</option>
                            </select>
                            <div className="flex-grow"></div>
                        </div>

                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                          placeholder={q.type === 'ESSAY' ? "Digite o tema da redação ou enunciado..." : (q.type === 'FILL_IN_THE_BLANK' ? "Digite a frase com a lacuna (Ex: O céu é ___)" : "Digite a pergunta aqui...")}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                        />
                        
                        {/* MULTIPLE CHOICE */}
                        {q.type === 'MULTIPLE_CHOICE' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {q.options?.map((opt, oIndex) => (
                                <div key={oIndex} className="flex items-center gap-3">
                                  <input
                                    type="radio"
                                    name={`correct-${qIndex}`}
                                    checked={q.correctAnswerIndex === oIndex}
                                    onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', oIndex)}
                                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                    placeholder={`Opção ${oIndex + 1}`}
                                    className={`w-full px-4 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm ${q.correctAnswerIndex === oIndex ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'}`}
                                  />
                                </div>
                              ))}
                            </div>
                        )}

                        {/* TRUE / FALSE */}
                        {q.type === 'TRUE_FALSE' && (
                            <div className="flex gap-4 p-2">
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
                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
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
                            <div className="space-y-3 bg-slate-100/50 p-4 rounded-2xl border border-slate-200">
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Pares (Item → Correspondência)</label>
                                <div className="space-y-2">
                                    {q.pairs?.map((pair, pIndex) => (
                                        <div key={pIndex} className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <input 
                                                    placeholder="Item (Ex: Brasil)" 
                                                    value={pair.left} 
                                                    onChange={(e) => handlePairChange(qIndex, pIndex, 'left', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            <div className="flex-1">
                                                <input 
                                                    placeholder="Correspondência (Ex: Brasília)" 
                                                    value={pair.right} 
                                                    onChange={(e) => handlePairChange(qIndex, pIndex, 'right', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleRemovePair(qIndex, pIndex)}
                                                disabled={(q.pairs?.length || 0) <= 2}
                                                className={`p-2 rounded-lg transition-colors ${
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
                                        className="text-xs flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Adicionar Par
                                    </button>
                                )}
                            </div>
                        )}

                        <div>
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
              className="border-dashed border-2 border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50"
              icon={<Plus className="w-5 h-5" />}
            >
              Adicionar Pergunta
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
