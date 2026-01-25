import { useState } from 'react';
import EmojiPickerReact, { Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-2 rounded-full hover:bg-muted transition-colors">
          <Smile className="w-5 h-5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="end" 
        className="w-auto p-0 border-border bg-card"
      >
        <EmojiPickerReact
          theme={Theme.DARK}
          onEmojiClick={(emojiData) => {
            onEmojiSelect(emojiData.emoji);
            setOpen(false);
          }}
          width={300}
          height={400}
        />
      </PopoverContent>
    </Popover>
  );
}
