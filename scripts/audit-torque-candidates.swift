import Foundation
import PDFKit

struct SourceDocument {
    let filename: String
    let classification: String
}

// This is an audit of every supplied technical PDF. The kit invoice and the
// manually prepared torque sheet are intentionally excluded: neither is a
// controlling technical source for a torque record.
let sourceDocuments = [
    SourceDocument(filename: "mk5-roadster-manual.pdf", classification: "controlling Mk5 manual"),
    SourceDocument(filename: "15942-2015-mustang-irs-rev-d.pdf", classification: "Mk5 option instruction"),
    SourceDocument(filename: "15998-2015-irs-swaybar.pdf", classification: "Mk5 option instruction"),
    SourceDocument(filename: "14680-koni-irs-coil-overs.pdf", classification: "Mk5 option instruction"),
    SourceDocument(filename: "14676-koni-front-coil-overs.pdf", classification: "Mk5 option instruction"),
    SourceDocument(filename: "SEAT-TRACK-Mk5-REV-A.pdf", classification: "Mk5 option instruction"),
    SourceDocument(filename: "PEDALBOX-WILWOOD-rev-H.pdf", classification: "Mk5 option instruction"),
    SourceDocument(filename: "Chassis-Harness-rev-W.pdf", classification: "Mk5 option instruction"),
    SourceDocument(filename: "Glovebox.pdf", classification: "Mk5 option instruction"),
    SourceDocument(filename: "12049-wind-wings.pdf", classification: "Mk5 option instruction"),
    SourceDocument(filename: "14769-standard-irs-rev-k.pdf", classification: "conditional/reference instruction"),
    SourceDocument(filename: "13673-oil-cooler-rev-h.pdf", classification: "Mk4-only/reference instruction"),
    SourceDocument(filename: "AC-HEATER-DEFROSTER-COUPE-Gen-3-REV-G.pdf", classification: "Coupe-only/reference instruction"),
]

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let output = root.appendingPathComponent("generated/torque-candidate-pages.md")
let keywords = ["torque", "lb-ft", "lb ft", "ft-lb", "ft lb", "n·m", "nm", "n-m", "newton"]

var lines = [
    "# Torque-candidate page audit",
    "",
    "Generated from supplied technical PDFs. A candidate is not a verified torque record; each must be reviewed for component, configuration, and applicability before entering the structured dataset.",
]

for source in sourceDocuments {
    let url = root.appendingPathComponent("sources").appendingPathComponent(source.filename)
    guard let document = PDFDocument(url: url) else {
        throw NSError(domain: "GarageGoblin", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot read \(source.filename)"])
    }

    lines += ["", "## \(source.filename)", "Classification: \(source.classification)"]
    var candidates = 0

    for index in 0..<document.pageCount {
        guard let text = document.page(at: index)?.string else { continue }
        let normalized = text.lowercased()
        guard keywords.contains(where: { normalized.contains($0) }) else { continue }
        candidates += 1
        lines += ["", "### PDF page \(index + 1)", "```text", text.trimmingCharacters(in: .whitespacesAndNewlines), "```"]
    }

    lines += ["", "Candidate pages found: \(candidates)"]
}

try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
try lines.joined(separator: "\n").write(to: output, atomically: true, encoding: .utf8)
print("Wrote \(output.path)")
