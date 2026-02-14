import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Check, Crown, Star, Heart, MessageCircle, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ProgressToTrial({ 
  completedActions = [],
  totalRequired = 5,
  className = "" 
}) {
  const actions = [
    { id: 'profile_photo', label: 'Add profile photo', icon: User, completed: completedActions.includes('profile_photo') },
    { id: 'bio', label: 'Write your bio', icon: User, completed: completedActions.includes('bio') },
    { id: 'first_like', label: 'Like someone', icon: Heart, completed: completedActions.includes('first_like') },
    { id: 'view_profiles', label: 'View 5 profiles', icon: Star, completed: completedActions.includes('view_profiles') },
    { id: 'send_message', label: 'Send a message', icon: MessageCircle, completed: completedActions.includes('send_message') },
  ];

  const completedCount = actions.filter(a => a.completed).length;
  const progress = (completedCount / totalRequired) * 100;
  const isComplete = completedCount >= totalRequired;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-amber-50 to-purple-50 rounded-2xl p-5 border border-amber-200/50 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
          <Gift size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">Unlock 1-Day Free Trial</h3>
          <p className="text-sm text-gray-600">Complete actions to earn premium access</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">{completedCount} of {totalRequired} completed</span>
          <span className="font-bold text-purple-600">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3 bg-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </Progress>
      </div>

      {/* Action checklist */}
      <div className="space-y-2 mb-4">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                action.completed 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-white/50 text-gray-600'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                action.completed 
                  ? 'bg-green-500' 
                  : 'bg-gray-200'
              }`}>
                {action.completed ? (
                  <Check size={14} className="text-white" />
                ) : (
                  <Icon size={12} className="text-gray-400" />
                )}
              </div>
              <span className={`text-sm ${action.completed ? 'line-through' : ''}`}>
                {action.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      {isComplete ? (
        <Link to={createPageUrl('PricingPlans')}>
          <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
            <Crown size={18} className="mr-2" />
            Claim Your Free Trial!
          </Button>
        </Link>
      ) : (
        <p className="text-center text-xs text-gray-500">
          Complete {totalRequired - completedCount} more action{totalRequired - completedCount !== 1 ? 's' : ''} to unlock
        </p>
      )}
    </motion.div>
  );
}