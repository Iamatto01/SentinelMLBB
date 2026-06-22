"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am Sentinel AI. I can analyze hero matchups, give drafting advice, and suggest the best macro strategies. What do you need help with?',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }]
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch response');
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Oops, something went wrong connecting to Sentinel AI. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        <Link href="/dashboard" className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-neutral-900 dark:text-white flex items-center gap-2">
              Sentinel AI <Sparkles className="w-4 h-4 text-purple-500" />
            </h1>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Powered by Groq</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-neutral-50/50 dark:bg-neutral-950/50">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}
          >
            <div className={\`flex gap-3 max-w-[85%] sm:max-w-[75%] \${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}\`}>
              <div className={\`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 \${
                msg.role === 'user' 
                  ? 'bg-neutral-200 dark:bg-neutral-700' 
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md'
              }\`}>
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={\`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm \${
                msg.role === 'user'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black rounded-tr-sm'
                  : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-100 dark:border-neutral-700 rounded-tl-sm'
              }\`}>
                {msg.content}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-tl-sm shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
        <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about counters, drafting strategies..."
            disabled={isLoading}
            className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-full pl-6 pr-14 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 w-10 h-10 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
