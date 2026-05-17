import { rankCandidates } from "../utils/matching.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const extractJson = (content) => {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : content;
  const jsonStart = candidate.indexOf("{");
  const jsonEnd = candidate.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("AI response did not contain JSON.");
  }

  return JSON.parse(candidate.slice(jsonStart, jsonEnd + 1));
};

export const getAiShortlist = async ({ candidates, job, apiKey, model }) => {
  const baselineRankings = rankCandidates(candidates, job);
  if (!apiKey) {
    return {
      aiEnabled: false,
      modelUsed: null,
      insights: baselineRankings.slice(0, 5).map((candidate, index) => ({
        rank: index + 1,
        candidateId: candidate.candidateId,
        name: candidate.name,
        score: candidate.matchScore,
        recommendation: `OpenRouter is not configured, so this recommendation uses the platform's scoring model. ${candidate.explanation}.`,
        interviewQuestions: [
          `Walk through a project where you used ${candidate.matchedSkills[0] || "your core skills"}.`,
          "How do you prioritize tradeoffs when requirements change?",
        ],
      })),
      fallbackReason: "Missing OPENROUTER_API_KEY",
    };
  }

  const prompt = {
    job,
    candidates: baselineRankings.map((candidate) => ({
      candidateId: candidate.candidateId,
      name: candidate.name,
      skills: candidate.skills,
      experience: candidate.experience,
      bio: candidate.bio,
      projects: candidate.projects,
      baselineMatchScore: candidate.matchScore,
      baselineMatchTier: candidate.matchTier,
      matchedSkills: candidate.matchedSkills,
      preferredSkillsMatched: candidate.preferredSkillsMatched,
      baselineExplanation: candidate.explanation,
    })),
  };

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a recruiting assistant. Rank candidates fairly and return valid JSON only.",
        },
        {
          role: "user",
          content: `Analyze the job and candidates, then respond as JSON with this shape: {"insights":[{"rank":1,"candidateId":"...","name":"...","score":92,"recommendation":"...","interviewQuestions":["...","..."]}],"summary":"..."}. Keep scores between 0 and 100. Use the candidateId values exactly as provided.\n\n${JSON.stringify(
            prompt,
            null,
            2
          )}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter response was empty.");
  }

  const parsed = extractJson(content);

  return {
    aiEnabled: true,
    modelUsed: model,
    insights: Array.isArray(parsed.insights) ? parsed.insights : [],
    summary: parsed.summary || "",
  };
};
