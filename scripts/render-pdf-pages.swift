import AppKit
import Foundation
import PDFKit

guard CommandLine.arguments.count >= 4 else {
    fatalError("Usage: swift scripts/render-pdf-pages.swift <pdf-path> <output-directory> <page> [page...]")
}

let pdfURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputDirectory = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
guard let document = PDFDocument(url: pdfURL) else { fatalError("Could not read \(pdfURL.path)") }
try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)

for argument in CommandLine.arguments.dropFirst(3) {
    guard let pageNumber = Int(argument), pageNumber >= 1, pageNumber <= document.pageCount,
          let page = document.page(at: pageNumber - 1) else {
        fatalError("Invalid PDF page: \(argument)")
    }

    let image = page.thumbnail(of: NSSize(width: 2000, height: 2000), for: .mediaBox)
    guard let data = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: data),
          let png = bitmap.representation(using: .png, properties: [:]) else {
        fatalError("Could not render PDF page \(pageNumber)")
    }
    let destination = outputDirectory.appendingPathComponent("page-\(pageNumber).png")
    try png.write(to: destination)
    print(destination.path)
}
