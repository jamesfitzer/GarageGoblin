export type DemoCitation = {
  id: string;
  title: string;
  authority: string;
  url: string;
  page?: number;
  pageStart?: number;
  pageEnd?: number;
  section?: string;
};

export type DemoMessageFixture = {
  role: "user" | "assistant";
  content: string;
  citations?: DemoCitation[];
  warning?: string;
  webSources?: Array<{ title: string; url: string; sourceType: "Factory Five Forum" | "General web" }>;
};

export type DemoChatFixture = {
  id: string;
  title: string;
  messages: DemoMessageFixture[];
};

const mk5 = (page: number): DemoCitation => ({ id: `mk5-roadster-manual-${page}`, title: "Factory Five Mk5 Roadster Assembly Manual", authority: "Factory Five manual", page, url: `/api/sources/mk5-roadster-manual#page=${page}` });
const mk5Section = (title: string, startPage: number, endPage: number): DemoCitation => ({ id: `mk5-roadster-manual-${startPage}-${endPage}`, title: "Factory Five Mk5 Roadster Assembly Manual", authority: "Factory Five manual", page: startPage, pageStart: startPage, pageEnd: endPage, section: title, url: `/api/sources/mk5-roadster-manual#page=${startPage}` });
const irsInstructionSection: DemoCitation = { id: "2015-mustang-irs-section-1-40", title: "2015+ Mustang IRS Installation Instructions", authority: "Factory Five option instruction", page: 1, pageStart: 1, pageEnd: 40, section: "IRS Installation Instructions", url: "/api/sources/2015-mustang-irs#page=1" };

/**
 * Read-only fallbacks for the MBA demo. These are intentionally bundled rather
 * than cached live results: they make the source-link UX demonstrable when an
 * API key, network connection, or rate limit has chosen chaos.
 */
export const cannedDemoChats: DemoChatFixture[] = [
  {
    id: "demo-canned-irs",
    title: "Canned demo · 2015+ IRS installation",
    messages: [
      { role: "user", content: "Prep me for: 2015+ IRS installation." },
      {
        role: "assistant",
        content: `## What you're doing\n\n- Stage the selected 2015+ Mustang IRS center section, arms, CV axles, and coil-overs.\n\n## Bring to the car\n\n- IRS parts, arms, CV axles, coil-overs, and their Factory Five fasteners.\n- Drill, 5/8 in. drill bit, 13/16 in. and 15/16 in. wrenches, 13/16 in., 15/16 in., and 18 mm sockets, torque wrench, marker, ruler, mallet, and a helper.\n\n## Do this\n\n- Confirm the IRS path, then prepare the Mustang spindles and toe-adjustment arms.\n- Install the center section with help, then build and hang the coil-overs.\n- Leave selected IRS brakes and sway bar as their own follow-on procedures.\n\n## Watch for\n\n- The vent nipple may be taped inside the box.\n- Verify each shock's rebound setting before installation.\n- Keep brake-hose slack while the suspension is at droop.\n\n## Verify before closing\n\n- Check shock jam nuts, bump stops, spring-seat position, and hose routing before finalizing.`,
        citations: [mk5Section("Optional Independent Rear Suspension", 104, 141), irsInstructionSection],
      },
    ],
  },
  {
    id: "demo-canned-fuel",
    title: "Canned demo · fuel tank installation",
    messages: [
      { role: "user", content: "Prep me for: fuel tank installation." },
      {
        role: "assistant",
        content: `## What you're doing\n\n- Installing the fuel tank and its tank penetrations for the selected EFI fuel system.\n\n## Bring to the car\n\n- Tank, straps, vent, sender, filler-neck parts, sockets, ratchet, wrenches, Teflon tape, razor knife, adjustable wrench, and light lubricant for the filler-neck gasket.\n\n## Do this\n\n- Flatten the tank flange at the mount area, then install the sender, filler neck, and vent.\n- Hang the straps from the rear chassis mount with the longer strap on the right.\n\n## Watch for\n\n- A tank flange left unflattened will not mount correctly.\n- Route a non-FFR vent hose higher than the tank.\n\n## STOP & VERIFY\n\n- Confirm the selected Holley in-tank module's installation, sealing, and electrical instructions with Holley/Forte before closing or sealing the tank.`,
        citations: [mk5(169), mk5(177), mk5(181), mk5(191)],
      },
      { role: "user", content: "Show Factory Five Forum gotchas for fuel tank installation." },
      {
        role: "assistant",
        content: `## Factory Five Forum gotchas\n\n- Builders commonly report shaping the tank straps and flattening the tank flange at the strap locations for a proper chassis fit.\n- Check the filler-tube/grommet sealing approach before final assembly; community threads do not establish a substitute for Factory Five guidance.\n\nFactory Five community experience is contextual only. Factory Five documentation controls.`,
        warning: "External research is contextual only. Factory Five documentation controls; resolve a conflict with Factory Five or the relevant component manufacturer.",
        webSources: [
          { title: "Factory Five Forum thread — Gas Tank install", url: "https://thefactoryfiveforum.com/showthread.php?41274-Gas-Tank-install=", sourceType: "Factory Five Forum" },
          { title: "Factory Five Forum thread — Gas Tank fill tube installation", url: "https://thefactoryfiveforum.com/showthread.php?47968-Gas-Tank-fill-tube-installation=", sourceType: "Factory Five Forum" },
        ],
      },
    ],
  },
  {
    id: "demo-canned-steering",
    title: "Canned demo · steering rack installation",
    messages: [
      { role: "user", content: "Prep me for: steering rack and steering shaft installation." },
      {
        role: "assistant",
        content: `## What you're doing\n\n- Installing the selected Mustang GT-style power-steering rack and preparing the steering shaft connection.\n\n## Bring to the car\n\n- Needle-nose pliers, 3/4 in. wrench and socket, 1-1/2 in. wrench, ratchet, thread lock, zip ties, steering-rack extensions, rack assembly, support safety bracket, and rack hardware.\n\n## Do this\n\n- Install the rack spacers and prepare the selected Mustang power rack.\n- If donor preparation did not already cover it, remove the inner tie rod and cut 1-3/4 in. from the inner tie-rod end.\n- Thread-lock the extensions and inner tie rods, refit the boot, and install the rack with its support safety bracket.\n\n## Watch for\n\n- Inner tie-rod extensions apply only to the stock Mustang power rack, not Factory Five manual or optional power racks.\n\n## Verify before closing\n\n- Ensure the steering-shaft set screw lands in the rack input shaft's recessed unsplined area before final tightening.`,
        citations: [mk5(36), mk5(37), mk5(38), mk5(39), mk5(220)],
      },
    ],
  },
  {
    id: "demo-canned-brake-fluid",
    title: "Canned demo · brake-fluid conflict",
    messages: [
      { role: "user", content: "What brake fluid should I use with this Factory Five Mk5 and Wilwood brake package?" },
      {
        role: "assistant",
        content: `Factory Five lists DOT 3 brake fluid in the Mk5 manual. The selected Wilwood front-brake instructions specify Wilwood Hi-Temp 570 grade fluid or higher and advise against silicone DOT 5 for performance use.\n\n**STOP & VERIFY:** Garage Goblin does not choose between those requirements. Confirm the correct fluid with Factory Five and Wilwood before filling or bleeding the system.`,
        citations: [mk5(280), { id: "wilwood-140-15138-7", title: "Wilwood Front Brake Kit Instructions (140-15138)", authority: "Wilwood vendor instruction", page: 7, url: "/api/sources/wilwood-140-15138#page=7" }],
      },
    ],
  },
];

export const liveDemoPrompts = [
  { title: "Live demo · 2015+ IRS installation", question: "Prep me for: 2015+ IRS installation." },
  { title: "Live demo · fuel tank installation", question: "Prep me for: fuel tank installation." },
  { title: "Live demo · steering rack installation", question: "Prep me for: steering rack and steering shaft installation." },
  { title: "Live demo · brake-fluid conflict", question: "What brake fluid should I use with this Factory Five Mk5 and Wilwood brake package?" },
] as const;
