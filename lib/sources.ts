export type SourceId =
  | "mk5-roadster-manual"
  | "2015-mustang-irs"
  | "2015-irs-swaybar"
  | "koni-irs-coil-overs"
  | "koni-front-coil-overs"
  | "seat-track-mk5"
  | "pedalbox-wilwood"
  | "wilwood-140-15138"
  | "chassis-harness-rev-w"
  | "glovebox"
  | "wind-wings";

export type Source = {
  id: SourceId;
  filename: string;
  title: string;
  authority: "Factory Five manual" | "Factory Five option instruction" | "Wilwood vendor instruction";
  initialPage: number;
};

export type SourceSection = {
  title: string;
  startPage: number;
  endPage: number;
};

const sourceSections: Array<SourceSection & { sourceId: SourceId; matches: RegExp }> = [
  {
    sourceId: "mk5-roadster-manual",
    title: "Optional Independent Rear Suspension",
    startPage: 104,
    endPage: 141,
    matches: /(?:\birs\b|independent rear suspension|rear suspension|center section|cv axle)/i,
  },
  {
    sourceId: "mk5-roadster-manual",
    title: "Front Suspension",
    startPage: 44,
    endPage: 82,
    matches: /front suspension|front end|control arm|front spindle/i,
  },
  {
    sourceId: "mk5-roadster-manual",
    title: "Fuel System",
    startPage: 166,
    endPage: 191,
    matches: /fuel|tank|fuel[-\s]?line|filler|sender|vent/i,
  },
  {
    sourceId: "2015-mustang-irs",
    title: "IRS Installation Instructions",
    startPage: 1,
    endPage: 40,
    matches: /(?:\birs\b|independent rear suspension|center section|cv axle)/i,
  },
];

export const initialSources: Source[] = [
  {
    id: "mk5-roadster-manual",
    filename: "mk5-roadster-manual.pdf",
    title: "Factory Five Mk5 Roadster Assembly Manual",
    authority: "Factory Five manual",
    initialPage: 104,
  },
  {
    id: "2015-mustang-irs",
    filename: "15942-2015-mustang-irs-rev-d.pdf",
    title: "2015+ Mustang IRS Installation Instructions",
    authority: "Factory Five option instruction",
    initialPage: 1,
  },
  {
    id: "2015-irs-swaybar",
    filename: "15998-2015-irs-swaybar.pdf",
    title: "2015 IRS Sway Bar Installation Instructions",
    authority: "Factory Five option instruction",
    initialPage: 1,
  },
  {
    id: "koni-irs-coil-overs",
    filename: "14680-koni-irs-coil-overs.pdf",
    title: "Koni IRS Coil-Over Shock Assembly",
    authority: "Factory Five option instruction",
    initialPage: 1,
  },
  {
    id: "koni-front-coil-overs",
    filename: "14676-koni-front-coil-overs.pdf",
    title: "Koni Front Coil-Over Shock Assembly",
    authority: "Factory Five option instruction",
    initialPage: 1,
  },
  {
    id: "seat-track-mk5",
    filename: "SEAT-TRACK-Mk5-REV-A.pdf",
    title: "Mk5 Seat Track Instructions",
    authority: "Factory Five option instruction",
    initialPage: 1,
  },
  {
    id: "pedalbox-wilwood",
    filename: "PEDALBOX-WILWOOD-rev-H.pdf",
    title: "Wilwood Pedal Box Instructions",
    authority: "Factory Five option instruction",
    initialPage: 1,
  },
  {
    id: "wilwood-140-15138",
    filename: "Wilwood-140-15138-DS-1111.pdf",
    title: "Wilwood Front Brake Kit Instructions (140-15138)",
    authority: "Wilwood vendor instruction",
    initialPage: 1,
  },
  {
    id: "chassis-harness-rev-w",
    filename: "Chassis-Harness-rev-W.pdf",
    title: "Chassis Harness Instructions (Rev W)",
    authority: "Factory Five option instruction",
    initialPage: 1,
  },
  {
    id: "glovebox",
    filename: "Glovebox.pdf",
    title: "Glovebox Installation Instructions",
    authority: "Factory Five option instruction",
    initialPage: 1,
  },
  {
    id: "wind-wings",
    filename: "12049-wind-wings.pdf",
    title: "Wind Wings Instructions",
    authority: "Factory Five option instruction",
    initialPage: 1,
  },
];

export const sourceByFilename = new Map(
  initialSources.map((source) => [source.filename, source]),
);

export function getSourceFromRetrievalFilename(filename: string) {
  const direct = sourceByFilename.get(filename);
  if (direct) return { source: direct, page: undefined };

  const match = filename.match(/^(.+)-p(\d{4})\.txt$/);
  if (!match) return undefined;

  const source = initialSources.find((item) => item.id === match[1]);
  return source ? { source, page: Number(match[2]) } : undefined;
}

export function getSource(id: string) {
  return initialSources.find((source) => source.id === id);
}

export function getSourceSection(sourceId: SourceId, question: string) {
  return sourceSections.find((section) => section.sourceId === sourceId && section.matches.test(question));
}
