import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Video, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function VideoProfileRecorder({ onVideoUploaded, existingVideoUrl, viewOnly = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(!!existingVideoUrl);
  const videoRef = useRef(null);
  const playbackVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Handle existing video URL
  useEffect(() => {
    if (existingVideoUrl && viewOnly) {
      setRecordedVideo(existingVideoUrl);
    }
  }, [existingVideoUrl, viewOnly]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 1280 }
        },
        audio: true 
      });
      
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Try to use a more compatible codec
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        videoRef.current.srcObject = null;
        stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingIntervalRef.current);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Track recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Camera error:', error);
      alert('Camera access denied. Please enable camera and microphone permissions in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const togglePlayback = () => {
    const video = playbackVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const video = playbackVideoRef.current;
    if (video && duration > 0) {
      setProgress((video.currentTime / duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const video = playbackVideoRef.current;
    if (video) {
      setDuration(video.duration);
      setIsLoading(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const toggleMute = () => {
    const video = playbackVideoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    const video = playbackVideoRef.current;
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      }
    }
  };

  const uploadVideo = async () => {
    if (!recordedVideo) return;

    setIsUploading(true);
    try {
      const response = await fetch(recordedVideo);
      const blob = await response.blob();
      const file = new File([blob], 'video-profile.webm', { type: blob.type });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoUploaded(file_url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload video. Please try again.');
    }
    setIsUploading(false);
  };

  const retake = () => {
    if (recordedVideo && !recordedVideo.startsWith('http')) {
      URL.revokeObjectURL(recordedVideo);
    }
    setRecordedVideo(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Video size={20} className="text-purple-600" />
              <h3 className="font-semibold">Video Profile</h3>
            </div>
            {isRecording && (
              <span className="text-sm font-medium text-red-500">
                {formatTime(recordingTime)} / 0:30
              </span>
            )}
          </div>

          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-[9/16] max-w-xs mx-auto">
            {/* Recording Preview */}
            {!recordedVideo && (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            )}

            {/* Playback Video */}
            {recordedVideo && (
              <>
                <video
                  ref={playbackVideoRef}
                  src={recordedVideo}
                  className="w-full h-full object-cover"
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleEnded}
                  onCanPlay={() => setIsLoading(false)}
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
                    className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                    onClick={togglePlayback}
                  >
                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                      <Play size={32} className="text-purple-600 ml-1" />
                    </div>
                  </div>
                )}

                {/* Video Controls */}
                {!isLoading && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <Progress value={progress} className="h-1 mb-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs">
                        {formatTime(playbackVideoRef.current?.currentTime || 0)} / {formatTime(duration)}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={toggleMute} className="text-white hover:text-purple-300">
                          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <button onClick={toggleFullscreen} className="text-white hover:text-purple-300">
                          <Maximize2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Empty State */}
            {!isRecording && !recordedVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/80 to-amber-900/80">
                <div className="text-center text-white">
                  <Video size={48} className="mx-auto mb-4" />
                  <p className="text-sm">Record a 30-second intro video</p>
                  <p className="text-xs text-white/70 mt-1">Share your personality!</p>
                </div>
              </div>
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <>
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Recording
                </div>
                <Progress 
                  value={(recordingTime / 30) * 100} 
                  className="absolute bottom-4 left-4 right-4 h-2"
                />
              </>
            )}
          </div>

          {/* Action Buttons */}
          {!viewOnly && (
            <div className="flex gap-2 justify-center">
              {!recordedVideo && !isRecording && (
                <Button onClick={startRecording} className="bg-purple-600 hover:bg-purple-700">
                  <Video size={18} className="mr-2" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <Button onClick={stopRecording} variant="destructive">
                  <Pause size={18} className="mr-2" />
                  Stop ({30 - recordingTime}s left)
                </Button>
              )}

              {recordedVideo && !isRecording && (
                <>
                  <Button onClick={retake} variant="outline">
                    <RotateCcw size={18} className="mr-2" />
                    Retake
                  </Button>
                  <Button 
                    onClick={uploadVideo} 
                    disabled={isUploading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Save Video'
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {!viewOnly && (
            <p className="text-xs text-gray-500 text-center">
              Max 30 seconds. Introduce yourself and what you're looking for!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}