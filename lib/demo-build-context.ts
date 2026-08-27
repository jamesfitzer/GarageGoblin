/**
 * Durable, source-reviewed facts for the one Mk5 demo build. This is deliberately
 * configuration context rather than a task profile: it tells the planner what the
 * builder owns and selected, but never supplies a procedure, tool, or torque value.
 *
 * Sources: sources/build-spec.md and the private Factory Five sales order,
 * sources/James Fitzer MK5 Complete Roadster Kit 0225114.pdf. The order confirms
 * selected Factory Five items; the build specification records non-Factory-Five
 * choices and later decisions. Neither source authorizes a procedure or torque.
 */
export type DemoBuildContext = {
  label: string;
  sources: string[];
  facts: string[];
};

export type DemoBuildSafetyGap = {
  text: string;
  citations?: Array<{ sourceId: string; page: number }>;
};

const irsContext: DemoBuildContext = {
  label: "Selected rear-suspension configuration",
  sources: ["Factory Five sales order", "Master build specification"],
  facts: [
    "The Factory Five sales order confirms forged Roadster IRS complete-kit components, an IRS center-and-spindle package, a 31-spline IRS driveshaft, and the Factory Five front/rear IRS shock set.",
    "This demo build uses the selected 2015+ Mustang Super 8.8 IRS center section and Factory Five forged Roadster IRS complete-kit components.",
    "The Factory Five sales order confirms Wilwood IRS brakes and front/rear IRS sway-bar parts are selected for this build.",
    "When Factory Five provides alternate IRS suspension mounting holes, this build uses the lower holes for the higher ride-height configuration.",
    "IRS brakes and sway bar are selected follow-on work, but they should not inflate the core IRS-install staging list unless the requested task explicitly includes them.",
  ],
};

const fuelContext: DemoBuildContext = {
  label: "Selected fuel-system configuration",
  sources: ["Master build specification"],
  facts: [
    "This demo build uses Edelbrock Pro-Flo 4 sequential multi-port EFI.",
    "The selected pump is a Holley 12-345 340 LPH in-tank module; do not present the manual's inline-pump pickup procedure as the selected pump configuration.",
    "The approved source set does not yet include the Holley module installation instructions. Before sealing the tank, STOP & VERIFY the module's installation, sealing, and electrical instructions with Holley/Forte documentation.",
    "An Aeromotive 13129 return-style regulator and an inline post-pump filter are selected.",
    "The planned supply and return backbone is -6 AN. Final hose ends, exact routing, and fittings remain an inventory-and-layout decision, not a completed configuration.",
    "Fuel-tank mounting and tank penetrations are core work; filter and final fuel-line plumbing are selected follow-on work unless the builder explicitly asks for fuel plumbing.",
  ],
};

const steeringContext: DemoBuildContext = {
  label: "Selected steering configuration",
  sources: ["Factory Five sales order", "Master build specification"],
  facts: [
    "The Factory Five sales order confirms the complete Factory Five power-steering-parts option. This demo build uses the Factory Five standard Mustang GT-style power-steering rack.",
  ],
};

const frontSuspensionContext: DemoBuildContext = {
  label: "Selected front-suspension configuration",
  sources: ["Factory Five sales order", "Master build specification"],
  facts: [
    "The Factory Five sales order confirms the big-brake forged standard-width front-suspension option and red 12.88-inch Wilwood front brakes.",
    "This build uses the selected Howe K772-pattern screw-in front upper ball joints and compatible polyurethane boots. Retain the Factory Five-supplied front lower ball joints.",
    "When Factory Five provides alternate upper and lower suspension mounting holes, this build uses the lower holes for the higher ride-height configuration.",
  ],
};

const brakeContext: DemoBuildContext = {
  label: "Selected brake configuration",
  sources: ["Factory Five sales order", "Master build specification"],
  facts: [
    "The Factory Five sales order confirms red 12.88-inch Wilwood front brakes, complete-kit red Wilwood IRS brakes, brake-reservoir parts, and remote brake-booster parts.",
    "The front and IRS brake procedures are separate selected work. Do not transfer a torque, fitting, or hose-routing instruction between them without an exact controlling source.",
  ],
};

/** Returns only configuration facts relevant to the requested garage task. */
export function getDemoBuildContext(question: string): DemoBuildContext[] {
  const contexts: DemoBuildContext[] = [];
  if (/(?:\birs\b|independent rear suspension|rear suspension|center section|cv axle|sway\s*bar)/i.test(question)) contexts.push(irsContext);
  if (/(?:front suspension|upper control arm|lower control arm|\buca\b|\blca\b|front ball joint|front coil[ -]?over)/i.test(question)) contexts.push(frontSuspensionContext);
  if (/(?:brake|caliper|rotor|master cylinder|brake line|brake hose|brake booster)/i.test(question)) contexts.push(brakeContext);
  if (/(?:fuel|tank|pump|sender|filler|vent|filter|fuel[-\s]?line)/i.test(question)) contexts.push(fuelContext);
  if (/(?:steering|tie\s*rod|rack)/i.test(question)) contexts.push(steeringContext);
  return contexts;
}

export function renderDemoBuildContext(contexts: DemoBuildContext[]) {
  if (!contexts.length) return "No task-specific build configuration facts are recorded for this request.";
  return contexts.map((context) => `${context.label} (configuration sources: ${context.sources.join("; ")}):\n${context.facts.map((fact) => `- ${fact}`).join("\n")}`).join("\n\n");
}

/** Configuration conflicts that must be surfaced independent of retrieval ranking. */
export function getDemoBuildSafetyGaps(question: string): DemoBuildSafetyGap[] {
  const gaps: DemoBuildSafetyGap[] = [];
  if (/(?:fuel|tank|pump|sender|filler|vent|filter|fuel[-\s]?line)/i.test(question)) {
    gaps.push({ text: "STOP & VERIFY the selected Holley in-tank module's installation, sealing, and electrical instructions with Holley/Forte documentation before closing or sealing the tank. The approved source set does not include those instructions." });
  }
  if (/(?:brake|caliper|rotor|flexline|bleed|brake[-\s]?fluid)/i.test(question)) {
    gaps.push({
      text: "STOP & VERIFY the brake-fluid choice before filling or bleeding: Factory Five specifies DOT 3, while the selected Wilwood 140-15138 instruction specifies Hi-Temp 570 grade fluid or higher. Do not select or reconcile those requirements in Garage Goblin; confirm the correct fluid with Factory Five and Wilwood.",
      citations: [
        { sourceId: "mk5-roadster-manual", page: 280 },
        { sourceId: "wilwood-140-15138", page: 7 },
      ],
    });
  }
  return gaps;
}
