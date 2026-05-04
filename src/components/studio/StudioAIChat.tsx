import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Minimize2, Maximize2, Edit2, Trash2, Plus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { chatWithAI } from '@/lib/api';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface StudioAIChatProps {
  isOpen: boolean;
  isFullscreen?: boolean;
  onClose: () => void;
  onToggleFullscreen?: () => void;
}

const SESSIONS_KEY = 'studio_chat_sessions';

// Load all chat sessions from localStorage
function loadSessions(): ChatSession[] {
  try {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((session: any) => ({
        ...session,
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt)
      }));
    }
  } catch (error) {
    console.warn('[Chat] Failed to load sessions:', error);
  }
  
  // Create initial session
  return [createNewSession('New Chat')];
}

// Create a new chat session
function createNewSession(title: string): ChatSession {
  const now = new Date();
  return {
    id: Date.now().toString(),
    title,
    messages: [
      {
        id: '1',
        role: 'assistant',
        content: `Hey there! 👋 I'm your AI music co-pilot. I can help you with:

🎵 Beat suggestions - describe the vibe you're going for
🎤 Lyrics inspiration - tell me about your song's story
🎨 Creative direction - mood, genre, and style ideas
🔧 Production tips - arrangement and composition advice

What would you like to create today?`,
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// Save all sessions to localStorage
function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.warn('[Chat] Failed to save sessions:', error);
  }
}

export function StudioAIChat({
  isOpen,
  isFullscreen = false,
  onClose,
  onToggleFullscreen,
}: StudioAIChatProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id || '');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save sessions whenever they change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const handleSendMessage = async () => {
    if (!input.trim() || !activeSession) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const userInput = input;
    setInput('');
    setIsLoading(true);

    // Update messages in session
    setSessions((prevSessions) =>
      prevSessions.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [...session.messages, userMessage],
              updatedAt: new Date(),
            }
          : session
      )
    );

    try {
      // Call AI API with /chat endpoint
      const result = await chatWithAI(userInput, 'default', messages.map(m => ({
        role: m.role,
        content: m.content
      })));

      if (!result.success) {
        throw new Error(result.error || 'Unable to generate response');
      }

      // Extract message from response - /chat endpoint returns 'reply' field
      const messageContent = result.reply || result.message || 'I couldn\'t generate a response. Try again?';

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: messageContent,
        timestamp: new Date(),
      };

      // Add assistant response to session
      setSessions((prevSessions) =>
        prevSessions.map(session =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [...session.messages, assistantMessage],
                updatedAt: new Date(),
              }
            : session
        )
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection error';
      toast.error(errorMessage);

      const errorChatMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      };

      setSessions((prevSessions) =>
        prevSessions.map(session =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [...session.messages, errorChatMessage],
                updatedAt: new Date(),
              }
            : session
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    const newSession = createNewSession('New Chat');
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    toast.success('New chat created');
  };

  const deleteChat = (id: string) => {
    if (sessions.length === 1) {
      toast.error('Cannot delete the last chat');
      return;
    }
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[0].id);
    }
    toast.success('Chat deleted');
  };

  const renameChat = (id: string) => {
    setRenaming(id);
    setRenameValue(sessions.find(s => s.id === id)?.title || '');
  };

  const saveRename = (id: string) => {
    if (renameValue.trim()) {
      setSessions(sessions.map(s =>
        s.id === id ? { ...s, title: renameValue.trim(), updatedAt: new Date() } : s
      ));
      toast.success('Chat renamed');
    }
    setRenaming(null);
  };

  // Fullscreen chat with sidebar
  if (isFullscreen && isOpen) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex"
        >
          {/* Left Sidebar - Chat History */}
          <div className="w-64 border-r border-border/40 flex flex-col bg-muted/30">
            {/* New Chat Button */}
            <div className="flex-shrink-0 p-4 border-b border-border/40">
              <Button
                onClick={createNewChat}
                className="w-full gap-2"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  whileHover={{ scale: 1.02 }}
                  className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                    activeSessionId === session.id
                      ? 'bg-primary/20 border border-primary/40'
                      : 'bg-background hover:bg-muted'
                  }`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  {renaming === session.id ? (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(session.id);
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        className="h-7 text-xs"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MessageCircle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate text-sm">{session.title}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            renameChat(session.id);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(session.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
              <h2 className="font-semibold text-lg">{activeSession?.title}</h2>
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
            <div 
              className="flex-1 overflow-y-auto p-6 space-y-4"
              onWheel={(e) => e.stopPropagation()}
            >
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

            {/* Input Section */}
            <div className="flex-shrink-0 p-6 border-t border-border/40 bg-background">
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything about your music..."
                  className="rounded-lg h-10"
                  disabled={isLoading}
                  autoFocus
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="rounded-lg px-6"
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
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
        className="fixed bottom-32 right-6 z-40 w-96 max-h-[32rem] rounded-2xl overflow-hidden shadow-2xl"
      >
        <Card className="h-full flex flex-col border-border/40">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
            <h3 className="font-semibold text-sm truncate">{activeSession?.title}</h3>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={createNewChat}
                title="New chat"
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={onToggleFullscreen}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Messages - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" onWheel={(e) => e.stopPropagation()}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg p-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 p-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse animation-delay-100" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse animation-delay-200" />
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - Always Visible */}
          <div className="flex-shrink-0 p-2 border-t border-border/40 bg-background space-y-2">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask..."
                className="text-xs h-8"
                disabled={isLoading}
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="h-8 px-2"
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
