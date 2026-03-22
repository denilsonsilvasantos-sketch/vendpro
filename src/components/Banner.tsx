import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BannerData } from '../types';

export default function Banner({ banners }: { banners?: BannerData[] }) {
  const slides = banners || [];
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    if (slides.length === 0) return;
    setCurrent(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    if (slides.length === 0) return;
    setCurrent(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused, slides.length]);

  if (slides.length === 0) return null;

  const currentSlide = slides[current];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <div className="relative rounded-[32px] overflow-hidden shadow-2xl shadow-slate-200/50 bg-slate-100 group">
        <div 
          className="relative w-full h-[250px] sm:h-[350px] md:h-[450px] overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className={`absolute inset-0 flex items-center ${currentSlide.className || ''}`}
              style={currentSlide.imageUrl ? {
                backgroundImage: `url(${currentSlide.imageUrl})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              } : {}}
            >
            {/* Overlay for readability */}
            {currentSlide.imageUrl && (
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            )}
            
            <div className="relative z-10 px-8 md:px-20 max-w-3xl">
              {currentSlide.tag && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block bg-primary/20 backdrop-blur-md text-white text-[10px] font-black tracking-[3px] uppercase px-4 py-1.5 rounded-full mb-6 border border-white/20"
                >
                  {currentSlide.tag}
                </motion.div>
              )}
              
              {currentSlide.title && (
                <motion.h2 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="font-black text-4xl md:text-6xl text-white leading-[0.9] mb-6 whitespace-pre-line uppercase tracking-tighter"
                >
                  {currentSlide.title.split('\n').map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </motion.h2>
              )}
              
              {currentSlide.sub && (
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm md:text-lg text-white/80 font-medium leading-relaxed mb-10 max-w-md"
                >
                  {currentSlide.sub}
                </motion.p>
              )}
              
              {(currentSlide.cta || currentSlide.link) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-4"
                >
                  {currentSlide.cta && (
                    <button 
                      onClick={() => currentSlide.link && window.open(currentSlide.link, '_blank')}
                      className="pink-gradient text-white px-10 py-4 rounded-full text-xs font-black uppercase tracking-[2px] shadow-2xl shadow-primary/40 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
                    >
                      {currentSlide.cta} <ChevronRight size={16} strokeWidth={3} />
                    </button>
                  )}
                </motion.div>
              )}
            </div>

            {/* Visuals */}
            {currentSlide.visuals && currentSlide.visuals.length > 0 && (
              <div className="hidden lg:flex absolute right-20 top-1/2 -translate-y-1/2 gap-6 items-end z-10">
                {currentSlide.visuals.map((v, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: i === 1 ? -30 : 0 }}
                    transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 100 }}
                    className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-6 text-center text-white min-w-[160px] shadow-2xl"
                  >
                    <span className="text-5xl mb-4 block drop-shadow-2xl">{v.emoji}</span>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{v.name}</div>
                    <div className="text-xl font-black text-white tracking-tighter">{v.price}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        {slides.length > 1 && (
          <>
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <button 
              onClick={prev}
              className="absolute left-8 top-1/2 -translate-y-1/2 z-20 bg-white/10 border border-white/20 text-white w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 hover:scale-110 active:scale-95"
            >
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>
            <button 
              onClick={next}
              className="absolute right-8 top-1/2 -translate-y-1/2 z-20 bg-white/10 border border-white/20 text-white w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 hover:scale-110 active:scale-95"
            >
              <ChevronRight size={28} strokeWidth={2.5} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${current === i ? 'w-10 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20">
              <motion.div 
                key={current}
                initial={{ width: '0%' }}
                animate={{ width: isPaused ? '0%' : '100%' }}
                transition={{ duration: isPaused ? 0 : 5, ease: 'linear' }}
                className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              />
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
