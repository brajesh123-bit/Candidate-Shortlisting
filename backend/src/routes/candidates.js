import express from "express";
import {
  createCandidate,
  listCandidates,
  toggleSavedCandidate,
} from "../data/candidateRepository.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { name, email, skills = [], experience, bio = "", projects = [] } = req.body;

    const candidate = await createCandidate({
      name,
      email,
      skills,
      experience,
      bio,
      projects,
    });

    res.status(201).json(candidate);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { search = "", saved } = req.query;
    const candidates = await listCandidates({ search, saved: saved === "true" });
    res.json(candidates);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/save", async (req, res, next) => {
  try {
    const candidate = await toggleSavedCandidate(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.json(candidate);
  } catch (error) {
    next(error);
  }
});

export default router;
