import React, { useState } from 'react';
import { Difficulty, QuizConfig, QuizTheme, GameMode, ArcadeMap, TeachingStyle } from '../types';
import { Button } from './Button';
import { BrainCircuit, Sparkles, BookOpen, Layers, Tv, Palette, Sun, Moon, Zap, Gamepad2, Trophy, Leaf, Snowflake, Flower2, Map, Mountain, Skull, Trees, Info, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuizSetupProps {
  onStart: (config: QuizConfig) => void;
  isGenerating: boolean;
}

export const QuizSetup: React.FC<QuizSetupProps> = ({ onStart, isGenerating }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [theme, setTheme] = useState<QuizTheme>('light');
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>('standard');
  // Removed isTvMode state as it is now derived from gameMode,  
  // BUT we need to pass it to onStart. We'll derive it there.
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [playerList, setPlayerList] = useState<string[]>(['Jogador 1', 'Jogador 2']);
  const [arcadeMap, setArcadeMap] = useState<ArcadeMap>('overworld');

  const handleAddPlayer = () => {
      if (playerList.length < 4) {
          setPlayerList([...playerList, `Jogador ${playerList.length + 1}`]);
      }
  };

  const handleRemovePlayer = () => {
      if (playerList.length > 2) {
          setPlayerList(playerList.slice(0, -1));
      }
  };

  const handlePlayerNameChange = (index: number, name: string) => {
      const newList = [...playerList];
      newList[index] = name;
      setPlayerList(newList);
  };

  const themeNames: Record<QuizTheme, string> = {
    light: 'Claro',
    dark: 'Escuro',
    vibrant: 'Vibrante',
    retro: 'Retrô',
    neon: 'Neon',
    summer: 'Verão',
    autumn: 'Outono',
    winter: 'Inverno',
    spring: 'Primavera'
  };

  const Tooltip: React.FC<{ id: string; text: string }> = ({ id, text }) => (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setActiveTooltip(id)}
        onMouseLeave={() => setActiveTooltip(null)}
        onClick={() => setActiveTooltip(activeTooltip === id ? null : id)}
        className="text-slate-400 hover:text-indigo-500 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {activeTooltip === id && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-50 w-40 text-center leading-tight pointer-events-none"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      let playerNames: string[] | undefined;
      if (isMultiplayer) {
          playerNames = playerList;
      }
      
      // Derive isTvMode from gameMode selection
      const isTvMode = gameMode === 'tv_show';
      
      onStart({ 
          topic, 
          difficulty, 
          questionCount, 
          theme, 
          isTvMode, 
          gameMode, 
          isMultiplayer,
          isStoryMode: gameMode === 'arcade' ? isStoryMode : false,
          playerNames,
          arcadeMap: gameMode === 'arcade' ? (isStoryMode ? 'overworld' : arcadeMap) : undefined,
          teachingStyle
      });
    }
  };

  const predefinedTopics = [
    "História do Brasil",
    "Astronomia",
    "React JS",
    "Mitologia Grega",
    "Cinema dos Anos 90"
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-xl md:max-w-4xl mx-auto w-full transition-all duration-500"
    >
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        {/* Right Panel - Form */}
        <div className="p-6 md:p-10 bg-white">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Topic Input */}
            <div className="space-y-3">
              <label htmlFor="topic" className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Sobre o que você quer aprender?
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Revolução Francesa, Biologia, Cinema..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-lg"
                required
              />
              <div className="flex flex-wrap gap-2">
                {predefinedTopics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Game Mode Selection */}
                <div className="space-y-3 md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4 text-indigo-500" />
                        Modo de Jogo
                        <Tooltip id="gameMode" text="Escolha como quer jogar: Clássico, Arcade (com mapas), TV Show ou Desafio Rápido." />
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                            type="button"
                            onClick={() => setGameMode('classic')}
                            className={`aspect-square flex flex-col items-center justify-center p-4 rounded-[2rem] border transition-all ${gameMode === 'classic' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                        >
                            <div className="flex flex-col items-center gap-2 text-center">
                                <BookOpen className={`w-8 h-8 ${gameMode === 'classic' ? 'text-indigo-600' : 'text-slate-500'}`} />
                                <span className={`font-bold text-xs ${gameMode === 'classic' ? 'text-indigo-900' : 'text-slate-700'}`}>Clássico</span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setGameMode('arcade')}
                            className={`aspect-square flex flex-col items-center justify-center p-4 rounded-[2rem] border transition-all ${gameMode === 'arcade' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                        >
                            <div className="flex flex-col items-center gap-2 text-center">
                                <Zap className={`w-8 h-8 ${gameMode === 'arcade' ? 'text-indigo-600' : 'text-slate-500'}`} />
                                <span className={`font-bold text-xs ${gameMode === 'arcade' ? 'text-indigo-900' : 'text-slate-700'}`}>Arcade</span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setGameMode('tv_show')}
                            className={`aspect-square flex flex-col items-center justify-center p-4 rounded-[2rem] border transition-all ${gameMode === 'tv_show' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                        >
                            <div className="flex flex-col items-center gap-2 text-center">
                                <Tv className={`w-8 h-8 ${gameMode === 'tv_show' ? 'text-indigo-600' : 'text-slate-500'}`} />
                                <span className={`font-bold text-xs ${gameMode === 'tv_show' ? 'text-indigo-900' : 'text-slate-700'}`}>TV Show</span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setGameMode('speed_run')}
                            className={`aspect-square flex flex-col items-center justify-center p-4 rounded-[2rem] border transition-all ${gameMode === 'speed_run' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                        >
                            <div className="flex flex-col items-center gap-2 text-center">
                                <Zap className={`w-8 h-8 ${gameMode === 'speed_run' ? 'text-indigo-600' : 'text-slate-500'}`} />
                                <span className={`font-bold text-xs ${gameMode === 'speed_run' ? 'text-indigo-900' : 'text-slate-700'}`}>Desafio Rápido</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Multiplayer Toggle */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className={`w-10 h-6 rounded-full relative transition-colors ${isMultiplayer ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isMultiplayer ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isMultiplayer} 
                            onChange={(e) => setIsMultiplayer(e.target.checked)} 
                        />
                        <div className="flex items-center gap-2">
                            <Trophy className={`w-5 h-5 ${isMultiplayer ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className={`font-medium ${isMultiplayer ? 'text-indigo-900' : 'text-slate-600'}`}>Multiplayer</span>
                            <Tooltip id="multiplayer" text="Jogue com amigos (2 a 4 jogadores) e veja quem sabe mais!" />
                        </div>
                    </label>

                    {gameMode === 'arcade' && (
                        <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors animate-fade-in">
                            <div className={`w-10 h-6 rounded-full relative transition-colors ${isStoryMode ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isStoryMode ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={isStoryMode} 
                                onChange={(e) => setIsStoryMode(e.target.checked)} 
                            />
                            <div className="flex items-center gap-2">
                                <BookOpen className={`w-5 h-5 ${isStoryMode ? 'text-amber-600' : 'text-slate-400'}`} />
                                <span className={`font-medium ${isStoryMode ? 'text-amber-900' : 'text-slate-600'}`}>Modo História</span>
                            </div>
                        </label>
                    )}
                </div>

                {/* Player Setup for Multiplayer */}
                {isMultiplayer && (
                    <div className="space-y-3 animate-fade-in md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-indigo-500" />
                            Jogadores (2 a 4)
                        </label>
                        <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {playerList.map((player, index) => (
                                    <input 
                                        key={index}
                                        type="text" 
                                        placeholder={`Nome do Jogador ${index + 1}`}
                                        value={player}
                                        onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                                {playerList.length < 4 && (
                                    <button 
                                        type="button" 
                                        onClick={handleAddPlayer}
                                        className="text-xs px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 font-medium transition-colors"
                                    >
                                        + Adicionar
                                    </button>
                                )}
                                {playerList.length > 2 && (
                                    <button 
                                        type="button" 
                                        onClick={handleRemovePlayer}
                                        className="text-xs px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-colors"
                                    >
                                        - Remover
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Teaching Style */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        Estilo de Ensino
                        <Tooltip id="teachingStyle" text="Define a personalidade da IA ao criar perguntas e explicações." />
                    </label>
                    <div className="relative">
                        <select
                            value={teachingStyle}
                            onChange={(e) => setTeachingStyle(e.target.value as TeachingStyle)}
                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-2xl leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="standard">Padrão</option>
                            <option value="socratic">Socrático</option>
                            <option value="humorous">Bem-humorado</option>
                            <option value="strict">Rigoroso</option>
                            <option value="gamified">Gamificado</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Difficulty OR Map Selector */}
                {gameMode === 'arcade' ? (
                    !isStoryMode && (
                    <div className="space-y-3 animate-fade-in">
                        <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Map className="w-4 h-4 text-indigo-500" />
                            Mapa (Mundo)
                            <Tooltip id="map" text="Cada mapa tem um estilo visual e trilha sonora únicos." />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setArcadeMap('overworld')}
                                className={`p-2 text-xs rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${arcadeMap === 'overworld' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'bg-white border-slate-200 text-slate-500'}`}
                            >
                                <Trees className="w-4 h-4" />
                                Overworld
                            </button>
                            <button
                                type="button"
                                onClick={() => setArcadeMap('underground')}
                                className={`p-2 text-xs rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${arcadeMap === 'underground' ? 'bg-amber-50 border-amber-700 text-amber-800 ring-1 ring-amber-700' : 'bg-white border-slate-200 text-slate-500'}`}
                            >
                                <Mountain className="w-4 h-4" />
                                Underground
                            </button>
                            <button
                                type="button"
                                onClick={() => setArcadeMap('athletic')}
                                className={`p-2 text-xs rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${arcadeMap === 'athletic' ? 'bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500' : 'bg-white border-slate-200 text-slate-500'}`}
                            >
                                <Zap className="w-4 h-4" />
                                Athletic
                            </button>
                            <button
                                type="button"
                                onClick={() => setArcadeMap('boss')}
                                className={`p-2 text-xs rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${arcadeMap === 'boss' ? 'bg-red-50 border-red-600 text-red-700 ring-1 ring-red-600' : 'bg-white border-slate-200 text-slate-500'}`}
                            >
                                <Skull className="w-4 h-4" />
                                Boss Map
                            </button>
                        </div>
                    </div>
                    )
                ) : (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            Dificuldade
                            <Tooltip id="difficulty" text="Ajuste o nível das perguntas geradas pela IA." />
                        </label>
                        <div className="flex rounded-[2rem] border border-slate-200 p-1 bg-slate-50">
                        {Object.values(Difficulty).map((d) => (
                            <button
                            key={d}
                            type="button"
                            onClick={() => setDifficulty(d)}
                            className={`flex-1 py-1.5 text-xs sm:text-sm rounded-2xl transition-all ${
                                difficulty === d
                                ? 'bg-white text-indigo-700 font-medium shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                            >
                            {d}
                            </button>
                        ))}
                        </div>
                    </div>
                )}

                {/* Question Count */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        Questões
                        <Tooltip id="questions" text="Escolha o tamanho do seu desafio." />
                    </label>
                    <div className="flex rounded-[2rem] border border-slate-200 p-1 bg-slate-50">
                    {[5, 10, 15].map((count) => (
                        <button
                        key={count}
                        type="button"
                        onClick={() => setQuestionCount(count)}
                        className={`flex-1 py-1.5 text-xs sm:text-sm rounded-2xl transition-all ${
                            questionCount === count
                            ? 'bg-white text-indigo-700 font-medium shadow-sm ring-1 ring-black/5'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                        >
                        {count}
                        </button>
                    ))}
                    </div>
                </div>
            </div>
            
            {/* Visual Settings */}
            <div className="pt-6 border-t border-slate-100">
                <div className="space-y-6">
                    {/* Theme Selection */}
                    <div className="space-y-3 md:-mx-10">
                         <label className="block text-sm font-medium text-slate-700 flex items-center gap-2 md:px-10">
                            <Palette className="w-4 h-4 text-indigo-500" />
                            Tema
                            <Tooltip id="theme" text="Mude as cores e o clima de toda a interface." />
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2 px-2 md:px-4">
                             <button
                                type="button"
                                onClick={() => setTheme('light')}
                                className={`aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'light' ? 'bg-slate-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                title="Claro"
                             >
                                <Sun className="w-5 h-5" />
                             </button>
                             <button
                                type="button"
                                onClick={() => setTheme('dark')}
                                className={`aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'dark' ? 'bg-slate-800 border-indigo-500 text-white ring-1 ring-indigo-500' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                                 title="Escuro"
                             >
                                <Moon className="w-5 h-5" />
                             </button>
                             <button
                                type="button"
                                onClick={() => setTheme('vibrant')}
                                className={`aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'vibrant' ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 border-transparent text-white ring-2 ring-offset-1 ring-violet-500' : 'bg-white border-slate-200 text-slate-400'}`}
                                 title="Vibrante"
                             >
                                <Zap className="w-5 h-5" />
                             </button>
                             <button
                                type="button"
                                onClick={() => setTheme('retro')}
                                className={`aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'retro' ? 'bg-amber-100 border-amber-600 text-amber-900 ring-2 ring-offset-1 ring-amber-600' : 'bg-[#f4e4bc] border-amber-200 text-amber-800/50'}`}
                                 title="Retrô"
                             >
                                <Tv className="w-5 h-5" />
                             </button>
                             <button
                                type="button"
                                onClick={() => setTheme('neon')}
                                className={`aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'neon' ? 'bg-black border-cyan-400 text-cyan-400 ring-2 ring-offset-1 ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-white border-slate-200 text-slate-400'}`}
                                 title="Neon"
                             >
                                <Zap className="w-5 h-5" />
                             </button>
                             <button
                                type="button"
                                onClick={() => setTheme('summer')}
                                className={`aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'summer' ? 'bg-orange-50 border-orange-500 text-orange-600 ring-2 ring-offset-1 ring-orange-500' : 'bg-white border-slate-200 text-slate-400'}`}
                                 title="Verão"
                             >
                                <Sun className="w-5 h-5" />
                             </button>
                             <button
                                type="button"
                                onClick={() => setTheme('autumn')}
                                className={`aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'autumn' ? 'bg-orange-50 border-red-700 text-red-800 ring-2 ring-offset-1 ring-red-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                 title="Outono"
                             >
                                <Leaf className="w-5 h-5" />
                             </button>
                             <button
                                type="button"
                                onClick={() => setTheme('winter')}
                                className={`aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'winter' ? 'bg-slate-50 border-sky-600 text-sky-700 ring-2 ring-offset-1 ring-sky-600' : 'bg-white border-slate-200 text-slate-400'}`}
                                 title="Inverno"
                             >
                                <Snowflake className="w-5 h-5" />
                             </button>
                             <button
                                type="button"
                                onClick={() => setTheme('spring')}
                                className={`aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'spring' ? 'bg-green-50 border-pink-500 text-pink-600 ring-2 ring-offset-1 ring-pink-500' : 'bg-white border-slate-200 text-slate-400'}`}
                                 title="Primavera"
                             >
                                <Flower2 className="w-5 h-5" />
                             </button>
                        </div>
                        <div className="text-center md:px-10">
                            <motion.span 
                                key={theme}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-1 rounded-full inline-block"
                            >
                                {themeNames[theme]}
                            </motion.span>
                        </div>
                    </div>
                </div>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isGenerating}
              disabled={!topic.trim()}
              icon={<Sparkles className="w-5 h-5" />}
              className="mt-4 py-4 text-lg shadow-lg shadow-indigo-500/20"
            >
              Gerar Quiz
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};