import React from 'react';
import { motion } from 'motion/react';
import { Button } from './Button';
import { ArrowRight, BookOpen, Map, Mountain, Zap, Skull, Trees } from 'lucide-react';
import { ArcadeMap } from '../types';

interface CutsceneProps {
  narrative: string;
  world: ArcadeMap;
  onContinue: () => void;
}

export const Cutscene: React.FC<CutsceneProps> = ({ narrative, world, onContinue }) => {
  
  const getWorldIcon = () => {
    switch (world) {
      case 'overworld': return <Trees className="w-16 h-16 text-green-500" />;
      case 'underground': return <Mountain className="w-16 h-16 text-amber-700" />;
      case 'athletic': return <Zap className="w-16 h-16 text-sky-500" />;
      case 'boss': return <Skull className="w-16 h-16 text-red-600" />;
      default: return <Map className="w-16 h-16 text-indigo-500" />;
    }
  };

  const getWorldTitle = () => {
    switch (world) {
      case 'overworld': return "O Início da Jornada";
      case 'underground': return "As Profundezas";
      case 'athletic': return "Desafios Celestes";
      case 'boss': return "O Confronto Final";
      default: return "Próximo Nível";
    }
  };

  const getBackgroundClass = () => {
    switch (world) {
      case 'overworld': return "bg-gradient-to-b from-sky-300 to-green-200";
      case 'underground': return "bg-gradient-to-b from-slate-800 to-amber-900";
      case 'athletic': return "bg-gradient-to-b from-sky-400 to-indigo-300";
      case 'boss': return "bg-gradient-to-b from-slate-900 to-red-900";
      default: return "bg-slate-100";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${getBackgroundClass()}`}
    >
      <div className="max-w-2xl w-full bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-8 md:p-12 text-center border-4 border-white/50">
        
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 border-4 border-slate-100"
        >
          {getWorldIcon()}
        </motion.div>

        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6"
        >
          {getWorldTitle()}
        </motion.h2>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/50 p-6 rounded-2xl border border-white/50 mb-8"
        >
          <p className="text-lg md:text-xl text-slate-700 leading-relaxed font-medium italic">
            "{narrative}"
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button 
            onClick={onContinue}
            className="w-full sm:w-auto px-12 py-4 text-xl shadow-xl hover:scale-105 transition-transform"
            icon={<ArrowRight className="w-6 h-6" />}
          >
            Continuar Aventura
          </Button>
        </motion.div>

      </div>
    </motion.div>
  );
};
