import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Gift, Clock, HandMetal, MessageCircle, 
  ChevronRight, RefreshCw, Share2, ArrowLeft,
  Check, Info
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const QUESTIONS = [
  // Words of Affirmation
  { text: "I feel loved when my partner tells me how much they appreciate me.", type: "Words" },
  { text: "Hearing 'I love you' is very important to me.", type: "Words" },
  { text: "I like receiving random texts or notes of affection.", type: "Words" },
  { text: "Insults can be particularly hurtful to me and leave a lasting mark.", type: "Words" },
  
  // Acts of Service
  { text: "I feel loved when my partner helps me with chores or tasks.", type: "Acts" },
  { text: "Actions speak louder than words for me.", type: "Acts" },
  { text: "I appreciate it when my partner anticipates my needs and acts on them.", type: "Acts" },
  { text: "It means a lot when my partner goes out of their way to make my life easier.", type: "Acts" },

  // Receiving Gifts
  { text: "I feel loved when I receive a thoughtful gift.", type: "Gifts" },
  { text: "I treasure gifts as physical symbols of love.", type: "Gifts" },
  { text: "I remember special occasions and expect my partner to do the same.", type: "Gifts" },
  { text: "Receiving a gift makes me feel special and prioritized.", type: "Gifts" },

  // Quality Time
  { text: "I feel loved when we spend uninterrupted time together.", type: "Time" },
  { text: "I value deep conversations and undivided attention.", type: "Time" },
  { text: "It hurts me when my partner is distracted (e.g., on their phone) while we're together.", type: "Time" },
  { text: "Shared activities and experiences are very meaningful to me.", type: "Time" },

  // Physical Touch
  { text: "I feel loved when my partner holds my hand or hugs me.", type: "Touch" },
  { text: "Physical intimacy is a crucial part of my relationship.", type: "Touch" },
  { text: "I like sitting close to my partner.", type: "Touch" },
  { text: "A touch on the arm or back makes me feel connected.", type: "Touch" }
];

const EXPLANATIONS = {
  Words: {
    title: "Words of Affirmation",
    icon: MessageCircle,
    color: "#8884d8",
    description: "You feel most loved when your partner verbally expresses their affection and appreciation. Compliments, encouraging words, and frequent 'I love you's' make you feel secure and valued.",
    tips: "Send a sweet good morning text, leave a sticky note on the mirror, or give a genuine compliment about their appearance or achievements."
  },
  Acts: {
    title: "Acts of Service",
    icon: HandMetal,
    color: "#82ca9d",
    description: "For you, actions truly speak louder than words. You feel loved when your partner helps you out, whether it's doing the dishes, running an errand, or fixing something around the house.",
    tips: "Ask 'How can I help you today?', take over a chore they dislike, or surprise them by fixing a problem they've been stressing about."
  },
  Gifts: {
    title: "Receiving Gifts",
    icon: Gift,
    color: "#ffc658",
    description: "You value gifts as tangible symbols of love and thoughtfulness. It's not about the price tag, but the meaning and effort behind the gesture.",
    tips: "Bring home their favorite snack, make a handmade card, or give a thoughtful gift on a random day just because."
  },
  Time: {
    title: "Quality Time",
    icon: Clock,
    color: "#ff8042",
    description: "You feel most loved when you have your partner's undivided attention. No phones, no distractions—just the two of you connecting and sharing experiences.",
    tips: "Plan a date night, go for a walk together without phones, or simply sit and talk about your day for 20 minutes."
  },
  Touch: {
    title: "Physical Touch",
    icon: Heart,
    color: "#ffbb28",
    description: "Physical contact is your primary love language. Hugs, holding hands, cuddles, and intimacy are essential for you to feel grounded and loved in a relationship.",
    tips: "Offer a back rub, hold hands while walking, give a long hug when saying goodbye, or cuddle while watching a movie."
  }
};

export default function LoveLanguageTest({ isOpen, onClose }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({}); // { 0: 5, 1: 3, ... }
  const [showResults, setShowResults] = useState(false);
  
  const handleAnswer = (value) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: value }));
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const calculateResults = () => {
    const scores = { Words: 0, Acts: 0, Gifts: 0, Time: 0, Touch: 0 };
    QUESTIONS.forEach((q, idx) => {
      const score = answers[idx] || 0;
      scores[q.type] += score;
    });
    return scores;
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  const scores = showResults ? calculateResults() : {};
  const sortedScores = showResults ? Object.entries(scores).sort((a, b) => b[1] - a[1]) : [];
  const topLanguage = showResults ? sortedScores[0][0] : null;

  const chartData = showResults ? Object.keys(scores).map(key => ({
    name: EXPLANATIONS[key].title,
    score: scores[key],
    key: key
  })) : [];

  const handleShare = async () => {
    const text = `I just took the Love Language Test on Afrinnect! My primary love language is ${EXPLANATIONS[topLanguage].title}. Find out yours!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Love Language Result',
          text: text,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Result copied to clipboard!');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-white rounded-2xl">
        {!showResults ? (
          <div className="p-6 md:p-10">
            <div className="flex justify-between items-center mb-6">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft size={24} />
              </Button>
              <h2 className="text-xl font-bold text-gray-800">Love Language Test</h2>
              <div className="w-10" />
            </div>

            <Progress value={((currentQuestion) / QUESTIONS.length) * 100} className="h-2 mb-8" />

            <div className="max-w-2xl mx-auto text-center min-h-[300px] flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">
                {QUESTIONS[currentQuestion].text}
              </h3>

              <div className="grid gap-3">
                {[
                  { label: "Strongly Agree", value: 5, color: "bg-green-100 hover:bg-green-200 text-green-800 border-green-200" },
                  { label: "Agree", value: 4, color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-100" },
                  { label: "Neutral", value: 3, color: "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200" },
                  { label: "Disagree", value: 2, color: "bg-red-50 hover:bg-red-100 text-red-700 border-red-100" },
                  { label: "Strongly Disagree", value: 1, color: "bg-red-100 hover:bg-red-200 text-red-800 border-red-200" }
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    className={`w-full py-6 text-lg border-2 transition-all ${option.color}`}
                    onClick={() => handleAnswer(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <p className="text-center text-gray-400 mt-8 text-sm">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </p>
          </div>
        ) : (
          <div className="p-6 md:p-10">
            <div className="flex justify-between items-center mb-6">
               <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft size={24} />
              </Button>
              <h2 className="text-xl font-bold text-gray-800">Your Results</h2>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 size={24} className="text-purple-600" />
              </Button>
            </div>

            <div className="text-center mb-8">
              <p className="text-lg text-gray-600 mb-2">Your primary love language is</p>
              <h3 className="text-3xl md:text-4xl font-bold text-purple-600 mb-4">
                {EXPLANATIONS[topLanguage].title}
              </h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                {EXPLANATIONS[topLanguage].description}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-bold text-gray-800 mb-4">Breakdown</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={EXPLANATIONS[entry.key].color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-amber-50 border-none">
                <CardContent className="p-6">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    Relationship Tips
                  </h4>
                  <div className="space-y-4">
                    {sortedScores.slice(0, 3).map(([key, score], idx) => (
                      <div key={key} className="bg-white/80 p-3 rounded-lg shadow-sm">
                         <div className="flex items-center gap-2 mb-1">
                           <Badge variant="outline" className="bg-white">{idx + 1}</Badge>
                           <span className="font-semibold text-gray-800">{EXPLANATIONS[key].title}</span>
                         </div>
                         <p className="text-sm text-gray-600 italic">"{EXPLANATIONS[key].tips}"</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <Info className="text-purple-600 mt-1 flex-shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-gray-900">Why this matters?</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Understanding your partner's love language helps you communicate love in the way they best receive it. 
                    Try to speak their language, even if it's not your own!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
              <Button onClick={resetQuiz} className="flex-1 bg-purple-600 hover:bg-purple-700">
                <RefreshCw size={18} className="mr-2" />
                Retake Test
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}