import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

export interface LanguagePreset {
  id: string;
  label: string;
  nativeLabel: string;
  code: string;
  icon?: string;
}

const LANGUAGE_PRESETS: LanguagePreset[] = [
  { id: 'english', label: 'English', nativeLabel: 'English (SA)', code: 'en-ZA', icon: '🇿🇦' },
  { id: 'zulu', label: 'isiZulu', nativeLabel: 'isiZulu', code: 'zu', icon: '🗣️' },
  { id: 'xhosa', label: 'isiXhosa', nativeLabel: 'isiXhosa', code: 'xh', icon: '🗣️' },
  { id: 'sesotho', label: 'Sesotho', nativeLabel: 'Sesotho', code: 'st', icon: '🗣️' },
  { id: 'afrikaans', label: 'Afrikaans', nativeLabel: 'Afrikaans', code: 'af', icon: '🇿🇦' },
  { id: 'tsotsitaal', label: 'Tsotsitaal', nativeLabel: 'Tsotsitaal', code: 'tsot', icon: '🔥' },
];

interface LanguagePresetsProps {
  selected?: string;
  onSelect: (languageId: string) => void;
  disabled?: boolean;
}

export function LanguagePresets({ selected = 'english', onSelect, disabled = false }: LanguagePresetsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="w-full"
    >
      <div className="mb-3 flex items-center gap-2 pl-2">
        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Language
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {LANGUAGE_PRESETS.map((lang, idx) => (
          <motion.button
            key={lang.id}
            whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + idx * 0.06 }}
            onClick={() => !disabled && onSelect(lang.id)}
            disabled={disabled}
            className={`group relative p-3 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 text-center backdrop-blur-sm ${
              selected === lang.id
                ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/80 shadow-lg shadow-emerald-500/30'
                : 'bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-border/40 hover:border-slate-500/60 hover:bg-slate-500/10 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <div className="text-lg">{lang.icon}</div>
            <div className="text-xs font-bold leading-tight">{lang.label}</div>
            <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {lang.nativeLabel}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
