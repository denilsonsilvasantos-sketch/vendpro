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
    <div className="w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-lg bg-slate-100">
      <div 
        className="relative w-full h-[250px] sm:h-[300px] md:h-[400px] overflow-hidden group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.6, ease: [0.77, 0, 0.18, 1] }}
            className={`absolute inset-0 flex items-center ${currentSlide.className || ''}`}
            style={currentSlide.imageUrl ? {
              backgroundImage: `url(${currentSlide.imageUrl})`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            } : {}}
          >
          {/* Overlay for readability if there's an image and text */}
          {currentSlide.imageUrl && (currentSlide.title || currentSlide.sub || currentSlide.tag) && (
            <div className="absolute inset-0 bg-black/30" />
          )}
          
          <div className="relative z-10 px-8 md:px-16 max-w-2xl">
            {currentSlide.tag && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block bg-white/15 text-white/90 text-[11px] tracking-[2px] uppercase px-3 py-1 rounded-full mb-4"
              >
                {currentSlide.tag}
              </motion.div>
            )}
            
            {currentSlide.title && (
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-display text-3xl md:text-5xl font-bold text-white leading-tight mb-4 whitespace-pre-line"
              >
                {currentSlide.title.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}{i < currentSlide.title!.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </motion.h2>
            )}
            
            {currentSlide.sub && (
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm md:text-base text-white/75 leading-relaxed mb-8 max-w-sm"
              >
                {currentSlide.sub}
              </motion.p>
            )}
            
            {(currentSlide.cta || currentSlide.link) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-4"
              >
                {currentSlide.cta && (
                  <button 
                    onClick={() => currentSlide.link && window.open(currentSlide.link, '_blank')}
                    className="bg-white text-primary px-7 py-3 rounded-full text-sm font-bold shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
                  >
                    {currentSlide.cta} →
                  </button>
                )}
                {currentSlide.link && !currentSlide.cta && (
                  <button 
                    onClick={() => window.open(currentSlide.link, '_blank')}
                    className="bg-transparent text-white/85 border border-white/35 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-white/10 transition-all"
                  >
                    Saiba mais
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Visuals */}
          {currentSlide.visuals && currentSlide.visuals.length > 0 && (
            <div className="hidden lg:flex absolute right-20 top-1/2 -translate-y-1/2 gap-4 items-end z-10">
              {currentSlide.visuals.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: i === 1 ? -20 : 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="bg-white/12 backdrop-blur-md border border-white/20 rounded-[20px] p-4 text-center text-white min-w-[120px]"
                >
                  <span className="text-3xl mb-2 block">{v.emoji}</span>
                  <div className="text-[12px] opacity-85 leading-tight mb-1.5">{v.name}</div>
                  <div className="text-[15px] font-bold text-primary-light">{v.price}</div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      {slides.length > 1 && (
        <>
          <button 
            onClick={prev}
            className="absolute left-5 top-1/2 -translate-y-1/2 z-20 bg-white/15 border border-white/30 text-white w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white/25"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={next}
            className="absolute right-5 top-1/2 -translate-y-1/2 z-20 bg-white/15 border border-white/30 text-white w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white/25"
          >
            <ChevronRight size={24} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${current === i ? 'w-7 bg-white' : 'w-2 bg-white/40'}`}
              />
            ))}
          </div>

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/15 z-20">
            <motion.div 
              key={current}
              initial={{ width: '0%' }}
              animate={{ width: isPaused ? '0%' : '100%' }}
              transition={{ duration: isPaused ? 0 : 5, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-primary-light to-white"
            />
          </div>
        </>
      )}
    </div>
  </div>
  );
}
