import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { chatCareerAssistant } from '../../api/assistant';
import { Badge, Button, Icon } from '../ui';
import type { Job } from '../../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendedJobs?: Job[];
}

export const Assistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hi ${user?.name ? user.name.split(' ')[0] : 'there'}. I can help you evaluate your job matches, review proof requirements, and plan your next career move. Where should we begin?`,
    },
  ]);
  const [typing, setTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Listen for programmatic open requests (e.g. from Skills to Grow cards)
  useEffect(() => {
    const handleOpen = (e: any) => {
      setOpen(true);
      if (e.detail?.message) {
        handleSend(e.detail.message);
      }
    };
    window.addEventListener('hirelens:open-assistant' as any, handleOpen);
    return () => window.removeEventListener('hirelens:open-assistant' as any, handleOpen);
  }, []);

  if (user?.role !== 'candidate') {
    return null;
  }

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || typing) return;

    const userMsgId = Math.random().toString(36).slice(2, 9);
    const newHistory = [...messages, { id: userMsgId, sender: 'user' as const, text: textToSend }];
    setMessages(newHistory);
    setInput('');
    setTyping(true);

    try {
      const historyPayload = newHistory.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));
      const res = await chatCareerAssistant(textToSend, historyPayload);
      const aiMsgId = Math.random().toString(36).slice(2, 9);
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'assistant',
          text: res.reply,
          recommendedJobs: res.recommendedJobs,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 9),
          sender: 'assistant',
          text: "I couldn't reach the assistant server right now. Please try asking again in a moment.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <>
      <button
        className="assistant-fab"
        onClick={() => setOpen(true)}
        aria-label="Open AI Career Assistant"
        type="button"
      >
        <Icon name="spark" />
        <span>Ask HireLens</span>
      </button>

      {open && (
        <div
          className="assistant-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-title"
        >
          <div className="assistant-head">
            <div className="ai-avatar">
              <Icon name="spark" />
            </div>
            <div>
              <strong id="assistant-title">Career Assistant</strong>
              <small>Evidence-backed AI career guidance</small>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close career assistant"
            >
              <Icon name="x" />
            </button>
          </div>

          <div className="chat" ref={chatScrollRef}>
            {messages.map((m) => (
              <div key={m.id} className={m.sender === 'user' ? 'user-message' : 'ai-message'}>
                <div>{m.text}</div>
                {m.recommendedJobs && m.recommendedJobs.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {m.recommendedJobs.slice(0, 3).map((job) => (
                      <div key={job._id} className="mini-job">
                        <strong>{job.title}</strong>
                        <small>{job.company}</small>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '4px 0' }}>
                          {job.requiredSkills?.slice(0, 3).map((s) => (
                            <Badge tone="sage" key={s}>
                              {s}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setOpen(false);
                            navigate(`/candidate/jobs/${job._id}`);
                          }}
                        >
                          View role
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="typing" aria-label="Assistant is thinking">
                <i />
                <i />
                <i />
              </div>
            )}

            {messages.length === 1 && !typing && (
              <div className="prompts">
                {[
                  'Best jobs for my skills',
                  'Jobs that fit my certificates',
                  'What should I learn next?',
                ].map((prompt) => (
                  <button key={prompt} type="button" onClick={() => handleSend(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="chat-input" onSubmit={handleFormSubmit}>
            <input
              placeholder="Ask about your next move…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask career assistant"
            />
            <button type="submit" aria-label="Send message" disabled={!input.trim() || typing}>
              <Icon name="arrow" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
