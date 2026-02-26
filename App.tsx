import React, { useState } from 'react';
import { AppState, QuizConfig, QuizData, UserAnswers, ArcadeMap } from './types';
import { QuizSetup } from './components/QuizSetup';
import { HomePage } from './components/HomePage';
import { QuizCreator } from './components/QuizCreator';
import { QuizGame } from './components/QuizGame';
import { QuizResults } from './components/QuizResults';
import { LoadingScreen } from './components/LoadingScreen';
import { Cutscene } from './components/Cutscene';
import { generateQuiz } from './services/geminiService';
import { AlertCircle } from 'lucide-react';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('HOME');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [score, setScore] = useState<number | number[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string>('');

  // Story Mode State
  const [storyWorldIndex, setStoryWorldIndex] = useState(0);
  const [originalConfig, setOriginalConfig] = useState<QuizConfig | null>(null);
  const worlds: ArcadeMap[] = ['overworld', 'underground', 'athletic', 'boss'];

  const handleStartQuiz = async (config: QuizConfig) => {
    setCurrentTopic(config.topic);
    setAppState('LOADING');
    setError(null);
    setScore(undefined);
    
    if (config.isStoryMode) {
        setOriginalConfig(config);
        setStoryWorldIndex(0);
        // Ensure starting world is overworld
        config.arcadeMap = 'overworld';
    }

    try {
      const data = await generateQuiz(config);
      setQuizData(data);
      
      if (data.isStoryMode && data.storyNarrative) {
          setAppState('CUTSCENE');
      } else {
          setAppState('QUIZ');
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao gerar o quiz. Tente novamente.");
      setAppState('ERROR');
    }
  };

  const handleCreateQuiz = () => {
    setAppState('CREATING');
  };

  const handleSaveCreatedQuiz = (data: QuizData) => {
    setQuizData(data);
    setAppState('QUIZ');
  };

  const handleQuizComplete = async (answers: UserAnswers, finalScore?: number | number[]) => {
    setUserAnswers(answers);
    setScore(finalScore);

    if (quizData?.isStoryMode && typeof finalScore === 'number') {
        // Calculate max score based on question types
        // Simple approximation: 100 per question
        const maxScore = quizData.questions.length * 100; 
        const percentage = (finalScore / maxScore) * 100;

        // Logic: 
        // If >= 50% -> Advance to next world
        // If < 50% -> Stay on same world (retry) or go back?
        // Let's make it simpler: >= 50% advances, < 50% retries same level
        
        if (percentage >= 50) {
            if (storyWorldIndex < worlds.length - 1) {
                const nextIndex = storyWorldIndex + 1;
                setStoryWorldIndex(nextIndex);
                setAppState('LOADING');
                
                try {
                    const nextConfig = { ...originalConfig!, arcadeMap: worlds[nextIndex] };
                    const data = await generateQuiz(nextConfig);
                    setQuizData(data);
                    
                    if (data.storyNarrative) {
                        setAppState('CUTSCENE');
                    } else {
                        setAppState('QUIZ');
                    }
                    return; 
                } catch (err: any) {
                    setError("Erro ao carregar próximo mundo.");
                    setAppState('ERROR');
                    return;
                }
            }
        } else {
            // Retry same level
            setAppState('RESULTS'); 
            // We show results so they know they failed, then they can click "Retry" which calls handleRetry
            // But handleRetry just resets state to QUIZ.
            // For story mode, we might want to regenerate to avoid same questions?
            // For now, let's keep simple retry.
            return;
        }
    }

    setAppState('RESULTS');
  };

  const handleRetry = () => {
    setUserAnswers({});
    setScore(undefined);
    setAppState('QUIZ');
  };

  const handleHome = () => {
    setQuizData(null);
    setUserAnswers({});
    setScore(undefined);
    setAppState('HOME');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <main className="w-full max-w-4xl flex-1 flex flex-col justify-center">
        
        {appState === 'HOME' && (
          <HomePage onStart={() => setAppState('SETUP')} onCreate={handleCreateQuiz} />
        )}

        {appState === 'SETUP' && (
          <QuizSetup onStart={handleStartQuiz} isGenerating={appState === 'LOADING'} />
        )}

        {appState === 'CREATING' && (
          <QuizCreator onSave={handleSaveCreatedQuiz} onCancel={() => setAppState('HOME')} />
        )}

        {appState === 'LOADING' && (
          <LoadingScreen topic={currentTopic} />
        )}

        {appState === 'CUTSCENE' && quizData && quizData.storyNarrative && (
          <Cutscene 
            narrative={quizData.storyNarrative} 
            world={quizData.arcadeMap || 'overworld'} 
            onContinue={() => setAppState('QUIZ')} 
          />
        )}

        {appState === 'QUIZ' && quizData && (
          <QuizGame quiz={quizData} onComplete={handleQuizComplete} />
        )}

        {appState === 'RESULTS' && quizData && (
          <QuizResults 
            quiz={quizData} 
            answers={userAnswers} 
            onRetry={handleRetry} 
            onHome={handleHome} 
            score={score}
          />
        )}

        {appState === 'ERROR' && (
          <div className="max-w-md mx-auto w-full bg-white p-8 rounded-2xl shadow-xl text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Ops! Algo deu errado.</h2>
            <p className="text-slate-500 mb-6">{error}</p>
            <Button onClick={handleHome} fullWidth>
              Tentar Novamente
            </Button>
          </div>
        )}
      </main>
      
      <footer className="mt-8 text-center text-slate-400 text-sm relative z-0">
        <p>QuizGen AI &copy; {new Date().getFullYear()} • Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;