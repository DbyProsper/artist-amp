import { motion } from 'framer-motion';
import { Music, Music2, Music3, Music4 } from 'lucide-react';
import { useState, useEffect } from 'react';

const musicIcons = [Music, Music2, Music3, Music4];

export function FloatingMusicNotes() {
  const [dimensions, setDimensions] = useState({ height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ height: document.documentElement.scrollHeight || window.innerHeight * 3 });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Update dimensions when page content changes
    const observer = new MutationObserver(updateDimensions);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, []);

  const notes = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    icon: musicIcons[i % musicIcons.length],
    x: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 6,
    size: 12 + Math.random() * 24,
    opacity: 0.1 + Math.random() * 0.2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ height: dimensions.height || '100%' }}>
      {notes.map((note) => (
        <motion.div
          key={note.id}
          className="absolute text-primary"
          style={{
            left: `${note.x}%`,
            bottom: -50,
            opacity: note.opacity,
          }}
          animate={{
            y: [0, -(dimensions.height || 2000)],
            x: [0, Math.sin(note.id) * 80],
            rotate: [0, 360],
          }}
          transition={{
            duration: note.duration,
            delay: note.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <note.icon style={{ width: note.size, height: note.size }} />
        </motion.div>
      ))}
    </div>
  );
}
