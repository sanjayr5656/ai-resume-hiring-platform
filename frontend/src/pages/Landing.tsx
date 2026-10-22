import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Heading, Icon, Logo } from '../components/ui';

export const Landing = () => {
  const navigate = useNavigate();

  const handlePick = (role: 'candidate' | 'recruiter') => {
    navigate(`/auth?role=${role}`);
  };

  return (
    <main className="landing">
      <div className="landing-nav">
        <Logo />
        <Button variant="ghost" onClick={() => navigate('/auth?mode=login')}>
          Sign in
        </Button>
      </div>

      <section className="hero">
        <Badge tone="teal">
          <Icon name="spark" size={14} /> AI-Powered Resume Screening & Precision Matching
        </Badge>
        <Heading level={1}>
          Smart Resume Screening for High-Impact Teams
        </Heading>
        <p>Connecting verified talent with forward-thinking employers through intelligent skill analysis and objective fit scoring.</p>
      </section>

      <section className="path-grid">
        <Card className="path-card hiring" onClick={() => handlePick('recruiter')}>
          <div className="path-icon">
            <Icon name="briefcase" size={28} />
          </div>
          <span className="eyebrow">For teams</span>
          <Heading level={2}>I’m hiring</Heading>
          <p>See the whole candidate—not just the right keywords.</p>
          <span className="text-link">
            Start hiring <Icon name="arrow" />
          </span>
        </Card>

        <Card className="path-card looking" onClick={() => handlePick('candidate')}>
          <div className="path-icon">
            <Icon name="user" size={28} />
          </div>
          <span className="eyebrow">For candidates</span>
          <Heading level={2}>I’m looking for a job</Heading>
          <p>Discover where you fit and show what you can really do.</p>
          <span className="text-link">
            Find your next role <Icon name="arrow" />
          </span>
        </Card>
      </section>

      <section className="how">
        <div>
          <span>01</span>
          <strong>Build your lens</strong>
          <p>Share what matters, whether you’re hiring or growing.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Find the signal</strong>
          <p>AI surfaces meaningful matches and explains why.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Decide with care</strong>
          <p>People stay in control at every important moment.</p>
        </div>
      </section>

      <footer>
        <Logo />
        <span>Clearer paths. Better work.</span>
        <span>Evidence-based technical hiring · Precision fit evaluation</span>
      </footer>
    </main>
  );
};
