import express from "express";
import { listCandidates } from "../data/candidateRepository.js";
import { getAiShortlist } from "../services/openRouterService.js";
import { rankCandidates } from "../utils/matching.js";

const router = express.Router();

router.post("/match", async (req, res, next) => {
  try {
    const { requiredSkills = [], preferredSkills = [], minExperience = 0 } = req.body;
    const candidates = await listCandidates();
    const rankings = rankCandidates(candidates, {
      requiredSkills,
      preferredSkills,
      minExperience,
    });

    res.json({
      totalCandidates: rankings.length,
      rankings,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/ai/shortlist", async (req, res, next) => {
  try {
    const { requiredSkills = [], preferredSkills = [], minExperience = 0 } = req.body;
    const candidates = await listCandidates();
    const job = { requiredSkills, preferredSkills, minExperience };

    let aiResult;
    try {
      aiResult = await getAiShortlist({
        candidates,
        job,
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || "google/gemma-2-9b-it:free",
      });
    } catch (error) {
      aiResult = {
        aiEnabled: false,
        modelUsed: null,
        summary: "",
        fallbackReason: error.message,
        insights: rankCandidates(candidates, job).slice(0, 5).map((candidate, index) => ({
          rank: index + 1,
          candidateId: candidate.candidateId,
          name: candidate.name,
          score: candidate.matchScore,
          recommendation: `Fallback recommendation based on platform scoring. ${candidate.explanation}.`,
          interviewQuestions: [
            `Describe a project where you applied ${candidate.matchedSkills[0] || "your strongest skill"}.`,
            "How would you approach learning a missing skill quickly on the job?",
          ],
        })),
      };
    }

    res.json(aiResult);
  } catch (error) {
    next(error);
  }
});

export default router;
