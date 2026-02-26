import React, { useState, useEffect, useRef } from 'react';
import { QuizData, UserAnswers, Difficulty, QuizTheme, Question, MatchingPair } from '../types';
import { Button } from './Button';
import { ChevronRight, CheckCircle2, Timer, AlertCircle, XCircle, Volume2, VolumeX, SkipForward, Heart, Zap, Shield, Hourglass, Trophy } from 'lucide-react';

interface QuizGameProps {
  quiz: QuizData;
  onComplete: (answers: UserAnswers, score?: number | number[]) => void;
}

const TIME_LIMITS: Record<Difficulty, number> = {
  [Difficulty.Easy]: 45,
  [Difficulty.Medium]: 30,
  [Difficulty.Hard]: 15,
};

// URLs de efeitos sonoros fixos
const SOUNDS = {
  correct: "https://actions.google.com/sounds/v1/crowds/battle_crowd_celebrate_stutter.ogg",
  wrong: "https://actions.google.com/sounds/v1/crowds/crowd_boo.ogg",
  powerup: "https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg",
  gameover: "https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg",
  skip: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
  eliminate: "https://actions.google.com/sounds/v1/cartoon/bang.ogg",
  timeFreeze: "https://actions.google.com/sounds/v1/science_fiction/scifi_laser.ogg"
};

const THEME_MUSIC: Record<QuizTheme, string> = {
  light: "https://actions.google.com/sounds/v1/ambiences/outdoor_garden.ogg",
  dark: "https://actions.google.com/sounds/v1/ambiences/cave_atmosphere.ogg",
  vibrant: "https://actions.google.com/sounds/v1/ambiences/fountain_loop.ogg",
  retro: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg", 
  neon: "https://actions.google.com/sounds/v1/science_fiction/space_station_ambience.ogg",
  summer: "https://actions.google.com/sounds/v1/ambiences/beach_with_waves.ogg",
  autumn: "https://actions.google.com/sounds/v1/weather/wind_through_trees.ogg",
  winter: "https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg",
  spring: "https://actions.google.com/sounds/v1/ambiences/morning_farm_ambience.ogg",
};

import { generateSpeech } from '../services/geminiService';

export const QuizGame: React.FC<QuizGameProps> = ({ quiz, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<UserAnswers>({});
  
  // Game State
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  // Multiplayer State
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const playerNames = quiz.playerNames || ['Jogador 1', 'Jogador 2'];
  const [playerScores, setPlayerScores] = useState<number[]>(new Array(playerNames.length).fill(0));

  const [powerUps, setPowerUps] = useState({
    skip: 1,
    eliminate: 1,
    timeFreeze: 1
  });
  const [isFrozen, setIsFrozen] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);

  // Matching Question State
  const [matchingLeft, setMatchingLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]); // Stores matched 'left' items
  const [shuffledRightOptions, setShuffledRightOptions] = useState<string[]>([]);
  const [rightOptionMap, setRightOptionMap] = useState<Record<string, string>>({}); // Maps right option text to original pair left key for validation

  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // Estado para animação entre perguntas
  
  // Estado para as cortinas do Modo TV
  // Se for TV, começa fechada (false) para abrir. Se não for TV, começa aberta (true).
  const [areCurtainsOpen, setAreCurtainsOpen] = useState(!quiz.isTvMode);
  
  const timeLimit = quiz.gameMode === 'speed_run' ? 60 : TIME_LIMITS[quiz.difficulty];
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Audio Management
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const question = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;

  // Determine effective theme based on Arcade Map if applicable
  const getEffectiveTheme = (): QuizTheme => {
      if (quiz.gameMode === 'arcade' && quiz.arcadeMap) {
          switch (quiz.arcadeMap) {
              case 'overworld': return 'spring';
              case 'underground': return 'dark';
              case 'athletic': return 'vibrant';
              case 'boss': return 'autumn'; // Or maybe 'retro' for 8-bit feel? 'autumn' has red tones.
              default: return quiz.theme;
          }
      }
      return quiz.theme;
  };

  const effectiveTheme = getEffectiveTheme();

  // Background Music Effect
  useEffect(() => {
    const musicUrl = THEME_MUSIC[effectiveTheme];
    
    if (!bgMusicRef.current) {
      bgMusicRef.current = new Audio(musicUrl);
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.1; // Low volume for background
    } else if (bgMusicRef.current.src !== musicUrl) {
       bgMusicRef.current.pause();
       bgMusicRef.current.src = musicUrl;
    }

    if (soundEnabled) {
      bgMusicRef.current.play().catch(e => console.log("Background music autoplay blocked:", e));
    } else {
      bgMusicRef.current.pause();
    }

    return () => {
      // Cleanup only on unmount (or if we want to stop it)
      // We don't pause here because this effect runs on theme change too, 
      // and we want smooth transition if possible, but src change handles it.
      // Actually, standard cleanup:
    };
  }, [effectiveTheme, soundEnabled]);

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  // Initialize Matching Question
  useEffect(() => {
    if (question.type === 'MATCHING' && question.pairs) {
        const rights = question.pairs.map(p => p.right);
        // Shuffle right options
        const shuffled = [...rights].sort(() => Math.random() - 0.5);
        setShuffledRightOptions(shuffled);
        
        // Create map for validation: rightText -> leftText
        const map: Record<string, string> = {};
        question.pairs.forEach(p => {
            map[p.right] = p.left;
        });
        setRightOptionMap(map);
        setMatchedPairs([]);
        setMatchingLeft(null);
    } else {
        setEliminatedOptions([]);
    }
  }, [currentQuestionIndex, question]);

  // Função para tocar som
  const playSound = (type: 'correct' | 'wrong' | 'powerup' | 'gameover' | 'skip' | 'eliminate' | 'timeFreeze') => {
    if (!quiz.isTvMode && !soundEnabled) return; // Allow sound in non-TV mode if enabled? Logic in original was strict. Let's assume soundEnabled toggle controls all.
    if (!soundEnabled) return;

    // Para o som anterior se houver
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const src = SOUNDS[type] || SOUNDS['powerup']; // Fallback
    
    const audio = new Audio(src);
    audio.volume = type === 'correct' ? 0.4 : 0.4;
    
    audio.play().catch(e => console.log("Erro ao reproduzir áudio:", e));
    currentAudioRef.current = audio;
  };

  // Limpa áudio e fala ao desmontar
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Efeito de abertura das cortinas no início (apenas Modo TV)
  useEffect(() => {
    if (quiz.isTvMode) {
      // Pequeno delay para garantir que o componente montou, então abre as cortinas
      const timer = setTimeout(() => {
        setAreCurtainsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [quiz.isTvMode]);

  const [fillInBlankAnswer, setFillInBlankAnswer] = useState('');

  // Reset State on Question Change
  useEffect(() => {
    if (quiz.gameMode !== 'speed_run') {
        setTimeLeft(timeLimit);
        setIsTimeUp(false);
    }
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setIsFrozen(false);
    setFillInBlankAnswer('');
  }, [currentQuestionIndex, timeLimit, quiz.gameMode]);

  // Countdown Logic
  useEffect(() => {
    // Se as cortinas estiverem fechadas (transição inicial), não conta o tempo
    if ((isAnswerChecked && quiz.gameMode !== 'speed_run') || isTimeUp || !areCurtainsOpen || isFrozen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimeUp(true);
          
          if (quiz.gameMode === 'speed_run') {
              playSound('gameover');
              onComplete(answers, score);
              return 0;
          }

          setIsAnswerChecked(true);
          // Toca som de erro (tempo esgotado)
          playSound('wrong');
          
          // Arcade/TV Show Mode: Lose Life on Timeout
          if (quiz.gameMode === 'arcade' || quiz.gameMode === 'tv_show') {
             setLives(l => Math.max(0, l - 1));
          }
          // Multiplayer: No lives lost, just no points.
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswerChecked, isTimeUp, quiz.isTvMode, soundEnabled, areCurtainsOpen, isFrozen, quiz.gameMode, answers, score]);

  const handleOptionSelect = (index: number) => {
    if (!isTimeUp && !isAnswerChecked && !isTransitioning && !eliminatedOptions.includes(index)) {
      setSelectedOption(index);
    }
  };

  const handleSkip = () => {
    if (isAnswerChecked || isTimeUp || isTransitioning) return;
    
      // Arcade/Multiplayer/TV Show Skip Powerup
    if (quiz.gameMode === 'arcade' || quiz.isMultiplayer || quiz.gameMode === 'tv_show') {
        if (powerUps.skip > 0) {
            setPowerUps(p => ({ ...p, skip: p.skip - 1 }));
            playSound('skip');
            // Move next immediately without checking/penalty
            setAnswers(prev => ({ ...prev, [question.id]: -1 }));
            handleNextQuestion();
        }
        return;
    }
    
    setIsAnswerChecked(true);
    setAnswers(prev => ({ ...prev, [question.id]: -1 })); // -1 indica pulada/sem resposta
    playSound('wrong'); // Toca som de erro/negativo pois não pontuou
  };

  const handleMatchingSelect = (item: string, side: 'left' | 'right') => {
      if (isAnswerChecked || isTimeUp) return;

      if (side === 'left') {
          // If already matched, ignore
          if (matchedPairs.includes(item)) return;
          setMatchingLeft(item === matchingLeft ? null : item); // Toggle selection
      } else {
          // Right side clicked
          if (!matchingLeft) return;
          
          // Check match
          const correctLeft = rightOptionMap[item];
          if (correctLeft === matchingLeft) {
              // Correct match
              const newMatchedPairs = [...matchedPairs, matchingLeft];
              setMatchedPairs(newMatchedPairs);
              setMatchingLeft(null);
              playSound('correct');
              
              // Check if all matched
              if (newMatchedPairs.length === (question.pairs?.length || 0)) {
                  // All done!
                  setIsAnswerChecked(true);
                  if (quiz.gameMode === 'arcade' || quiz.gameMode === 'tv_show') {
                      setScore(s => s + 500);
                  } else if (quiz.isMultiplayer) {
                      setPlayerScores(prev => {
                          const newScores = [...prev];
                          newScores[currentPlayerIndex] += 500;
                          return newScores;
                      });
                  }
                  setAnswers(prev => ({ ...prev, [question.id]: 1 })); // 1 for correct
              }
          } else {
              // Wrong match
              playSound('wrong');
              
              // Visual feedback for wrong match could be added here if we had a state for it
              // For now, just clear the selection
              setMatchingLeft(null);
              
              // Multiplayer/Arcade/TV Show penalty
              if (quiz.isMultiplayer || quiz.gameMode === 'arcade' || quiz.gameMode === 'tv_show') {
                  setTimeLeft(t => Math.max(0, t - 5)); // Penalty 5s
              }
          }
      }
  };

  const handlePowerUp = (type: 'eliminate' | 'timeFreeze') => {
      if (isAnswerChecked || isTimeUp || powerUps[type] <= 0) return;

      if (type === 'eliminate') {
          if (question.type !== 'MULTIPLE_CHOICE') return;
          // Find wrong answers
          const wrongIndices = question.options!.map((_, i) => i).filter(i => i !== question.correctAnswerIndex);
          // Shuffle and pick 2
          const toEliminate = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
          setEliminatedOptions(toEliminate);
          setPowerUps(p => ({ ...p, eliminate: p.eliminate - 1 }));
          playSound('eliminate');
      } else if (type === 'timeFreeze') {
          setIsFrozen(true);
          setPowerUps(p => ({ ...p, timeFreeze: p.timeFreeze - 1 }));
          playSound('timeFreeze');
          // Unfreeze after 10s
          setTimeout(() => setIsFrozen(false), 10000);
      }
  };

  const handleConfirm = () => {
    if (!isAnswerChecked) {
      // Step 1: Confirm Answer
      setIsAnswerChecked(true);
      let isCorrect = false;
      let finalAnswer: any = -1;

      if (question.type === 'MATCHING') {
          // Logic handled in handleMatchingSelect, this block might be redundant for MATCHING if we auto-check
          // But if we want manual confirm for matching, we'd check here.
          // Current implementation auto-checks matching.
      } else if (question.type === 'FILL_IN_THE_BLANK') {
          const normalizedUserAnswer = fillInBlankAnswer.trim().toLowerCase();
          // We need to extract the correct answer from the explanation or have it in a separate field.
          // Since the current schema puts the answer in explanation for FILL_IN_THE_BLANK, we might need to parse it or rely on the user to check against explanation.
          // Ideally, the API should return the correct answer in a specific field.
          // For now, let's assume the correct answer is the FIRST option if options are provided (as a hack) or we check if the explanation contains the user answer.
          // BETTER: Let's assume the correct answer is in `correctAnswerIndex` (which is number) or we need to update the type.
          // Actually, for FILL_IN_THE_BLANK, we usually need a string answer.
          // Let's update the prompt to put the correct answer in `options[0]` for FILL_IN_THE_BLANK or similar.
          // Let's try to match loosely against the explanation for now, or assume the AI puts the word in quotes in the explanation.
          
          // REVISION: Let's assume the correct answer is the string in `options[0]` if available, or we check if explanation contains it.
          // Let's use a simple heuristic: if the explanation contains the user answer (case insensitive), it's correct.
          // Or better, let's update the prompt in geminiService to put the correct answer in `options` array as the first element.
          
          const correct = question.options?.[0]?.toLowerCase() || "";
          isCorrect = normalizedUserAnswer === correct || (correct === "" && question.explanation.toLowerCase().includes(normalizedUserAnswer));
          finalAnswer = fillInBlankAnswer;
      } else {
          finalAnswer = selectedOption !== null ? selectedOption : -1;
          isCorrect = finalAnswer === question.correctAnswerIndex;
      }
      
      setAnswers(prev => ({ ...prev, [question.id]: finalAnswer }));

      // Play Sound Effects
      if (isCorrect) {
        playSound('correct');
        if (quiz.gameMode === 'arcade' || quiz.gameMode === 'tv_show') {
            setScore(s => s + 100);
        } else if (quiz.isMultiplayer) {
            setPlayerScores(prev => {
                const newScores = [...prev];
                newScores[currentPlayerIndex] += 100;
                return newScores;
            });
        } else if (quiz.gameMode === 'speed_run') {
            setScore(s => s + 100);
        }
      } else {
        playSound('wrong');
        if (quiz.gameMode === 'arcade' || quiz.gameMode === 'tv_show') {
            setLives(l => Math.max(0, l - 1));
        }
        // Multiplayer: No penalty, just next player
      }

    } else {
      handleNextQuestion();
    }
  };

  // Auto-advance for Speed Run
  useEffect(() => {
      if (quiz.gameMode === 'speed_run' && isAnswerChecked) {
          const timer = setTimeout(() => {
              handleNextQuestion();
          }, 500); // Short delay for feedback
          return () => clearTimeout(timer);
      }
  }, [isAnswerChecked, quiz.gameMode]);

  const handleNextQuestion = () => {
      // Stop current sound immediately when moving next
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      // Check Game Over (Lives) - Arcade/TV Show Only
      if ((quiz.gameMode === 'arcade' || quiz.gameMode === 'tv_show') && lives === 0) {
          onComplete(answers, score);
          return;
      }

      if (currentQuestionIndex < totalQuestions - 1) {
        // --- PRÓXIMA PERGUNTA ---
        setIsTransitioning(true);
        
        setTimeout(() => {
          setCurrentQuestionIndex(prev => prev + 1);
          // Switch Player in Multiplayer
          if (quiz.isMultiplayer) {
              setCurrentPlayerIndex(prev => (prev + 1) % playerNames.length);
          }
          
          setTimeout(() => {
            setIsTransitioning(false);
          }, 50);
        }, quiz.gameMode === 'speed_run' ? 50 : 300); // Faster transition for Speed Run
      } else {
        // --- FINAL DO QUIZ ---
        if (quiz.isTvMode) {
            // Se for modo TV, fecha as cortinas primeiro
            setAreCurtainsOpen(false);
            // Aguarda a animação da cortina (1.5s) antes de navegar
            setTimeout(() => {
                onComplete(answers, quiz.isMultiplayer ? playerScores : score);
            }, 1500);
        } else {
            onComplete(answers, quiz.isMultiplayer ? playerScores : score);
        }
      }
  };

  // --- THEME LOGIC ---
  const getThemeStyles = (theme: QuizTheme, isTv: boolean) => {
    const base = {
      title: isTv 
        ? 'text-2xl sm:text-3xl md:text-5xl leading-tight text-center drop-shadow-lg break-words hyphens-auto' 
        : 'text-lg md:text-2xl break-words',
      optionText: isTv 
        ? 'text-lg sm:text-xl md:text-2xl font-bold break-words' 
        : 'text-sm md:text-base break-words',
    };

    if (isTv) {
      return {
        ...base,
        wrapper: `fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start md:justify-center p-4 tv-stage-bg`,
        textMain: 'text-white',
        textSec: 'text-yellow-200',
        card: 'bg-indigo-900/90 backdrop-blur-sm border-4 border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.3)] w-full',
        cardTimeUp: '!border-red-500 !shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-pulse',
        progressBg: 'bg-black/50',
        progressFill: 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]',
        timerNormal: 'text-yellow-400',
        optDefault: 'border-2 border-indigo-400/30 bg-indigo-950/50 text-white hover:bg-indigo-800/50 hover:border-yellow-400/50 hover:scale-[1.01] active:scale-95',
        optSelected: 'border-4 border-yellow-400 bg-yellow-500/20 text-yellow-100 shadow-[0_0_20px_rgba(250,204,21,0.4)]',
        optCorrect: 'border-4 border-green-400 bg-green-600/40 text-white shadow-[0_0_30px_rgba(74,222,128,0.6)] animate-pulse',
        optWrong: 'border-4 border-red-500 bg-red-600/40 text-white',
        optDimmed: 'opacity-30 grayscale',
        explanationBox: 'bg-black/60 border-2 border-white/20 text-white backdrop-blur-md',
        hud: {
            container: 'bg-indigo-900/80 border border-yellow-500/50 text-white',
            text: 'text-yellow-400',
            button: 'bg-indigo-800 hover:bg-indigo-700 border border-indigo-500/50',
            buttonDisabled: 'bg-slate-800/50 border-slate-700 text-slate-500',
            heart: 'text-red-500 fill-red-500'
        }
      };
    }

    if (theme === 'dark') {
      return {
        ...base,
        wrapper: `bg-slate-900 min-h-screen py-8 px-4`,
        textMain: 'text-white',
        textSec: 'text-slate-400',
        card: 'bg-slate-800 border-slate-700',
        cardTimeUp: '!border-red-500/60 ring-1 ring-red-500/40',
        progressBg: 'bg-slate-700',
        progressFill: 'bg-indigo-500',
        timerNormal: 'text-indigo-400',
        optDefault: 'border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-700',
        optSelected: 'border-indigo-400 bg-indigo-900/50 ring-indigo-400 text-white',
        optCorrect: 'border-green-500 bg-green-900/30 text-green-100 ring-1 ring-green-500',
        optWrong: 'border-red-500 bg-red-900/30 text-red-100 ring-1 ring-red-500',
        optDimmed: 'opacity-40 grayscale',
        explanationBox: 'bg-slate-700/50 border-slate-600 text-slate-200',
        hud: {
            container: 'bg-slate-800 border border-slate-700 text-white',
            text: 'text-indigo-400',
            button: 'bg-slate-700 hover:bg-slate-600 border border-slate-600',
            buttonDisabled: 'bg-slate-800 text-slate-600 border-slate-700',
            heart: 'text-red-500 fill-red-500'
        }
      };
    } else if (theme === 'vibrant') {
      return {
        ...base,
        wrapper: `bg-gradient-to-br from-violet-600 to-fuchsia-600 min-h-screen py-8 px-4`,
        textMain: 'text-white drop-shadow-sm',
        textSec: 'text-violet-100',
        card: 'bg-white/10 backdrop-blur-md border-white/20 shadow-2xl',
        cardTimeUp: '!border-red-400/80 !bg-red-900/20',
        progressBg: 'bg-black/20',
        progressFill: 'bg-white',
        timerNormal: 'text-white',
        optDefault: 'border-white/20 bg-white/5 text-white hover:bg-white/20',
        optSelected: 'border-white bg-white/30 ring-white text-white font-bold',
        optCorrect: 'border-green-400 bg-green-500/20 text-white ring-1 ring-green-400 font-bold',
        optWrong: 'border-red-400 bg-red-500/20 text-white ring-1 ring-red-400 font-bold',
        optDimmed: 'opacity-40',
        explanationBox: 'bg-white/10 border-white/20 text-white',
        hud: {
            container: 'bg-white/10 backdrop-blur-md border border-white/20 text-white',
            text: 'text-white font-bold',
            button: 'bg-white/20 hover:bg-white/30 border border-white/30',
            buttonDisabled: 'bg-black/10 text-white/30 border-white/5',
            heart: 'text-white fill-white'
        }
      };
    } else if (theme === 'retro') {
      return {
        ...base,
        wrapper: `bg-[#f4e4bc] min-h-screen py-8 px-4 font-serif bg-[url('https://www.transparenttextures.com/patterns/paper.png')]`,
        textMain: 'text-amber-900',
        textSec: 'text-amber-800/70',
        card: 'bg-[#fff8e1] border-2 border-amber-900/20 shadow-[4px_4px_0px_rgba(120,53,15,0.2)]',
        cardTimeUp: '!border-red-800/50 !bg-red-50',
        progressBg: 'bg-amber-900/10',
        progressFill: 'bg-amber-700',
        timerNormal: 'text-amber-800',
        optDefault: 'border-amber-900/20 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-900/40',
        optSelected: 'border-amber-800 bg-amber-200 text-amber-950 font-bold shadow-[2px_2px_0px_rgba(120,53,15,0.2)]',
        optCorrect: 'border-green-700 bg-green-100 text-green-900 font-bold',
        optWrong: 'border-red-700 bg-red-100 text-red-900 font-bold',
        optDimmed: 'opacity-50 grayscale',
        explanationBox: 'bg-amber-100 border-amber-900/20 text-amber-900',
        hud: {
            container: 'bg-[#fff8e1] border-2 border-amber-900/20 text-amber-900 shadow-[4px_4px_0px_rgba(120,53,15,0.1)]',
            text: 'text-amber-800',
            button: 'bg-amber-100 hover:bg-amber-200 border border-amber-900/30 text-amber-900',
            buttonDisabled: 'bg-amber-50 text-amber-900/30 border-amber-900/10',
            heart: 'text-red-600 fill-red-600'
        }
      };
    } else if (theme === 'neon') {
      return {
        ...base,
        wrapper: `bg-black min-h-screen py-8 px-4`,
        textMain: 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]',
        textSec: 'text-fuchsia-400',
        card: 'bg-gray-900 border border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]',
        cardTimeUp: '!border-red-500 !shadow-[0_0_20px_rgba(239,68,68,0.6)]',
        progressBg: 'bg-gray-800',
        progressFill: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]',
        timerNormal: 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]',
        optDefault: 'border-cyan-900/50 bg-gray-900 text-cyan-200 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.4)]',
        optSelected: 'border-fuchsia-500 bg-fuchsia-900/20 text-fuchsia-300 shadow-[0_0_15px_rgba(232,121,249,0.5)]',
        optCorrect: 'border-green-400 bg-green-900/20 text-green-300 shadow-[0_0_15px_rgba(74,222,128,0.5)]',
        optWrong: 'border-red-500 bg-red-900/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.5)]',
        optDimmed: 'opacity-30 grayscale',
        explanationBox: 'bg-gray-800 border-cyan-500/30 text-cyan-100',
        hud: {
            container: 'bg-gray-900 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
            text: 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]',
            button: 'bg-gray-800 hover:bg-gray-700 border border-cyan-500/50 text-cyan-300',
            buttonDisabled: 'bg-gray-900 text-gray-700 border-gray-800',
            heart: 'text-fuchsia-500 fill-fuchsia-500 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]'
        }
      };
    } else if (theme === 'summer') {
      return {
        ...base,
        wrapper: `bg-orange-50 min-h-screen py-8 px-4 bg-[url('https://www.transparenttextures.com/patterns/beach-towels.png')]`,
        textMain: 'text-orange-600',
        textSec: 'text-yellow-600',
        card: 'bg-white border-orange-200 shadow-xl shadow-orange-500/10',
        cardTimeUp: '!border-red-400 ring-4 ring-red-100',
        progressBg: 'bg-orange-100',
        progressFill: 'bg-orange-500',
        timerNormal: 'text-orange-500',
        optDefault: 'border-orange-100 bg-orange-50/50 text-orange-800 hover:bg-orange-100 hover:border-orange-300',
        optSelected: 'border-orange-500 bg-orange-100 text-orange-900 ring-orange-500',
        optCorrect: 'border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500',
        optWrong: 'border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500',
        optDimmed: 'opacity-50 grayscale',
        explanationBox: 'bg-orange-50 border-orange-200 text-orange-800',
        hud: {
            container: 'bg-white/90 border border-orange-200 text-orange-600 shadow-lg',
            text: 'text-orange-500',
            button: 'bg-orange-100 hover:bg-orange-200 border border-orange-300 text-orange-700',
            buttonDisabled: 'bg-slate-100 text-slate-400 border-slate-200',
            heart: 'text-red-500 fill-red-500'
        }
      };
    } else if (theme === 'autumn') {
      return {
        ...base,
        wrapper: `bg-[#fdf2e9] min-h-screen py-8 px-4`,
        textMain: 'text-[#7c2d12]', // amber-900 equivalent
        textSec: 'text-[#9a3412]', // orange-800 equivalent
        card: 'bg-white border-orange-200 shadow-lg',
        cardTimeUp: '!border-red-400 ring-4 ring-red-100',
        progressBg: 'bg-orange-100',
        progressFill: 'bg-[#c2410c]', // orange-700
        timerNormal: 'text-[#c2410c]',
        optDefault: 'border-orange-200 bg-orange-50 text-[#7c2d12] hover:bg-orange-100 hover:border-orange-400',
        optSelected: 'border-[#9a3412] bg-orange-100 text-[#7c2d12] ring-[#9a3412]',
        optCorrect: 'border-green-600 bg-green-50 text-green-900 ring-1 ring-green-600',
        optWrong: 'border-red-600 bg-red-50 text-red-900 ring-1 ring-red-600',
        optDimmed: 'opacity-50 grayscale',
        explanationBox: 'bg-orange-50 border-orange-200 text-[#7c2d12]',
        hud: {
            container: 'bg-white/90 border border-orange-200 text-[#7c2d12] shadow-lg',
            text: 'text-[#c2410c]',
            button: 'bg-orange-100 hover:bg-orange-200 border border-orange-300 text-[#7c2d12]',
            buttonDisabled: 'bg-slate-100 text-slate-400 border-slate-200',
            heart: 'text-red-600 fill-red-600'
        }
      };
    } else if (theme === 'winter') {
      return {
        ...base,
        wrapper: `bg-slate-50 min-h-screen py-8 px-4 bg-[url('https://www.transparenttextures.com/patterns/snow.png')]`,
        textMain: 'text-slate-700',
        textSec: 'text-sky-600',
        card: 'bg-white border-sky-100 shadow-xl shadow-sky-200/50',
        cardTimeUp: '!border-red-300 ring-4 ring-red-50',
        progressBg: 'bg-slate-200',
        progressFill: 'bg-sky-600',
        timerNormal: 'text-sky-600',
        optDefault: 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-sky-50 hover:border-sky-200',
        optSelected: 'border-sky-500 bg-sky-50 text-sky-900 ring-sky-500',
        optCorrect: 'border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500',
        optWrong: 'border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500',
        optDimmed: 'opacity-50 grayscale',
        explanationBox: 'bg-sky-50 border-sky-200 text-sky-800',
        hud: {
            container: 'bg-white/90 border border-sky-200 text-sky-800 shadow-lg',
            text: 'text-sky-600',
            button: 'bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700',
            buttonDisabled: 'bg-slate-100 text-slate-400 border-slate-200',
            heart: 'text-red-500 fill-red-500'
        }
      };
    } else if (theme === 'spring') {
      return {
        ...base,
        wrapper: `bg-green-50 min-h-screen py-8 px-4 bg-[url('https://www.transparenttextures.com/patterns/flowers.png')]`,
        textMain: 'text-pink-700',
        textSec: 'text-green-600',
        card: 'bg-white/90 backdrop-blur-sm border-pink-100 shadow-xl shadow-pink-200/50',
        cardTimeUp: '!border-red-300 ring-4 ring-red-50',
        progressBg: 'bg-green-100',
        progressFill: 'bg-pink-500',
        timerNormal: 'text-pink-600',
        optDefault: 'border-green-100 bg-green-50/50 text-green-800 hover:bg-pink-50 hover:border-pink-200',
        optSelected: 'border-pink-500 bg-pink-50 text-pink-900 ring-pink-500',
        optCorrect: 'border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500',
        optWrong: 'border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500',
        optDimmed: 'opacity-50 grayscale',
        explanationBox: 'bg-pink-50 border-pink-200 text-pink-800',
        hud: {
            container: 'bg-white/90 border border-pink-200 text-pink-800 shadow-lg',
            text: 'text-pink-600',
            button: 'bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700',
            buttonDisabled: 'bg-slate-100 text-slate-400 border-slate-200',
            heart: 'text-red-500 fill-red-500'
        }
      };
    } else {
      // Light
      return {
        ...base,
        wrapper: `bg-slate-50 min-h-screen py-8 px-4`,
        textMain: 'text-slate-800',
        textSec: 'text-slate-500',
        card: 'bg-white border-slate-100 shadow-lg',
        cardTimeUp: '!border-red-300 ring-4 ring-red-50',
        progressBg: 'bg-slate-200',
        progressFill: 'bg-indigo-600',
        timerNormal: 'text-indigo-600',
        optDefault: 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50',
        optSelected: 'border-indigo-600 bg-indigo-50 ring-indigo-600 text-indigo-900',
        optCorrect: 'border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500',
        optWrong: 'border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500',
        optDimmed: 'opacity-50 grayscale',
        explanationBox: 'bg-slate-50 border-slate-200 text-slate-700',
        hud: {
            container: 'bg-white border border-slate-200 text-slate-700 shadow-sm',
            text: 'text-indigo-600',
            button: 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600',
            buttonDisabled: 'bg-slate-50 text-slate-300 border-slate-100',
            heart: 'text-red-500 fill-red-500'
        }
      };
    }
  };

  const styles = getThemeStyles(effectiveTheme, quiz.isTvMode);

  const timePercentage = (timeLeft / timeLimit) * 100;
  let timerColor = styles.timerNormal;
  let barColor = styles.progressFill;
  
  if (timePercentage <= 30) {
    timerColor = 'text-red-500';
    barColor = 'bg-red-500';
  } else if (timePercentage <= 60) {
    timerColor = 'text-amber-500';
    barColor = 'bg-amber-500';
  }

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  
  const isCorrect = question.type === 'MATCHING' 
      ? answers[question.id] === 1 
      : question.type === 'FILL_IN_THE_BLANK'
          ? (answers[question.id] && (question.options?.[0]?.toLowerCase() === answers[question.id].trim().toLowerCase()))
          : selectedOption === question.correctAnswerIndex;

  const isTimeout = isTimeUp && (
      question.type === 'MATCHING' ? answers[question.id] === undefined : 
      question.type === 'FILL_IN_THE_BLANK' ? !isAnswerChecked :
      selectedOption === null
  );
  
  const isSkipped = !isTimeUp && isAnswerChecked && (
      question.type === 'MATCHING' 
          ? answers[question.id] === -1 
          : question.type === 'FILL_IN_THE_BLANK'
              ? answers[question.id] === ''
              : selectedOption === null
  );

  return (
    <div className={`w-full transition-colors duration-500 ${styles.wrapper}`}>
      
      {/* CORTINAS DO MODO TV */}
      {quiz.isTvMode && (
        <>
            <div className={`fixed top-0 bottom-0 left-0 w-[50%] z-[60] transition-transform duration-[1500ms] ease-in-out bg-[#740001] shadow-2xl curtain-pattern border-r-4 border-yellow-600 ${areCurtainsOpen ? '-translate-x-full' : 'translate-x-0'}`}></div>
            <div className={`fixed top-0 bottom-0 right-0 w-[50%] z-[60] transition-transform duration-[1500ms] ease-in-out bg-[#740001] shadow-2xl curtain-pattern border-l-4 border-yellow-600 ${areCurtainsOpen ? 'translate-x-full' : 'translate-x-0'}`}></div>
        </>
      )}

      {/* Controls (Sound) */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {/* Sound Toggle */}
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-full transition-all ${quiz.isTvMode ? 'bg-black/40 text-white hover:bg-black/60' : 'bg-white/80 text-slate-700 hover:bg-white shadow-sm'}`}
          title={soundEnabled ? "Silenciar Efeitos e Música" : "Ativar Efeitos e Música"}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      </div>

      <div className={`max-w-2xl mx-auto w-full ${quiz.isTvMode ? 'max-w-5xl relative z-10 my-auto' : ''}`}>
        
        {/* Arcade/Multiplayer/TV Show/Speed Run HUD */}
        {(quiz.gameMode === 'arcade' || quiz.isMultiplayer || quiz.gameMode === 'tv_show' || quiz.gameMode === 'speed_run') && (
            <div className={`mb-6 flex items-center justify-between p-3 rounded-3xl transition-all ${styles.hud?.container || 'bg-black/20 backdrop-blur-md border border-white/10 text-white'}`}>
                <div className="flex items-center gap-4">
                    {/* Player Name (Multiplayer) */}
                    {quiz.isMultiplayer && (
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold uppercase tracking-wider ${styles.hud?.text || 'text-yellow-400'}`}>
                                {playerNames[currentPlayerIndex]}
                            </span>
                            <div className="h-4 w-px bg-white/20"></div>
                        </div>
                    )}

                    {/* Mode Specifics */}
                    {quiz.gameMode === 'arcade' || quiz.gameMode === 'tv_show' ? (
                        <div className="flex items-center gap-1">
                            {[...Array(3)].map((_, i) => (
                                <Heart key={i} className={`w-6 h-6 ${i < lives ? (styles.hud?.heart || 'text-red-500 fill-red-500') : 'text-slate-600/50'}`} />
                            ))}
                        </div>
                    ) : quiz.gameMode === 'speed_run' ? (
                        <div className="flex items-center gap-2">
                             <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400 animate-pulse" />
                             <span className="font-bold text-yellow-400 uppercase tracking-wider text-sm hidden sm:inline">Speed Run</span>
                        </div>
                    ) : null}
                </div>

                <div className={`font-mono font-bold text-2xl ${styles.hud?.text || 'text-yellow-400'}`}>
                    {quiz.isMultiplayer ? playerScores[currentPlayerIndex].toLocaleString() : score.toLocaleString()}
                </div>
                
                {quiz.gameMode !== 'speed_run' && (
                <div className="flex gap-2">
                    <button 
                        onClick={() => handlePowerUp('eliminate')} 
                        disabled={powerUps.eliminate <= 0 || question.type !== 'MULTIPLE_CHOICE' || isAnswerChecked}
                        className={`p-2 rounded-2xl relative transition-all ${powerUps.eliminate > 0 && question.type === 'MULTIPLE_CHOICE' ? (styles.hud?.button || 'bg-indigo-600 hover:bg-indigo-500') : (styles.hud?.buttonDisabled || 'bg-slate-700 opacity-50')}`}
                        title="50/50"
                    >
                        <Zap className="w-5 h-5" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border border-white font-bold">{powerUps.eliminate}</span>
                    </button>
                    <button 
                        onClick={() => handlePowerUp('timeFreeze')} 
                        disabled={powerUps.timeFreeze <= 0 || isAnswerChecked || isFrozen}
                        className={`p-2 rounded-2xl relative transition-all ${powerUps.timeFreeze > 0 ? (styles.hud?.button || 'bg-sky-600 hover:bg-sky-500') : (styles.hud?.buttonDisabled || 'bg-slate-700 opacity-50')}`}
                        title="Congelar Tempo"
                    >
                        <Hourglass className="w-5 h-5" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border border-white font-bold">{powerUps.timeFreeze}</span>
                    </button>
                    <button 
                        onClick={handleSkip} 
                        disabled={powerUps.skip <= 0 || isAnswerChecked}
                        className={`p-2 rounded-2xl relative transition-all ${powerUps.skip > 0 ? (styles.hud?.button || 'bg-green-600 hover:bg-green-500') : (styles.hud?.buttonDisabled || 'bg-slate-700 opacity-50')}`}
                        title="Pular"
                    >
                        <SkipForward className="w-5 h-5" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border border-white font-bold">{powerUps.skip}</span>
                    </button>
                </div>
                )}
            </div>
        )}

        {/* Overall Quiz Progress Bar OR Arcade Map */}
        {quiz.gameMode === 'arcade' && quiz.arcadeMap ? (
            <div className="w-full mb-6 px-1">
                <div className={`flex justify-between items-center text-xs font-bold mb-2 uppercase tracking-wider ${styles.hud?.text || 'text-white'}`}>
                    <div className="flex items-center gap-2">
                        <span>Mapa: {quiz.arcadeMap.toUpperCase()}</span>
                        {quiz.isStoryMode && (
                            <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] animate-pulse">Modo História</span>
                        )}
                    </div>
                    <span>Nível {currentQuestionIndex + 1}/{totalQuestions}</span>
                </div>
                <div className="relative w-full h-12 bg-black/40 rounded-3xl border-2 border-white/20 overflow-hidden flex items-center px-2">
                    {/* Map Background Style */}
                    <div className={`absolute inset-0 opacity-50 ${
                        quiz.arcadeMap === 'overworld' ? 'bg-gradient-to-b from-sky-400 to-green-500' :
                        quiz.arcadeMap === 'underground' ? 'bg-gradient-to-b from-slate-800 to-amber-900' :
                        quiz.arcadeMap === 'athletic' ? 'bg-gradient-to-b from-sky-300 to-white' :
                        'bg-gradient-to-b from-red-900 to-slate-900'
                    }`} />
                    
                    {/* Progress Steps */}
                    <div className="relative z-10 flex justify-between w-full items-center">
                        {quiz.questions.map((q, idx) => {
                            const isCompleted = idx < currentQuestionIndex;
                            const isCurrent = idx === currentQuestionIndex;
                            
                            // Check correctness for completed questions
                            const userAnswer = answers[q.id];
                            let wasCorrect = false;
                            if (isCompleted) {
                                if (q.type === 'MATCHING') {
                                    wasCorrect = userAnswer === 1;
                                } else if (q.type === 'FILL_IN_THE_BLANK') {
                                    wasCorrect = userAnswer && (q.options?.[0]?.toLowerCase() === userAnswer.trim().toLowerCase());
                                } else {
                                    wasCorrect = userAnswer !== -1 && userAnswer === q.correctAnswerIndex;
                                }
                            }

                            return (
                                <div key={idx} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                                    isCompleted 
                                        ? (wasCorrect ? 'bg-green-500 border-white text-white' : 'bg-red-500 border-white text-white') 
                                        : isCurrent ? 'bg-yellow-400 border-white scale-125 shadow-lg animate-bounce' :
                                    'bg-black/50 border-white/30 text-white/30'
                                }`}>
                                    {isCompleted ? (
                                        wasCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />
                                    ) : <span className="text-[10px] font-bold">{idx + 1}</span>}
                                </div>
                            );
                        })}
                        {/* Flag/Goal */}
                        <div className={`w-8 h-8 flex items-center justify-center ${currentQuestionIndex === totalQuestions ? 'text-yellow-400 scale-125' : 'text-white/50'}`}>
                            <Trophy className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="w-full mb-6 px-1">
          <div className={`flex justify-between text-xs font-bold mb-2 uppercase tracking-wider ${
            quiz.isTvMode ? 'text-yellow-400/80' : 
            (quiz.theme === 'dark' ? 'text-slate-400' : 
            (quiz.theme === 'vibrant' ? 'text-white/80' : 
            (quiz.theme === 'neon' ? 'text-cyan-400/80' : 
            (quiz.theme === 'retro' ? 'text-amber-900/60' : 
            (quiz.theme === 'summer' ? 'text-orange-600/80' : 
            (quiz.theme === 'autumn' ? 'text-red-800/70' : 
            (quiz.theme === 'winter' ? 'text-sky-700/80' : 
            (quiz.theme === 'spring' ? 'text-pink-600/80' : 'text-slate-500'))))))))
          }`}>
            <span>Progresso do Quiz</span>
            <span>{currentQuestionIndex + 1} de {totalQuestions}</span>
          </div>
          <div className={`w-full h-3 rounded-full overflow-hidden ${
            quiz.isTvMode ? 'bg-black/60 border border-white/10' : 
            (quiz.theme === 'dark' ? 'bg-slate-800' : 
            (quiz.theme === 'vibrant' ? 'bg-black/20' : 
            (quiz.theme === 'neon' ? 'bg-gray-900 border border-cyan-900' : 
            (quiz.theme === 'retro' ? 'bg-amber-200/50 border border-amber-900/10' : 
            (quiz.theme === 'summer' ? 'bg-orange-200/50' : 
            (quiz.theme === 'autumn' ? 'bg-orange-200/50' : 
            (quiz.theme === 'winter' ? 'bg-sky-200/50' : 
            (quiz.theme === 'spring' ? 'bg-green-200/50' : 'bg-slate-200'))))))))
          }`}>
            <div 
              className={`h-full transition-all duration-700 ease-out rounded-full ${
                quiz.isTvMode 
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                  : (quiz.theme === 'vibrant' ? 'bg-white shadow-sm' : 
                    (quiz.theme === 'neon' ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 
                    (quiz.theme === 'retro' ? 'bg-amber-600' : 
                    (quiz.theme === 'summer' ? 'bg-orange-500' : 
                    (quiz.theme === 'autumn' ? 'bg-red-700' : 
                    (quiz.theme === 'winter' ? 'bg-sky-600' : 
                    (quiz.theme === 'spring' ? 'bg-pink-500' : 'bg-indigo-600')))))))
              }`}
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      )}

        {/* Header Info */}
        <div className="flex items-center justify-between mb-4">
          <span className={`${styles.textSec} text-xs sm:text-sm font-medium uppercase tracking-wider truncate mr-4`}>
             {quiz.topic}
          </span>
          <span className={`flex items-center gap-2 font-mono font-bold text-xl sm:text-2xl ${timerColor} transition-colors flex-shrink-0 ${isFrozen ? 'animate-pulse text-blue-400' : ''}`}>
            {isFrozen ? <Hourglass className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
            {timeLeft}s
          </span>
        </div>

        {/* Timer Bar */}
        <div className={`w-full ${styles.progressBg} rounded-full h-2 mb-6 sm:mb-8 overflow-hidden`}>
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`}
            style={{ width: `${timePercentage}%` }}
          />
        </div>

        {/* Card */}
        <div className={`${styles.card} ${isTimeout ? styles.cardTimeUp : ''} rounded-[2.5rem] p-4 sm:p-6 md:p-10 relative overflow-hidden transition-all duration-300 flex flex-col`}>
          
          <div className={`transition-all duration-300 ease-in-out transform w-full flex flex-col ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <h2 className={`${styles.title} font-bold ${styles.textMain} mb-2 leading-relaxed`}>
                {question.text}
            </h2>
            {question.type === 'MATCHING' && !isAnswerChecked && (
                <p className={`${styles.textSec} text-sm mb-6 italic`}>
                    Selecione um item da esquerda e depois o seu par correspondente na direita.
                </p>
            )}

            {/* Render based on Question Type */}
            {question.type === 'MATCHING' ? (
                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                    <div className="space-y-3">
                        {question.pairs?.map((pair, idx) => {
                            const isMatched = matchedPairs.includes(pair.left);
                            const isSelected = matchingLeft === pair.left;
                            return (
                                <button
                                  key={`left-${idx}`}
                                  onClick={() => handleMatchingSelect(pair.left, 'left')}
                                  disabled={isMatched || isAnswerChecked}
                                  className={`w-full p-4 rounded-3xl text-left transition-all border-2 ${
                                      isMatched ? 'opacity-0 pointer-events-none' : 
                                      isSelected ? 'border-indigo-500 bg-indigo-100 text-indigo-900' : 
                                      styles.optDefault
                                  }`}
                                >
                                    {pair.left}
                                </button>
                            );
                        })}
                    </div>
                    <div className="space-y-3">
                        {shuffledRightOptions.map((text, idx) => {
                            const originalLeft = rightOptionMap[text];
                            const isMatched = matchedPairs.includes(originalLeft);
                            return (
                              <button
                                  key={`right-${idx}`}
                                  onClick={() => handleMatchingSelect(text, 'right')}
                                  disabled={isMatched || isAnswerChecked}
                                  className={`w-full p-4 rounded-3xl text-left transition-all border-2 ${
                                      isMatched ? 'opacity-0 pointer-events-none' : 
                                      styles.optDefault
                                  }`}
                                >
                                    {text}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : question.type === 'FILL_IN_THE_BLANK' ? (
                <div className="w-full">
                    <input
                        type="text"
                        value={fillInBlankAnswer}
                        onChange={(e) => setFillInBlankAnswer(e.target.value)}
                        disabled={isAnswerChecked || isTimeUp}
                        placeholder="Digite sua resposta..."
                        className={`w-full p-4 rounded-3xl border-2 text-lg outline-none transition-all ${
                            isAnswerChecked
                                ? isCorrect
                                    ? 'border-green-500 bg-green-50 text-green-900'
                                    : 'border-red-500 bg-red-50 text-red-900'
                                : 'border-slate-300 focus:border-indigo-500'
                        }`}
                    />
                    {isAnswerChecked && !isCorrect && (
                        <p className="mt-2 text-sm text-red-600 font-bold">
                            Resposta correta: {question.options?.[0]}
                        </p>
                    )}
                </div>
            ) : (
                <div className={`grid ${quiz.isTvMode ? 'grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6' : 'grid-cols-1 gap-3'}`}>
                    {question.options?.map((option, index) => {
                    if (eliminatedOptions.includes(index)) {
                        return <div key={index} className="opacity-0 pointer-events-none" aria-hidden="true"></div>;
                    }

                    const isSelected = selectedOption === index;
                    const isTargetCorrect = index === question.correctAnswerIndex;
                    
                    let optionStyle = styles.optDefault;
                    let icon = null;

                    if (isAnswerChecked) {
                        if (isTargetCorrect) {
                        optionStyle = styles.optCorrect;
                        icon = <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />;
                        } else if (isSelected && !isTargetCorrect) {
                        optionStyle = styles.optWrong;
                        icon = <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />;
                        } else {
                        optionStyle = styles.optDimmed;
                        }
                    } else if (isSelected) {
                        optionStyle = styles.optSelected;
                    } else if (isTimeUp) {
                        optionStyle = styles.optDimmed;
                    }

                    return (
                        <button
                        key={index}
                        onClick={() => handleOptionSelect(index)}
                        disabled={isAnswerChecked || isTimeUp || isTransitioning}
                        className={`w-full text-left p-4 sm:p-6 rounded-[2rem] transition-all duration-200 flex items-center group relative
                            ${(isAnswerChecked || isTimeUp || isTransitioning) ? 'cursor-default' : 'cursor-pointer'}
                            ${optionStyle}
                        `}
                        >
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0 transition-colors ${
                            isSelected || (isAnswerChecked && isTargetCorrect)
                                ? 'border-current bg-current/10' 
                                : 'border-current opacity-50'
                        }`}>
                            {icon ? icon : (isSelected && <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-current`} />)}
                        </div>
                        <span className={`${styles.optionText} font-medium`}>
                            {option}
                        </span>
                        </button>
                    );
                    })}
                </div>
            )}

            {(isAnswerChecked || isTimeUp) && (
                <div className={`mt-6 sm:mt-8 p-4 sm:p-6 rounded-[2rem] border animate-feedback ${styles.explanationBox}`}>
                <div className="flex items-start gap-3">
                    <div className={`mt-1 p-2 rounded-full flex-shrink-0 ${
                        isSkipped 
                            ? 'bg-slate-100 text-slate-600'
                            : isCorrect 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-red-100 text-red-600'
                    }`}>
                        {isSkipped ? (
                            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : isTimeUp && selectedOption === null ? (
                            <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className={`font-bold text-base sm:text-lg mb-1 ${quiz.isTvMode ? 'text-white' : (quiz.theme === 'light' ? 'text-slate-800' : 'text-white')}`}>
                            {isSkipped 
                                ? "Questão Pulada" 
                                : (isTimeUp && selectedOption === null ? "Tempo Esgotado!" : (isCorrect ? "Correto!" : "Incorreto!"))}
                        </h4>
                        
                        <p className={`text-sm sm:text-base leading-relaxed opacity-90 break-words`}>
                            {question.explanation}
                        </p>
                    </div>
                </div>
                </div>
            )}

            <div className="mt-6 sm:mt-10 flex justify-end items-center gap-4">
                {/* Skip Button - Visible in both modes if not answered yet */}
                {!isAnswerChecked && !isTimeUp && (
                   <Button
                      variant="ghost"
                      onClick={handleSkip}
                      disabled={(quiz.gameMode === 'multiplayer' || quiz.gameMode === 'arcade') && powerUps.skip <= 0}
                      className={quiz.isTvMode ? 'text-white/70 hover:text-white hover:bg-white/10' : ''}
                      icon={<SkipForward className="w-4 h-4" />}
                   >
                     {(quiz.gameMode === 'multiplayer' || quiz.gameMode === 'arcade') ? `Pular (${powerUps.skip})` : 'Pular'}
                   </Button>
                )}

                {question.type !== 'MATCHING' && (
                    <Button
                    onClick={handleConfirm}
                    disabled={(!isAnswerChecked && (question.type === 'FILL_IN_THE_BLANK' ? fillInBlankAnswer.trim() === '' : selectedOption === null)) || isTransitioning}
                    icon={isAnswerChecked && isLastQuestion ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6"/> : undefined}
                    variant={quiz.isTvMode || quiz.theme === 'vibrant' ? 'outline' : "primary"}
                    className={quiz.isTvMode ? 'text-lg sm:text-xl py-3 sm:py-4 px-6 sm:px-8 font-bold border-2 w-full sm:w-auto' : 'w-full sm:w-auto'}
                    style={quiz.isTvMode ? { 
                        color: '#FEF08A', 
                        borderColor: '#FEF08A', 
                        backgroundColor: 'rgba(0,0,0,0.4)', 
                        boxShadow: '0 0 15px rgba(254, 240, 138, 0.2)'
                    } : (quiz.theme === 'vibrant' ? { color: 'white', borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.2)' } : {})}
                    >
                    {!isAnswerChecked ? (
                        <span className="flex items-center justify-center">
                        Confirmar
                        </span>
                    ) : (
                        <span className="flex items-center justify-center">
                        {isLastQuestion ? 'Ver Resultados' : 'Próxima Questão'} <ChevronRight className={`ml-1 ${quiz.isTvMode ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4 h-4'}`} />
                        </span>
                    )}
                    </Button>
                )}
                
                {/* For Matching, we auto-confirm when done, but need a next button after feedback */}
                {question.type === 'MATCHING' && isAnswerChecked && (
                     <Button
                     onClick={handleNextQuestion}
                     disabled={isTransitioning}
                     variant={quiz.isTvMode || quiz.theme === 'vibrant' ? 'outline' : "primary"}
                     className={quiz.isTvMode ? 'text-lg sm:text-xl py-3 sm:py-4 px-6 sm:px-8 font-bold border-2 w-full sm:w-auto' : 'w-full sm:w-auto'}
                     style={quiz.isTvMode ? { 
                         color: '#FEF08A', 
                         borderColor: '#FEF08A', 
                         backgroundColor: 'rgba(0,0,0,0.4)', 
                         boxShadow: '0 0 15px rgba(254, 240, 138, 0.2)'
                     } : (quiz.theme === 'vibrant' ? { color: 'white', borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.2)' } : {})}
                     >
                         <span className="flex items-center justify-center">
                         {isLastQuestion ? 'Ver Resultados' : 'Próxima Questão'} <ChevronRight className={`ml-1 ${quiz.isTvMode ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4 h-4'}`} />
                         </span>
                     </Button>
                )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes feedback-enter {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          50% { opacity: 1; transform: scale(1.03) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-feedback {
          animation: feedback-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        /* TV SHOW STAGE CURTAIN EFFECT */
        .tv-stage-bg {
            background-color: #000;
            background-image: 
                radial-gradient(circle at 50% 30%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 80%),
                repeating-linear-gradient(90deg, #600000 0px, #800000 40px, #4a0000 80px);
            box-shadow: inset 0 0 100px #000;
        }
        .curtain-pattern {
             background-image: repeating-linear-gradient(90deg, transparent 0px, rgba(0,0,0,0.3) 20px, transparent 40px);
        }
      `}</style>
    </div>
  );
};