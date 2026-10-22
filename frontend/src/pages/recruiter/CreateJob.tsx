import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob, extractSkillsWithAi } from '../../api/recruiter';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, Field, Heading, Icon, PageHeader } from '../../components/ui';
import type { JobWeights } from '../../types';

export const CreateJob = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minExperience, setMinExperience] = useState(2);

  // Skill chips state
  const [requiredSkills, setRequiredSkills] = useState<string[]>([
    'Node.js',
    'React',
    'MongoDB',
    'TypeScript',
  ]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>(['AWS', 'Docker']);
  const [newRequiredSkill, setNewRequiredSkill] = useState('');
  const [newNiceSkill, setNewNiceSkill] = useState('');
  const [showAddRequired, setShowAddRequired] = useState(false);
  const [showAddNice, setShowAddNice] = useState(false);

  // Weight sliders state (must sum to exactly 100)
  const [weights, setWeights] = useState<JobWeights>({
    skills: 40,
    projects: 30,
    certifications: 20,
    experience: 10,
  });

  const [extracting, setExtracting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState('');

  const totalWeights =
    Number(weights.skills) +
    Number(weights.projects) +
    Number(weights.certifications) +
    Number(weights.experience);

  const isValidWeights = totalWeights === 100;

  const handleWeightChange = (key: keyof JobWeights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  const handleAddRequiredSkill = () => {
    const trimmed = newRequiredSkill.trim();
    if (trimmed && !requiredSkills.includes(trimmed)) {
      setRequiredSkills([...requiredSkills, trimmed]);
      setNewRequiredSkill('');
      setShowAddRequired(false);
    }
  };

  const handleRemoveRequiredSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill));
  };

  const handleAddNiceSkill = () => {
    const trimmed = newNiceSkill.trim();
    if (trimmed && !niceToHaveSkills.includes(trimmed)) {
      setNiceToHaveSkills([...niceToHaveSkills, trimmed]);
      setNewNiceSkill('');
      setShowAddNice(false);
    }
  };

  const handleRemoveNiceSkill = (skill: string) => {
    setNiceToHaveSkills(niceToHaveSkills.filter((s) => s !== skill));
  };

  const handleAiSkillSuggest = async () => {
    if (!description.trim() || description.trim().length < 20) {
      setFormError('Please enter a job description of at least 20 characters before extracting skills.');
      return;
    }
    setFormError('');
    setExtracting(true);
    try {
      const extracted = await extractSkillsWithAi(title, description);
      if (extracted.requiredSkills?.length) {
        setRequiredSkills(Array.from(new Set([...requiredSkills, ...extracted.requiredSkills])));
      }
      if (extracted.niceToHaveSkills?.length) {
        setNiceToHaveSkills(Array.from(new Set([...niceToHaveSkills, ...extracted.niceToHaveSkills])));
      }
      toast('Skills suggested by AI successfully!');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to extract skills.'));
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (isDraft = false) => {
    if (!title.trim() || !description.trim()) {
      setFormError('Job title and description are required.');
      return;
    }
    if (requiredSkills.length === 0) {
      setFormError('Please add at least one required skill.');
      return;
    }
    if (!isValidWeights) {
      setFormError(`Scoring weights must sum to exactly 100% (currently ${totalWeights}%).`);
      return;
    }

    setPublishing(true);
    setFormError('');

    try {
      await createJob({
        title: title.trim(),
        description: description.trim(),
        requiredSkills,
        niceToHaveSkills,
        minExperience,
        weights,
      });

      toast(isDraft ? 'Draft role saved (inactive)' : 'Job published successfully');
      navigate('/recruiter');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to create job'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="page form-page">
      <button type="button" className="back-link" onClick={() => navigate('/recruiter')}>
        <Icon name="back" /> Back to jobs
      </button>

      <PageHeader
        eyebrow="Create a role"
        title="Describe the work, clearly."
        text="Candidates respond to context and transparent scoring—not generic keyword walls."
      />

      <Card className="job-form">
        {formError && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'var(--red)',
              color: 'var(--red-text)',
              marginBottom: '16px',
              fontSize: '0.9rem',
            }}
          >
            {formError}
          </div>
        )}

        <Field
          label="Job title"
          placeholder="e.g. Senior Full-Stack Engineer"
          value={title}
          onChange={setTitle}
          required
        />

        <label className="field">
          <span>Description *</span>
          <textarea
            placeholder="What will this person make possible? Describe the day-to-day work, architecture, and team context."
            rows={7}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>

        <Field
          label="Minimum experience (years)"
          type="number"
          value={String(minExperience)}
          onChange={(v) => setMinExperience(Math.max(0, parseInt(v) || 0))}
        />

        <div className="field-heading">
          <div>
            <strong>Required skills</strong>
            <small>Core competencies evaluated strictly in scoring.</small>
          </div>
          <Button
            variant="coral"
            icon="spark"
            loading={extracting}
            onClick={handleAiSkillSuggest}
          >
            Suggest skills with AI
          </Button>
        </div>

        <div className={`chip-editor ${extracting ? 'shimmer' : ''}`}>
          {requiredSkills.map((s) => (
            <Badge tone="teal" key={s}>
              {s}{' '}
              <button
                type="button"
                onClick={() => handleRemoveRequiredSkill(s)}
                aria-label={`Remove ${s}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Icon name="x" size={13} />
              </button>
            </Badge>
          ))}
          {showAddRequired ? (
            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Skill name"
                value={newRequiredSkill}
                onChange={(e) => setNewRequiredSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRequiredSkill())}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  fontSize: '0.85rem',
                }}
              />
              <Button variant="secondary" onClick={handleAddRequiredSkill}>
                Add
              </Button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAddRequired(true)}>
              <Icon name="plus" /> Add skill
            </button>
          )}
        </div>

        <div className="field-heading">
          <div>
            <strong>Nice-to-have skills</strong>
            <small>Bonus points in ranking, but does not penalize candidates if missing.</small>
          </div>
        </div>

        <div className="chip-editor">
          {niceToHaveSkills.map((s) => (
            <Badge key={s}>
              {s}{' '}
              <button
                type="button"
                onClick={() => handleRemoveNiceSkill(s)}
                aria-label={`Remove ${s}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Icon name="x" size={13} />
              </button>
            </Badge>
          ))}
          {showAddNice ? (
            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Skill name"
                value={newNiceSkill}
                onChange={(e) => setNewNiceSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNiceSkill())}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  fontSize: '0.85rem',
                }}
              />
              <Button variant="secondary" onClick={handleAddNiceSkill}>
                Add
              </Button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAddNice(true)}>
              <Icon name="plus" /> Add skill
            </button>
          )}
        </div>

        <hr />

        <Heading level={2}>How should fit be scored?</Heading>
        <p>The total must equal exactly 100%. Adjust weights according to your team’s priorities.</p>

        <div className="weights">
          <label className="weight">
            <span>
              <strong>Skills</strong>
              <output>{weights.skills}%</output>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={weights.skills}
              onChange={(e) => handleWeightChange('skills', Number(e.target.value))}
            />
          </label>
          <label className="weight">
            <span>
              <strong>Projects</strong>
              <output>{weights.projects}%</output>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={weights.projects}
              onChange={(e) => handleWeightChange('projects', Number(e.target.value))}
            />
          </label>
          <label className="weight">
            <span>
              <strong>Certificates</strong>
              <output>{weights.certifications}%</output>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={weights.certifications}
              onChange={(e) => handleWeightChange('certifications', Number(e.target.value))}
            />
          </label>
          <label className="weight">
            <span>
              <strong>Experience</strong>
              <output>{weights.experience}%</output>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={weights.experience}
              onChange={(e) => handleWeightChange('experience', Number(e.target.value))}
            />
          </label>
        </div>

        <div className="form-actions">
          <span>
            <strong style={{ color: isValidWeights ? 'var(--teal)' : 'var(--coral-dark)' }}>
              {totalWeights}
            </strong>{' '}
            / 100 total
          </span>
          <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={publishing}>
            Save inactive draft
          </Button>
          <Button
            disabled={!isValidWeights || publishing}
            loading={publishing}
            onClick={() => handleSubmit(false)}
          >
            Publish job
          </Button>
        </div>
      </Card>
    </main>
  );
};
