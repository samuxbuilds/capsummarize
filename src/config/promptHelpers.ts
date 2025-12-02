import {
  promptTemplates,
  getAspectRatioText,
  type PromptTemplate,
  type PromptVariant,
  type OutputType,
  type AspectRatio,
} from './prompts.js';

/**
 * Return all available prompt templates.
 */
export function getAllPromptTemplates(): PromptTemplate[] {
  return promptTemplates;
}

/**
 * Filter prompt templates for text output.
 */
export function getTextPromptTemplates(): PromptTemplate[] {
  return promptTemplates.filter(
    (template) => !template.outputType || template.outputType === 'text'
  );
}

/**
 * Filter prompt templates for image output.
 */
export function getImagePromptTemplates(): PromptTemplate[] {
  return promptTemplates.filter((template) => template.outputType === 'image');
}

/**
 * Filter prompt templates for video output.
 */
export function getVideoPromptTemplates(): PromptTemplate[] {
  return promptTemplates.filter((template) => template.outputType === 'video');
}

/**
 * Retrieve prompt templates scoped by output type.
 */
export function getPromptTemplatesByType(outputType: OutputType): PromptTemplate[] {
  if (outputType === 'text') {
    return getTextPromptTemplates();
  }
  if (outputType === 'video') {
    return getVideoPromptTemplates();
  }
  return getImagePromptTemplates();
}

/**
 * Find a single prompt template by variant name.
 */
export function getPromptTemplate(variant: string): PromptTemplate | undefined {
  return promptTemplates.find((template) => template.variant === variant);
}

/**
 * Check if a variant is flagged as an image template.
 */
export function isImageVariant(variant: string): boolean {
  const template = getPromptTemplate(variant);
  return template?.outputType === 'image';
}

/**
 * Check if a variant is flagged as a video template.
 */
export function isVideoVariant(variant: string): boolean {
  const template = getPromptTemplate(variant);
  return template?.outputType === 'video';
}

/**
 * Format prompt templates for UI consumption.
 */
export function getPromptVariantsForUI(): Array<{
  variant: string;
  label: string;
  description: string;
  prompt: string;
  outputType: OutputType;
}> {
  return promptTemplates.map((template) => ({
    variant: template.variant,
    label: template.label,
    description: template.description,
    prompt: template.prompt,
    outputType: template.outputType || 'text',
  }));
}

/**
 * Text-only prompt variants formatted for UI consumption.
 * Returns variants sorted alphabetically by label for easier navigation.
 */
export function getTextPromptVariantsForUI(): Array<{
  variant: string;
  label: string;
  description: string;
  prompt: string;
  outputType: OutputType;
}> {
  return getTextPromptTemplates()
    .map((template) => ({
      variant: template.variant,
      label: template.label,
      description: template.description,
      prompt: template.prompt,
      outputType: 'text' as OutputType,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Image prompt variants formatted for UI consumption.
 */
export function getImagePromptVariantsForUI(): Array<{
  variant: string;
  label: string;
  description: string;
  prompt: string;
  outputType: OutputType;
}> {
  return getImagePromptTemplates().map((template) => ({
    variant: template.variant,
    label: template.label,
    description: template.description,
    prompt: template.prompt,
    outputType: 'image' as OutputType,
  }));
}

/**
 * Video prompt variants formatted for UI consumption.
 * Returns variants sorted alphabetically by label for easier navigation.
 */
export function getVideoPromptVariantsForUI(): Array<{
  variant: string;
  label: string;
  description: string;
  prompt: string;
  outputType: OutputType;
}> {
  return getVideoPromptTemplates()
    .map((template) => ({
      variant: template.variant,
      label: template.label,
      description: template.description,
      prompt: template.prompt,
      outputType: 'video' as OutputType,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Determine whether a variant represents a thumbnail template.
 */
export function isThumbnailVariant(variant: string): boolean {
  return variant === 'thumbnail' || variant.startsWith('thumbnail-');
}

/**
 * Return only thumbnail prompt templates.
 */
export function getThumbnailPromptTemplates(): PromptTemplate[] {
  return promptTemplates.filter((template) => isThumbnailVariant(template.variant));
}

/**
 * Format thumbnail prompt templates for UI consumption.
 * Returns variants sorted alphabetically by label for easier navigation.
 */
export function getThumbnailPromptVariantsForUI(): Array<{
  variant: string;
  label: string;
  description: string;
  prompt: string;
  outputType: OutputType;
}> {
  return getThumbnailPromptTemplates()
    .map((template) => ({
      variant: template.variant,
      label: template.label
        .replace('Thumbnail ', '')
        .replace('(', '')
        .replace(' Style)', '')
        .replace(')', ''),
      description: template.description,
      prompt: template.prompt,
      outputType: 'image' as OutputType,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Return non-thumbnail image prompt templates.
 */
export function getNonThumbnailImagePromptTemplates(): PromptTemplate[] {
  return promptTemplates.filter(
    (template) => template.outputType === 'image' && !isThumbnailVariant(template.variant)
  );
}

/**
 * Format non-thumbnail image prompt templates for UI consumption.
 * Returns variants sorted alphabetically by label for easier navigation.
 */
export function getNonThumbnailImagePromptVariantsForUI(): Array<{
  variant: string;
  label: string;
  description: string;
  prompt: string;
  outputType: OutputType;
}> {
  return getNonThumbnailImagePromptTemplates()
    .map((template) => ({
      variant: template.variant,
      label: template.label,
      description: template.description,
      prompt: template.prompt,
      outputType: 'image' as OutputType,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Inject aspect ratio guidance into an image prompt.
 * Handles both the instruction text AND updates any hardcoded JSON values.
 */
export function addAspectRatioToPrompt(prompt: string, aspectRatio: AspectRatio): string {
  const ratioText = getAspectRatioText(aspectRatio);
  const aspectInstruction = `\n\n**CRITICAL: Generate the image in ${ratioText} aspect ratio. This overrides any other aspect ratio mentioned.**\n`;

  let updatedPrompt = prompt;

  // Update hardcoded JSON aspect_ratio values
  if (aspectRatio === 'vertical') {
    // Replace aspect ratio strings
    updatedPrompt = updatedPrompt.replace(/"aspect_ratio":\s*"16:9"/g, '"aspect_ratio": "9:16"');
    updatedPrompt = updatedPrompt.replace(
      /16:9 landscape \(YouTube thumbnail\)/g,
      '9:16 vertical (Shorts/Reels/TikTok)'
    );
    updatedPrompt = updatedPrompt.replace(/16:9 \(cinematic\)/g, '9:16 (vertical/mobile)');
    updatedPrompt = updatedPrompt.replace(/16:9 or square/g, '9:16 vertical');

    // Replace size_pixels for common resolutions (swap width/height)
    updatedPrompt = updatedPrompt.replace(/\[1920,\s*1080\]/g, '[1080, 1920]');
    updatedPrompt = updatedPrompt.replace(/\[3840,\s*2160\]/g, '[2160, 3840]');
    updatedPrompt = updatedPrompt.replace(/\[1200,\s*1800\]/g, '[1800, 1200]');
    updatedPrompt = updatedPrompt.replace(/\[1080,\s*1080\]/g, '[1080, 1920]');

    // Update composition guidelines for vertical
    updatedPrompt = updatedPrompt.replace(
      /face occupying 30-40% of frame/g,
      'face occupying 40-50% of frame (vertical format)'
    );
    updatedPrompt = updatedPrompt.replace(
      /text on one side and face on other/g,
      'text on top and face on bottom (vertical stack)'
    );
  } else {
    // Ensure wide format values are correct
    updatedPrompt = updatedPrompt.replace(/"aspect_ratio":\s*"9:16"/g, '"aspect_ratio": "16:9"');
  }

  // Inject the aspect ratio instruction before transcript
  const transcriptMarker = '### SOURCE TRANSCRIPT';
  if (updatedPrompt.includes(transcriptMarker)) {
    return updatedPrompt.replace(transcriptMarker, `${aspectInstruction}${transcriptMarker}`);
  }

  const transcriptMarkerAlt = '### TRANSCRIPT';
  if (updatedPrompt.includes(transcriptMarkerAlt)) {
    return updatedPrompt.replace(transcriptMarkerAlt, `${aspectInstruction}${transcriptMarkerAlt}`);
  }

  return updatedPrompt + aspectInstruction;
}
