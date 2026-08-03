import type { Repo } from "./types.js";

export interface CompareSummary {
  headline: string;
  evidence: string;
}

function bestBy(repos: Repo[], score: (repo: Repo) => number): Repo | null {
  return repos.reduce<Repo | null>((winner, candidate) => {
    if (!winner) return candidate;
    const candidateScore = score(candidate);
    const winnerScore = score(winner);
    if (candidateScore > winnerScore) return candidate;
    if (candidateScore < winnerScore) return winner;
    if (candidate.starsTotal !== winner.starsTotal) {
      return candidate.starsTotal > winner.starsTotal ? candidate : winner;
    }
    return candidate.fullName.localeCompare(winner.fullName) < 0 ? candidate : winner;
  }, null);
}

export function buildCompareSummary(repos: Repo[]): CompareSummary {
  if (repos.length < 2) {
    return {
      headline: "Choose at least two repositories to compare.",
      evidence: "The comparison desk needs more than one candidate before it can rank the evidence.",
    };
  }

  const momentum = bestBy(
    repos.filter(
      (repo) => repo.starDelta !== null && repo.starDelta !== undefined,
    ),
    (repo) => repo.starDelta ?? Number.NEGATIVE_INFINITY,
  );
  const largest = bestBy(repos, (repo) => repo.starsTotal);
  const activeRepos = repos.filter((repo) => Number.isFinite(Date.parse(repo.pushedAt)));
  const freshest = bestBy(activeRepos, (repo) => Date.parse(repo.pushedAt));

  const headline = momentum
    ? `For a momentum-first pick, start with ${momentum.fullName}.`
    : `For a first pass, start with ${freshest?.fullName ?? repos[0].fullName}, the most recently active candidate.`;
  const momentumEvidence = momentum
    ? `${momentum.fullName} leads measured momentum at +${(momentum.starDelta ?? 0).toLocaleString()} stars.`
    : "None of these candidates has enough tracking history for a momentum ranking.";
  const largestEvidence = largest
    ? `${largest.fullName} has the largest existing audience at ${largest.starsTotal.toLocaleString()} stars.`
    : "Audience size is unavailable.";
  const activityEvidence = freshest
    ? `${freshest.fullName} was pushed most recently.`
    : "Recent activity is unavailable.";

  return {
    headline,
    evidence: `${momentumEvidence} ${largestEvidence} ${activityEvidence}`,
  };
}
