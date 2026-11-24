import React, { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  /** Duration in milliseconds to show the splash before fading out (default: 3800ms) */
  minDisplayDuration?: number;
  /** Callback fired when transition completes and splash screen unmounts */
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  minDisplayDuration = 3800,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent scrollbars during splash screen
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Start video playback as early as possible
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback: muted video is allowed on all modern browsers
      });
    }

    // Timer to trigger smooth transition after initial animation plays
    timerRef.current = setTimeout(() => {
      startFadeOut();
    }, minDisplayDuration);

    return () => {
      document.body.style.overflow = originalOverflow;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [minDisplayDuration]);

  const startFadeOut = () => {
    if (isFading) return;
    setIsFading(true);
    // 700ms matches the transition duration in CSS
    setTimeout(() => {
      setIsVisible(false);
      document.body.style.overflow = '';
      if (onComplete) onComplete();
    }, 700);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label="RepayX Animated Splash Screen"
      aria-modal="true"
      onClick={startFadeOut}
      className={`fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden cursor-pointer select-none transition-opacity duration-700 ease-in-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#EBEBEB',
      }}
    >
      {/* Full-Screen Edge-to-Edge Video Container */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          preload="auto"
          className="w-full h-full object-cover"
          onEnded={startFadeOut}
        >
          <source src="/splash_screen.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Subtle skip button for fast access */}
      <div className="absolute bottom-5 right-5 sm:bottom-8 sm:right-8 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            startFadeOut();
          }}
          className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-emerald-700 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-emerald-600/40 backdrop-blur-md transition-all shadow-sm"
          title="Skip to RepayX Dashboard"
        >
          <span>Skip</span>
          <span className="transform transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      </div>
    </div>
  );
};
