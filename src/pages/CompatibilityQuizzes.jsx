import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Play, Sparkles, CheckCircle2, Award } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import AfricanPattern from '@/components/shared/AfricanPattern';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

export default function CompatibilityQuizzes() {
  const [myProfile, setMyProfile] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    };
    fetchProfile();
  }, []);

  const { data: quizzes, isLoading: loadingQuizzes } = useQuery({
    queryKey: ['compatibility-quizzes'],
    queryFn: () => base44.entities.CompatibilityQuiz.filter({ is_active: true }),
    staleTime: 300000,
    retry: 1
  });

  const { data: myQuizResults, isLoading: loadingResults } = useQuery({
    queryKey: ['my-quiz-results', myProfile?.id],
    queryFn: () => myProfile ? base44.entities.QuizResult.filter({ user_profile_id: myProfile.id }) : [],
    enabled: !!myProfile,
    staleTime: 300000,
    retry: 1
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (resultData) => {
      await base44.entities.QuizResult.create(resultData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-quiz-results']);
    }
  });

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResult(false);
  };

  const handleAnswer = (optionIndex) => {
    const newAnswers = [...selectedAnswers, { question_index: currentQuestionIndex, selected_option_index: optionIndex }];
    setSelectedAnswers(newAnswers);
    
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      calculateResult(newAnswers);
    }
  };

  const calculateResult = (answers) => {
    const compatibilityScores = {};
    activeQuiz.compatibility_types.forEach(type => compatibilityScores[type.type_name] = 0);

    answers.forEach(answer => {
      const question = activeQuiz.questions[answer.question_index];
      const selectedOption = question.options[answer.selected_option_index];
      
      for (const type in selectedOption.score_modifier) {
        if (compatibilityScores.hasOwnProperty(type)) {
          compatibilityScores[type] += selectedOption.score_modifier[type];
        }
      }
    });

    let dominantType = '';
    let maxScore = -Infinity;

    for (const type in compatibilityScores) {
      if (compatibilityScores[type] > maxScore) {
        maxScore = compatibilityScores[type];
        dominantType = type;
      }
    }

    const resultData = {
      quiz_id: activeQuiz.id,
      user_profile_id: myProfile.id,
      answers: answers,
      compatibility_score: compatibilityScores,
      result_type: dominantType
    };
    submitQuizMutation.mutate(resultData);
    setShowResult(true);
  };

  const getResultDescription = (quizId) => {
    const result = myQuizResults?.find(r => r.quiz_id === quizId);
    if (!result) return null;
    const type = activeQuiz?.compatibility_types.find(t => t.type_name === result.result_type);
    return type?.description;
  };

  const currentQuestion = activeQuiz?.questions[currentQuestionIndex];
  const progress = activeQuiz ? ((currentQuestionIndex / activeQuiz.questions.length) * 100) : 0;
  const userHasResultForQuiz = (quizId) => myQuizResults?.some(r => r.quiz_id === quizId);
  const quizResultForActiveQuiz = myQuizResults?.find(r => r.quiz_id === activeQuiz?.id);

  if (loadingQuizzes || loadingResults) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 relative pb-24">
      <AfricanPattern className="text-purple-600" opacity={0.03} />

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Compatibility Quizzes</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Discover Your Compatibility Type</h2>
        <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          Take fun quizzes to improve your matches and find your perfect partner. Your results help us connect you with people who truly understand you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes?.map(quiz => (
            <Card key={quiz.id} className="bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <img src={quiz.image_url || 'https://images.unsplash.com/photo-1517457210338-f00f72676767?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'} alt={quiz.title} className="rounded-lg mb-4 object-cover h-40 w-full" />
                <CardTitle className="text-xl font-bold text-gray-800">{quiz.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {userHasResultForQuiz(quiz.id) && quizResultForActiveQuiz?.quiz_id === quiz.id ? (
                  <div className="text-center mb-4">
                    <p className="text-purple-600 font-semibold">Your Type: {quizResultForActiveQuiz.result_type}</p>
                  </div>
                ) : null}

                {userHasResultForQuiz(quiz.id) ? (
                  <Button variant="outline" className="w-full" onClick={() => startQuiz(quiz)}>
                    <CheckCircle2 size={18} className="mr-2 text-green-600" />
                    View Result / Retake
                  </Button>
                ) : (
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => startQuiz(quiz)}>
                    <Play size={18} className="mr-2" />
                    Start Quiz
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={!!activeQuiz} onOpenChange={() => setActiveQuiz(null)}>
        <DialogContent className="max-w-2xl p-6 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">{activeQuiz?.title}</DialogTitle>
          </DialogHeader>

          {!showResult ? (
            <div className="space-y-6">
              <Progress value={progress} className="w-full" />
              <h3 className="text-xl font-semibold text-gray-700">{currentQuestion?.question_text}</h3>
              <div className="space-y-3">
                {currentQuestion?.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start py-6 text-base border-gray-300 hover:bg-purple-50 hover:border-purple-600"
                    onClick={() => handleAnswer(index)}
                  >
                    {option.option_text}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center p-4">
              <Award size={64} className="mx-auto text-amber-500 mb-4" />
              <h3 className="text-3xl font-bold text-gray-800 mb-2">Your Compatibility Result:</h3>
              <p className="text-purple-600 text-xl font-semibold mb-4">{quizResultForActiveQuiz?.result_type}</p>
              <p className="text-gray-700 mb-6">{getResultDescription(activeQuiz.id)}</p>
              <Button onClick={() => setActiveQuiz(null)} className="bg-purple-600 hover:bg-purple-700">
                Back to Quizzes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}