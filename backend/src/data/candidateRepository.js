import mongoose from "mongoose";
import Candidate from "../models/Candidate.js";

const memoryCandidates = [];

const normalizeCandidateInput = (input) => ({
  name: input.name,
  email: input.email?.toLowerCase(),
  skills: Array.isArray(input.skills) ? input.skills : [],
  experience: Number(input.experience || 0),
  bio: input.bio || "",
  projects: Array.isArray(input.projects) ? input.projects : [],
});

const matchesSearch = (candidate, searchTerm) => {
  const value = searchTerm.trim().toLowerCase();
  if (!value) {
    return true;
  }

  return [candidate.name, candidate.email, ...(candidate.skills || [])]
    .join(" ")
    .toLowerCase()
    .includes(value);
};

const sortNewestFirst = (left, right) =>
  new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

export const getStorageMode = () =>
  mongoose.connection.readyState === 1 ? "mongodb" : "memory";

export const createCandidate = async (input) => {
  if (getStorageMode() === "mongodb") {
    return Candidate.create(normalizeCandidateInput(input));
  }

  const normalized = normalizeCandidateInput(input);
  const existing = memoryCandidates.find(
    (candidate) => candidate.email === normalized.email
  );

  if (existing) {
    const duplicateError = new Error("A candidate with this email already exists.");
    duplicateError.code = 11000;
    throw duplicateError;
  }

  const candidate = {
    _id: new mongoose.Types.ObjectId().toString(),
    ...normalized,
    saved: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryCandidates.unshift(candidate);
  return candidate;
};

export const listCandidates = async ({ search = "", saved } = {}) => {
  if (getStorageMode() === "mongodb") {
    const filters = {};

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { skills: { $elemMatch: { $regex: search, $options: "i" } } },
      ];
    }

    if (saved === true) {
      filters.saved = true;
    }

    return Candidate.find(filters).sort({ createdAt: -1 });
  }

  return memoryCandidates
    .filter((candidate) => matchesSearch(candidate, search))
    .filter((candidate) => (saved === true ? candidate.saved : true))
    .sort(sortNewestFirst);
};

export const toggleSavedCandidate = async (candidateId) => {
  if (getStorageMode() === "mongodb") {
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return null;
    }

    candidate.saved = !candidate.saved;
    await candidate.save();
    return candidate;
  }

  const candidate = memoryCandidates.find((item) => item._id === candidateId);
  if (!candidate) {
    return null;
  }

  candidate.saved = !candidate.saved;
  candidate.updatedAt = new Date();
  return candidate;
};
