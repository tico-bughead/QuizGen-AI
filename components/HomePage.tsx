import React, { useState } from 'react';
import { Button } from './Button';
import { BrainCircuit, Sparkles, Gamepad2, Users, Trophy, ArrowRight, PenTool, AlertCircle, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface HomePageProps {
  onStart: () => void;
  onCreate: () => void;
  onEssayGenerator: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStart, onCreate, onEssayGenerator }) => {
  const [runTutorial, setRunTutorial] = useState(false);

  const steps: Step[] = [
    {
      target: '.tour-welcome',
      content: 'Bem-vindo ao QuizGen AI! Aqui você pode criar quizzes incríveis e praticar redações com a ajuda da Inteligência Artificial.',
      disableBeacon: true,
    },
    {
      target: '.tour-features',
      content: 'Estas são as principais funcionalidades do app: geração com IA, modos de jogo variados, multiplayer local e prática de redação.',
    },
    {
      target: '.tour-generate-ai',
      content: 'Clique aqui para gerar um quiz ou tema de redação automaticamente usando Inteligência Artificial. Você poderá escolher o tema, dificuldade e modo de jogo!',
    },
    {
      target: '.tour-create-manual',
      content: 'Prefere criar suas próprias perguntas? Use esta opção para montar um quiz manualmente, passo a passo.',
    },
    {
      target: '.tour-essay-models',
      content: 'Acesse aqui para gerar modelos de redação nota 1000, baixar folhas de rascunho e praticar para o ENEM e outros vestibulares.',
    },
    {
      target: '.tour-chatbot',
      content: 'Tem alguma dúvida? Nosso assistente virtual está sempre disponível aqui no canto inferior direito para te ajudar com dicas de estudo!',
    }
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTutorial(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full relative">
      <Joyride
        steps={steps}
        run={runTutorial}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#4f46e5',
            zIndex: 10000,
          }
        }}
        locale={{
          back: 'Anterior',
          close: 'Fechar',
          last: 'Finalizar',
          next: 'Próximo',
          skip: 'Pular'
        }}
      />

      <div className="absolute top-0 right-0 z-10">
        <Button 
          onClick={() => setRunTutorial(true)} 
          variant="outline" 
          className="bg-white/80 backdrop-blur-sm text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          icon={<HelpCircle className="w-5 h-5" />}
        >
          Ver Tutorial
        </Button>
      </div>

      <div className="text-center mb-12 tour-welcome pt-12">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center p-6 bg-indigo-600 rounded-3xl shadow-2xl mb-8 transform rotate-3 hover:rotate-0 transition-transform duration-300"
        >
          <BrainCircuit className="w-16 h-16 text-white" />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight"
        >
          QuizGen <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">AI</span>
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          Crie quizzes desafiadores sobre qualquer assunto ou aprimore sua escrita com nossa ferramenta completa de redação e feedback inteligente.
        </motion.p>
      </div>

      <motion.div 
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 tour-features"
      >
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-shadow">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 text-indigo-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">IA Generativa</h3>
          <p className="text-slate-500">Gere quizzes únicos e temas de redação sobre qualquer tópico, de História a Cultura Pop.</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-4 text-purple-600">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Modos de Jogo</h3>
          <p className="text-slate-500">Divirta-se com modos Arcade, TV Show ou pratique com o modo Redação e Treino.</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-shadow">
          <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center mb-4 text-pink-600">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Multiplayer</h3>
          <p className="text-slate-500">Desafie seus amigos localmente e veja quem sabe mais.</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-shadow">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 text-emerald-600">
            <PenTool className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Redação</h3>
          <p className="text-slate-500">Pratique com temas estilo ENEM, modelos nota 1000 e receba correção detalhada.</p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <div className="tour-generate-ai">
          <Button 
            onClick={onStart} 
            className="py-4 px-12 text-xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/40 w-full"
            icon={<Sparkles className="w-6 h-6" />}
          >
            Gerar com IA
          </Button>
        </div>
        <div className="tour-create-manual">
          <Button 
            onClick={onCreate} 
            variant="outline"
            className="py-4 px-12 text-xl bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-lg w-full"
            icon={<BrainCircuit className="w-6 h-6" />}
          >
            Criar Quiz
          </Button>
        </div>
        <div className="tour-essay-models">
          <Button 
            onClick={onEssayGenerator} 
            variant="outline"
            className="py-4 px-12 text-xl bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-lg w-full"
            icon={<PenTool className="w-6 h-6" />}
          >
            Modelos de Redação
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
