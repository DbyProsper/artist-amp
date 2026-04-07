import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { chatWithAI } from '@/lib/api';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIChatProps {
  title?: string;
  description?: string;
}

export function AIChat({ title = 'AI Chat', description = 'Chat with AI' }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('gemini');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError('');

    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    setLoading(true);

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const result = await chatWithAI(userMessage, model, conversationHistory);

      if (!result.success) {
        setError(result.error || 'Failed to get response from AI');
        toast.error('Chat error', { description: result.error });
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.message || result.data?.response || 'No response',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
      toast.error('Error', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {/* Model Selector */}
      <div className="flex gap-2">
        <label className="text-xs font-medium text-muted-foreground">Model:</label>
        <Select value={model} onValueChange={setModel} disabled={loading}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini">Gemini AI</SelectItem>
            <SelectItem value="musicgen">MusicGen</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto bg-background/50 rounded-lg p-3 border border-border space-y-3 min-h-0">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="text-muted-foreground">
                <p className="text-sm font-medium mb-1">No messages yet</p>
                <p className="text-xs">Start a conversation with AI</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={`${msg.timestamp}-${idx}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted text-muted-foreground rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-muted text-muted-foreground rounded-lg p-2 flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-xs">Thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="space-y-2">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          placeholder="Type your message... (Ctrl+Enter to send)"
          className="w-full p-2 rounded-lg bg-background border border-border text-sm resize-none min-h-[80px]"
          rows={3}
        />
        <Button
          onClick={handleSendMessage}
          disabled={loading || !inputValue.trim()}
          className="w-full"
          size="sm"
        >
          <Send className="w-4 h-4 mr-2" />
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
