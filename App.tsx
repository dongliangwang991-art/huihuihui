import React, { useState, useEffect, useRef } from 'react';
import ChristmasScene from './components/ChristmasScene';

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    const audio = new Audio('https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=christmas-magic-127376.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const handleUserInteraction = () => {
    if (!hasStarted && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play failed pending interaction", e));
      setHasStarted(true);
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-black"
      onClick={handleUserInteraction}
    >
      {/* Header UI */}
      <div className="absolute top-0 left-0 w-full z-10 flex flex-col items-center justify-center pt-8 pointer-events-none select-none">
        <h1 className="text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 font-serif tracking-widest drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] animate-pulse">
          MERRY CHRISTMAS
        </h1>
        <p className="mt-4 text-yellow-100/60 text-sm font-serif tracking-widest uppercase">
          Click to Interact &bull; Drag to Rotate
        </p>
      </div>

      {/* 3D Scene */}
      <div className="w-full h-full">
        <ChristmasScene onInteract={handleUserInteraction} />
      </div>

      {/* Audio Control Hint (fades out) */}
      {!hasStarted && (
        <div className="absolute bottom-10 w-full text-center pointer-events-none">
          <p className="text-yellow-100/40 text-xs animate-bounce">
            Tap anywhere to start the magic
          </p>
        </div>
      )}
    </div>
  );
};

export default App;