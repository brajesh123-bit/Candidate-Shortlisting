const normalizeSkill = (skill = "") => skill.trim().toLowerCase();

const uniqueNormalizedSkills = (skills = []) =>
  [...new Set(skills.map(normalizeSkill).filter(Boolean))];

const intersectSkills = (left = [], right = []) => {
  const rightSet = new Set(uniqueNormalizedSkills(right));
  return uniqueNormalizedSkills(left).filter((skill) => rightSet.has(skill));
};

const titleCaseSkill = (skill = "") =>
  skill
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

export const scoreCandidate = (candidate, job) => {
  const requiredSkills = uniqueNormalizedSkills(job.requiredSkills);
  const preferredSkills = uniqueNormalizedSkills(job.preferredSkills);
  const candidateSkills = uniqueNormalizedSkills(candidate.skills);
  const matchedRequired = intersectSkills(candidateSkills, requiredSkills);
  const matchedPreferred = intersectSkills(candidateSkills, preferredSkills);

  const requiredSkillScore = requiredSkills.length
    ? matchedRequired.length / requiredSkills.length
    : 1;
  const preferredSkillScore = preferredSkills.length
    ? matchedPreferred.length / preferredSkills.length
    : 0;
  const experienceDelta = candidate.experience - Number(job.minExperience || 0);
  const experienceScore =
    job.minExperience > 0
      ? Math.max(0, Math.min(1, candidate.experience / job.minExperience))
      : 1;

  const weightedScore =
    requiredSkillScore * 0.65 + preferredSkillScore * 0.15 + experienceScore * 0.2;
  const matchScore = Math.round(weightedScore * 100);

  let matchTier = "Low";
  if (matchScore >= 80 && experienceDelta >= 0) {
    matchTier = "High";
  } else if (matchScore >= 55) {
    matchTier = "Medium";
  }

  const explanationParts = [];
  if (matchedRequired.length) {
    explanationParts.push(
      `Matches required skills: ${matchedRequired.map(titleCaseSkill).join(", ")}`
    );
  }
  if (matchedPreferred.length) {
    explanationParts.push(
      `Covers preferred skills: ${matchedPreferred.map(titleCaseSkill).join(", ")}`
    );
  }
  if (experienceDelta >= 0) {
    explanationParts.push(
      `${candidate.experience} years of experience meets the ${job.minExperience || 0}+ year target`
    );
  } else {
    explanationParts.push(
      `${candidate.experience} years of experience is below the ${job.minExperience || 0}+ year target`
    );
  }

  return {
    candidateId: String(candidate._id),
    name: candidate.name,
    email: candidate.email,
    skills: candidate.skills,
    experience: candidate.experience,
    bio: candidate.bio,
    projects: candidate.projects,
    saved: candidate.saved,
    matchScore,
    matchTier,
    matchedSkills: matchedRequired.map(titleCaseSkill),
    preferredSkillsMatched: matchedPreferred.map(titleCaseSkill),
    experienceMet: experienceDelta >= 0,
    explanation: explanationParts.join(". "),
  };
};

export const rankCandidates = (candidates, job) =>
  candidates
    .map((candidate) => scoreCandidate(candidate, job))
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return b.experience - a.experience;
    });
