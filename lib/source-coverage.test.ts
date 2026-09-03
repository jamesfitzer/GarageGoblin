import { describe, expect, it } from "vitest";
import { assessSourceCoverage } from "./source-coverage";

describe("source coverage assessment", () => {
  it("removes a direct-coverage marker from a cited answer", () => {
    expect(assessSourceCoverage({
      answer: "Install the bracket in the documented sequence.\n<!-- garage-goblin-source-coverage: direct -->",
      question: "How do I install the bracket?",
      hasMappedCitation: true,
    })).toEqual({
      answer: "Install the bracket in the documented sequence.",
      sourceCoverage: "direct",
    });
  });

  it("offers expansion for a cited answer whose source only provides context", () => {
    expect(assessSourceCoverage({
      answer: "The manual mentions the part, but does not recommend a choice.\n<!-- garage-goblin-source-coverage: context_only -->",
      question: "Which aftermarket option should I buy?",
      hasMappedCitation: true,
    })).toEqual({
      answer: "The manual mentions the part, but does not recommend a choice.",
      sourceCoverage: "context_only",
    });
  });

  it("recognizes a cited paint-color answer as personal preference", () => {
    expect(assessSourceCoverage({
      answer: "Factory Five does not prescribe a body color; the choice is up to you.",
      question: "What color should I paint my FF Roadster?",
      hasMappedCitation: true,
    })).toEqual({
      answer: "Factory Five does not prescribe a body color; the choice is up to you.",
      sourceCoverage: "personal_preference",
    });
  });

  it("fails open to an expansion offer when a direct marker has no mapped citation", () => {
    expect(assessSourceCoverage({
      answer: "Unmapped answer.\n<!-- garage-goblin-source-coverage: direct -->",
      question: "How do I install the bracket?",
      hasMappedCitation: false,
    })).toEqual({
      answer: "Unmapped answer.",
      sourceCoverage: "ambiguous",
    });
  });
});
