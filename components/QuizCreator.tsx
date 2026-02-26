import React, { useState } from 'react';
import { QuizData, Question, Difficulty, QuizTheme, GameMode } from '../types';
import { Button } from './Button';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Save, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

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

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    const newOptions = [...(newQuestions[qIndex].options || [])];
    newOptions[oIndex] = value;
    newQuestions[qIndex].options = newOptions;
    setQuestions(newQuestions);
  };

  const handleSave = () => {
    // Basic validation
    if (!title.trim() || !topic.trim()) {
      alert("Por favor, preencha o título e o tópico do quiz.");
      return;
    }

    for (const q of questions) {
      if (!q.text.trim()) {
        alert("Todas as perguntas devem ter um enunciado.");
        return;
      }
      if (q.options?.some(opt => !opt.trim())) {
        alert("Todas as opções de resposta devem ser preenchidas.");
        return;
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
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                          placeholder="Digite a pergunta aqui..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                        />
                        
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

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Explicação (Opcional)</label>
                          <textarea
                            value={q.explanation}
                            onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                            placeholder="Explique por que a resposta está correta..."
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
