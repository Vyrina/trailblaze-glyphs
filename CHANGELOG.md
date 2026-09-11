# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - Sep 10, 2026

### Added
- Support Amphoreus glyph decode (CRNN model and alphabet mapping)

## [1.4.0] - Sep 07, 2026

### Added
- Support Penacony glyph decode (CRNN model and alphabet mapping)

## [1.3.0] - Sep 03, 2026

### Added
- Support Xianzhou glyph decode (CRNN model and alphabet mapping)

### Fixed
- Run model inference sequentially to avoid ONNX WASM session crash

## [1.2.0] - Aug 29, 2026

### Added
- In browser glyph OCR engine using ONNX Runtime Web and CTC decoding
- Support Jarilo VI glyph decode (CRNN model and alphabet mapping)
- Multiline image decode with line segmentation and densest line script detection
- Support paste from clipboard (Ctrl + V), drag and drop, and file upload
- Decode preview card with thumbnail, script badge, confidence, and dismiss button
- Multiline PNG export with line measurement and vertical spacing

### Fixed
- Lock controls (script select, swap, export) during active decode

## [1.1.0] - Aug 21, 2026

### Added
- Filter tabs for uppercase, lowercase, and numbers in glyph index (A to Z, a to z, 0 to 9)
- Shortcut tooltips on swap, clear, and copy buttons

### Changed
- Insert clicked glyphs at text cursor position instead of appending to end
- Center GitHub repo link in sidebar

## [1.0.1] - Aug 20, 2026

### Changed
- Change default font size to 18px (was 24px)
- Update size presets to 18, 24, 36, 48 (desktop) and 18, 24, 32 (mobile)
- Update third sample quote to Reach the ending of the story in your own way

### Fixed
- Fix mobile input and output overflow (add 220px max height and touch scroll)

## [1.0.0] - Aug 20, 2026

### Added
- Latin to in game script translation (Jarilo VI, Xianzhou, Penacony, Amphoreus)
- Reverse translation mode (script to Latin)
- 2x retina PNG export directly to clipboard with toast popup
- Font size slider (16px to 120px) with quick presets
- Character map sidebar with click to insert
- Live char and word counter
- Preset sample quotes for quick testing
- Keyboard shortcuts: Ctrl + Shift + S (swap), Ctrl + Shift + C (copy PNG), Esc (clear)
- Mobile responsive layout with script selection modal
