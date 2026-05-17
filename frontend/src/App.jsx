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

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Recruiting Intelligence Dashboard</p>
          <h1>Candidate Profile Shortlisting System</h1>
          <p className="hero-copy">
            Add candidate profiles, define job requirements, score matches, and ask
            OpenRouter AI to explain the strongest fits.
          </p>
        </div>
        <div className="hero-card">
          <div className="metric">
            <span>{candidates.length}</span>
            <p>Candidates tracked</p>
          </div>
          <div className="metric">
            <span>{rankings.filter((candidate) => candidate.matchTier === "High").length}</span>
            <p>High match profiles</p>
          </div>
          <div className="metric">
            <span>{candidates.filter((candidate) => candidate.saved).length}</span>
            <p>Saved candidates</p>
          </div>
        </div>
      </header>

      {error ? <div className="banner error">{error}</div> : null}

      <main className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Candidate Intake</p>
              <h2>Add Candidate</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleCandidateSubmit}>
            <input name="name" placeholder="Candidate name" value={candidateForm.name} onChange={handleCandidateChange} required />
            <input name="email" type="email" placeholder="Email address" value={candidateForm.email} onChange={handleCandidateChange} required />
            <input name="skills" placeholder="Skills: React, Node.js, MongoDB" value={candidateForm.skills} onChange={handleCandidateChange} required />
            <input name="experience" type="number" min="0" placeholder="Experience in years" value={candidateForm.experience} onChange={handleCandidateChange} required />
            <textarea name="bio" placeholder="Short bio / summary" value={candidateForm.bio} onChange={handleCandidateChange} rows="4" />
            <textarea name="projects" placeholder="Projects: ATS dashboard, Hiring portal" value={candidateForm.projects} onChange={handleCandidateChange} rows="4" />
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Add Candidate"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Job Matching</p>
              <h2>Define Requirement</h2>
            </div>
          </div>
          <div className="form-grid">
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

          <div className="summary-card">
            <h3>What this scores</h3>
            <p>Required skills carry the most weight, then preferred skills, then experience fit.</p>
          </div>
        </section>

        <section className="panel panel-wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Talent Pool</p>
              <h2>Candidate List</h2>
            </div>
            <input className="search-input" placeholder="Search by name, email, or skill" value={search} onChange={handleSearch} />
          </div>
          <div className="candidate-grid">
            {candidates.map((candidate) => (
              <article className="candidate-card" key={candidate._id}>
                <div className="candidate-topline">
                  <div>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.email}</p>
                  </div>
                  <button className={candidate.saved ? "save-button active" : "save-button"} type="button" onClick={() => handleToggleSave(candidate._id)}>
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

        <section className="panel panel-wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Ranked Output</p>
              <h2>Shortlisted Candidates</h2>
            </div>
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
        </section>

        <section className="panel panel-wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AI Recommendations</p>
              <h2>OpenRouter Insights</h2>
            </div>
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
      </main>
    </div>
  );
}

export default App;
