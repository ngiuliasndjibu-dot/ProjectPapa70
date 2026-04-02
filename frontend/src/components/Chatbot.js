import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Chatbot = () => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: t('chatWelcome') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: userMessage,
        session_id: sessionId
      });
      
      setSessionId(response.data.session_id);
      setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: "Désolé, je rencontre des difficultés techniques. Veuillez réessayer."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full chatbot-orb flex items-center justify-center text-white shadow-lg animate-pulse-glow`}
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        data-testid="chatbot-toggle"
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-6rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
              isDark ? 'bg-[#1A1A2E] border border-white/10' : 'bg-white border border-gray-200'
            }`}
            data-testid="chatbot-window"
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${isDark ? 'bg-[#252542]' : 'bg-[#0066FF]'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{t('chatTitle')}</h3>
                  <p className="text-xs text-white/70">En ligne</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-full"
                data-testid="chatbot-close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' 
                          ? 'bg-[#0066FF]' 
                          : isDark ? 'bg-[#252542]' : 'bg-gray-100'
                      }`}>
                        {msg.role === 'user' 
                          ? <User className="w-4 h-4 text-white" />
                          : <Bot className={`w-4 h-4 ${isDark ? 'text-[#0066FF]' : 'text-gray-600'}`} />
                        }
                      </div>
                      <div className={`px-4 py-2 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-[#0066FF] text-white rounded-tr-none'
                          : isDark 
                            ? 'bg-[#252542] text-white rounded-tl-none'
                            : 'bg-gray-100 text-gray-900 rounded-tl-none'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className={`px-4 py-3 rounded-2xl rounded-tl-none ${isDark ? 'bg-[#252542]' : 'bg-gray-100'}`}>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#0066FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#0066FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#0066FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={sendMessage} className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chatPlaceholder')}
                  className={`flex-1 rounded-full ${
                    isDark ? 'bg-[#252542] border-white/10' : 'bg-gray-100 border-gray-200'
                  }`}
                  disabled={loading}
                  data-testid="chat-input"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full bg-[#0066FF] hover:bg-[#3385FF]"
                  disabled={loading || !input.trim()}
                  data-testid="chat-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
