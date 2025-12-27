import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Video, X, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function VideoProfileRecorder({ onVideoUploaded, existingVideoUrl }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(existingVideoUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: true 
      });
      
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch (error) {
      alert('Camera access denied. Please enable camera permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVideo = async () => {
    if (!recordedVideo) return;

    setIsUploading(true);
    try {
      // Convert blob URL to file
      const response = await fetch(recordedVideo);
      const blob = await response.blob();
      const file = new File([blob], 'video-profile.webm', { type: 'video/webm' });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoUploaded(file_url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload video');
    }
    setIsUploading(false);
  };

  const retake = () => {
    setRecordedVideo(null);
    setIsPlaying(false);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Video size={20} className="text-purple-600" />
            <h3 className="font-semibold">Video Profile</h3>
          </div>

          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-[9/16] max-w-xs mx-auto">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted={isRecording}
              controls={!isRecording && recordedVideo && isPlaying}
            />
            
            {!isRecording && !recordedVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/80 to-amber-900/80">
                <div className="text-center text-white">
                  <Video size={48} className="mx-auto mb-4" />
                  <p className="text-sm">Record a 30-second intro video</p>
                </div>
              </div>
            )}

            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Recording...
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center">
            {!recordedVideo && !isRecording && (
              <Button onClick={startRecording} className="bg-purple-600">
                <Video size={18} className="mr-2" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button onClick={stopRecording} variant="destructive">
                <Pause size={18} className="mr-2" />
                Stop Recording
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
                  className="bg-purple-600"
                >
                  {isUploading ? 'Uploading...' : 'Save Video'}
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            Max 30 seconds. Introduce yourself and what you're looking for!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}