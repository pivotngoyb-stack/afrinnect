import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Heart, MessageCircle, Calendar, Trophy, TrendingUp, Award, Target } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';

export default function SuccessMetrics() {
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setMyProfile(profiles[0]);
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    fetchProfile();
  }, []);

  const { data: matches = [] } = useQuery({
    queryKey: ['my-matches', myProfile?.id],
    queryFn: async () => {
      const m1 = await base44.entities.Match.filter({ user1_id: myProfile.id, is_match: true });
      const m2 = await base44.entities.Match.filter({ user2_id: myProfile.id, is_match: true });
      return [...m1, ...m2];
    },
    enabled: !!myProfile
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['my-messages', myProfile?.id],
    queryFn: () => base44.entities.Message.filter({ sender_id: myProfile.id }),
    enabled: !!myProfile
  });

  const { data: events = [] } = useQuery({
    queryKey: ['attended-events', myProfile?.id],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.filter({});
      return allEvents.filter(e => e.attendees?.includes(myProfile.id));
    },
    enabled: !!myProfile
  });

  const { data: likes = [] } = useQuery({
    queryKey: ['my-likes', myProfile?.id],
    queryFn: () => base44.entities.Like.filter({ liker_id: myProfile.id }),
    enabled: !!myProfile
  });

  const milestones = [
    { id: 'first_match', title: 'First Match', icon: Heart, completed: matches.length > 0, target: 1, current: matches.length },
    { id: '10_matches', title: '10 Matches', icon: Heart, completed: matches.length >= 10, target: 10, current: matches.length },
    { id: 'first_message', title: 'First Message', icon: MessageCircle, completed: messages.length > 0, target: 1, current: messages.length },
    { id: '100_messages', title: '100 Messages', icon: MessageCircle, completed: messages.length >= 100, target: 100, current: messages.length },
    { id: 'first_event', title: 'First Event', icon: Calendar, completed: events.length > 0, target: 1, current: events.length },
    { id: '50_likes', title: '50 Likes Given', icon: TrendingUp, completed: likes.length >= 50, target: 50, current: likes.length },
    { id: 'login_streak_7', title: '7 Day Streak', icon: Trophy, completed: (myProfile?.login_streak || 0) >= 7, target: 7, current: myProfile?.login_streak || 0 },
    { id: 'login_streak_30', title: '30 Day Streak', icon: Award, completed: (myProfile?.login_streak || 0) >= 30, target: 30, current: myProfile?.login_streak || 0 }
  ];

  const completedMilestones = milestones.filter(m => m.completed).length;
  const completionRate = Math.round((completedMilestones / milestones.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Profile')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Your Journey</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Overall Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-purple-600 to-amber-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{completionRate}%</h2>
                  <p className="text-white/80">Journey Complete</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Trophy size={32} />
                </div>
              </div>
              <Progress value={completionRate} className="h-2 bg-white/20" />
              <p className="text-sm text-white/80 mt-2">
                {completedMilestones} of {milestones.length} milestones achieved
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Heart size={24} className="mx-auto text-pink-600 mb-2" />
              <p className="text-2xl font-bold">{matches.length}</p>
              <p className="text-sm text-gray-500">Total Matches</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageCircle size={24} className="mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{messages.length}</p>
              <p className="text-sm text-gray-500">Messages Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar size={24} className="mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{events.length}</p>
              <p className="text-sm text-gray-500">Events Attended</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy size={24} className="mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold">{myProfile?.login_streak || 0}</p>
              <p className="text-sm text-gray-500">Day Streak</p>
            </CardContent>
          </Card>
        </div>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={20} />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.map((milestone, idx) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-xl border-2 ${
                  milestone.completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <milestone.icon 
                      size={20} 
                      className={milestone.completed ? 'text-green-600' : 'text-gray-400'} 
                    />
                    <span className={`font-medium ${milestone.completed ? 'text-green-900' : 'text-gray-700'}`}>
                      {milestone.title}
                    </span>
                  </div>
                  {milestone.completed ? (
                    <Badge className="bg-green-600">Completed</Badge>
                  ) : (
                    <span className="text-sm text-gray-500">
                      {milestone.current}/{milestone.target}
                    </span>
                  )}
                </div>
                {!milestone.completed && (
                  <Progress 
                    value={(milestone.current / milestone.target) * 100} 
                    className="h-1.5"
                  />
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}