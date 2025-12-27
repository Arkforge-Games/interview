
import React, { useState, useEffect, useRef } from 'react';
import { SessionConfig, InterviewQuestion } from '../types';
import { VirtualAudience } from './VirtualAudience';
import { Mic, Square, Video, VideoOff, Loader2, Play, ChevronRight, Timer as TimerIcon } from 'lucide-react';

interface Props {
  config: SessionConfig;
  onFinishQuestion: (blob: Blob, duration: number, index: number) => void;
  onAllFinished: () => void;
}

export const Stage: React.FC<Props> = ({ config, onFinishQuestion, onAllFinished }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  const [isReady, setIsReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const setup = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsReady(true);
    };
    setup();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startRec = () => {
    if (!streamRef.current) return;
    const recorder = new MediaRecorder(streamRef.current);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onFinishQuestion(blob, seconds, currentIdx);
      if (currentIdx === config.questions.length - 1) {
        onAllFinished();
      } else {
        setCurrentIdx(prev => prev + 1);
        setSeconds(0);
        setIsRecording(false);
      }
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRec = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  const currentQ = config.questions[currentIdx];

  return (
    <div className="flex flex-col h-screen w-full bg-white relative overflow-hidden font-inter">
      {/* Header with Progress & Timer */}
      <div className="w-full bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-center z-20">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question {currentIdx + 1}/{config.questions.length}</p>
            <div className="flex gap-1.5 mt-2">
              {config.questions.map((_, i) => (
                <div key={i} className={`h-1 w-8 rounded-full ${i <= currentIdx ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              ))}
            </div>
          </div>
          <div className="h-10 w-px bg-slate-100 mx-2" />
          <div className="text-slate-900">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</p>
            <p className="font-bold text-sm">{config.jobTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
          <TimerIcon size={16} className="text-indigo-600" />
          <span className="font-mono font-bold text-lg text-slate-700">{formatTime(seconds)}</span>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Visualizer Side */}
        <div className="lg:col-span-8 p-6 bg-slate-50 relative">
          <VirtualAudience userVideo={
            <div className="relative w-full h-full bg-slate-200">
               <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transform scale-x-[-1] ${!cameraOn && 'hidden'}`} />
               {!cameraOn && <div className="absolute inset-0 flex items-center justify-center text-slate-400"><VideoOff size={48} /></div>}
            </div>
          } />
        </div>

        {/* Question Side */}
        <div className="lg:col-span-4 p-10 bg-white border-l border-slate-100 flex flex-col justify-center space-y-10">
           <div className="space-y-4">
              <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                {currentQ.category} Question
              </span>
              <h2 className="text-3xl font-black text-slate-900 leading-tight">
                "{currentQ.text}"
              </h2>
           </div>

           <div className="pt-10 flex flex-col items-center gap-6">
              {!isRecording ? (
                <button 
                  onClick={startRec}
                  disabled={!isReady}
                  className="w-24 h-24 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white shadow-2xl hover:scale-105 transition-all"
                >
                  <Play size={40} fill="white" />
                </button>
              ) : (
                <button 
                  onClick={stopRec}
                  className="w-24 h-24 rounded-full bg-white border-4 border-red-500 flex items-center justify-center shadow-xl hover:scale-105 transition-all group"
                >
                  <Square size={32} className="text-red-500 fill-red-500 group-hover:scale-90 transition-transform" />
                </button>
              )}
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                {isRecording ? "Recording Answer..." : "Press Play to Record Answer"}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
