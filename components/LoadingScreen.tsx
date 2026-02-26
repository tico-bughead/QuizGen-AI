import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, Brain, BookOpen, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  topic?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ topic }) => {
  const [step, setStep] = useState(0);

  const steps = [
    { text: "Conectando ao cérebro da IA...", icon: <Brain className="w-5 h-5" /> },
    { text: `Pesquisando sobre "${topic || 'o tópico'}"...`, icon: <Sparkles className="w-5 h-5" /> },
    { text: "Gerando perguntas desafiadoras...", icon: <BookOpen className="w-5 h-5" /> },
    { text: "Validando respostas e explicações...", icon: <CheckCircle2 className="w-5 h-5" /> },
    { text: "Quase pronto para começar!", icon: <Loader2 className="w-5 h-5 animate-spin" /> },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="max-w-md mx-auto w-full text-center py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 relative overflow-hidden"
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="flex justify-center mb-8">
          <div className="relative">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 180, 270, 360]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "linear" 
              }}
              className="absolute inset-0 bg-indigo-100 rounded-full blur-2xl opacity-60"
            ></motion.div>
            <div className="relative bg-white p-5 rounded-full ring-1 ring-slate-100 shadow-xl">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-6">Preparando seu Quiz</h3>
        
        <div className="space-y-4 mb-8">
          {steps.map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ 
                opacity: step >= i ? 1 : 0.3,
                x: step >= i ? 0 : -10,
                scale: step === i ? 1.05 : 1
              }}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                step === i ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-400'
              }`}
            >
              <div className={`${step === i ? 'text-indigo-600' : 'text-slate-300'}`}>
                {step > i ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : s.icon}
              </div>
              <span className="text-sm">{s.text}</span>
            </motion.div>
          ))}
        </div>

        <div className="relative w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-indigo-600 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        <p className="mt-4 text-xs text-slate-400 font-medium uppercase tracking-wider">
          Isso pode levar alguns segundos
        </p>
      </motion.div>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 text-slate-500 italic text-sm"
      >
        "O conhecimento é a única coisa que ninguém pode tirar de você."
      </motion.p>
    </div>
  );
};