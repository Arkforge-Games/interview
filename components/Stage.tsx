import React, { useState, useEffect, useRef } from 'react';
import { SessionConfig, InterviewQuestion } from '../types';
import { VirtualAudience } from './VirtualAudience';
import { Mic, Square, Video, VideoOff, Loader2, Play, ChevronRight, Timer as TimerIcon, Shuffle } from 'lucide-react';

interface Props {
  config: SessionConfig;
  onFinishQuestion: (blob: Blob, duration: number, index: number) => void;
  onAllFinished: (finalBlob?: Blob, finalDuration?: number, finalIndex?: number) => void;
}

export const Stage: React.FC<Props> = ({ config, onFinishQuestion, onAllFinished }) => {
  const [activeQuestions, setActiveQuestions] = useState<InterviewQuestion[]>(config.questions);
  const [backupQuestions, setBackupQuestions] = useState<InterviewQuestion[]>(config.backupQuestions || []);
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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        streamRef.current = stream;
        // Also try setting immediate ref if available, though callback ref handles the general case
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
        setIsReady(true);
      } catch (e) {
        alert("Camera/Mic permission needed. Please allow access to start the interview.");
        console.error("Media Error:", e);
      }
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
      
      if (currentIdx === activeQuestions.length - 1) {
        // Last question - pass final data to completion handler to avoid race conditions
        onAllFinished(blob, seconds, currentIdx);
      } else {
        onFinishQuestion(blob, seconds, currentIdx);
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

  const swapQuestion = () => {
    if (backupQuestions.length === 0) {
        alert("No more backup questions available.");
        return;
    }
    const newQuestion = backupQuestions[0];
    const newBackups = backupQuestions.slice(1);
    const updatedActive = [...activeQuestions];
    updatedActive[currentIdx] = newQuestion;
    setActiveQuestions(updatedActive);
    setBackupQuestions(newBackups);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  const currentQ = activeQuestions[currentIdx];

  // Callback ref to ensure video element gets stream whenever it renders
  const setVideoRef = (node: HTMLVideoElement) => {
      videoRef.current = node;
      if (node && streamRef.current) {
          node.srcObject = streamRef.current;
      }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white relative overflow-hidden font-inter">
      {/* Header */}
      <div className="w-full bg-white border-b border-slate-100 px-4 py-4 md:px-8 md:py-5 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-4 md:gap-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Q {currentIdx + 1}/{activeQuestions.length}</p>
            <div className="flex gap-1.5 mt-2">
              {activeQuestions.map((_, i) => (
                <div key={i} className={`h-1 w-6 md:w-8 rounded-full ${i <= currentIdx ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              ))}
            </div>
          </div>
          <div className="hidden md:block h-10 w-px bg-slate-100 mx-2" />
          <div className="hidden md:block text-slate-900">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</p>
            <p className="font-bold text-sm truncate max-w-[150px]">{config.jobTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 py-1.5 md:px-5 md:py-2 bg-slate-50 border border-slate-100 rounded-2xl">
          <TimerIcon size={16} className="text-indigo-600" />
          <span className="font-mono font-bold text-base md:text-lg text-slate-700">{formatTime(seconds)}</span>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 relative overflow-hidden">
        {/* Visualizer Side */}
        <div className="h-1/2 lg:h-full lg:col-span-8 bg-black relative overflow-hidden order-1 lg:order-1">
          <VirtualAudience userVideo={
             <div className="w-full h-full relative group">
                <video 
                    ref={setVideoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className={`w-full h-full object-cover transform scale-x-[-1] rounded-xl border border-white/20 shadow-2xl ${!cameraOn && 'hidden'}`} 
                />
                {!cameraOn && <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-800 rounded-xl"><VideoOff size={32} /></div>}
                
                <div className="absolute bottom-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setCameraOn(!cameraOn)} className="p-2 bg-black/60 text-white rounded-full hover:bg-indigo-600 transition-colors">
                        {cameraOn ? <Video size={16}/> : <VideoOff size={16}/>}
                    </button>
                </div>
             </div>
          } />
        </div>

        {/* Question Side */}
        <div className="h-1/2 lg:h-full lg:col-span-4 p-6 md:p-10 bg-white border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col justify-center items-center lg:items-start text-center lg:text-left space-y-6 md:space-y-10 z-10 shadow-xl order-2 lg:order-2 overflow-y-auto">
           <div className="space-y-4 w-full">
              <div className="flex justify-between items-start">
                  <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mx-auto lg:mx-0">
                    {currentQ.category} Question
                  </span>
                  {!isRecording && backupQuestions.length > 0 && (
                      <button 
                        onClick={swapQuestion}
                        className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                      >
                          <Shuffle size={12} /> Swap
                      </button>
                  )}
              </div>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 leading-tight">
                "{currentQ.text}"
              </h2>
              {/* Mobile swap button */}
              {!isRecording && backupQuestions.length > 0 && (
                  <button 
                    onClick={swapQuestion}
                    className="lg:hidden flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors w-full"
                  >
                      <Shuffle size={12} /> Swap Question
                  </button>
              )}
           </div>

           <div className="pt-4 lg:pt-10 flex flex-col items-center gap-6 w-full">
              {!isRecording ? (
                <button 
                  onClick={startRec}
                  disabled={!isReady}
                  className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-105 transition-all ${!isReady ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  <Play className="w-8 h-8 md:w-10 md:h-10" fill="white" />
                </button>
              ) : (
                <button 
                  onClick={stopRec}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white border-4 border-red-500 flex items-center justify-center shadow-xl hover:scale-105 transition-all group"
                >
                  <Square className="w-6 h-6 md:w-8 md:h-8 text-red-500 fill-red-500 group-hover:scale-90 transition-transform" />
                </button>
              )}
              <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                {isRecording ? "Recording Answer..." : isReady ? "Press Play to Record Answer" : "Waiting for Camera..."}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};