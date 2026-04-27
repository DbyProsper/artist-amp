import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader, X, Edit2, Trash2, Plus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { chatWithAI } from '@/lib/api';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: number;
  updated_at: number;
}

export function ImprovedAIChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai-chat-sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
      }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ai-chat-sessions', JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: `Chat ${new Date().toLocaleTimeString()}`,
      messages: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    toast.success('New chat created');
  };

  const deleteSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(sessions.find((s) => s.id !== id)?.id || null);
    }
    toast.success('Chat deleted');
  };

  const startRenaming = (session: ChatSession) => {
    setRenaming(session.id);
    setRenameValue(session.title);
  };

  const saveRename = () => {
    if (renaming && renameValue.trim()) {
      setSessions(
        sessions.map((s) => (s.id === renaming ? { ...s, title: renameValue.trim() } : s))
      );
      setRenaming(null);
      toast.success('Chat renamed');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading || !activeSession) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setLoading(true);

    try {
      // Add user message
      const updatedSessions = sessions.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [
              ...s.messages,
              {
                role: 'user' as const,
                content: userMessage,
                timestamp: Date.now(),
              },
            ],
            updated_at: Date.now(),
          };
        }
        return s;
      });
      setSessions(updatedSessions);

      // Get AI response
      const currentSession = updatedSessions.find((s) => s.id === activeSessionId);
      if (!currentSession) return;

      const conversationHistory = currentSession.messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const result = await chatWithAI(userMessage, 'gemini', conversationHistory);

      if (!result.success) {
        toast.error('Chat error', { description: result.error });
      } else {
        const assistantMessage = result.message || result.data?.response || 'Unable to generate response';

        // Add assistant response
        setSessions((prevSessions) =>
          prevSessions.map((s) => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    role: 'assistant' as const,
                    content: assistantMessage,
                    timestamp: Date.now(),
                  },
                ],
                updated_at: Date.now(),
              };
            }
            return s;
          })
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
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
    <div className="flex h-full gap-3">
      {/* Sidebar - Chat History */}
      <Card className="w-48 flex flex-col bg-muted/50 border-0">
        <CardHeader className="pb-3">
          <Button
            onClick={createNewSession}
            size="sm"
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-1">
            <AnimatePresence>
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`group p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    activeSessionId === session.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  {renaming === session.id ? (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        className="h-6 text-xs"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <MessageCircle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{session.title}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRenaming(session);
                          }}
                          className="p-1 rounded hover:bg-foreground/20"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="p-1 rounded hover:bg-destructive/20 text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeSession ? (
          <>
            {/* Messages */}
            <Card className="flex-1 flex flex-col bg-muted/30 border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{activeSession.title}</CardTitle>
                <CardDescription className="text-xs">
                  {activeSession.messages.length} messages
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3 pb-3">
                <AnimatePresence>
                  {activeSession.messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-xs ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-secondary text-secondary-foreground px-3 py-2 rounded-lg">
                      <Loader className="w-4 h-4 animate-spin" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            {/* Input Area */}
            <Card className="border-0 mt-3">
              <CardContent className="pt-3">
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about music... (Ctrl+Enter to send)"
                    className="flex-1 h-16 p-2 rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs resize-none"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={loading || !inputValue.trim()}
                    size="sm"
                    className="gap-2 self-end"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex items-center justify-center flex-1">
            <CardContent className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No chat selected</p>
              <Button onClick={createNewSession} size="sm" className="mt-3">
                Start new chat
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
