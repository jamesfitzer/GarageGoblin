import { getSource } from "@/lib/sources";
import { getTorqueSpec, officialTorqueSourceConflicts, torqueSpecs, type TorqueSpec } from "@/lib/torque-specs";

type TorqueCitation = {
  id: string;
  title: string;
  authority: string;
  page: number;
  url: string;
};

export type VerifiedTorqueResponse = {
  answer: string;
  citations: TorqueCitation[];
  warning?: string;
};

/** Normalizes common garage shorthand without asking a model to infer a specification. */
function normalizeTorqueLanguage(question: string) {
  return question
    .toLowerCase()
    .replace(/\b(?:uca|upper\s+a[-\s]?arm)\b/g, "upper control arm")
    .replace(/\b(?:lca|lower\s+a[-\s]?arm)\b/g, "lower control arm")
    .replace(/\b(?:u\s*[- ]?joint)\b/g, "upper ball joint")
    .replace(/\b(?:l\s*[- ]?joint)\b/g, "lower ball joint")
    .replace(/\bframe[-\s]?bolt(?:s)?\b/g, "frame")
    .replace(/\bmount(?:ing)?\s+bolt(?:s)?\b/g, "mount")
    .replace(/\b2015\s*(?:mustang\s*)?irs\b/g, "2015+ irs");
}

const nonComponentWords = new Set([
  "a", "an", "and", "are", "at", "bolt", "bolts", "can", "do", "does", "for", "give", "i", "is", "it", "me", "need", "of", "please", "pleasee", "spec", "specs", "tell", "that", "the", "this", "to", "torque", "use", "value", "what", "which", "with", "you",
]);

function componentWords(value: string) {
  return [...new Set(value
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .split(" ")
    .map((word) => word.replace(/s$/, "").replace(/ing$/, ""))
    .filter((word) => word.length > 1 && !nonComponentWords.has(word)))];
}

function findTorqueCandidates(normalizedQuestion: string) {
  const questionWords = componentWords(normalizedQuestion);
  if (questionWords.length < 2) return [];

  return torqueSpecs.filter((spec) => {
    const specWords = new Set(componentWords(`${spec.component} ${spec.configuration.join(" ")}`));
    return questionWords.every((word) => specWords.has(word));
  });
}

function citationFor(spec: TorqueSpec): TorqueCitation {
  const source = getSource(spec.source.sourceId);
  if (!source) throw new Error(`Unknown torque source: ${spec.source.sourceId}`);

  return {
    id: `${source.id}-${spec.source.page}`,
    title: source.title,
    authority: source.authority,
    page: spec.source.page,
    url: `/api/sources/${source.id}#page=${spec.source.page}`,
  };
}

function valueFor(spec: TorqueSpec) {
  const units = spec.newtonMeters ? `${spec.newtonMeters} Nm (${spec.lbFt} lb-ft)` : `${spec.lbFt} lb-ft`;
  return spec.additionalOperation ? `${units}; ${spec.additionalOperation}` : units;
}

function answerFor(spec: TorqueSpec): VerifiedTorqueResponse {
  if (spec.status !== "verified") {
    const conflict = officialTorqueSourceConflicts.find((item) => {
      const conflictComponent = item.component.toLowerCase();
      const specComponent = spec.component.toLowerCase();
      return conflictComponent.includes(specComponent) || specComponent.includes(conflictComponent);
    });
    const supplemental = conflict ? getSource("2015-mustang-irs") : undefined;
    const citations = [citationFor(spec)];
    if (supplemental && conflict) {
      citations.push({
        id: `${supplemental.id}-${conflict.supplementalInstruction.page}`,
        title: supplemental.title,
        authority: supplemental.authority,
        page: conflict.supplementalInstruction.page,
        url: `/api/sources/${supplemental.id}#page=${conflict.supplementalInstruction.page}`,
      });
    }

    return {
      answer: `**STOP & VERIFY:** Factory Five documents conflict for **${spec.component}**. The Mk5 manual and a supplemental 2015+ IRS instruction do not agree, so Garage Goblin will not select a torque value. Contact Factory Five with your exact parts/configuration before final torque.`,
      citations,
      warning: "An official-source torque conflict requires Factory Five resolution.",
    };
  }

  return {
    answer: `**${spec.component}:** ${valueFor(spec)}\n\n**Applies to:** ${spec.configuration.join("; ")}.\n\n[Requirement] Use the cited Factory Five specification for this exact configuration.`,
    citations: [citationFor(spec)],
  };
}

/**
 * Direct torque requests are served only from reviewed, configuration-specific
 * records. Other torque questions deliberately abstain instead of asking the
 * language model to infer a safety-critical number.
 */
export function getVerifiedTorqueResponse(question: string): VerifiedTorqueResponse | undefined {
  const normalized = normalizeTorqueLanguage(question);
  const isPreparationOrSequenceQuestion = /\b(?:prep(?:are|aration)?|before|after|finally|sequence|order|check(?:s|list)?|ready|readiness)\b.*\btorque\b|\btorque\b.*\b(?:prep(?:are|aration)?|before|after|sequence|order|check(?:s|list)?|ready|readiness)\b/i.test(question);
  const isTorqueRequest = !isPreparationOrSequenceQuestion && /\btorque\b|\b(?:lb\.?[-\s]?ft|ft\.?[-\s]?lb|n\.?m\.?|newton[-\s]?meters?)\b/i.test(question);
  if (!isTorqueRequest) return undefined;

  const hasNonIrsRearConfiguration = /solid axle|3-link|non[-\s]?irs/i.test(normalized);
  const hasIrs = !hasNonIrsRearConfiguration && /\birs\b|independent rear suspension|2015\+?\s*(?:mustang\s*)?irs/i.test(normalized);

  if (/center[-\s]?section/.test(normalized) && /frame mount/.test(normalized)) {
    return answerFor(getTorqueSpec("irs-center-section-frame")!);
  }

  if (/upper control arm/.test(normalized) && /front/.test(normalized) && /frame/.test(normalized)) {
    return answerFor(getTorqueSpec("front-uca-frame")!);
  }

  if (/banjo/.test(normalized) && /rear/.test(normalized)) {
    if (hasIrs) return answerFor(getTorqueSpec("irs-brake-banjo")!);
    if (hasNonIrsRearConfiguration) return answerFor(getTorqueSpec("rear-brake-banjo-non-irs")!);

    return {
      answer: "**STOP & VERIFY:** Which rear-brake configuration do you have: 2015+ IRS or non-IRS? Factory Five publishes different rear banjo-bolt specifications for those configurations, so Garage Goblin will not choose one from an ambiguous question.",
      citations: [citationFor(getTorqueSpec("irs-brake-banjo")!), citationFor(getTorqueSpec("rear-brake-banjo-non-irs")!)],
    };
  }

  const candidates = findTorqueCandidates(normalized);
  if (candidates.length === 1) return answerFor(candidates[0]);
  if (candidates.length > 1) {
    const options = candidates.slice(0, 6).map((spec) => `- ${spec.component} (${spec.configuration.filter((item) => item !== "Mk5").join("; ") || "Mk5"})`).join("\n");
    const citations = candidates
      .slice(0, 6)
      .map(citationFor)
      .filter((citation, index, all) => all.findIndex((item) => item.id === citation.id) === index);
    return {
      answer: `**STOP & VERIFY:** That wording matches multiple reviewed torque records. Tell me which exact joint/configuration you mean:\n\n${options}\n\nGarage Goblin will not choose among similar fasteners for you.`,
      citations,
    };
  }

  return {
    answer: "**STOP & VERIFY:** That torque value is not yet matched to an exact, reviewed component and configuration in Garage Goblin. Do not use a model-generated or generic value. Check the applicable Factory Five instruction, or contact Factory Five if the manual does not clearly cover your exact configuration.",
    citations: [],
    warning: "No verified torque record matched this request.",
  };
}
