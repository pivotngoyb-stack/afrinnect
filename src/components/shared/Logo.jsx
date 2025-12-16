import React from 'react';
import { Heart } from 'lucide-react';

export default function Logo({ size = "default", showText = true }) {
  const sizes = {
    small: { icon: 20, text: "text-lg" },
    default: { icon: 28, text: "text-2xl" },
    large: { icon: 40, text: "text-4xl" }
  };

  const { icon, text } = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl blur-sm opacity-50" />
        <div className="relative bg-gradient-to-br from-purple-700 to-purple-900 p-2 rounded-xl">
          <Heart size={icon} className="text-amber-400 fill-amber-400" />
        </div>
      </div>
      {showText && (
        <span className={`font-bold ${text} bg-gradient-to-r from-purple-700 to-amber-600 bg-clip-text text-transparent`}>
          Ubuntu
        </span>
      )}
    </div>
  );
}