import Foundation
import PDFKit

struct PageRange {
    let sourceID: String
    let filename: String
    let pages: ClosedRange<Int>
}

let ranges = [
    PageRange(sourceID: "mk5-roadster-manual", filename: "mk5-roadster-manual.pdf", pages: 104...141),
    PageRange(sourceID: "2015-mustang-irs", filename: "15942-2015-mustang-irs-rev-d.pdf", pages: 1...40),
    PageRange(sourceID: "2015-irs-swaybar", filename: "15998-2015-irs-swaybar.pdf", pages: 1...7),
    PageRange(sourceID: "koni-irs-coil-overs", filename: "14680-koni-irs-coil-overs.pdf", pages: 1...6),
]

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let output = root.appendingPathComponent("generated/irs-page-index", isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

for range in ranges {
    let sourceURL = root.appendingPathComponent("sources/").appendingPathComponent(range.filename)
    guard let document = PDFDocument(url: sourceURL) else {
        throw NSError(domain: "GarageGoblin", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot read \(range.filename)"])
    }

    for pageNumber in range.pages {
        guard let page = document.page(at: pageNumber - 1) else {
            throw NSError(domain: "GarageGoblin", code: 2, userInfo: [NSLocalizedDescriptionKey: "Missing PDF page \(pageNumber) in \(range.filename)"])
        }
        let filename = String(format: "%@-p%04d.txt", range.sourceID, pageNumber)
        let header = "Source PDF: \(range.filename)\nPDF page: \(pageNumber)\n\n"
        try (header + (page.string ?? "[No extractable text on this page.]\n")).write(to: output.appendingPathComponent(filename), atomically: true, encoding: .utf8)
    }
}

print("Extracted \(ranges.reduce(0) { $0 + $1.pages.count }) page-aware retrieval files to \(output.path)")
