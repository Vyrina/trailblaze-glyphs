# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.1] - Oct 15, 2026

### Changed
- Load the wasm only ONNX Runtime build and pin its version (14 MB instead of 28 MB)
- Start loading models when the scan button is clicked or an image is dragged over

## [1.7.0] - Oct 14, 2026

### Added
- Screenshot decode with a text line detector (`text_detector.onnx`)
- Translated image for screenshots (decoded text drawn over the original lines)
- Larger preview with Save PNG
- Line overlay on the preview (green = read, orange = skipped)
- Click the script badge to switch to the next most likely script
- Support light text on dark background in screenshot decode

### Changed
- Retrain all 4 OCR models (Jarilo, Xianzhou, Penacony, Amphoreus) with screenshot style text and icon training
- Detect script from the 12 biggest lines instead of 1 in screenshots
- Skip lines under 11px or with low confidence
- Add version to OCR model URLs to avoid old models in browser cache

### Fixed
- Fix random characters when decoding game screenshots (icons, small text)

## [1.6.0] - Sep 24, 2026

### Added
- Decode progress status (model loading, script detection 1/4, multiline reading)
- Loading spinner on script badge and output pulse during decode

### Changed
- Retrain all 4 OCR models (Jarilo, Xianzhou, Penacony, Amphoreus) with improved punctuation training
- Expand Penacony and Amphoreus alphabets to support standard symbols and punctuation

### Fixed
- Fix repeated punctuation collapsing into single characters in OCR (e.g. "...", "!!!")

## [1.5.1] - Sep 15, 2026

### Changed
- Use canvas smoothing for OCR line downsampling

### Fixed
- Fix OCR misdetection and corrupted glyphs on large font sizes (e.g. 120px)
- Fix aspect ratio distortion when cropping long text lines in OCR
- Fix glyph index cells stretching vertically on desktop (0-9 tab)

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
