# Image Examples

This folder contains AI-generated image examples from CapSummarize.

## Format

Each example follows this naming convention:
```
{video-slug}-{style}.webp
```

For example:
- `ai-engineering-explained-thumbnail-mrbeast.webp`
- `react-19-features-infographic.webp`
- `cooking-tutorial-comic.webp`

## Adding Examples

1. Watch a YouTube video with captions
2. Use CapSummarize to generate an image
3. Save the generated image
4. Create a markdown file with the same name describing the example:

```markdown
# [Video Title] - [Style]

**Source:** [YouTube Link](https://youtube.com/watch?v=...)
**Style:** Thumbnail (MrBeast) / Infographic / Mind Map / etc.
**Provider:** ChatGPT / Gemini / Grok
**Generated:** YYYY-MM-DD

## Preview

![Preview](./filename.webp)

## Prompt Used

[The prompt that was used to generate this image]
```

## Available Image Styles

- Thumbnail (General)
- Thumbnail (MrBeast Style)
- Thumbnail (Casey Neistat Style)
- Thumbnail (Theo Style)
- Thumbnail (5-Min Crafts Style)
- Infographic
    ![Preview](./generated-images/infographic.webp)
- Comic Strip
    ![Preview](./generated-images/comic.webp)
- Mind Map
    ![Preview](./generated-images/mind-map.webp)
- Whiteboard
    ![Preview](./generated-images/whiteboard.webp)
- Quote Card
    ![Preview](./generated-images/quote-card.webp)
- Scene Visualization
    ![Preview](./generated-images/scene.webp)

## Supported Providers

- ChatGPT (DALL-E)
- Gemini (Imagen)
- Grok
