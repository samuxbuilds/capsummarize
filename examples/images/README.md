# Image Examples

This folder contains AI-generated image examples from CapSummarize.

## Format

Each example follows this naming convention:
```
{video-slug}-{style}.png
```

For example:
- `ai-engineering-explained-thumbnail-mrbeast.png`
- `react-19-features-infographic.png`
- `cooking-tutorial-comic.png`

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

![Preview](./filename.png)

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
    ![Preview](./generated-images/infographic.png)
- Comic Strip
    ![Preview](./generated-images/comic.png)
- Mind Map
    ![Preview](./generated-images/mind-map.png)
- Whiteboard
    ![Preview](./generated-images/whiteboard.png)
- Quote Card
    ![Preview](./generated-images/quote-card.png)
- Scene Visualization
    ![Preview](./generated-images/scene.png)

## Supported Providers

- ChatGPT (DALL-E)
- Gemini (Imagen)
- Grok
