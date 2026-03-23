import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BannerData } from '../types';

export default function Banner({ banners }: { banners?: BannerData[] }) {
  const slides = banners || [];
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => { if (slides.length === 0) return; setCurrent(prev => (prev + 1) % slides.length); }, [slides.length]);
  const prev = useCallback(() => { if (slides.length === 0) return; setCurrent(prev => (prev - 1 + slides.length) % slides.length); }, [slides.length]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused, slides.length]);

  if (slides.length === 0) return null;
  const currentSlide = slides[current];

  return (
    <div className="w-full mb-4">
      <div className="relative rounded-2xl overflow-hidden shadow-lg bg-slate-100 group">
        <div
          className="relative w-full h-[180px] sm:h-[190px] md:h-[210px] overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className={`absolute inset-0 flex items-center ${currentSlide.className || ''}`}
              style={currentSlide.imageUrl ? { backgroundImage: `url(${currentSlide.imageUrl})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } : {}}
            >
              {currentSlide.imageUrl && <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />}

              <div className="relative z-10 px-6 md:px-10 max-w-md">
                {currentSlide.tag && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                    className="inline-block bg-primary/20 backdrop-blur-md text-white text-[9px] font-black tracking-[2px] uppercase px-3 py-1 rounded-full mb-2 border border-white/20">
                    {currentSlide.tag}
                  </motion.div>
                )}
                {currentSlide.title && (
                  <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
                    className="font-black text-lg md:text-2xl text-white leading-tight mb-1.5 uppercase tracking-tight">
                    {currentSlide.title.split('\n').map((line, i) => <span key={i} className="block">{line}</span>)}
                  </motion.h2>
                )}
                {currentSlide.sub && (
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="text-xs text-white/80 font-medium leading-relaxed mb-3 max-w-xs hidden sm:block">
                    {currentSlide.sub}
                  </motion.p>
                )}
                {(currentSlide.cta || currentSlide.link) && currentSlide.cta && (
                  <motion.button initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                    onClick={() => currentSlide.link && window.open(currentSlide.link, '_blank')}
                    className="pink-gradient text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[1.5px] shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-1">
                    {currentSlide.cta} <ChevronRight size={11} strokeWidth={3} />
                  </motion.button>
                )}
              </div>

              {currentSlide.visuals && currentSlide.visuals.length > 0 && (
                <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 gap-2 items-end z-10">
                  {currentSlide.visuals.map((v, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.8, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0, y: i === 1 ? -12 : 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-2.5 text-center text-white min-w-[80px] shadow-lg">
                      <span className="text-xl mb-0.5 block">{v.emoji}</span>
                      <div className="text-[7px] font-black uppercase tracking-widest opacity-60">{v.name}</div>
                      <div className="text-xs font-black text-white">{v.price}</div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {slides.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/10 border border-white/20 text-white w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"><ChevronLeft size={16} strokeWidth={2.5} /></button>
              <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/10 border border-white/20 text-white w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"><ChevronRight size={16} strokeWidth={2.5} /></button>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {slides.map((_, i) => (<button key={i} onClick={() => setCurrent(i)} className={`h-1 rounded-full transition-all duration-500 ${current === i ? 'w-5 bg-white' : 'w-1 bg-white/30 hover:bg-white/50'}`} />))}
              </div>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/10 z-20">
                <motion.div key={current} initial={{ width: '0%' }} animate={{ width: isPaused ? '0%' : '100%' }} transition={{ duration: isPaused ? 0 : 5, ease: 'linear' }} className="h-full bg-white" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}