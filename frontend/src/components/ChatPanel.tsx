import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { addMessage, setLoading, setLoggedSuccess } from '../features/chatSlice';
import { updateMultipleFields, resetForm } from '../features/interactionSlice';
import { Send, User, Bot } from 'lucide-react';
import axios from 'axios';

const ChatPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { messages, isLoading } = useSelector((state: RootState) => state.chat);
  const formState = useSelector((state: RootState) => state.interaction);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to Redux
    dispatch(addMessage({ role: 'user', content: userMessage }));
    dispatch(setLoading(true));

    try {
      const payload = {
        messages: [...messages, { role: 'user', content: userMessage }],
        current_fields: formState
      };
      
      const res = await axios.post('http://localhost:8000/api/chat', payload);
      
      // Update chat history
      dispatch(addMessage({ role: 'assistant', content: res.data.reply }));
      
      // Update form fields
      if (res.data.extracted_fields) {
        dispatch(updateMultipleFields(res.data.extracted_fields));
      }
      
      // Handle logging event
      if (res.data.logged) {
        dispatch(setLoggedSuccess(true));
        setTimeout(() => {
          dispatch(setLoggedSuccess(false));
          dispatch(resetForm());
        }, 3000);
      }
      
    } catch (e) {
      console.error(e);
      dispatch(addMessage({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-chat)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          AI Assistant — Log interaction via chat
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '13px' }}>
            <Bot size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>I can help you fill out the interaction form.</p>
            <p style={{ marginTop: '8px' }}>Just tell me what happened in your own words.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`animate-fade-in flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={16} />
              </div>
            )}
            
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: 'var(--radius-bubble)',
              fontSize: '13.5px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              background: msg.role === 'user' ? 'var(--bg-user-message)' : 'var(--bg-bot-message)',
              color: msg.role === 'user' ? 'var(--primary-accent)' : 'var(--text-primary)',
              borderBottomRightRadius: msg.role === 'user' ? '4px' : 'var(--radius-bubble)',
              borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : 'var(--radius-bubble)',
            }}>
              {msg.content}
            </div>

            {msg.role === 'user' && (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E2E8F0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 animate-fade-in">
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={16} />
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-bubble)',
              background: 'var(--bg-bot-message)',
              display: 'flex', alignItems: 'center'
            }}>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            placeholder='Log interaction details here (e.g., "Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared brochure") or ask for help.'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            style={{
              paddingRight: '48px',
              minHeight: '60px',
              maxHeight: '120px',
              borderRadius: '16px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              background: input.trim() && !isLoading ? 'var(--primary-accent)' : 'var(--border-subtle)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
