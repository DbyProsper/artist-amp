import { motion } from 'framer-motion';
import { Music, Music2, Music3, Music4 } from 'lucide-react';

const musicIcons = [Music, Music2, Music3, Music4];

export function FloatingMusicNotes() {
  const notes = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    icon: musicIcons[i % musicIcons.length],
    x: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    size: 12 + Math.random() * 20,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {notes.map((note) => (
        <motion.div
          key={note.id}
          className="absolute text-primary/30"
          style={{
            left: `${note.x}%`,
            bottom: -50,
          }}
          animate={{
            y: [0, -window.innerHeight - 100],
            x: [0, Math.sin(note.id) * 50],
            opacity: [0, 1, 1, 0],
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
