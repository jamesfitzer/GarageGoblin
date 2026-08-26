import torqueSpecData from "@/data/mk5-roadster-torque-specs.json";

export type TorqueSpecStatus = "verified" | "needs-review";

export type TorqueSpec = {
  id: string;
  component: string;
  configuration: string[];
  lbFt: string;
  newtonMeters: string | null;
  additionalOperation?: string;
  source: {
    sourceId: string;
    file: string;
    page: number;
    section: string;
    authority: string;
  };
  status: TorqueSpecStatus;
  notes?: string;
};

export const torqueSpecs = torqueSpecData.entries as TorqueSpec[];
export const officialTorqueSourceConflicts = torqueSpecData.officialSourceConflicts;

export function getTorqueSpec(id: string) {
  return torqueSpecs.find((spec) => spec.id === id);
}
