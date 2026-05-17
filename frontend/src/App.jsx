import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://localhost:5000");

const initialCandidateForm = {
  name: "",
  email: "",
  skills: "",
  experience: "",
  bio: "",
  projects: "",
};

const initialJobForm = {
  requiredSkills: "React, Node.js",
  preferredSkills: "MongoDB, AWS",
  minExperience: "2",
};

const sections = [
  { id: "overview", label: "Overview" },
  { id: "add", label: "Add Candidate" },
  { id: "pool", label: "Candidate Pool" },
  { id: "shortlist", label: "Shortlisting" },
  { id: "ai", label: "AI Insights" },
];

const parseCommaSeparated = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const scoreColor = (score) => {
  if (score >= 80) return "var(--high)";
  if (score >= 55) return "var(--medium)";
  return "var(--low)";
};

function App() {
  const [activeSection, setActiveSection] = useState("overview");
  const [candidateForm, setCandidateForm] = useState(initialCandidateForm);
  const [jobForm, setJobForm] = useState(initialJobForm);
  const [candidates, setCandidates] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [aiMeta, setAiMeta] = useState({ aiEnabled: false, summary: "", fallbackReason: "" });
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCandidates = async (query = "") => {
    const response = await fetch(
      `${API_BASE_URL}/api/candidates${query ? `?search=${encodeURIComponent(query)}` : ""}`
    );
    if (!response.ok) {
      throw new Error("Unable to load candidates");
    }
    const data = await response.json();
    setCandidates(data);
  };

  useEffect(() => {
    loadCandidates().catch((loadError) => setError(loadError.message));
  }, []);

  const handleCandidateChange = (event) => {
    const { name, value } = event.target;
    setCandidateForm((current) => ({ ...current, [name]: value }));
  };

  const handleJobChange = (event) => {
    const { name, value } = event.target;
    setJobForm((current) => ({ ...current, [name]: value }));
  };

  const handleCandidateSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/candidates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: candidateForm.name,
          email: candidateForm.email,
          skills: parseCommaSeparated(candidateForm.skills),
          experience: Number(candidateForm.experience),
          bio: candidateForm.bio,
          projects: parseCommaSeparated(candidateForm.projects),
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || "Unable to add candidate");
      }

      setCandidateForm(initialCandidateForm);
      await loadCandidates(search);
      setActiveSection("pool");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const jobPayload = {
    requiredSkills: parseCommaSeparated(jobForm.requiredSkills),
    preferredSkills: parseCommaSeparated(jobForm.preferredSkills),
    minExperience: Number(jobForm.minExperience || 0),
  };

  const handleMatch = async () => {
    setIsMatching(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobPayload),
      });

      if (!response.ok) {
        throw new Error("Unable to match candidates");
      }

      const data = await response.json();
      setRankings(data.rankings);
      setActiveSection("shortlist");
    } catch (matchError) {
      setError(matchError.message);
    } finally {
      setIsMatching(false);
    }
  };

  const handleAiShortlist = async () => {
    setIsAiLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/shortlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobPayload),
      });

      if (!response.ok) {
        throw new Error("Unable to generate AI shortlist");
      }

      const data = await response.json();
      setAiInsights(data.insights || []);
      setAiMeta({
        aiEnabled: Boolean(data.aiEnabled),
        summary: data.summary || "",
        fallbackReason: data.fallbackReason || "",
      });
      setActiveSection("ai");
    } catch (aiError) {
      setError(aiError.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleToggleSave = async (candidateId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/candidates/${candidateId}/save`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Unable to update saved state");
      }

      await loadCandidates(search);
      if (rankings.length) {
        await handleMatch();
      }
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const handleSearch = async (event) => {
    const value = event.target.value;
    setSearch(value);
    try {
      await loadCandidates(value);
    } catch (searchError) {
      setError(searchError.message);
    }
  };

  const topCandidate = rankings[0];
  const savedCount = candidates.filter((candidate) => candidate.saved).length;
  const highMatchCount = rankings.filter((candidate) => candidate.matchTier === "High").length;

  const renderOverview = () => (
    <>
      <section className="hero-surface">
        <div className="hero-copy-block">
          <p className="eyebrow">AI Recruiting Workspace</p>
          <h1>Turn your candidate pipeline into a clear hiring decision.</h1>
          <p className="hero-copy">
            Add profiles, screen talent with structured scoring, and open AI-generated fit
            insights only when you need deeper context. Everything stays organized in
            dedicated sections instead of one crowded page.
          </p>
          <div className="quick-actions">
            <button className="primary-button" type="button" onClick={() => setActiveSection("add")}>
              Add candidate
            </button>
            <button className="ghost-button" type="button" onClick={() => setActiveSection("shortlist")}>
              Start shortlisting
            </button>
          </div>
          <div className="hero-proof">
            <span>Structured screening</span>
            <span>AI ranking</span>
            <span>Recruiter-ready notes</span>
          </div>
        </div>

        <div className="hero-aside">
          <article className="insight-tile primary">
            <p className="eyebrow">Top Match</p>
            <h3>{topCandidate ? topCandidate.name : "Waiting for shortlist"}</h3>
            <p>
              {topCandidate
                ? `${topCandidate.matchScore}% fit across required skills and experience.`
                : "Run matching to surface your strongest candidate instantly."}
            </p>
          </article>
          <article className="insight-tile">
            <span>{candidates.length}</span>
            <p>Candidates tracked</p>
          </article>
          <article className="insight-tile">
            <span>{savedCount}</span>
            <p>Saved for follow-up</p>
          </article>
        </div>
      </section>

      <section className="content-panel feature-strip">
        <article className="feature-card">
          <p className="eyebrow">01</p>
          <h3>Add candidate profiles</h3>
          <p>Capture skills, experience, projects, and bios in a clean intake flow.</p>
          <button className="text-button" type="button" onClick={() => setActiveSection("add")}>
            Open intake
          </button>
        </article>
        <article className="feature-card">
          <p className="eyebrow">02</p>
          <h3>Score and shortlist</h3>
          <p>Match candidates against required and preferred skills in a dedicated ranking view.</p>
          <button className="text-button" type="button" onClick={() => setActiveSection("shortlist")}>
            View shortlist
          </button>
        </article>
        <article className="feature-card">
          <p className="eyebrow">03</p>
          <h3>Open AI insights</h3>
          <p>Get recommendation summaries and interview prompts without leaving the workflow.</p>
          <button className="text-button" type="button" onClick={() => setActiveSection("ai")}>
            See insights
          </button>
        </article>
      </section>
    </>
  );

  const renderAddCandidate = () => (
    <section className="content-panel split-panel">
      <div className="section-copy">
        <p className="eyebrow">Candidate Intake</p>
        <h2>Add a new candidate profile</h2>
        <p>
          Capture the essentials first: identity, skills, experience, a short bio, and
          notable projects.
        </p>
        <div className="journey-card">
          <h3>What goes in a strong profile?</h3>
          <p>Use specific skills, real project names, and a short summary that explains where this person is strongest.</p>
        </div>
      </div>
      <form className="form-card" onSubmit={handleCandidateSubmit}>
        <input name="name" placeholder="Candidate name" value={candidateForm.name} onChange={handleCandidateChange} required />
        <input name="email" type="email" placeholder="Email address" value={candidateForm.email} onChange={handleCandidateChange} required />
        <input name="skills" placeholder="Skills: React, Node.js, MongoDB" value={candidateForm.skills} onChange={handleCandidateChange} required />
        <input name="experience" type="number" min="0" placeholder="Experience in years" value={candidateForm.experience} onChange={handleCandidateChange} required />
        <textarea name="bio" placeholder="Short bio / summary" value={candidateForm.bio} onChange={handleCandidateChange} rows="4" />
        <textarea name="projects" placeholder="Projects: ATS dashboard, hiring portal" value={candidateForm.projects} onChange={handleCandidateChange} rows="4" />
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Candidate"}
        </button>
      </form>
    </section>
  );

  const renderCandidatePool = () => (
    <section className="content-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Candidate Pool</p>
          <h2>Browse and manage profiles</h2>
        </div>
        <input
          className="search-input"
          placeholder="Search by name, email, or skill"
          value={search}
          onChange={handleSearch}
        />
      </div>
      <div className="candidate-grid">
        {candidates.map((candidate) => (
          <article className="candidate-card" key={candidate._id}>
            <div className="candidate-topline">
              <div>
                <h3>{candidate.name}</h3>
                <p>{candidate.email}</p>
              </div>
              <button
                className={candidate.saved ? "save-button active" : "save-button"}
                type="button"
                onClick={() => handleToggleSave(candidate._id)}
              >
                {candidate.saved ? "Saved" : "Save"}
              </button>
            </div>
            <p className="candidate-bio">{candidate.bio || "No bio added yet."}</p>
            <div className="tag-row">
              {candidate.skills.map((skill) => (
                <span className="tag" key={`${candidate._id}-${skill}`}>
                  {skill}
                </span>
              ))}
            </div>
            <p className="muted">{candidate.experience} years experience</p>
          </article>
        ))}
        {!candidates.length ? <p className="empty-state">No candidates found yet.</p> : null}
      </div>
    </section>
  );

  const renderShortlisting = () => (
    <section className="content-panel split-panel">
      <div className="section-stack">
        <div className="section-copy">
          <p className="eyebrow">Shortlisting</p>
          <h2>Define the job requirement</h2>
          <p>Score candidates by required skills, preferred skills, and minimum experience.</p>
        </div>
        <div className="form-card compact">
          <input name="requiredSkills" placeholder="Required skills" value={jobForm.requiredSkills} onChange={handleJobChange} />
          <input name="preferredSkills" placeholder="Preferred skills" value={jobForm.preferredSkills} onChange={handleJobChange} />
          <input name="minExperience" type="number" min="0" placeholder="Minimum experience" value={jobForm.minExperience} onChange={handleJobChange} />
          <div className="button-row">
            <button className="primary-button" type="button" onClick={handleMatch} disabled={isMatching}>
              {isMatching ? "Scoring..." : "Run Basic Match"}
            </button>
            <button className="secondary-button" type="button" onClick={handleAiShortlist} disabled={isAiLoading}>
              {isAiLoading ? "Thinking..." : "AI Shortlist"}
            </button>
          </div>
        </div>
        <div className="journey-card">
          <h3>How the ranking works</h3>
          <p>Required skills carry the most weight, preferred skills refine the order, and experience confirms readiness.</p>
        </div>
      </div>
      <div className="results-column">
        <div className="section-copy">
          <p className="eyebrow">Ranked Output</p>
          <h2>Shortlisted candidates</h2>
        </div>
        <div className="results-list">
          {rankings.map((candidate) => (
            <article className="result-card" key={candidate.candidateId}>
              <div className="result-heading">
                <div>
                  <h3>{candidate.name}</h3>
                  <p>{candidate.matchTier} Match</p>
                </div>
                <strong>{candidate.matchScore}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-bar"
                  style={{
                    width: `${candidate.matchScore}%`,
                    background: scoreColor(candidate.matchScore),
                  }}
                />
              </div>
              <p>{candidate.explanation}</p>
              <p className="muted">
                Matched skills: {candidate.matchedSkills.length ? candidate.matchedSkills.join(", ") : "None"}
              </p>
            </article>
          ))}
          {!rankings.length ? <p className="empty-state">Run a basic match to see ranked candidates.</p> : null}
        </div>
      </div>
    </section>
  );

  const renderAiInsights = () => (
    <section className="content-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">AI Insights</p>
          <h2>OpenRouter recommendations</h2>
        </div>
        <button className="primary-button" type="button" onClick={handleAiShortlist} disabled={isAiLoading}>
          {isAiLoading ? "Refreshing..." : "Refresh Insights"}
        </button>
      </div>
      {aiMeta.summary ? <div className="banner">{aiMeta.summary}</div> : null}
      {!aiMeta.aiEnabled && aiMeta.fallbackReason ? (
        <div className="banner warning">Fallback mode: {aiMeta.fallbackReason}</div>
      ) : null}
      <div className="results-list">
        {aiInsights.map((item) => (
          <article className="result-card ai-card" key={`${item.candidateId}-${item.rank}`}>
            <div className="result-heading">
              <div>
                <h3>
                  #{item.rank} {item.name}
                </h3>
                <p>AI fit score {item.score}%</p>
              </div>
            </div>
            <p>{item.recommendation}</p>
            <div className="interview-box">
              <h4>Suggested interview questions</h4>
              <ul>
                {(item.interviewQuestions || []).map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
        {!aiInsights.length ? <p className="empty-state">Run AI shortlist to see recommendation summaries.</p> : null}
      </div>
    </section>
  );

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-row">
          <div className="brand-mark">SP</div>
          <div>
            <p className="eyebrow">Candidate Intelligence</p>
            <h2>SquarePeg-inspired Hiring Workspace</h2>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" type="button" onClick={() => setActiveSection("pool")}>
            Candidate pool
          </button>
          <button className="primary-button" type="button" onClick={() => setActiveSection("add")}>
            Add candidate
          </button>
        </div>
      </header>

      <main className="main-shell">
        <section className="workspace-nav">
          <div>
            <p className="eyebrow">Workflow</p>
            <h1>{sections.find((section) => section.id === activeSection)?.label}</h1>
          </div>
          <nav className="pill-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? "pill-button active" : "pill-button"}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </section>

        {error ? <div className="banner error">{error}</div> : null}

        {activeSection === "overview" ? renderOverview() : null}
        {activeSection === "add" ? renderAddCandidate() : null}
        {activeSection === "pool" ? renderCandidatePool() : null}
        {activeSection === "shortlist" ? renderShortlisting() : null}
        {activeSection === "ai" ? renderAiInsights() : null}
      </main>
    </div>
  );
}

export default App;
