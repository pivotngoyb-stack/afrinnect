import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export default function VideoProfilePlayer({ videoUrl, className = '' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Reset state when URL changes
    setIsPlaying(false);
    setProgress(0);
    setIsLoading(true);
    setHasError(false);
  }, [videoUrl]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(e => {
        console.error('Playback failed:', e);
        setHasError(true);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && duration > 0) {
      setProgress((video.currentTime / duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      setIsLoading(false);
    }
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen(); // iOS
      }
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;
  };

  if (!videoUrl) {
    return null;
  }

  if (hasError) {
    return (
      <div className={`bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center text-white p-4">
          <p className="text-sm">Unable to play video</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover cursor-pointer"
        playsInline
        muted={isMuted}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onEnded={handleEnded}
        onClick={togglePlayback}
      />
      
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Play/Pause Overlay */}
      {!isLoading && !isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity hover:bg-black/40"
          onClick={togglePlayback}
        >
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
            <Play size={32} className="text-purple-600 ml-1" />
          </div>
        </div>
      )}

      {/* Video Controls */}
      {!isLoading && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          {/* Progress Bar */}
          <div 
            className="h-1 bg-white/30 rounded-full mb-2 cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={togglePlayback}
                className="text-white hover:text-purple-300 transition-colors"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span className="text-white text-xs font-medium">
                {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={toggleMute} 
                className="text-white hover:text-purple-300 transition-colors"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button 
                onClick={toggleFullscreen} 
                className="text-white hover:text-purple-300 transition-colors"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}