import Foundation
import PDFKit

struct SourceRange {
    let sourceID: String
    let filename: String
    let pages: ClosedRange<Int>
}

// Full controlling manual plus cataloged applicable secondary instructions only.
// Owner-private and conditional/reference-only material remain outside retrieval.
let sources = [
    SourceRange(sourceID: "mk5-roadster-manual", filename: "mk5-roadster-manual.pdf", pages: 1...594),
    SourceRange(sourceID: "2015-mustang-irs", filename: "15942-2015-mustang-irs-rev-d.pdf", pages: 1...40),
    SourceRange(sourceID: "2015-irs-swaybar", filename: "15998-2015-irs-swaybar.pdf", pages: 1...7),
    SourceRange(sourceID: "koni-irs-coil-overs", filename: "14680-koni-irs-coil-overs.pdf", pages: 1...6),
    SourceRange(sourceID: "koni-front-coil-overs", filename: "14676-koni-front-coil-overs.pdf", pages: 1...7),
    SourceRange(sourceID: "seat-track-mk5", filename: "SEAT-TRACK-Mk5-REV-A.pdf", pages: 1...9),
    SourceRange(sourceID: "pedalbox-wilwood", filename: "PEDALBOX-WILWOOD-rev-H.pdf", pages: 1...16),
    SourceRange(sourceID: "chassis-harness-rev-w", filename: "Chassis-Harness-rev-W.pdf", pages: 1...70),
    SourceRange(sourceID: "glovebox", filename: "Glovebox.pdf", pages: 1...16),
    SourceRange(sourceID: "wind-wings", filename: "12049-wind-wings.pdf", pages: 1...3),
]

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let output = root.appendingPathComponent("generated/approved-page-index", isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

for source in sources {
    let sourceURL = root.appendingPathComponent("sources/").appendingPathComponent(source.filename)
    guard let document = PDFDocument(url: sourceURL) else {
        throw NSError(domain: "GarageGoblin", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot read \(source.filename)"])
    }
    guard document.pageCount >= source.pages.upperBound else {
        throw NSError(domain: "GarageGoblin", code: 2, userInfo: [NSLocalizedDescriptionKey: "Expected \(source.pages.upperBound) pages in \(source.filename), found \(document.pageCount)"])
    }

    for pageNumber in source.pages {
        guard let page = document.page(at: pageNumber - 1) else {
            throw NSError(domain: "GarageGoblin", code: 3, userInfo: [NSLocalizedDescriptionKey: "Missing PDF page \(pageNumber) in \(source.filename)"])
        }
        let filename = String(format: "%@-p%04d.txt", source.sourceID, pageNumber)
        let header = "Source PDF: \(source.filename)\nPDF page: \(pageNumber)\n\n"
        try (header + (page.string ?? "[No extractable text on this page.]\n")).write(to: output.appendingPathComponent(filename), atomically: true, encoding: .utf8)
    }
}

print("Extracted \(sources.reduce(0) { $0 + $1.pages.count }) approved page-aware retrieval files to \(output.path)")
