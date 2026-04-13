import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromptBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function PromptBox({
  value,
  onChange,
  onSubmit,
  loading = false,
  maxLength = 120,
  placeholder = 'Describe your song idea in a few words... (e.g. sad amapiano love song)',
  disabled = false,
}: PromptBoxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current && !disabled) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [disabled]);

  const charCount = value.length;
  const percentFull = (charCount / maxLength) * 100;
  const remainingChars = maxLength - charCount;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!loading && charCount > 0) {
        onSubmit();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative">
        {/* Main Input Container */}
        <div
          className={`relative rounded-3xl border-2 transition-all duration-300 backdrop-blur-xl ${
            isFocused
              ? 'border-primary/60 bg-primary/5 shadow-xl shadow-primary/20'
              : 'border-border/40 bg-background/40 hover:border-primary/40'
          }`}
        >
          {/* Progress bar background */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentFull}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-primary/10 to-accent/10"
            />
          </div>

          {/* Input content */}
          <div className="relative p-6 space-y-0">
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => {
                if (e.target.value.length <= maxLength) {
                  onChange(e.target.value);
                }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={disabled || loading}
              rows={3}
              className="w-full bg-transparent text-lg font-medium placeholder:text-muted-foreground/60 resize-none focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />

            {/* Bottom row: character count + submit button */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/30">
              <motion.span
                animate={{
                  color: remainingChars < 20 ? '#ef4444' : '#64748b',
                  fontSize: remainingChars < 10 ? '14px' : '13px',
                }}
                className="text-sm font-medium"
              >
                {charCount}/{maxLength}
              </motion.span>

              <Button
                onClick={onSubmit}
                disabled={disabled || loading || charCount === 0}
                size="lg"
                className="gap-2 rounded-full font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Track
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Helpful text */}
        <motion.div
          animate={{ opacity: isFocused ? 1 : 0.6 }}
          className="mt-4 text-center text-xs text-muted-foreground"
        >
          <p>Tip: Use short, creative phrases for best results</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
