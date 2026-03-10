import React, { useState, useEffect } from 'react';
import { AppState, QuizConfig, QuizData, UserAnswers, ArcadeMap, EssayEvaluation } from './types';
import { QuizSetup } from './components/QuizSetup';
import { HomePage } from './components/HomePage';
import { QuizCreator } from './components/QuizCreator';
import { QuizGame } from './components/QuizGame';
import { QuizResults } from './components/QuizResults';
import { LoadingScreen } from './components/LoadingScreen';
import { Cutscene } from './components/Cutscene';
import { generateQuiz } from './services/geminiService';
import { AlertCircle, LogIn, LogOut } from 'lucide-react';
import { Button } from './components/Button';
import { Chatbot } from './components/Chatbot';
import { auth, signInWithGoogle, logout } from './firebase';

import { EssayTemplateGenerator } from './components/EssayTemplateGenerator';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('HOME');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [score, setScore] = useState<number | number[] | undefined>(undefined);
  const [essayEvaluations, setEssayEvaluations] = useState<Record<number, EssayEvaluation>>({});
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              createdAt: serverTimestamp()
            });
          } else {
            // Update only allowed fields
            await setDoc(userRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              createdAt: userSnap.data().createdAt
            }, { merge: true });
          }
        } catch (error) {
          console.error("Error saving user profile:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Story Mode State
  const [storyWorldIndex, setStoryWorldIndex] = useState(0);
  const [originalConfig, setOriginalConfig] = useState<QuizConfig | null>(null);
  const [passedStoryLevel, setPassedStoryLevel] = useState(false);
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

  const handleQuizComplete = async (answers: UserAnswers, finalScore?: number | number[], evaluations?: Record<number, EssayEvaluation>) => {
    setUserAnswers(answers);
    setScore(finalScore);
    if (evaluations) setEssayEvaluations(evaluations);

    if (quizData?.isStoryMode && typeof finalScore === 'number') {
        const maxScore = quizData.questions.length * 100; 
        const percentage = (finalScore / maxScore) * 100;
        
        if (percentage >= 50 && storyWorldIndex < worlds.length - 1) {
            setPassedStoryLevel(true);
        } else {
            setPassedStoryLevel(false);
        }
    } else {
        setPassedStoryLevel(false);
    }

    if (user && quizData && typeof finalScore === 'number') {
      try {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        await addDoc(collection(db, 'quizResults'), {
          userId: user.uid,
          topic: quizData.topic || quizData.title,
          score: finalScore,
          totalQuestions: quizData.questions.length,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error saving quiz result:", error);
      }
    }

    setAppState('RESULTS');
  };

  const handleNextLevel = async () => {
      if (!originalConfig) return;
      
      const nextIndex = storyWorldIndex + 1;
      setStoryWorldIndex(nextIndex);
      setAppState('LOADING');
      setPassedStoryLevel(false);
      setUserAnswers({});
      setScore(undefined);
      
      try {
          const nextConfig = { ...originalConfig, arcadeMap: worlds[nextIndex] };
          const data = await generateQuiz(nextConfig);
          setQuizData(data);
          
          if (data.storyNarrative) {
              setAppState('CUTSCENE');
          } else {
              setAppState('QUIZ');
          }
      } catch (err: any) {
          setError("Erro ao carregar próximo mundo.");
          setAppState('ERROR');
      }
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
      {/* Auth Header */}
      <div className="w-full max-w-4xl flex justify-end mb-4">
        {user ? (
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{user.displayName || user.email}</span>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-red-500 transition-colors p-1" title="Sair">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Button onClick={signInWithGoogle} variant="outline" className="bg-white" icon={<LogIn className="w-4 h-4" />}>
            Entrar com Google
          </Button>
        )}
      </div>

      <main className="w-full max-w-4xl flex-1 flex flex-col justify-center">
        
        {appState === 'HOME' && (
          <HomePage 
            onStart={() => setAppState('SETUP')} 
            onCreate={handleCreateQuiz} 
            onEssayGenerator={() => setAppState('ESSAY_GENERATOR')}
          />
        )}

        {appState === 'SETUP' && (
          <QuizSetup onStart={handleStartQuiz} isGenerating={false} />
        )}

        {appState === 'CREATING' && (
          <QuizCreator onSave={handleSaveCreatedQuiz} onCancel={() => setAppState('HOME')} />
        )}

        {appState === 'ESSAY_GENERATOR' && (
            <EssayTemplateGenerator onBack={() => setAppState('HOME')} />
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
            essayEvaluations={essayEvaluations}
            onNextLevel={passedStoryLevel ? handleNextLevel : undefined}
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

      {/* Chatbot Widget */}
      <Chatbot />
    </div>
  );
};

export default App;