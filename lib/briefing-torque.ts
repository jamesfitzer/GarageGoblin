import { torqueSpecs, type TorqueSpec } from "@/lib/torque-specs";

export type BriefingTorqueSupplement = {
  title: string;
  specs: TorqueSpec[];
};

const briefingProfiles: Array<{
  title: string;
  matches: RegExp;
  includes: (spec: TorqueSpec) => boolean;
}> = [
  {
    title: "Reviewed 2015+ IRS torque checks",
    matches: /(?:2015\+?\s*(?:mustang\s*)?irs|independent rear suspension)/i,
    includes: (spec) => spec.configuration.some((item) => item.toLowerCase() === "2015+ irs"),
  },
  {
    title: "Reviewed front-suspension torque checks",
    matches: /front\s+(?:suspension|end|control\s+arm|spindle)/i,
    includes: (spec) => spec.configuration.some((item) => item === "front suspension" || item === "front steering" || item === "front sway bar"),
  },
];

/**
 * Prep workflows get torque data from reviewed records only. This deliberately
 * has no fuzzy fallback: an unknown task receives no numeric supplement rather
 * than a model's best guess about which fasteners are in scope.
 */
export function getBriefingTorqueSupplement(question: string): BriefingTorqueSupplement | undefined {
  const profile = briefingProfiles.find((candidate) => candidate.matches.test(question));
  if (!profile) return undefined;

  return {
    title: profile.title,
    specs: torqueSpecs.filter(profile.includes),
  };
}
