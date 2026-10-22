import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJobs, getMyApplications } from '../../api/jobs';
import { getErrorMessage } from '../../api/client';
import { Badge, Button, Card, Chip, Heading, Icon, PageHeader, ScoreRing } from '../../components/ui';
import type { Application, Job } from '../../types';

export const Jobs = () => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const fetchJobs = async (search?: string) => {
    try {
      setError('');
      const [allJobs, userApps] = await Promise.all([
        getJobs(search),
        getMyApplications().catch(() => []),
      ]);
      setJobs(allJobs);
      setApplications(userApps);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load jobs.'));
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSearch = (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    fetchJobs(searchQuery);
  };

  // Derive common filter chips from available skills
  const availableSkills = Array.from(
    new Set(jobs.flatMap((j) => j.requiredSkills || []))
  ).slice(0, 4);

  // Client-side filtering if user clicks a chip
  const filteredJobs = jobs.filter((job) => {
    if (activeFilter === 'All') return true;
    return job.requiredSkills?.some((s) => s.toLowerCase() === activeFilter.toLowerCase());
  });

  return (
    <main className="page">
      <PageHeader
        eyebrow="Job board"
        title="Find engineering roles matched to your skills"
        text="Discover roles matched by intelligent resume screening and transparent skill requirements."
      />

      <form className="search-bar" onSubmit={handleSearch}>
        <Icon name="search" />
        <input
          placeholder="Search by role, skill, or company"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search jobs"
        />
        <Button type="submit" loading={searching}>
          Search
        </Button>
      </form>

      <div className="filter-row">
        <span>Filter by</span>
        <Chip
          active={activeFilter === 'All'}
          onClick={() => setActiveFilter('All')}
        >
          All roles
        </Chip>
        {availableSkills.map((skill) => (
          <Chip
            key={skill}
            active={activeFilter.toLowerCase() === skill.toLowerCase()}
            onClick={() => setActiveFilter(skill)}
          >
            {skill}
          </Chip>
        ))}
      </div>

      <div className="results-head">
        <p>
          <strong>
            {filteredJobs.length} {filteredJobs.length === 1 ? 'match' : 'matches'}
          </strong>
          <br />
          <small>Open engineering roles verified for application</small>
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <span className="spinner" />
        </div>
      ) : error ? (
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--red-text)', marginBottom: '16px' }}>{error}</p>
          <Button variant="secondary" onClick={() => fetchJobs(searchQuery)}>
            Retry
          </Button>
        </Card>
      ) : filteredJobs.length === 0 ? (
        <Card style={{ padding: '36px', textAlign: 'center' }}>
          <Heading level={3}>No jobs found</Heading>
          <p style={{ marginTop: '8px' }}>
            Try searching for a different skill, title, or clearing your filters.
          </p>
          <Button
            variant="secondary"
            style={{ marginTop: '16px' }}
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('All');
              fetchJobs('');
            }}
          >
            Clear filters
          </Button>
        </Card>
      ) : (
        <div className="jobs-list">
          {filteredJobs.map((job) => {
            const userAppForJob = applications.find(
              (a) => (typeof a.jobId === 'string' ? a.jobId : a.jobId?._id) === job._id
            );
            const fitScore = userAppForJob?.scores?.total;

            return (
              <Card
                className="job-card"
                key={job._id}
                onClick={() => navigate(`/candidate/jobs/${job._id}`)}
              >
                <div className="company-mark">{(job.company || 'C').slice(0, 1).toUpperCase()}</div>
                <div className="job-main">
                  <small>{job.company} · Remote</small>
                  <Heading level={3}>{job.title}</Heading>
                  <div className="chip-row">
                    {job.requiredSkills?.slice(0, 4).map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </div>
                </div>
                {fitScore !== undefined ? (
                  <ScoreRing value={fitScore} size="small" />
                ) : userAppForJob ? (
                  <Badge tone="teal">Applied</Badge>
                ) : (
                  <Badge tone="neutral">Explore role</Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
};
