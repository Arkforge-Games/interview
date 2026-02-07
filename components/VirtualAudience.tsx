
import React from 'react';
import { Video } from 'lucide-react';

interface Props {
  userVideo?: React.ReactNode;
}

export const VirtualAudience: React.FC<Props> = ({ userVideo }) => {
  return (
    <div className="w-full h-full relative bg-slate-900 overflow-hidden">
      {/* Immersive Background - Professional Interviewer */}
      <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2574&auto=format&fit=crop" 
            alt="Interviewer in Office" 
            className="w-full h-full object-cover opacity-90"
          />
          {/* Dark gradient overlay for focus */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      </div>
      
      {/* "Live" Indicator overlay */}
      <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Live Session
      </div>

      {/* User Picture-in-Picture (PiP) */}
      <div className="absolute bottom-6 right-6 w-32 aspect-video md:w-64 bg-black rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20">
          {userVideo ? (
            userVideo
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-800">
              <Video size={24} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded flex items-center gap-1 z-30">
            <span className="font-bold">You</span>
          </div>
      </div>
    </div>
  );
};
