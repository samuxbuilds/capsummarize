/**
 * Extracts text from VTT content, optionally removing timestamps.
 *
 * @param vttContent - VTT content to extract text from.
 * @param removeTimestamps - Whether to remove timestamps from the extracted text.
 * @returns Extracted text.
 */
export function extractTextFromVTT(vttContent: string, removeTimestamps: boolean = false): string {
  const lines = vttContent.split('\n');

  let buffer: string[] = [];
  let result: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();

    // Skip metadata and styles
    if (!trimmed) continue;
    if (trimmed.startsWith('X-TIMESTAMP-MAP')) continue;
    if (trimmed.startsWith('WEBVTT')) continue;
    if (trimmed.startsWith('NOTE')) continue;
    if (trimmed.startsWith('STYLE')) continue;
    if (/^\d+$/.test(trimmed)) continue;

    // Skip timestamp lines if requested
    if (removeTimestamps && trimmed.includes('-->')) {
      // When timestamps appear, push current buffer as a block
      if (buffer.length) {
        result.push(buffer.join(' '));
        buffer = [];
      }
      continue;
    }

    // Accumulate words into the same buffer
    buffer.push(trimmed);
  }

  // push the last block
  if (buffer.length) {
    result.push(buffer.join(' '));
  }

  return result
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
}

/**
 * Analyzes VTT content to detect thumbnail sprite sheets
 *
 * Video platforms often provide thumbnail VTT files that contain sprite coordinates
 * (#xywh=x,y,width,height) instead of actual subtitle text. These are used for
 * hover previews in the video player timeline.
 *
 * Detection algorithm:
 * - Counts lines containing #xywh= (sprite coordinates)
 * - Counts lines with actual human-readable text content
 * - Counts timestamp arrows (-->) for validation
 * - Excludes WebVTT directives, timestamps, comments, and image references
 * - Returns true if many sprite refs exist but no actual text
 *
 * Example thumbnail VTT line:
 *   00:00:00.000 --> 00:00:05.000
 *   thumb-sprites.jpg#xywh=0,0,160,90
 *
 * @param content - The VTT file content to analyze
 * @returns True if content is a thumbnail sprite sheet, false if real subtitles
 */
export function isThumbnailVTT(content: string): boolean {
  if (!content || content.length === 0) return false;

  try {
    const lines = content.split('\n');
    let xywh_count = 0;
    let actual_text_count = 0;
    let arrow_count = 0; // Count timestamp arrows (-->)

    // Sample first 100 lines for performance (sufficient for detection)
    for (let i = 0; i < Math.min(lines.length, 100); i++) {
      const line = (lines[i] || '').trim();

      // Count sprite coordinate references
      if (/#xywh=/.test(line)) {
        xywh_count++;
      }

      // Count timestamp arrows
      if (/-->/.test(line)) {
        arrow_count++;
      }

      // Identify actual subtitle text by excluding non-text lines
      const isDirective = /^(WEBVTT|NOTE|STYLE|REGION|CUESTYLETEXT)/.test(line);
      const isTimestamp = /^\d{2}:\d{2}/.test(line);
      const isComment = /^NOTE/.test(line);
      const isImageRef = /\.(jpg|jpeg|png|webp|gif)/.test(line);

      // If line has content and isn't metadata/timing/image, count as actual text
      if (
        line.length > 0 &&
        !isDirective &&
        !isTimestamp &&
        !isComment &&
        !isImageRef &&
        !/^$/.test(line)
      ) {
        actual_text_count++;
      }
    }

    // Thumbnail VTT: has many sprite refs, some timestamps, but NO actual text content
    // Real VTT: has timestamps and actual dialogue/captions
    const isThumbnail = xywh_count > 5 && actual_text_count === 0;

    return isThumbnail;
  } catch (e) {
    return false;
  }
}
