import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Heading,
  Icon,
  PageHeader,
  ScoreRing,
  SectionTitle,
} from '../components/ui';

export const DesignSystem = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    if (user?.role === 'recruiter') {
      navigate('/recruiter');
    } else if (user?.role === 'candidate') {
      navigate('/candidate');
    } else {
      navigate('/');
    }
  };

  return (
    <main className="page system-page">
      <button type="button" className="back-link" onClick={handleBack}>
        <Icon name="back" /> Back
      </button>

      <PageHeader
        eyebrow="HireLens design system"
        title="Calm tools for consequential choices."
        text="A living library of the colors, type, space, and components used throughout HireLens."
      />

      <SectionTitle title="Foundations" />
      <div className="swatches">
        {['paper', 'white', 'ink', 'teal', 'coral', 'sage', 'blue', 'lavender'].map((c) => (
          <div key={c}>
            <i className={`swatch swatch-${c}`} />
            <span>{c}</span>
          </div>
        ))}
      </div>

      <Card className="type-spec" style={{ marginTop: '24px' }}>
        <span>Display / Fraunces</span>
        <Heading level={1}>Clarity with character.</Heading>
        <span>Body / DM Sans</span>
        <p>Readable, warm, and generous enough for careful decisions.</p>
      </Card>

      <SectionTitle title="Components & states" />
      <Card className="component-spec">
        <div>
          <small>Buttons</small>
          <div className="spec-row">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="coral" icon="spark">
              AI action
            </Button>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
          </div>
        </div>

        <div>
          <small>Chips & badges</small>
          <div className="spec-row">
            <Chip active>Active filter</Chip>
            <Badge tone="sage">Verified</Badge>
            <Badge tone="grey">Claimed</Badge>
            <Badge tone="blue">Proof provided</Badge>
            <Badge tone="lavender">AI checked</Badge>
            <Badge tone="red">Rejected</Badge>
            <Badge tone="teal">Shortlisted</Badge>
          </div>
        </div>

        <div>
          <small>Inputs & scores</small>
          <div className="spec-row">
            <Field label="Default field" placeholder="Type something…" />
            <Field
              label="Error state"
              value="invalid-entry"
              error="Enter a valid value."
            />
            <ScoreRing value={84} />
          </div>
        </div>
      </Card>
    </main>
  );
};
