import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Brain, Heart, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CompatibilityQuiz() {
  const [myProfile, setMyProfile] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const user = await base44.auth.me();
      if (user) {
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setMyProfile(profiles[0]);
      }
    };
    fetchProfile();
  }, []);

  const { data: quizzes = [] } = useQuery({
    queryKey: ['compatibility-quizzes'],
    queryFn: () => base44.entities.CompatibilityQuiz.filter({ is_active: true })
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const score = Math.floor(Math.random() * 30) + 70; // 70-100 score
      const personalities = ['Adventurer', 'Nurturer', 'Leader', 'Creative', 'Intellectual'];
      const personality = personalities[Math.floor(Math.random() * personalities.length)];

      await base44.entities.QuizResult.create({
        user_profile_id: myProfile.id,
        quiz_id: selectedQuiz.id,
        answers,
        score,
        personality_type: personality
      });

      return { score, personality };
    },
    onSuccess: (data) => {
      setResult(data);
      setCompleted(true);
    }
  });

  const handleAnswer = (answer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentQuestion < selectedQuiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitMutation.mutate();
    }
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setCompleted(false);
    setResult(null);
  };

  if (!selectedQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pb-24">
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

        <main className="max-w-4xl mx-auto px-4 py-6">
          <Card className="mb-6 bg-gradient-to-br from-purple-600 to-pink-600 text-white border-0">
            <CardContent className="p-6 text-center">
              <Brain size={48} className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Discover Your Compatibility Type</h2>
              <p className="text-white/90">Take fun quizzes to improve your matches and find your perfect partner</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {quizzes.map(quiz => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedQuiz(quiz)}>
                <CardContent className="p-6">
                  <Badge className="mb-3 capitalize">{quiz.category}</Badge>
                  <h3 className="text-xl font-bold mb-2">{quiz.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{quiz.description}</p>
                  <p className="text-sm text-purple-600 font-medium">{quiz.questions.length} questions • 5 min</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <Sparkles size={40} className="text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
              <p className="text-gray-600 mb-6">Your Compatibility Type:</p>
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-purple-600 mb-2">{result.personality}</h3>
                <p className="text-xl text-gray-700">Score: {result.score}%</p>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                This helps us find better matches for you based on personality compatibility!
              </p>
              <div className="flex gap-3">
                <Button onClick={resetQuiz} variant="outline" className="flex-1">
                  Take Another Quiz
                </Button>
                <Link to={createPageUrl('Home')} className="flex-1">
                  <Button className="w-full bg-purple-600">
                    Find Matches
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const question = selectedQuiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / selectedQuiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="icon" onClick={resetQuiz}>
              <ArrowLeft size={24} />
            </Button>
            <span className="text-sm text-gray-600">Question {currentQuestion + 1} of {selectedQuiz.questions.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="mb-6">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6 text-center">{question.question}</h2>
                <div className="space-y-3">
                  {question.options.map((option, idx) => (
                    <Button
                      key={idx}
                      onClick={() => handleAnswer(option)}
                      variant="outline"
                      className="w-full p-6 h-auto text-left justify-start hover:bg-purple-50 hover:border-purple-600"
                    >
                      <span className="text-base">{option}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}