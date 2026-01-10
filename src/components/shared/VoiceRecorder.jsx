import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Trash2, Loader2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function VoiceRecorder({ onRecordingComplete, isUploading = false, compact = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) { // Max 60 seconds
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleDelete = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleSend = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      // Optional: Clear after sending if desired, or let parent handle
      if (compact) handleDelete(); 
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    // Chat-style compact recorder
    if (isRecording) {
      return (
        <div className="flex items-center gap-2 bg-red-50 rounded-full px-3 py-1 animate-pulse">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-red-600 text-xs font-mono w-10">{formatTime(recordingTime)}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-600 hover:bg-red-100 rounded-full"
            onClick={stopRecording}
          >
            <Square size={16} fill="currentColor" />
          </Button>
        </div>
      );
    }

    if (audioBlob) {
      return (
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={handleDelete}>
            <Trash2 size={16} />
          </Button>
          <audio ref={audioRef} src={audioUrl} className="h-8 w-32" controls />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-purple-600 bg-purple-100 hover:bg-purple-200 rounded-full" 
            onClick={handleSend}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      );
    }

    return (
      <Button variant="ghost" size="icon" onClick={startRecording}>
        <Mic size={20} className="text-gray-500" />
      </Button>
    );
  }

  // Full Profile Recorder UI
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {isRecording ? (
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-mono text-red-500 animate-pulse">
            {formatTime(recordingTime)}
          </div>
          <p className="text-sm text-gray-500">Recording audio intro...</p>
          <Button 
            variant="destructive" 
            size="lg" 
            className="rounded-full w-16 h-16 flex items-center justify-center mt-2"
            onClick={stopRecording}
          >
            <Square size={24} fill="currentColor" />
          </Button>
        </div>
      ) : audioBlob ? (
        <div className="w-full flex flex-col items-center gap-4">
          <div className="w-full bg-gray-100 rounded-xl p-4 flex items-center gap-3">
            <audio ref={audioRef} src={audioUrl} controls className="w-full" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDelete} className="text-red-500 hover:text-red-600 border-red-200">
              <Trash2 size={18} className="mr-2" />
              Discard
            </Button>
            <Button onClick={handleSend} disabled={isUploading} className="bg-purple-600 hover:bg-purple-700">
              {isUploading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <SaveIcon /> Save Voice Intro
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Button 
            variant="outline"
            size="lg" 
            className="rounded-full w-20 h-20 border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-600 flex flex-col items-center justify-center gap-1 mb-2"
            onClick={startRecording}
          >
            <Mic size={32} />
          </Button>
          <p className="text-sm text-gray-500">Tap to record voice intro</p>
        </div>
      )}
    </div>
  );
}

function SaveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
  )
}