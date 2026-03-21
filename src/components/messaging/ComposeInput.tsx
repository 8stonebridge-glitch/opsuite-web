'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ComposeInputProps {
  onSend: (body: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}

export function ComposeInput({ onSend, onTyping, disabled }: ComposeInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (value: string) => {
    setText(value);
    if (value.trim()) {
      onTyping();
    }
  };

  return (
    <div className="flex items-end gap-2 px-4 py-3 border-t border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-surface-50 dark:bg-surface-800 rounded-2xl px-4 py-2.5 text-[14px] text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/30 max-h-32"
        style={{ fieldSizing: 'content' } as React.CSSProperties}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-surface-200 dark:disabled:bg-surface-700 flex items-center justify-center transition-colors shrink-0"
        aria-label="Send message"
      >
        <Send className="h-4.5 w-4.5 text-white" />
      </button>
    </div>
  );
}
