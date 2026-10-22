import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMyApplications } from "../../api/jobs";
import { getProfile } from "../../api/profile";
import {
  Badge,
  Button,
  Card,
  Heading,
  Icon,
  PageHeader,
  ScoreRing,
  SectionTitle,
} from "../../components/ui";
import type { Application, Job } from "../../types";

/* Tiny SVG bar chart */
interface BarDatum { label: string; value: number; color: string; }
const BarChart = ({ data, maxValue, height = 110 }: { data: BarDatum[]; maxValue?: number; height?: number; }) => {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barW = 32; const gap = 16;
  const svgW = data.length * (barW + gap) - gap;
  return (
    <div style={{ overflowX: "auto", textAlign: "center" }}>
      <svg width={svgW} height={height + 36} viewBox={`0 0 ${svgW} ${height + 36}`} style={{ display: "inline-block" }}>
        {data.map((d, i) => {
          const x = i * (barW + gap);
          const barH = max > 0 ? Math.round((d.value / max) * height) : 0;
          const y = height - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={6} fill={d.color} opacity={0.9} />
              <text x={x + barW / 2} y={Math.max(y - 4, 10)} textAnchor="middle" fontSize={10} fill="var(--ink)" fontWeight={600}>{d.value}</text>
              <text x={x + barW / 2} y={height + 16} textAnchor="middle" fontSize={9} fill="var(--muted)">{d.label.slice(0, 8)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* Donut chart */
interface DonutSeg { value: number; color: string; label: string; }
const Donut = ({ segments, size = 120 }: { segments: DonutSeg[]; size?: number; }) => {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 14; const cx = size / 2; const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((seg) => {
    const pct = seg.value / total;
    const da = `${circ * pct} ${circ * (1 - pct)}`;
    const dOffset = -(offset) * circ;
    offset += pct;
    return { ...seg, da, dOffset };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={arc.color} strokeWidth={18}
          strokeDasharray={arc.da} strokeDashoffset={arc.dOffset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight={700} fill="var(--ink)">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="var(--muted)">total</text>
    </svg>
  );
};

/* Horizontal score bar */
const ScoreBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string; }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <span style={{ color: "var(--muted)" }}>{value} / {max}</span>
    </div>
    <div style={{ height: 8, background: "var(--paper)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${max > 0 ? Math.round((value / max) * 100) : 0}%`, background: color, borderRadius: 4, transition: "width .6s ease" }} />
    </div>
  </div>
);

/* Main Dashboard */
export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [apps, prof] = await Promise.all([
          getMyApplications().catch(() => [] as Application[]),
          getProfile().catch(() => null),
        ]);
        if (mounted) { setApplications(apps); setProfile(prof); }
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const total = applications.length;
  const shortlisted = applications.filter((a) => a.status === "shortlisted").length;
  const inReview = applications.filter((a) => a.status === "applied").length;
  const rejected = applications.filter((a) => a.status === "rejected").length;
  const avgScore = total > 0 ? Math.round(applications.reduce((s, a) => s + (a.scores?.total ?? 0), 0) / total) : 0;
  const bestScore = total > 0 ? Math.max(...applications.map((a) => a.scores?.total ?? 0)) : 0;

  const avgSkills = total > 0 ? Math.round(applications.reduce((s, a) => s + (a.scores?.skills ?? 0), 0) / total) : 0;
  const avgProjects = total > 0 ? Math.round(applications.reduce((s, a) => s + (a.scores?.projects ?? 0), 0) / total) : 0;
  const avgCerts = total > 0 ? Math.round(applications.reduce((s, a) => s + (a.scores?.certifications ?? 0), 0) / total) : 0;
  const avgExp = total > 0 ? Math.round(applications.reduce((s, a) => s + (a.scores?.experience ?? 0), 0) / total) : 0;

  const matchedFreq: Record<string, number> = {};
  applications.forEach((a) => (a.skillGap?.matched || []).forEach((s) => { matchedFreq[s] = (matchedFreq[s] || 0) + 1; }));
  const topMatched = Object.entries(matchedFreq).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const missingFreq: Record<string, number> = {};
  applications.forEach((a) => (a.skillGap?.missing || []).forEach((s) => { missingFreq[s] = (missingFreq[s] || 0) + 1; }));
  const topMissing = Object.entries(missingFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const allCerts = applications.flatMap((a) => a.parsed?.certifications || []);
  const verifiedCerts = allCerts.filter((c) => c.verificationStatus === "verified").length;
  const proofCerts = allCerts.filter((c) => c.verificationStatus === "proof_provided").length;
  const aiCerts = allCerts.filter((c) => c.verificationStatus === "ai_checked").length;
  const claimedCerts = allCerts.filter((c) => c.verificationStatus === "claimed").length;

  const codingStats: any[] = profile?.codingStats || [];
  const totalProblems = codingStats.reduce((s, c) => s + (Number(c.totalSolved) || 0), 0);
  const bestRating = codingStats.reduce((m, c) => Math.max(m, Number(c.rating) || 0), 0);
  const firstName = user?.name ? user.name.split(" ")[0] : "there";

  if (loading) {
    return (
      <main className="page">
        <PageHeader eyebrow="Dashboard" title="Your career analytics" />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><span className="spinner" /></div>
      </main>
    );
  }

  return (
    <main className="page">
      <PageHeader
        eyebrow="Career dashboard"
        title={<>Analytics for <span className="underline">{firstName}</span></>}
        text="A data-driven view of your applications, skills, and readiness — all in one place."
        action={<Button variant="primary" icon="briefcase" onClick={() => navigate("/candidate/jobs")}>Browse Roles</Button>}
      />

      {/* KPI strip */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))" }}>
        {[
          { label: "Applications", value: total, sub: "Total submitted", hi: false },
          { label: "Shortlisted", value: shortlisted, sub: "Active candidates", hi: shortlisted > 0 },
          { label: "Under Review", value: inReview, sub: "Awaiting decision", hi: false },
          { label: "Avg Fit Score", value: `${avgScore}%`, sub: "Across all roles", hi: avgScore >= 60 },
          { label: "Best Score", value: `${bestScore}%`, sub: "Top application", hi: bestScore >= 80 },
        ].map((k) => (
          <Card key={k.label} className="stat">
            <small>{k.label}</small>
            <strong>{k.value}</strong>
            <span className={k.hi ? "positive" : ""}>{k.sub}</span>
          </Card>
        ))}
      </div>

      {total === 0 ? (
        <Card style={{ padding: "64px 32px", textAlign: "center", marginTop: 32 }}>
          <div style={{ display: "inline-flex", padding: 20, background: "var(--paper)", borderRadius: "50%", marginBottom: 20 }}>
            <Icon name="spark" size={36} />
          </div>
          <Heading level={3}>Apply to your first role to unlock dashboard analytics</Heading>
          <p style={{ marginTop: 8, color: "var(--muted)", maxWidth: 400, marginInline: "auto" }}>
            Once you submit applications, your dashboard will populate with score breakdowns, skill analysis, certification trust scores, and application trends.
          </p>
          <Button style={{ marginTop: 24 }} variant="primary" icon="search" onClick={() => navigate("/candidate/jobs")}>Find Roles</Button>
        </Card>
      ) : (
        <>
          {/* Row 1: Status donut + Score breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20, marginTop: 28 }}>
            <Card style={{ padding: 24 }}>
              <Heading level={3} style={{ marginBottom: 18 }}>Application Status</Heading>
              <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
                <Donut size={130} segments={[
                  { value: shortlisted, color: "var(--teal)", label: "Shortlisted" },
                  { value: inReview, color: "#60a5fa", label: "In Review" },
                  { value: rejected, color: "#f87171", label: "Rejected" },
                ]} />
                <div style={{ display: "grid", gap: 12, flex: 1 }}>
                  {[{ label: "Shortlisted", count: shortlisted, color: "var(--teal)" },
                    { label: "Under Review", count: inReview, color: "#60a5fa" },
                    { label: "Not Selected", count: rejected, color: "#f87171" }].map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
                      <strong style={{ fontSize: 14 }}>{s.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <Heading level={3}>Avg Score Breakdown</Heading>
                <ScoreRing value={avgScore} size="small" />
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <ScoreBar label="Skills" value={avgSkills} max={45} color="var(--teal)" />
                <ScoreBar label="Projects" value={avgProjects} max={30} color="#60a5fa" />
                <ScoreBar label="Certifications" value={avgCerts} max={20} color="#a78bfa" />
                <ScoreBar label="Experience" value={avgExp} max={5} color="#f59e0b" />
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>Averaged across {total} application{total !== 1 ? "s" : ""}</p>
            </Card>
          </div>

          {/* Row 2: Per-application bar chart */}
          {applications.length > 1 && (
            <Card style={{ padding: 24, marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <Heading level={3}>Fit Score Per Application</Heading>
                <Badge tone="teal">Live AI scores</Badge>
              </div>
              <BarChart
                data={applications.map((a) => {
                  const score = a.scores?.total ?? 0;
                  return {
                    label: typeof a.jobId === "object" ? ((a.jobId as Job).title?.split(" ")[0] || "Role") : "Role",
                    value: score,
                    color: score >= 75 ? "var(--teal)" : score >= 50 ? "#60a5fa" : "#f59e0b",
                  };
                })}
                maxValue={100}
                height={100}
              />
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, textAlign: "center" }}>
                🟢 ≥75%  🔵 ≥50%  🟡 &lt;50%
              </p>
            </Card>
          )}

          {/* Row 3: Skills */}
          <SectionTitle title="Skills Analysis" text="Based on requirements across all your applied roles" style={{ marginTop: 32 } as any} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
            <Card style={{ padding: 24 }}>
              <Heading level={3} style={{ marginBottom: 14 }}>✓ Your Strongest Skills</Heading>
              {topMatched.length === 0 ? <p style={{ color: "var(--muted)", fontSize: 13 }}>No skill data yet.</p> : (
                <div style={{ display: "grid", gap: 10 }}>
                  {topMatched.map(([skill, count]) => (
                    <div key={skill}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{skill}</span>
                        <span style={{ color: "var(--muted)" }}>{count}/{total}</span>
                      </div>
                      <div style={{ height: 6, background: "var(--paper)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(count / total) * 100}%`, background: "var(--teal)", borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card style={{ padding: 24 }}>
              <Heading level={3} style={{ marginBottom: 14 }}>📈 Skills to Grow</Heading>
              {topMissing.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>No skill gaps detected — great work!</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {topMissing.map(([skill, count]) => (
                    <div key={skill}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{skill}</span>
                        <Badge tone={count >= total * 0.7 ? "red" : "amber"}>{count}/{total}</Badge>
                      </div>
                      <div style={{ height: 6, background: "var(--paper)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(count / total) * 100}%`, background: count >= total * 0.7 ? "#f87171" : "#f59e0b", borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {topMissing.length > 0 && (
                <Button variant="ghost" style={{ marginTop: 14, fontSize: 12 }} onClick={() => navigate("/candidate/applications")}>
                  View full gap analysis →
                </Button>
              )}
            </Card>
          </div>

          {/* Row 4: Certification status */}
          {allCerts.length > 0 && (
            <>
              <SectionTitle title="Certification Trust Score" text="Verified credentials have a direct impact on your AI fit score" style={{ marginTop: 32 } as any} />
              <Card style={{ padding: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "start" }}>
                  <Donut size={110} segments={[
                    { value: verifiedCerts, color: "var(--teal)", label: "Verified" },
                    { value: aiCerts, color: "#a78bfa", label: "AI Checked" },
                    { value: proofCerts, color: "#60a5fa", label: "Proof" },
                    { value: claimedCerts, color: "#e5e7eb", label: "Claimed" },
                  ]} />
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 14 }}>
                      {[{ label: "Verified", count: verifiedCerts, color: "var(--teal)", desc: "+100% multiplier" },
                        { label: "AI Checked", count: aiCerts, color: "#a78bfa", desc: "+60–80% multiplier" },
                        { label: "Proof Provided", count: proofCerts, color: "#60a5fa", desc: "+60% multiplier" },
                        { label: "Claimed Only", count: claimedCerts, color: "#e5e7eb", desc: "+30% multiplier" }].map((s) => (
                        <div key={s.label} style={{ display: "flex", gap: 8, padding: "10px 12px", background: "var(--paper)", borderRadius: 10 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.count} {s.label}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {claimedCerts > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.2)", borderRadius: 10, fontSize: 13 }}>
                        <Icon name="shield" size={16} />
                        <span><strong>{claimedCerts}</strong> credential{claimedCerts !== 1 ? "s" : ""} without proof — add documents to boost your trust score.</span>
                        <Button variant="secondary" style={{ marginLeft: "auto", fontSize: 12 }} onClick={() => navigate("/candidate/certificates")}>Add Proof</Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Row 5: Coding stats */}
          {codingStats.length > 0 && (
            <>
              <SectionTitle title="Coding Platform Performance" text="Verified problem-solving evidence automatically attached to your applications" style={{ marginTop: 32 } as any} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
                {codingStats.map((stat: any) => (
                  <Card key={stat.platform} style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontWeight: 600, textTransform: "capitalize", fontSize: 14 }}>{stat.platform}</span>
                      <Badge tone={stat.status === "ok" ? "sage" : stat.status === "partial" ? "amber" : "grey"}>
                        {stat.status === "ok" ? "Live" : stat.status === "partial" ? "Partial" : "Offline"}
                      </Badge>
                    </div>
                    {stat.totalSolved != null && (
                      <>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--teal)", lineHeight: 1 }}>{stat.totalSolved}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Problems solved</div>
                      </>
                    )}
                    {stat.rating != null && (
                      <>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{stat.rating}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>Contest rating</div>
                      </>
                    )}
                    {stat.platform === "leetcode" && stat.easySolved != null && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        <Badge tone="sage">Easy: {stat.easySolved}</Badge>
                        <Badge tone="amber">Med: {stat.mediumSolved ?? "—"}</Badge>
                        <Badge tone="red">Hard: {stat.hardSolved ?? "—"}</Badge>
                      </div>
                    )}
                    {stat.profileUrl && (
                      <a href={stat.profileUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: "var(--teal)", display: "flex", alignItems: "center", gap: 4, marginTop: 10, textDecoration: "none" }}>
                        View profile <Icon name="external" size={12} />
                      </a>
                    )}
                  </Card>
                ))}
                {codingStats.length > 1 && (
                  <Card style={{ padding: 20, background: "var(--paper)", border: "1px dashed var(--line)" }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>COMBINED</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "var(--teal)", lineHeight: 1 }}>{totalProblems}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Total problems solved</div>
                    {bestRating > 0 && (
                      <>
                        <div style={{ fontSize: 20, fontWeight: 600 }}>{bestRating}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Peak rating</div>
                      </>
                    )}
                  </Card>
                )}
              </div>
            </>
          )}

          {/* Row 6: Application timeline */}
          <SectionTitle title="Application Timeline" text="Your most recent submissions and their status" style={{ marginTop: 32 } as any} />
          <Card style={{ padding: 24, marginBottom: 8 }}>
            {applications.slice(0, 6).map((app, idx) => {
              const job = typeof app.jobId === "object" ? (app.jobId as Job) : null;
              const score = app.scores?.total ?? 0;
              return (
                <div key={app._id} style={{ display: "grid", gridTemplateColumns: "10px 1fr auto auto", gap: 16, alignItems: "center", padding: "14px 0", borderBottom: idx < Math.min(applications.length, 6) - 1 ? "1px solid var(--line)" : "none" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: app.status === "shortlisted" ? "var(--teal)" : app.status === "rejected" ? "#f87171" : "#60a5fa" }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{job?.title || "Engineering Role"}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {job?.company || "Company"} · {new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <Badge tone={app.status === "shortlisted" ? "teal" : app.status === "rejected" ? "red" : "grey"}>
                    {app.status === "shortlisted" ? "Shortlisted" : app.status === "rejected" ? "Not selected" : "Under review"}
                  </Badge>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: score >= 75 ? "var(--teal)" : score >= 50 ? "#60a5fa" : "var(--muted)" }}>{score}%</span>
                    {job && (
                      <button type="button" className="icon-btn" title="View fit report"
                        onClick={() => navigate(`/candidate/jobs/${job._id}/report`, { state: { application: app } })}>
                        <Icon name="arrow" size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {applications.length > 6 && (
              <div style={{ paddingTop: 12, textAlign: "center" }}>
                <Button variant="ghost" onClick={() => navigate("/candidate/applications")}>
                  View all {applications.length} applications
                </Button>
              </div>
            )}
          </Card>

          {/* Row 7: Quick actions */}
          <SectionTitle title="Quick Actions" text="Your next steps to improve your candidacy" style={{ marginTop: 32 } as any} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { icon: "briefcase", title: "Browse open roles", desc: "Find engineering roles matched to your skill set.", action: () => navigate("/candidate/jobs"), label: "Browse Jobs", variant: "primary" },
              { icon: "shield", title: "Verify credentials", desc: `${claimedCerts > 0 ? claimedCerts + " credential(s)" : "No credentials"} waiting for proof documents.`, action: () => navigate("/candidate/certificates"), label: "Add Proof", variant: "secondary" },
              { icon: "code", title: "Coding profiles", desc: `${codingStats.length > 0 ? codingStats.length + " platform(s) connected." : "Link LeetCode, HackerRank, or CodeChef to boost your rankings."}`, action: () => navigate("/candidate/profiles"), label: "Manage", variant: "secondary" },
            ].map((a) => (
              <Card key={a.title} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ padding: 8, background: "var(--paper)", borderRadius: 10, color: "var(--teal)" }}><Icon name={a.icon} size={20} /></div>
                  <strong style={{ fontSize: 14 }}>{a.title}</strong>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{a.desc}</p>
                <Button variant={a.variant as "primary" | "secondary"} style={{ marginTop: "auto" }} onClick={a.action}>{a.label}</Button>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
};

