import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { updateField, resetForm } from '../features/interactionSlice';
import { setLoggedSuccess } from '../features/chatSlice';
import { Mic, Plus, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const FormPanel: React.FC = () => {
  const dispatch = useDispatch();
  const formState = useSelector((state: RootState) => state.interaction);
  const loggedSuccess = useSelector((state: RootState) => state.chat.loggedSuccess);
  const [hcps, setHcps] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Load HCPs for dropdown
  useEffect(() => {
    const fetchHcps = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/hcps');
        setHcps(res.data);
      } catch (e) {
        console.error("Failed to load HCPs");
      }
    };
    fetchHcps();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    dispatch(updateField({ field: e.target.name as any, value: e.target.value }));
  };

  const handleSentimentChange = (value: string) => {
    dispatch(updateField({ field: 'sentiment', value }));
  };

  const handleLogInteraction = async () => {
    setIsSubmitting(true);
    try {
      await axios.post('http://localhost:8000/api/interactions', formState);
      dispatch(setLoggedSuccess(true));
      setTimeout(() => {
        dispatch(setLoggedSuccess(false));
        dispatch(resetForm());
      }, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSummarizeVoiceNote = async (e: React.MouseEvent) => {
    e.preventDefault();
    const transcript = window.prompt("Paste or dictate your raw voice note transcript here:");
    if (!transcript) return;
    
    setIsSummarizing(true);
    try {
      const res = await axios.post('http://localhost:8000/api/summarize', { raw_transcript: transcript });
      dispatch(updateField({ field: 'topics_discussed', value: res.data.summary }));
    } catch (err) {
      console.error(err);
      alert("Failed to summarize voice note. Please ensure the backend is running and the API key is valid.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const SectionDivider = ({ title }: { title: string }) => (
    <div style={{ marginTop: '32px', marginBottom: '16px' }}>
      <div className="section-label">{title}</div>
      <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)' }}>
      <h2 className="panel-title">Interaction Details</h2>

      {loggedSuccess && (
        <div className="animate-fade-in" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 16px', background: 'var(--sentiment-positive-bg)',
          color: 'var(--sentiment-positive-text)', borderRadius: '8px', marginBottom: '24px'
        }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 500, fontSize: '13.5px' }}>Interaction successfully logged to CRM.</span>
        </div>
      )}

      <div className="flex-col gap-4">
        {/* Basic Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="field-label">HCP Name</label>
            <div style={{ position: 'relative' }}>
              <select name="hcp_name" value={formState.hcp_name} onChange={handleChange}>
                <option value="">Search or select HCP</option>
                {hcps.map(hcp => (
                  <option key={hcp.id} value={hcp.name}>{hcp.name} ({hcp.specialty})</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Interaction Type</label>
            <select name="interaction_type" value={formState.interaction_type} onChange={handleChange}>
              <option value="">Select type...</option>
              <option value="Meeting">Meeting</option>
              <option value="Call">Call</option>
              <option value="Email">Email</option>
              <option value="Conference">Conference</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label className="field-label">Date</label>
            <input type="date" name="date" value={formState.date} onChange={handleChange} />
          </div>
          <div>
            <label className="field-label">Time</label>
            <input type="time" name="time" value={formState.time} onChange={handleChange} />
          </div>
          <div>
            <label className="field-label">Attendees</label>
            <input type="text" name="attendees" placeholder="e.g. MSL, Rep" value={formState.attendees} onChange={handleChange} />
          </div>
        </div>

        <SectionDivider title="Discussion & Content" />

        <div>
          <div className="flex justify-between items-center" style={{ marginBottom: '6px' }}>
            <label className="field-label" style={{ margin: 0 }}>Topics Discussed</label>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '12px', padding: '4px 8px' }}
              onClick={handleSummarizeVoiceNote}
              disabled={isSummarizing}
            >
              <Mic size={14} />
              {isSummarizing ? 'Summarizing...' : 'Summarize from Voice Note'}
            </button>
          </div>
          <textarea name="topics_discussed" placeholder="Enter key topics discussed..." value={formState.topics_discussed} onChange={handleChange} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="field-label">Materials Shared</label>
            <div className="flex gap-2">
              <input type="text" name="materials_shared" placeholder="Search materials..." value={formState.materials_shared} onChange={handleChange} />
              <button className="btn-icon" style={{ border: '1px solid var(--border-subtle)' }}><Plus size={16}/></button>
            </div>
          </div>
          <div>
            <label className="field-label">Samples Distributed</label>
            <div className="flex gap-2">
              <input type="text" name="samples_distributed" placeholder="Add sample quantity..." value={formState.samples_distributed} onChange={handleChange} />
              <button className="btn-icon" style={{ border: '1px solid var(--border-subtle)' }}><Plus size={16}/></button>
            </div>
          </div>
        </div>

        <SectionDivider title="Outcomes" />

        <div>
          <label className="field-label">Observed/Inferred HCP Sentiment</label>
          <div className="sentiment-group">
            <label className="sentiment-option positive">
              <input type="radio" name="sentiment" value="Positive" checked={formState.sentiment === 'Positive'} onChange={() => handleSentimentChange('Positive')} />
              <span>Positive</span>
            </label>
            <label className="sentiment-option neutral">
              <input type="radio" name="sentiment" value="Neutral" checked={formState.sentiment === 'Neutral'} onChange={() => handleSentimentChange('Neutral')} />
              <span>Neutral</span>
            </label>
            <label className="sentiment-option negative">
              <input type="radio" name="sentiment" value="Negative" checked={formState.sentiment === 'Negative'} onChange={() => handleSentimentChange('Negative')} />
              <span>Negative</span>
            </label>
          </div>
        </div>

        <div>
          <label className="field-label">Outcomes</label>
          <textarea name="outcomes" placeholder="Result of the interaction..." value={formState.outcomes} onChange={handleChange} />
        </div>

        <div>
          <label className="field-label">Follow-up Actions</label>
          <textarea name="follow_up_actions" placeholder="Manual follow-ups..." value={formState.follow_up_actions} onChange={handleChange} />
        </div>

        <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <label className="field-label">AI Suggested Follow-ups</label>
          {formState.ai_suggested_follow_ups ? (
            <div style={{ fontSize: '13.5px', whiteSpace: 'pre-line' }}>{formState.ai_suggested_follow_ups}</div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
              No suggestions yet. The AI will suggest actions based on the conversation context.
            </div>
          )}
        </div>

        <div className="flex justify-end" style={{ marginTop: '24px' }}>
          <button 
            className="btn btn-primary" 
            style={{ padding: '10px 24px' }} 
            onClick={handleLogInteraction}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="typing-dot" style={{ backgroundColor: 'white' }}></div>
                <div className="typing-dot" style={{ backgroundColor: 'white' }}></div>
                <div className="typing-dot" style={{ backgroundColor: 'white' }}></div>
              </>
            ) : (
              'Log Interaction'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormPanel;
