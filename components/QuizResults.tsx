import React from 'react';
import { QuizData, UserAnswers, QuizTheme, EssayEvaluation } from '../types';
import { Button } from './Button';
import { RefreshCw, Home, CheckCircle, XCircle, Award, Clock, SkipForward, Trophy, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';

interface QuizResultsProps {
  quiz: QuizData;
  answers: UserAnswers;
  onRetry: () => void;
  onHome: () => void;
  score?: number | number[];
  essayEvaluations?: Record<number, EssayEvaluation>;
}

export const QuizResults: React.FC<QuizResultsProps> = ({ quiz, answers, onRetry, onHome, score: resultScore, essayEvaluations }) => {
  let correctCount = 0;
  quiz.questions.forEach(q => {
    if (q.type === 'MATCHING') {
        if (answers[q.id] === 1) correctCount++;
    } else if (q.type === 'ESSAY') {
        if (essayEvaluations?.[q.id]?.score && essayEvaluations[q.id].score >= 60) correctCount++;
    } else {
        if (answers[q.id] === q.correctAnswerIndex) {
            correctCount++;
        }
    }
  });

  const percentage = Math.round((correctCount / quiz.questions.length) * 100);
  
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(quiz.title, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Tópico: ${quiz.topic} | Dificuldade: ${quiz.difficulty}`, pageWidth / 2, y, { align: 'center' });
    y += 20;

    // Questions
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    quiz.questions.forEach((q, index) => {
      // Check for page break
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      // Question Text
      doc.setFont("helvetica", "bold");
      const questionText = `${index + 1}. ${q.text}`;
      const splitQuestion = doc.splitTextToSize(questionText, pageWidth - 40);
      doc.text(splitQuestion, 20, y);
      y += splitQuestion.length * 7;

      // Options
      doc.setFont("helvetica", "normal");
      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
        q.options?.forEach((opt, optIndex) => {
           const isCorrect = optIndex === q.correctAnswerIndex;
           const prefix = isCorrect ? "(Correta) " : "";
           const optionText = `   ${String.fromCharCode(97 + optIndex)}) ${prefix}${opt}`;
           
           if (y > 280) {
             doc.addPage();
             y = 20;
           }
           
           if (isCorrect) {
             doc.setTextColor(0, 150, 0);
             doc.setFont("helvetica", "bold");
           } else {
             doc.setTextColor(60, 60, 60);
             doc.setFont("helvetica", "normal");
           }

           const splitOption = doc.splitTextToSize(optionText, pageWidth - 50);
           doc.text(splitOption, 20, y);
           y += splitOption.length * 6;
        });
      } else if (q.type === 'MATCHING') {
          q.pairs?.forEach((p, i) => {
             const pairText = `   ${p.left} <-> ${p.right}`;
             if (y > 280) {
                doc.addPage();
                y = 20;
             }
             doc.setTextColor(0, 0, 0);
             doc.text(pairText, 20, y);
             y += 7;
          });
      } else if (q.type === 'FILL_IN_THE_BLANK') {
          const answerText = `   Resposta: ${q.explanation}`; // Usually explanation contains the answer context
           if (y > 280) {
             doc.addPage();
             y = 20;
           }
           doc.setTextColor(0, 150, 0);
           doc.text(answerText, 20, y);
           y += 7;
      }

      // Explanation
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      const explanationText = `Explicação: ${q.explanation}`;
      const splitExplanation = doc.splitTextToSize(explanationText, pageWidth - 40);
      doc.text(splitExplanation, 20, y);
      
      y += splitExplanation.length * 5 + 10;
      doc.setFontSize(12);
    });

    doc.save(`${quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  // Theme Helper
  const getThemeStyles = (theme: QuizTheme, isTv: boolean) => {
    if (theme === 'dark') {
      return {
        wrapper: `bg-slate-900 ${isTv ? 'fixed inset-0 z-50 overflow-y-auto p-4 sm:p-8' : ''}`,
        card: 'bg-slate-800 border-slate-700',
        headerBg: 'bg-black/30',
        textMain: 'text-white',
        textSec: 'text-slate-400',
        itemBg: 'bg-slate-900 border-slate-700',
        explanationBg: 'bg-indigo-900/30 text-indigo-300',
      };
    } else if (theme === 'vibrant') {
      return {
        wrapper: `bg-gradient-to-br from-violet-600 to-fuchsia-600 ${isTv ? 'fixed inset-0 z-50 overflow-y-auto p-4 sm:p-8' : ''}`,
        card: 'bg-white/10 backdrop-blur-md border-white/20',
        headerBg: 'bg-black/20',
        textMain: 'text-white',
        textSec: 'text-violet-100',
        itemBg: 'bg-white/5 border-white/10',
        explanationBg: 'bg-white/10 text-white',
      };
    } else {
      return {
        wrapper: `bg-slate-50 ${isTv ? 'fixed inset-0 z-50 overflow-y-auto p-4 sm:p-8' : ''}`,
        card: 'bg-white border-slate-100 shadow-xl',
        headerBg: 'bg-slate-900',
        textMain: 'text-slate-900',
        textSec: 'text-slate-500',
        itemBg: 'bg-white border-slate-200',
        explanationBg: 'bg-indigo-50 text-indigo-800',
      };
    }
  };

  const styles = getThemeStyles(quiz.theme, quiz.isTvMode);

  let message = "";
  if (percentage === 100) message = "Perfeito!";
  else if (percentage >= 80) message = "Excelente!";
  else if (percentage >= 60) message = "Muito bom!";
  else if (percentage >= 40) message = "Estude mais!";
  else message = "Tente de novo!";

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`w-full min-h-screen ${styles.wrapper}`}
    >
      <div className={`max-w-3xl mx-auto w-full pb-12 ${quiz.isTvMode ? 'max-w-5xl' : ''}`}>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${styles.card} rounded-[2.5rem] overflow-hidden mb-8`}
        >
          <div className={`${styles.headerBg} p-8 text-center`}>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                className="inline-flex items-center justify-center p-4 bg-white/10 rounded-full mb-4 backdrop-blur-sm"
              >
                  <Award className={`w-12 h-12 ${percentage >= 60 ? 'text-yellow-400' : 'text-slate-400'}`} />
              </motion.div>
              <h2 className={`text-3xl sm:text-4xl font-bold text-white mb-2 break-words`}>{message}</h2>
              <p className="text-white/70 text-lg">Você acertou {correctCount} de {quiz.questions.length} questões</p>
              
              {/* Arcade Score */}
              {quiz.gameMode === 'arcade' && typeof resultScore === 'number' && (
                  <div className="mt-4 p-4 bg-white/10 rounded-2xl border border-white/20 inline-block">
                      <p className="text-yellow-400 font-mono text-2xl font-bold flex items-center gap-2 justify-center">
                          <Award className="w-6 h-6" />
                          SCORE: {resultScore.toLocaleString()}
                      </p>
                  </div>
              )}

              {/* Multiplayer Scores */}
              {quiz.gameMode === 'multiplayer' && Array.isArray(resultScore) && (
                  <div className="mt-6 w-full max-w-md mx-auto bg-white/10 rounded-2xl border border-white/20 p-4">
                      <h3 className="text-white font-bold mb-3 flex items-center justify-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-400" />
                          Placar Final
                      </h3>
                      <div className="space-y-2">
                          {resultScore.map((s, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                                  <span className="text-white font-medium">{(quiz.playerNames && quiz.playerNames[idx]) || `Jogador ${idx + 1}`}</span>
                                  <span className="text-yellow-400 font-mono font-bold text-xl">{s.toLocaleString()}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
          
          <div className={`p-8 flex flex-col items-center justify-center border-b ${quiz.theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
               <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                      <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="12" fill="transparent" className={quiz.theme === 'light' ? 'text-slate-100' : 'text-white/10'} />
                      <circle 
                          cx="50%" cy="50%" r="45%" 
                          stroke="currentColor" strokeWidth="12" 
                          fill="transparent" 
                          strokeDasharray={283} 
                          strokeDashoffset={283 - (283 * percentage) / 100}
                          className={`transition-all duration-1000 ease-out ${percentage >= 60 ? 'text-green-500' : 'text-indigo-500'}`}
                          strokeLinecap="round"
                          style={{ strokeDasharray: 251, strokeDashoffset: 251 - (251 * percentage) / 100 }} 
                      />
                  </svg>
                  <span className={`absolute text-3xl sm:text-4xl font-bold ${styles.textMain}`}>{percentage}%</span>
              </div>
          </div>

          <div className={`p-4 sm:p-8 ${quiz.theme === 'light' ? 'bg-slate-50' : 'bg-transparent'}`}>
              <h3 className={`text-xl font-bold ${styles.textMain} mb-6 flex items-center`}>
                  Resumo
              </h3>
              <div className={`space-y-4 ${quiz.isTvMode ? 'grid grid-cols-1 gap-6' : ''}`}>
                  {quiz.questions.map((q, idx) => {
                      const userAnswerIdx = answers[q.id];
                      let isCorrect = false;
                      if (q.type === 'MATCHING') {
                          isCorrect = userAnswerIdx === 1;
                      } else if (q.type === 'ESSAY') {
                          isCorrect = (essayEvaluations?.[q.id]?.score || 0) >= 60;
                      } else {
                          isCorrect = userAnswerIdx === q.correctAnswerIndex;
                      }
                      const isSkipped = userAnswerIdx === -1 || userAnswerIdx === undefined;
                      
                          return (
                              <div key={q.id} className={`${styles.itemBg} p-4 sm:p-6 rounded-[2rem] shadow-sm border`}>
                              <div className="flex gap-3 sm:gap-4">
                                  <div className="mt-1 flex-shrink-0">
                                      {isCorrect ? (
                                          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                                      ) : isSkipped ? (
                                          <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                                      ) : (
                                          <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                                      )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                                        <p className={`${styles.textMain} font-medium ${quiz.isTvMode ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'} pr-4 break-words`}>
                                            <span className={`${styles.textSec} font-normal mr-2`}>{idx + 1}.</span>
                                            {q.text}
                                        </p>
                                        {isSkipped && (
                                          <div className="flex-shrink-0 inline-flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 whitespace-nowrap">
                                            <SkipForward className="w-3 h-3 mr-1" /> Pulada / Sem Resposta
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="space-y-2 mb-4">
                                          {q.type === 'MATCHING' ? (
                                              <div className="text-sm opacity-80 italic">
                                                  Questão de Associação (Pares)
                                                  {q.pairs?.map((p, i) => (
                                                      <div key={i} className="flex gap-2 mt-1 not-italic">
                                                          <span className="font-bold">{p.left}</span> ↔ <span>{p.right}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : q.type === 'ESSAY' ? (
                                              <div className="space-y-3">
                                                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                      <span className="text-xs font-bold uppercase text-slate-500 mb-1 block">Sua Resposta:</span>
                                                      <p className="text-sm italic text-slate-700 whitespace-pre-wrap">{answers[q.id]}</p>
                                                  </div>
                                                  {essayEvaluations?.[q.id] && (
                                                      <div className={`p-3 rounded-xl border ${essayEvaluations[q.id].score >= 60 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                                          <div className="flex justify-between items-center mb-2">
                                                              <span className={`text-xs font-bold uppercase ${essayEvaluations[q.id].score >= 60 ? 'text-green-600' : 'text-red-600'}`}>Avaliação da IA</span>
                                                              <span className={`text-sm font-bold ${essayEvaluations[q.id].score >= 60 ? 'text-green-700' : 'text-red-700'}`}>{essayEvaluations[q.id].score}/100</span>
                                                          </div>
                                                          <p className="text-sm text-slate-700 mb-2">{essayEvaluations[q.id].feedback}</p>
                                                          
                                                          {essayEvaluations[q.id].styleFeedback && (
                                                              <div className="mt-2 text-xs text-blue-800 bg-blue-50 p-2 rounded border border-blue-100">
                                                                  <strong>Estilo:</strong> {essayEvaluations[q.id].styleFeedback}
                                                              </div>
                                                          )}
                                                          {essayEvaluations[q.id].structureFeedback && (
                                                              <div className="mt-2 text-xs text-purple-800 bg-purple-50 p-2 rounded border border-purple-100">
                                                                  <strong>Estrutura:</strong> {essayEvaluations[q.id].structureFeedback}
                                                              </div>
                                                          )}
                                                      </div>
                                                  )}
                                              </div>
                                          ) : (
                                              q.options?.map((opt, optIdx) => {
                                                  const isSelected = userAnswerIdx === optIdx;
                                                  const isTargetCorrect = q.correctAnswerIndex === optIdx;
                                                  
                                                  let itemStyle = `border ${styles.textSec} bg-transparent`;
                                                  
                                                  if (isTargetCorrect) {
                                                      itemStyle = "border-green-500/50 bg-green-500/10 text-green-600 font-medium";
                                                      if (quiz.theme !== 'light') itemStyle = "border-green-500/50 bg-green-500/20 text-green-400 font-medium";
                                                  }
                                                  else if (isSelected && !isTargetCorrect) {
                                                      itemStyle = "border-red-500/50 bg-red-500/10 text-red-600 line-through decoration-red-500/50";
                                                      if (quiz.theme !== 'light') itemStyle = "border-red-500/50 bg-red-500/20 text-red-400 line-through decoration-red-400/50";
                                                  } else {
                                                      itemStyle = `opacity-60 ${quiz.theme === 'light' ? 'border-slate-200' : 'border-white/10'}`;
                                                  }
    
                                                  return (
                                                      <div key={optIdx} className={`px-4 py-3 rounded-xl text-sm flex items-center ${itemStyle} ${quiz.isTvMode ? 'text-base sm:text-lg' : ''} break-words`}>
                                                          <div className="flex-shrink-0 mr-2">
                                                            {isTargetCorrect && <CheckCircle className="w-4 h-4" />}
                                                            {isSelected && !isTargetCorrect && <XCircle className="w-4 h-4" />}
                                                          </div>
                                                          <span className="break-words min-w-0">{opt}</span>
                                                      </div>
                                                  )
                                              })
                                          )}
                                      </div>

                                      <div className={`${styles.explanationBg} p-4 rounded-2xl text-sm ${quiz.isTvMode ? 'text-base sm:text-lg' : ''}`}>
                                          <span className="font-bold block mb-1 opacity-80">Explicação:</span>
                                          <p className="break-words">{q.explanation}</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center relative z-50"
        >
          <Button variant="outline" onClick={onHome} icon={<Home className="w-4 h-4" />} className="bg-white text-slate-700 hover:bg-slate-100 border-transparent shadow-lg w-full sm:w-auto">
            Novo Assunto
          </Button>
          <Button variant="outline" onClick={handleExportPDF} icon={<Download className="w-4 h-4" />} className="bg-white text-slate-700 hover:bg-slate-100 border-transparent shadow-lg w-full sm:w-auto">
            Exportar PDF
          </Button>
          <Button onClick={onRetry} icon={<RefreshCw className="w-4 h-4" />} className="shadow-lg w-full sm:w-auto">
            Refazer Quiz
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};