import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StudioAIChatProps {
  isOpen: boolean;
  isFullscreen?: boolean;
  onClose: () => void;
  onToggleFullscreen?: () => void;
}

export function StudioAIChat({
  isOpen,
  isFullscreen = false,
  onClose,
  onToggleFullscreen,
}: StudioAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hey there! 👋 I'm your AI music co-pilot. I can help you with:
      
🎵 Beat suggestions - describe the vibe you're going for
🎤 Lyrics inspiration - tell me about your song's story
🎨 Creative direction - mood, genre, and style ideas
🔧 Production tips - arrangement and composition advice

What would you like to create today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (in production, call actual API)
    setTimeout(() => {
      const responses = [
        "That sounds amazing! 🎉 I'm picturing a track with those vibes. Want me to suggest some specific elements?",
        "Ooh, I like where your head's at! Here are some ideas to make that happen:\n\n• Try a higher BPM for more energy\n• Layer some atmospheric pads underneath\n• Add a catchy vocal loop in the chorus",
        "Perfect inspiration! Let me help you structure that:\n\n1. Intro - Build atmosphere\n2. Verse - Introduce main melody\n3. Chorus - Maximum impact\n4. Bridge - Creative variation\n5. Outro - Satisfying resolution",
        "I love the creativity! Here are some production tips:\n\n• Keep the kick tight and punchy\n• Let the bass carry the groove\n• Leave breathing room for vocals\n• Use reverb for depth, not muddiness",
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  // Fullscreen chat
  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
            <h2 className="font-semibold text-lg">Music Creative Chat</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleFullscreen}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-2 block">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 p-4"
              >
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse animation-delay-100" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse animation-delay-200" />
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 p-4 border-t border-border/40">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about your music..."
                className="rounded-full"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="rounded-full"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Compact floating panel
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-24 right-6 z-40 w-96 max-h-96 rounded-2xl overflow-hidden shadow-2xl"
      >
        <Card className="h-full flex flex-col border-border/40">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
            <h3 className="font-semibold">AI Music Chat</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleFullscreen}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg p-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 p-4"
              >
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse animation-delay-100" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse animation-delay-200" />
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 p-3 border-t border-border/40 space-y-2">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask..."
                className="text-sm h-9"
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
