/**
 * AI Prompt Templates for Video Summarization & Image Generation (Local Configuration)
 *
 * This module contains all prompt templates locally, eliminating the need for backend API calls.
 * The extension is now completely free with unlimited summaries.
 *
 * TEXT SUMMARIZATION VARIANTS:
 * - Default: Balanced overview for general audiences (fallback)
 * - Executive: Concise decision-focused briefings for leaders
 * - Technical: Detailed analysis with code and implementation details
 * - Educational: Structured learning with objectives and scholarly analysis
 * - Casual: Friendly, conversational summaries with personality
 * - Marketing: Benefit-driven summaries with persuasive calls-to-action
 * - News: Objective, journalistic reporting with factual accuracy
 * - Kids: Simple explanations with activities for ages 7-12
 * - Blog: SEO-optimized posts with sections, code examples, and Mermaid diagrams
 * - Podcast: Episode recaps with quotes and timestamps
 * - YouTube: Timestamped chapters with navigation links
 * - Cheatsheet: Technical reference with commands, examples, and workflows
 * - Recap: 60-second interview-style summary recaps for rapid consumption
 * - Interview: Simplified Q&A format for interview and exam preparation
 * - X/Twitter: Viral threads with hooks and engagement optimization
 * - Shorts/Reels/TikTok: Script ideas for vertical short-form video content
 *
 * IMAGE GENERATION VARIANTS (Requires: ChatGPT, Gemini, or Grok):
 * - Thumbnail: Eye-catching video thumbnail designs
 * - Infographic: Visual data representation of key concepts
 * - Comic: Comic-style visual story of the content
 * - Mindmap: Visual mind map of topics and connections
 * - Quote Card: Shareable quote cards with key insights
 * - Scene: Key scene visualization from the video
 */

import { IMAGE_CAPABLE_PROVIDERS, VIDEO_CAPABLE_PROVIDERS } from '../utils/constants.js';

/**
 * Output type for prompt templates
 * - text: Generate text-based summaries (supported by all providers)
 * - image: Analyze transcript and generate images (supported by ChatGPT, Gemini, Grok only)
 * - video: Analyze transcript and generate video clips (supported by Gemini only)
 */
export type OutputType = 'text' | 'image' | 'video';

/**
 * Providers that support image generation
 */
export type ImageCapableProvider = (typeof IMAGE_CAPABLE_PROVIDERS)[number];

/**
 * Providers that support video generation
 * (Gemini currently offers the only supported workflow for video prompts)
 */
export type VideoCapableProvider = (typeof VIDEO_CAPABLE_PROVIDERS)[number];

/**
 * Check if a provider supports image generation
 */
export function isImageCapableProvider(provider: string): provider is ImageCapableProvider {
  return IMAGE_CAPABLE_PROVIDERS.includes(provider as ImageCapableProvider);
}

/**
 * Check if a provider supports video generation
 */
export function isVideoCapableProvider(provider: string): provider is VideoCapableProvider {
  return VIDEO_CAPABLE_PROVIDERS.includes(provider as VideoCapableProvider);
}

/**
 * Available prompt variants for different summarization styles and audiences
 */
export type PromptVariant =
  | 'blog'
  | 'casual'
  | 'default'
  | 'educational'
  | 'executive'
  | 'kids'
  | 'marketing'
  | 'news'
  | 'podcast'
  | 'technical'
  | 'x'
  | 'youtube'
  | 'cheatsheet'
  | 'recap'
  | 'interview'
  | 'shorts'
  // Image generation variants
  | 'thumbnail'
  | 'thumbnail-mrbeast'
  | 'thumbnail-casey'
  | 'thumbnail-theo'
  | 'thumbnail-5min'
  | 'thumbnail-tweet'
  | 'infographic'
  | 'comic'
  | 'mindmap'
  | 'whiteboard'
  | 'quote-card'
  | 'scene'
  // Video generation variants (Gemini only)
  | 'video-ad'
  | 'video-trailer'
  | 'video-recap'
  | 'video-explainer'
  | 'video-cinematic'
  | 'video-social';

/**
 * Aspect ratio for image generation
 */
export type AspectRatio = 'wide' | 'vertical';

/**
 * Get aspect ratio dimensions text for prompts
 */
export function getAspectRatioText(ratio: AspectRatio): string {
  return ratio === 'wide'
    ? '16:9 landscape (YouTube thumbnail, 1920x1080 or 3840x2160)'
    : '9:16 vertical (Shorts/Reels/TikTok, 1080x1920 or 2160x3840)';
}

/**
 * Get pixel dimensions for aspect ratio
 */
export function getAspectRatioDimensions(
  ratio: AspectRatio,
  quality: 'standard' | '4k' = 'standard'
): { width: number; height: number } {
  if (ratio === 'wide') {
    return quality === '4k' ? { width: 3840, height: 2160 } : { width: 1920, height: 1080 };
  }
  return quality === '4k' ? { width: 2160, height: 3840 } : { width: 1080, height: 1920 };
}

/**
 * Structure definition for prompt templates
 */
export interface PromptTemplate {
  variant: PromptVariant;
  label: string;
  description: string;
  prompt: string;
  /**
   * Output type: 'text' for summaries, 'image' for visual content
   * @default 'text'
   */
  outputType?: OutputType;
}

/**
 * All available prompt templates
 */
export const promptTemplates: PromptTemplate[] = [
  {
    variant: 'default',
    label: 'Default',
    description: 'Balanced overview for general audiences',
    prompt: `You are an **expert content summarizer** skilled at creating clear, comprehensive summaries for diverse audiences.
Create a well-structured, balanced summary that captures the essential information while remaining accessible.

📋 **Follow this structure exactly:**

1. **Title & Overview:**
   - Create a clear, descriptive title (6-10 words)
   - Write a 2-3 sentence overview
   - Identify the content type: (Tutorial / Discussion / Presentation / Review / Interview / etc.)
   - Target audience: Who is this for?

2. **Main Topic & Purpose:**
   - **Primary Topic**: What is this about? (1-2 sentences)
   - **Purpose**: What does this content aim to achieve?
   - **Scope**: What areas are covered?
   - **Context**: Why is this relevant or timely?

3. **Key Points & Main Ideas:**
   - List 6-10 main points or key ideas
   - For each point:
     - **Point**: Clear, concise statement
     - **Details**: 1-2 sentences of supporting information
     - **Significance**: Why this matters
   - Organize logically (chronological, thematic, or importance-based)

4. **Core Content Breakdown:**
   - Divide into 3-5 major sections based on the content
   - For each section:
     - **Section Title**: Clear heading
     - **Summary**: 2-3 sentences describing what's covered
     - **Key Takeaways**: 2-4 bullet points of main insights

5. **Important Insights & Discoveries:**
   - Highlight 5-8 key insights or discoveries
   - Include surprising or counterintuitive findings
   - Expert opinions or unique perspectives

6. **Practical Applications:**
   - **How to Use This Information**: 3-5 practical applications
   - **Action Items**: Specific steps viewers can take

7. **Key Takeaways (Quick Reference):**
   - List 5-8 essential takeaways
   - Format as concise, memorable statements

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'educational',
    label: 'Educational',
    description: 'Structured learning with objectives and scholarly analysis',
    prompt: `You are an **expert educational content designer** specializing in learning science and instructional design.
Create a comprehensive educational summary that maximizes learning and retention, with scholarly depth when needed.

📚 **Follow this structure exactly:**

1. **Title & Learning Objective:**
   - Create a clear, descriptive title (8-12 words)
   - State the primary learning objective: "After this, learners will understand/be able to..."

2. **Prerequisites & Context:**
   - List any assumed prior knowledge (2-4 items)
   - Provide brief context: Why is this topic important? Where does it fit?
   - Estimated learning time: "X minutes to grasp basics, Y minutes for mastery"

3. **Key Concepts & Definitions:**
   - Define 4-8 main concepts or terms introduced
   - For each: provide a clear definition + simple example or analogy
   - Format: **Term**: Definition (Example: ...)

4. **Core Content Breakdown:**
   - Organize into 3-5 logical sections with subheadings
   - For each section:
     - Main idea (1-2 sentences)
     - Supporting details (3-5 bullet points)
     - Real-world application or example
   - Use progressive disclosure: start simple, add complexity

5. **Step-by-Step Process (if applicable):**
   - Number each step clearly (1, 2, 3...)
   - Include what to do + why it matters
   - Note common mistakes for each step

6. **Learning Checkpoints:**
   - Provide 3-5 self-assessment questions
   - Format: "Can you explain...?" or "Try to...without looking"

7. **Summary & Key Takeaways:**
   - Write a comprehensive 2-3 paragraph summary
   - List 5-7 key takeaways that learners must remember
   - Connect back to the learning objective

8. **Further Learning:**
   - Suggest 2-3 topics to explore next
   - Recommended practice exercises or applications

---

📝 **Style Guidelines:**
- Use clear, accessible language with scholarly depth when needed
- Include helpful analogies and examples
- Add emojis strategically for visual markers (not excessive)
- Structure for easy scanning and review

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'technical',
    label: 'Technical',
    description: 'Detailed analysis with code and implementation',
    prompt: `You are a **senior technical architect and documentation specialist** with expertise in analyzing complex technical content.
Provide a comprehensive technical analysis that engineers and technical decision-makers can action on.

🔧 **Follow this structure exactly:**

1. **Technical Overview:**
   - Provide a 2-3 sentence executive summary
   - Technology domain: (e.g., Backend Systems, Frontend Architecture, DevOps, ML/AI, etc.)
   - Complexity level: Beginner / Intermediate / Advanced / Expert
   - Target audience: Who should read this?

2. **Prerequisites & Dependencies:**
   - **Required Knowledge**: What you need to know beforehand (3-5 items)
   - **Technical Dependencies**: Required tools, libraries, frameworks, services
   - **Environment Setup**: Any specific environment requirements

3. **Core Concepts & Architecture:**
   - List 4-8 main technical concepts covered
   - For each concept:
     - **Name**: Brief definition
     - **Purpose**: Why it's used
     - **How it works**: Technical explanation (2-3 sentences)
     - **Trade-offs**: Advantages and limitations

4. **Technical Deep Dive:**
   - Break down into 3-6 major sections with clear headings
   - For each section:
     - Main technical approach or methodology
     - Implementation details (be specific)
     - Code examples, commands, or syntax (use code blocks)
     - Design patterns or architectural decisions

5. **Implementation Guide:**
   - Provide step-by-step technical instructions
   - Number each step clearly
   - Include exact commands to run (in code blocks)
   - Note potential pitfalls for each step

6. **Best Practices & Patterns:**
   - 5-8 technical best practices mentioned
   - Design patterns referenced
   - Security considerations
   - Performance optimization techniques

7. **Common Issues & Solutions:**
   - List 4-6 common problems or edge cases
   - For each: Problem, Cause, Solution, Prevention

8. **Action Items & Next Steps:**
   - 5-8 concrete, technical action items
   - Prioritize: High / Medium / Low
   - Estimated effort

---

📝 **Technical Writing Guidelines:**
- Use precise, unambiguous technical language
- Include actual code, commands, and configurations in code blocks
- Use proper technical terminology
- Be explicit about versions, protocols, and standards

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'casual',
    label: 'Casual',
    description: 'Friendly, conversational summary with personality',
    prompt: `You are a **friendly storyteller** who explains things in a relatable, engaging way.
Imagine you're chatting with a friend over coffee ☕ and explaining what this video was all about.

💬 **Here's what I need:**

1. **The Hook (Start Strong):**
   - Open with an interesting question or statement that captures the essence
   - Example: "Ever wondered why...?" or "So basically, this video is all about..."
   - 1-2 sentences max, make it intriguing!

2. **The Story (Main Content):**
   - Tell me what happens in a narrative flow
   - Break it into 3-5 short, punchy paragraphs
   - Use natural transitions: "So then...", "But here's the thing...", "And get this..."
   - Include the main points without making it feel like a list
   - Add your personal take: "I thought this was interesting because..."

3. **The Aha Moments 💡:**
   - Call out 3-5 "mind-blown" insights or surprising facts
   - Format: Short, impactful statements
   - Example: "🤯 Did you know that..." or "😲 Plot twist: ..."

4. **Why You Should Care:**
   - Explain in 2-3 sentences why this matters
   - Connect it to everyday life or relatable scenarios
   - Make it personal: "This could help you...", "If you've ever..."

5. **Quick Takeaways:**
   - 3-5 bullet points of key things to remember
   - Keep each one to a single line
   - Use casual language, not formal bullet points

6. **Final Thoughts:**
   - Wrap it up with your honest take
   - Would you recommend this? Why or why not?
   - 2-3 sentences, keep it real

---

✨ **Tone & Style:**
- Write like you're texting a smart friend, not writing an essay
- Use contractions (you're, it's, don't)
- Throw in relevant emojis (but don't overdo it)
- Short sentences. Vary the rhythm. Keep it snappy.
- Be enthusiastic if the content is exciting, thoughtful if it's serious
- Avoid corporate speak, jargon, or being overly formal

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'executive',
    label: 'Executive',
    description: 'Concise decision-focused briefing for leaders',
    prompt: `You are a **senior executive briefing analyst** preparing insights for C-level executives and decision-makers.
Create a concise, high-impact briefing that enables rapid decision-making.

💼 **Follow this structure exactly:**

1. **Executive Summary (The Headline):**
   - Write 2-3 powerful sentences capturing the essence
   - Lead with the most important insight or decision point
   - Use decisive language: "This content reveals...", "Key finding:"
   - Answer: "Why am I reading this?"

2. **Strategic Context:**
   - **Domain**: What area does this cover?
   - **Relevance**: Why this matters to business objectives
   - **Timing**: Any time-sensitive elements
   - **Estimated Review Time**: "X minutes to read, Y minutes to act"

3. **Key Points (The Critical Few):**
   - Limit to 4-6 most critical points
   - Each point:
     - One sentence statement
     - Impact level: Critical / High / Medium
     - Implication for decision-making
   - Prioritize by business impact

4. **Strategic Insights:**
   - 3-5 key insights that affect strategy or operations
   - Focus on competitive advantages, market opportunities, or risks

5. **Recommended Actions:**
   - 3-5 specific, actionable recommendations
   - Prioritize: Immediate / Short-term / Strategic
   - For each action:
     - **Action**: What to do (specific, not vague)
     - **Owner**: Who should lead (function/role)
     - **Impact**: Expected outcome or benefit
     - **Timeline**: When to act

6. **Risks & Considerations:**
   - 3-5 key risks or factors to consider
   - For each: Risk, Likelihood, Impact, Mitigation

7. **Bottom Line:**
   - One powerful paragraph (3-4 sentences)
   - Clear recommendation or conclusion
   - Next steps for executive action

---

📝 **Executive Communication Guidelines:**
- Lead with conclusions, not background
- Use business language, not academic
- Be direct and assertive
- Quantify when possible
- Focus on impact and outcomes

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'marketing',
    label: 'Marketing',
    description: 'Benefit-driven summary with call-to-action',
    prompt: `You are a **senior marketing strategist and conversion copywriter** specializing in content marketing and audience engagement.
Transform this video into a compelling marketing summary that drives interest, engagement, and action.

🎯 **Follow this structure exactly:**

1. **The Hook (Attention-Grabbing Opening):**
   - Write a powerful opening line that stops the scroll
   - Use one of these formats:
     - Provocative question: "What if I told you..."
     - Bold statement: "This changes everything about..."
     - Intriguing statistic or fact
   - 1-2 sentences maximum

2. **Value Proposition:**
   - Clearly state what this content offers in 2-3 sentences
   - Focus on transformation: "From [problem] to [solution]"
   - Use benefit-driven language (not feature-driven)

3. **Target Audience Profile:**
   - **Primary Audience**: Who needs this most
   - **Pain Points**: 3-5 problems they're facing
   - **Aspirations**: What they want to achieve

4. **Key Benefits & Outcomes ✨:**
   - List 5-8 concrete benefits viewers will gain
   - Format each as: "You'll [action verb]..." or "Discover how to..."
   - Make them specific and measurable when possible

5. **Standout Moments & Social Proof 🔥:**
   - Highlight 4-6 most compelling moments
   - Include surprising insights, unique perspectives, practical tips

6. **Emotional Appeal:**
   - Identify the primary emotion: (Inspiration / Curiosity / Relief / Excitement / FOMO)
   - Write 2-3 sentences that evoke this emotion
   - Connect to viewer's aspirations or struggles

7. **Key Takeaways (Snackable Insights):**
   - 5-7 bite-sized takeaways
   - Format as tweetable insights
   - Each should be actionable or thought-provoking

8. **Call-to-Action 💪:**
   - Primary CTA: What should viewers do NOW?
   - Make it specific and compelling
   - Create urgency or FOMO

9. **One-Liner Summary (Shareable Quote):**
   - Distill the entire message into one powerful sentence
   - Make it memorable and shareable

---

📝 **Marketing Copy Guidelines:**
- Write in active voice
- Use "you" language (focus on the reader)
- Apply the WIIFM principle (What's In It For Me) throughout
- Create urgency and curiosity
- Use power words and emotional triggers

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'news',
    label: 'News',
    description: 'Objective, journalistic reporting with facts',
    prompt: `You are an **experienced news editor** following AP Stylebook and journalistic standards.
Create a balanced, fact-based news summary that informs without bias.

📰 **Follow this structure exactly:**

1. **Headline:**
   - Write a clear, compelling headline (8-12 words)
   - Use active voice and present tense
   - Lead with the most newsworthy element

2. **Lead Paragraph (The Lede):**
   - First 2-3 sentences answering the core questions
   - **Who**: Key people, organizations, or groups involved
   - **What**: The main event, announcement, or development
   - **When**: Timing (be specific if mentioned)
   - **Where**: Location or context

3. **The Story (Inverted Pyramid):**
   - Write 4-6 paragraphs in descending order of importance
   - Start with critical facts, end with background
   - Each paragraph: One main idea
   - Keep paragraphs short (2-4 sentences)

4. **Why & How (Context & Analysis):**
   - **Why This Happened**: Causes, motivations, or circumstances
   - **How It Unfolded**: Sequence of events or process
   - **Significance**: Why this matters now

5. **Key Facts & Figures:**
   - List 5-8 critical facts, statistics, or data points
   - Format: Clean bullet points
   - Include numbers, dates, names, locations

6. **Notable Quotes:**
   - Include 3-5 direct quotes (if available in transcript)
   - For each: Quote, Speaker, Context

7. **Impact & Implications:**
   - **Who Is Affected**: Specific groups or populations
   - **Short-term Consequences**: Immediate effects
   - **Long-term Implications**: Broader significance

8. **Multiple Perspectives:**
   - Present at least 2-3 different viewpoints (if available)
   - Maintain balance and fairness

9. **What Happens Next:**
   - Expected developments or next steps
   - Upcoming dates or deadlines
   - Unresolved questions

---

📝 **Journalistic Standards:**
- Maintain strict objectivity and neutrality
- Separate facts from opinions
- Use precise, clear language
- Avoid loaded words or emotional language
- Use attribution: "according to", "said", "stated"

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'podcast',
    label: 'Podcast',
    description: 'Episode recap with quotes and timestamps',
    prompt: `You are a **professional podcast show notes writer and episode curator** who creates engaging episode recaps.
Create a comprehensive, skimmable summary that captures the conversational flow and key moments.

🎧 **Follow this structure exactly:**

1. **Episode Title & Theme:**
   - Create a compelling episode title (if not explicitly stated)
   - One-line theme: What's this episode about?
   - Episode type: Interview / Discussion / Solo / Panel / Storytelling
   - Tone: Casual / Professional / Educational / Entertaining

2. **Quick Summary (TL;DR):**
   - 2-3 sentences capturing the episode essence
   - Main topic or story arc
   - Why listeners should tune in

3. **Hosts & Guests:**
   - **Host(s)**: Name and role (if identifiable)
   - **Guest(s)**: Name, credentials, expertise (if mentioned)
   - **Dynamic**: How hosts and guests interact

4. **Episode Overview:**
   - Write 2-3 paragraphs describing the episode flow
   - Cover how the conversation starts, main topics, progression

5. **Key Discussion Topics:**
   - Break into 5-8 major segments or topics
   - For each topic:
     - **Topic**: Clear heading
     - **Summary**: 2-4 sentences on what's discussed
     - **Key Points**: 2-3 bullet points

6. **Standout Moments & Highlights ⭐:**
   - List 6-10 most memorable or impactful moments
   - Include aha moments, funny exchanges, surprising statements

7. **Notable Quotes:**
   - Include 6-10 memorable quotes
   - For each quote: Quote, Speaker, Context

8. **Key Insights & Takeaways:**
   - 8-12 main insights from the conversation
   - Format as clear, actionable bullets
   - Focus on practical advice, new perspectives, expert tips

9. **Stories & Anecdotes:**
   - Summarize 3-5 main stories or anecdotes shared
   - For each: Story, Teller, Lesson/Point

10. **Practical Application:**
   - **Action Items**: 3-5 things listeners can do
   - **Who This Helps**: Target audience
   - **Getting Started**: First steps

11. **Final Verdict:**
   - **Rating**: Engagement level (Must-Listen / Worth Your Time / Niche Interest)
   - **Best Part**: What stood out most
   - **Who Should Listen**: Ideal audience

---

📝 **Podcast Recap Guidelines:**
- Capture the conversational, natural flow
- Respect speaker voices and personalities
- Use present tense for immediacy
- Include timestamps when inferable
- Make it skimmable with clear sections

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'kids',
    label: 'Kids',
    description: 'Simple explanation with activities for ages 7-12',
    prompt: `You are a **fun and friendly teacher** 😊 who's great at explaining things to kids (ages 7-12).
Make this video easy to understand and exciting to learn about!

🌟 **Follow this structure exactly:**

1. **The Big Idea (In One Sentence):**
   - Explain what this video is about in the simplest way
   - Use words a 10-year-old would understand
   - Make it interesting!
   - Example: "This video teaches us how..."

2. **Why You'll Love This ❤️:**
   - Give 2-3 reasons why this is cool or fun to learn
   - Connect to things kids care about
   - Example: "You'll discover...", "You'll learn how to..."

3. **What You'll Learn:**
   - List 5-7 main things from the video
   - Use VERY short sentences (under 15 words)
   - Start each with a friendly verb: "Learn", "Discover", "Find out", "See"
   - Add emojis to make it fun! 🚀🌈✨

4. **The Story (What Happens):**
   - Explain the video in 3-5 short paragraphs
   - Use words like: "First", "Then", "Next", "After that", "Finally"
   - Keep sentences SHORT (10-12 words max)
   - Make it feel like telling a story to a friend
   - Use examples kids can relate to

5. **Cool Facts or Surprises 🤯:**
   - Share 3-5 interesting or surprising things
   - Format: "Did you know...?", "Guess what?", "Here's something cool:"

6. **Fun Comparisons:**
   - Help kids understand by comparing to things they know
   - Examples: "It's like...", "Imagine if...", "Think of it as..."
   - Use 2-4 comparisons

7. **Important Words (Vocabulary):**
   - If there are tricky words, explain them simply
   - Format: **Word** = Simple definition (Example: ...)
   - Only include 3-5 most important words

8. **Why This Matters (For Real Life):**
   - Explain in 2-3 sentences why this is useful or important
   - Connect to kid's daily life

9. **Try This at Home! 🏠:**
   - Give 2-3 fun activities or things kids can try
   - Make them safe and easy
   - Format: "You could...", "Try...", "Ask your parents to help you..."

10. **Questions to Think About 🤔:**
   - Ask 2-4 interesting questions that make kids think
   - Use "What if...?", "Why do you think...?", "How would you...?"

11. **The Main Thing to Remember:**
   - Sum it up in ONE simple sentence
   - This is the most important takeaway
   - Make it memorable!

---

🌈 **Super Important Rules:**
- Use SHORT sentences (max 12-15 words)
- Use SIMPLE words (nothing fancy or complicated)
- Be POSITIVE and ENCOURAGING
- Add emojis to make it colorful (but not too many!)
- Compare to things kids know (toys, games, school, family)

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'blog',
    label: 'Blog',
    description: 'SEO-optimized post with sections and engagement',
    prompt: `You are a **professional content writer and blogger** specializing in creating engaging, SEO-optimized blog posts.
Transform this video into a comprehensive, reader-friendly blog article that drives engagement and shares.

**⚠️ IMPORTANT: Programming/Software Engineering Content Detection**
- First, analyze the transcript to determine if it's about programming, software development, coding, or technology implementation
- If YES: Include code examples and snippets throughout the blog
- If NO: Skip the code examples section and focus on other content types

📝 **Follow this structure exactly:**

---

# [Compelling Blog Title]

**Title Requirements:**
- 6-12 words, attention-grabbing
- Include main keyword or topic
- Use power words: Ultimate, Complete, Essential, Proven, Expert

---

## Introduction (Hook + Context)

**Write 3-4 paragraphs:**
- Paragraph 1 - The Hook: Open with attention-grabbing statement or question
- Paragraph 2 - The Problem/Context: Identify the problem or topic relevance
- Paragraph 3 - The Promise: Preview what readers will learn
- Paragraph 4 - Credibility: Brief context on source or expertise

---

## Quick Takeaways (TL;DR)

**Provide 4-6 bullet points:**
- Main insights from the article
- Each bullet: one concise sentence
- Use this format: "✅ [Key takeaway]"

---

## [Main Content Sections - 3-5 sections]

**Requirements for each main section:**
- Write 3-5 paragraphs per subsection
- Start with a clear topic sentence
- Include clear explanations, concrete examples, data or insights
- Use short paragraphs (3-5 sentences max)
- Add subheadings (H3) every 200-300 words

### Code Examples (For Programming/Technical Topics Only)
- Include 3-6 code examples throughout the content
- Add Mermaid diagrams for visual clarity when helpful
- Each code example must have Context, Code Block, Explanation, Use Case

---

## Common Mistakes to Avoid

**List 4-6 common pitfalls:**
- ❌ **Mistake**: [What not to do]
  - Why it's wrong
  - What to do instead

---

## Expert Tips / Advanced Insights

**Share 5-7 insider tips:**
- 💡 **Tip**: [Advanced strategy or insight]
  - Explanation (2-3 sentences)

---

## Key Takeaways

**Summarize main points:**
- ✅ **Takeaway 1**: [Main insight or lesson]
- (List 5-8 total takeaways)

---

## Conclusion

**Write 3-4 paragraphs:**
- Summary of main points
- Why this matters
- Call-to-action
- Final thought

---

📝 **Blog Writing Guidelines:**
- Conversational yet professional
- Use "you" to address readers directly
- Short paragraphs (3-5 sentences)
- Use subheadings every 200-300 words
- Include bullet points and numbered lists

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'youtube',
    label: 'YouTube',
    description: 'Timestamped chapters with navigation links',
    prompt: `You are a **precise YouTube summary writer** 🎬 — produce a viewer-friendly summary from transcript.

IMPORTANT — handling timestamps (WebVTT):
- **If the transcript is in WebVTT format** (contains cues like "00:00:00.000 --> 00:00:37.000"), **extract those cue start times** and use them **exactly** for chapter timestamps.
- **Ignore** metadata blocks such as \`NOTE\`, \`STYLE\`, and \`REGION\`.

Chapter rules (strict):
- Produce **3-12 chapters** based on the length of the video and topic density
- Each chapter must follow this layout:
  \`HH:MM:SS — Chapter Title — 2-5 sentence summary\`
- **Titles:** short (3-6 words), action-oriented when possible
- **Summaries:** use rich, multi-paragraph format (2-5 sentences), with clear transitions and **bold keywords**
- **Two or more key takeaways required**: Each chapter summary must include distinct learnings

✅ **Example Output (Rich Multi-Paragraph Style)**

00:00 — **Introduction to AI Engineering** ⚙️  
AI engineering represents the *fusion of software development and machine intelligence*. Instead of just coding applications, engineers now integrate **AI systems that learn, adapt, and optimize themselves**. This section explores how AI engineering redefines what it means to build products.

---

00:37 — **What Is AI Engineering?** 🧠  
AI engineering isn't about creating neural networks from scratch — it's about **harnessing pre-trained AI models as powerful tools**. By combining **prompting, model orchestration, and application logic**, AI engineers focus on delivering outcomes, not reinventing algorithms.

---

Word-length & tone:
- Summaries: 2-5 sentences (multi-paragraph structure allowed)
- Tone: educational, narrative, and **developer-friendly** for technical content

Formatting rules (strict):
- Use **square brackets** for timestamps \`[HH:MM:SS]\` in jump links
- Use **em dashes (—)** between title and summary
- Add 1 emoji at the top and bottom
- Keep it visually scannable and descriptive

Concise written summary:
- After chapters, provide **2 paragraphs (3-5 sentences each)** summarizing what the video teaches and who benefits most

Fallback rules:
- If WebVTT timestamps missing, estimate chapters: one every 90s for short videos, 120s for long ones

Output order:
1. Header: \`🎬 Summary & Key Takeaways: [Video Topic Placeholder]\`
2. Chapter list (multi-paragraph format)
3. Jump links section
4. 2-paragraph summary
5. CTA line with emoji

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'cheatsheet',
    label: 'Cheatsheet',
    description: 'Technical reference with commands, examples, and workflows',
    prompt: `You are a **senior developer + educator** whose job is to convert a video tutorial transcript into a compact, beautiful **cheatsheet in Markdown** suitable for quick reference and interview prep.

🔧 **Rules (follow exactly):**
- Output **only** the cheatsheet in **Markdown** (no extra commentary)
- Produce a **single-file, scannable** cheatsheet with short lines, card-style sections, and copy-paste-ready code blocks
- **Extract concepts, commands, examples, and code** directly from the transcript
- Use **bold** to emphasize important words and sprinkle **emojis** to improve scanability
- Keep explanations **short and actionable** (1-2 sentences per concept)

---

# {{TECH}} Cheatsheet
> *Generated from the provided transcript.*  

## Quick Reference
- **Purpose**: One-line description of what this language/library does  
- **Use Cases**: 2-3 bullet points  
- **Prerequisites**: 1-3 items (tools/versions you need)

---

## Syntax Snapshot
- **File ext / run command**: \`[file.ext]\` / \`[run command]\`  
- **Basic Hello/Print**:
\`\`\`[language]
// from transcript
[small example]
\`\`\`

---

## Core Concepts (short cards)
Create 4-8 short cards (title + 1-2 line explanation + 1-line example)

### Variables
- **What**: One-line definition  
- **Example**:
\`\`\`[language]
let x = 10;
\`\`\`

---

## Code Examples — From the Video
Include **2-4 runnable examples** extracted from transcript

---

## Quick Tips & Gotchas ⚠️
- **Tip**: short practical tip
- **Gotcha**: common mistake + one-line fix

---

## Common Mistakes & Fixes ❌➡️✅

**Wrong:**
\`\`\`[language]
[bad snippet]
\`\`\`

**Right:**
\`\`\`[language]
[good snippet]
\`\`\`

---

## Summary for Revision (1-3 lines)
A tiny TL;DR of the most important things to remember

---

## Key Interview Takeaways 💡
- **What to memorize**: 3 bullet points
- **What to explain**: 2-3 short prompts

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'recap',
    label: 'Recap',
    description: '60-second interview-style summary recap',
    prompt: `You are a **rapid content strategist** specializing in 60-second video recaps.
Create an ultra-concise, punchy summary that delivers maximum value in minimum time.

⚡ **Follow this interview-style format exactly:**

1. **The Hook (First 10 seconds):**
   - Start with a provocative question or bold statement
   - Example: "What if you could master [topic] in 60 seconds?"
   - 1 powerful line that grabs immediate attention

2. **Quick Fire Q&A (Core Content):**
   Format as 5-7 rapid interview questions and answers:
   
   **Q: What's the one thing I need to know?**
   A: [Single sentence answer with the most important insight]
   
   **Q: Why should I care about this?**
   A: [One-sentence benefit or impact statement]
   
   **Q: What's the biggest mistake people make?**
   A: [Common pitfall in one punchy sentence]
   
   **Q: What's the secret sauce here?**
   A: [Key technique or insight that makes this work]
   
   **Q: Can I actually use this today?**
   A: [Immediate application in one sentence]
   
   **Q: What will surprise me most?**
   A: [Unexpected insight or finding]

3. **60-Second Action Plan:**
   - **Step 1:** [One actionable thing to do in the next hour]
   - **Step 2:** [One thing to implement this week]
   - **Step 3:** [One mindset shift to adopt]

4. **The Mic Drop (Final Impact):**
   - One powerful, memorable sentence that summarizes everything
   - Make it shareable and quotable

---

⏱️ **Critical Constraints:**
- Total reading time: Under 60 seconds
- Each answer: Maximum 1 sentence (15-20 words max)
- Use simple, direct language
- No jargon or complex explanations
- Focus on actionable insights, not theory

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'interview',
    label: 'Interview',
    description: 'Interview-prep summary with Q&A and examples',
    prompt: `You are an **expert interview coach and developer educator**. Produce a concise, interview-ready summary from the transcript with explanations that are **easy to remember** and **quick to apply**.

🔥 **Adapt automatically based on topic**:
- If the transcript covers code, algorithms, or engineering patterns → enable **Code Mode**
- If it's leadership/management/product → adapt sections to principles, behaviours, or frameworks
- If it's mixed, include both tech + high-level context

---

# 🎯 Core Concepts (Must-Know Basics)

**What is the topic?** — 1-2 simple sentences (no heavy jargon)  
**Why it matters** — 1 sentence with a real-world reason or benefit

---

# 🤝 Interview Questions & Answers (Dynamic)

Generate **5-7 domain-appropriate questions** and short answers. Keep them interview-style, concise, and practical.

---

# 🧩 Code Mode (enable when topic is coding/implementation/algorithm)

When the topic is technical:
1. **Concise explanation** (1-2 sentences)
2. **Minimal runnable snippet** in JavaScript or TypeScript
3. **Complexity**: time and space complexity (if applicable)
4. **Edge cases & tests**: 2 short test cases
5. **Common pitfalls & fixes**: 2-3 pitfalls and how to avoid them
6. **Mermaid diagram** when a diagram clarifies the flow

---

# 🧩 Breakdown / Components / Principles
3-6 key items with short descriptions

---

# ⚙️ How It Works (3-5 steps)
Short step-by-step description of the mechanism or flow

---

# 🌍 Real-World Example
Give **one practical scenario** showing the topic in action

---

# ⚠️ Common Mistakes / Misconceptions
List **2-4 common mistakes** and short corrections

---

# ➕➖ Advantages & Disadvantages
**2-3 pros** and **2-3 cons**, simplified

---

# 📌 Quick Reference (Cheat Sheet)
- **Key terms** (3-5 with 1-line defs)
- **3 essential points**
- **3-step mental model or pattern**

---

# 🧠 Practice Scenarios
- Explain to a manager (30 seconds)
- Whiteboard sketch description
- Real problem and solution (stepwise)

---

# 🚀 Final Summary (30-second pitch)
One-liner covering what it is, why it matters, and how it works

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'x',
    label: 'X/Twitter',
    description: 'Viral Twitter thread with hooks and engagement',
    prompt: `You are a **world-class viral Twitter thread strategist** 🧵  
— known for writing threads that *educate, entertain, and emotionally hook readers*.

Your job: turn the transcript below into a **viral, human-sounding Twitter thread** that is visually optimized for *scroll-stopping readability*.

---

### 🧮 THREAD LENGTH (n)
Estimate total tweets automatically:
- < 250 words → 4-6 tweets  
- 250-700 words → 7-12 tweets  
- 700-2000 words → 12-18 tweets  
- >2000 words → 18-30 tweets  

Choose a **natural number within the range** (avoid fluff).  
The **first tweet should NOT show "1/n"** — it's a hook tweet.  
Numbering starts **from the second tweet** onward.

---

### 🧵 STRUCTURE TO FOLLOW

#### 🚀 1 — HOOK (NO NUMBERING)
- First tweet must **grab attention** instantly
- Don't start with "1/n"
- Use 2-4 short lines separated by blank spaces
- Use proven hook styles: contrarian, surprising stat, relatable truth, or intriguing question
- Max 280 chars
- Add 🧵 or ⬇️ at the end to signal a thread

---

#### 🧵 2..(n-1) — BODY TWEETS  
Each tweet should:
- Start with \`🧵 <<tweet_number>>/<<n>>:\`  
- Use **2-4 short lines per tweet**, separated by blank lines
- Focus on **one clear idea**
- Use **emojis** strategically (1-2 per tweet)
- Keep a conversational, confident tone
- Avoid large paragraphs

**Categories to cover:**
- Core concepts (2-3 tweets)  
- Actionable tactics (3-4 tweets)  
- Common mistakes (1-2 tweets)  
- Surprising facts (1-2 tweets)  
- Real examples / stories (1-2 tweets)  
- Pro tips / advanced insights (1-2 tweets)

---

#### 🧵 (n-1) — SUMMARY / QUICK RECAP 📦  
- Use a **list format** with bullets (•)
- Keep it short, snappy, and screenshot-friendly

---

#### 🧵 n — CTA / CLOSER 🚀  
- Encourage engagement (retweet, reply, follow)
- May include 1-2 relevant hashtags
- Keep it positive, energetic, and community-driven

---

### ✍️ FORMATTING RULES
- Hook tweet → **no numbering**  
- Subsequent tweets → \`🧵 <num>/<total>:\` prefix  
- Blank line between short sentences for rhythm  
- Use 1-2 emojis max per tweet  
- Avoid walls of text  
- No hashtags before final tweet

---

### 🎯 STYLE GUIDELINES
- **Conversational tone** — use "you", "let's", "here's"  
- **Punchy writing** — mix short & medium lines  
- **Emotional flow** — mix surprise, humor, and insight  
- **Readable layout** — every tweet scannable in 3 seconds  
- **Human rhythm** — not robotic or repetitive

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'shorts',
    label: 'Shorts/Reels/TikTok',
    description: 'Script ideas for vertical short-form video content',
    prompt: `You are a **viral short-form video strategist** who creates content for TikTok, Instagram Reels, and YouTube Shorts.
Extract the most engaging moments from this video and turn them into ready-to-film short-form content ideas.

⚠️ **CRITICAL INSTRUCTION:**
- **DO NOT ASK ANY QUESTIONS.** Generate the full content package immediately.
- **AUTO-DETECT** the target audience from the transcript (developers, general audience, niche experts, etc.)
- **AUTO-SELECT** the appropriate tone and complexity based on the content
- **MAKE AUTONOMOUS DECISIONS** about style, hooks, and approach — do not wait for clarification
- If the content is technical, adapt for a tech-savvy audience while keeping hooks accessible
- If the content is general, keep it simple and dramatic for mass appeal

📱 **Follow this structure exactly:**

---

## 🎬 Content Overview

**Original Video Topic:** [1 sentence summary]
**Best Format for Shorts:** [Hook-based / Story / Tutorial / Hot Take / Reaction / List]
**Viral Potential:** [High / Medium / Niche] — explain why

---

## 🔥 Top 5 Short-Form Video Ideas

For each idea, provide:

### Idea 1: [Catchy Title]

**Hook (First 1-3 seconds):**
- The exact words/action to start with
- Must stop the scroll IMMEDIATELY
- Examples: "Nobody's talking about this...", "POV:", "Wait for it..."

**Script (15-60 seconds):**
\`\`\`
[Second-by-second breakdown]
0:00 - [Hook - what you say/show]
0:03 - [Setup - context in 1-2 sentences]
0:08 - [Main point 1]
0:15 - [Main point 2 or twist]
0:25 - [Payoff/conclusion]
0:30 - [CTA or loop point]
\`\`\`

**On-Screen Text:**
- Text overlay 1: "[Exact text to display]"
- Text overlay 2: "[Exact text to display]"

**Visual Suggestions:**
- Camera angle: [talking head / B-roll / screen recording / etc.]
- Transitions: [jump cuts / zoom / swipe / etc.]
- Props or setup needed

**Hashtags:** #hashtag1 #hashtag2 #hashtag3 (5-8 relevant tags)

**Why This Works:** [1-2 sentences on the psychology/trend this taps into]

---

[Repeat for Ideas 2-5]

---

## 📝 Ready-to-Use Hooks (Copy & Paste)

Extract 8-10 hook variations from the content:

1. "Here's what nobody tells you about [topic]..."
2. "I was today years old when I learned..."
3. "Stop scrolling if you [target audience]..."
4. [Continue with content-specific hooks]

---

## 🎵 Audio/Sound Suggestions

- **Trending sounds that fit:** [Describe 2-3 audio vibes]
- **Original audio style:** [Voiceover tone, pacing, energy level]
- **When to use music vs. talking:** [Guidance]

---

## ✂️ Key Clips to Extract

If reusing footage from the original video:

| Timestamp | What Happens | Why It's Gold |
|-----------|--------------|---------------|
| [X:XX] | [Description] | [Viral element] |
| [X:XX] | [Description] | [Viral element] |
| [X:XX] | [Description] | [Viral element] |

---

## 💡 Pro Tips for This Content

1. **Best posting times:** [Based on content type]
2. **Engagement bait:** [Question to ask in caption or comments]
3. **Series potential:** [Can this be a part 1, 2, 3?]
4. **Duet/Stitch opportunities:** [How others could interact]

---

## 📊 Quick Reference Card

| Element | Recommendation |
|---------|----------------|
| Ideal length | [15s / 30s / 60s] |
| Aspect ratio | 9:16 vertical |
| Captions | [Style recommendation] |
| CTA | [Best call-to-action] |
| Post frequency | [If making a series] |

---

⚡ **Platform-Specific Notes:**
- **TikTok:** [Any TikTok-specific advice]
- **Instagram Reels:** [Any Reels-specific advice]  
- **YouTube Shorts:** [Any Shorts-specific advice]

---

### SOURCE TRANSCRIPT
{transcript}`,
  },
  // ============================================
  // IMAGE GENERATION VARIANTS
  // Requires: ChatGPT (DALL-E), Gemini (Imagen), or Grok
  // ============================================
  {
    variant: 'thumbnail',
    label: 'Thumbnail (General)',
    description: 'High-energy, split background, illustrations if no photo',
    outputType: 'image',
    prompt: `Generate a viral YouTube thumbnail image based on the transcript below.

⚠️ **CRITICAL - SUBJECT RULES:**
- **IF REFERENCE IMAGE ATTACHED**: YOU MUST use that EXACT person's face. Apply a shocked/intense expression.
- **IF NO REFERENCE IMAGE**: DO NOT generate a realistic human. Create a **High-Quality 3D Illustration** (Pixar/Fortnite style) or **Cartoon Persona** or **Robot Mascot** representing the topic.

🎨 **GENERATE THIS IMAGE:**

**Style & Vibe:**
- **High Energy**: Chaotic, exciting, "YouTube Commentary" style.
- **Background**: Split design (Red vs Blue, or Black vs Yellow). High contrast.
- **Elements**: Big arrows, circles, floating emojis, "Vs" lightning bolts.

**Subject (Person or Illustration):**
- **Expression**: Hands on head (shocked), mouth open, pointing at something.
- **Position**: Foreground, taking up 40% of the frame.

**Text Overlay:**
- **Content**: 2-4 words. "GONE MAD!", "WARNING", "IT'S OVER".
- **Style**: Massive, white text with thick black outline and drop shadow.

**DO NOT:**
- Generate generic stock photo people (unless reference provided).
- Use boring/flat colors.
- Make text small.

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'thumbnail-mrbeast',
    label: 'Thumbnail (MrBeast Style)',
    description: 'Explosive, bright colors, huge text, high energy',
    outputType: 'image',
    prompt: `Generate a high-energy MrBeast-style viral YouTube thumbnail image.

⚠️ **CRITICAL - REFERENCE IMAGE RULES:**
- If a reference image is attached, YOU MUST use that EXACT person's face and likeness.
- **FACE SWAP PRIORITY**: The attached face is the MOST IMPORTANT element. Do not change the person's identity.
- **EXPRESSION MODIFICATION**: Keep the person's identity but morph their expression into a MrBeast-style SHOCK/EXCITEMENT (mouth wide open, eyes huge).
- **SKIN TEXTURE**: Apply a "glossy", high-quality YouTuber skin retouching filter. Smooth but detailed.
- If NO reference image: create a generic fictional person with diverse appearance, but maintain the style.

🔥 **GENERATE THIS EXACT IMAGE:**

**The Face (Center of Attention):**
- **Expression**: EXTREME shock, joy, or disbelief. Mouth OPEN showing teeth. Eyes WIDE.
- **Position**: Large in the frame (30-50%), usually on the left or right third.
- **Lighting**: High-key studio lighting. Bright, even illumination on the face.
- **Rim Light**: Strong CYAN or MAGENTA rim light separating the subject from the background.
- **Detail**: Hyper-realistic, 8k resolution, sharp focus on the eyes.

**The "MrBeast" Look:**
- **Saturation**: 110%. Colors should be VIBRANT and POP. No dull or muted tones.
- **Contrast**: High contrast. Deep blacks (if any) and bright highlights.
- **Depth**: Strong separation between foreground (person) and background. 3D "pop-out" effect.
- **Lens**: Wide-angle (16mm-24mm) distortion to make the hand/face feel closer to the viewer.

**Background & Context:**
- **Scenario**: An epic, larger-than-life challenge or situation based on the transcript.
- **Elements**: Piles of money, expensive cars, private islands, massive structures, or "Versus" setups.
- **Blur**: Slight Gaussian blur on the background to keep focus on the subject.

**Text (If needed):**
- **Style**: Massive, sans-serif font (like "ObelixPro" or "Komika Axis").
- **Effect**: Thick black stroke/outline. White or bright yellow fill. Heavy drop shadow.
- **Content**: Short, punchy (1-3 words). "$1 vs $1,000,000", "I SURVIVED", "IMPOSSIBLE".

**DO NOT GENERATE:**
- The real MrBeast (Jimmy Donaldson) unless specifically requested or if he's the reference.
- Low resolution, blurry, or "painting" style images. Must look like a PHOTOGRAPH.
- Muted, pastel, or desaturated colors.
- Small, hard-to-read text.

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'thumbnail-casey',
    label: 'Thumbnail (Casey Neistat Style)',
    description: 'Vlog style, sunglasses, NYC grit, high contrast',
    outputType: 'image',
    prompt: `Generate a "Casey Neistat" style vlog thumbnail.

⚠️ **CRITICAL - REFERENCE IMAGE RULES:**
- If a reference image is attached, YOU MUST use that EXACT person's face.
- **FACE SWAP PRIORITY**: The attached face is the MOST IMPORTANT element.
- **ACCESSORIES**: If the person is NOT wearing sunglasses, TRY to add "Ray-Ban Wayfarer" style sunglasses if it fits the vibe (optional but preferred for this style).
- **EXPRESSION**: Intense, serious, or "mid-sentence" speaking. Authentic, not posed.
- If NO reference image: create a generic person with messy hair and sunglasses.

🎬 **GENERATE THIS EXACT IMAGE:**

**The Vibe (NYC Vlog):**
- **Camera Angle**: Hand-held "selfie" style (wide angle, arm visible sometimes).
- **Lighting**: Natural, harsh sunlight or gritty city night lights. High contrast.
- **Texture**: Sharp, slightly grainy, "shot on Canon DSLR" look.
- **Background**: NYC streets, busy intersections, subway, or messy studio with gear.

**The Look:**
- **Sunglasses**: Black Wayfarer-style sunglasses are a SIGNATURE element.
- **Hair**: Messy, windblown, "just woke up" or "been working all day" hair.
- **Clothing**: Casual, t-shirt, hoodie, maybe a suit jacket over a t-shirt.

**Text Style:**
- **Font**: Hand-drawn marker style OR simple bold white sans-serif.
- **Background**: Text often on black rectangular strips (label maker style).
- **Content**: ANALYZE TRANSCRIPT. Extract a 3-5 word provocative phrase that summarizes the core conflict. Examples: "THE TRUTH ABOUT [TOPIC]", "WHY I QUIT", "NYC IS OVER".

**DO NOT GENERATE:**
- The real Casey Neistat (unless requested).
- Polished "beauty guru" lighting.
- Perfect hair or makeup.
- 3D rendered text or "gaming" effects.
- Oversaturated "MrBeast" colors.

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'thumbnail-theo',
    label: 'Thumbnail (Theo Style)',
    description: 'Dark mode, tech logos, "hot takes", skeptical face',
    outputType: 'image',
    prompt: `Generate a "Theo - t3.gg" style YouTube thumbnail.
    
⚠️ **CRITICAL - REFERENCE IMAGE RULES:**
- If a reference image is attached, YOU MUST use that EXACT person's face.
- **FACE SWAP PRIORITY**: The attached face is the MOST IMPORTANT element.
- **EXPRESSION**: Skeptical, "really?", slight smirk, or intense stare. NOT exaggerated like MrBeast.
- **FRAMING**: Person on the LEFT or RIGHT third, looking towards the center/text.
- If NO reference image: create a generic young tech developer (hoodie/t-shirt).

💻 **GENERATE THIS EXACT IMAGE:**

**The Vibe (Dark Mode Tech):**
- **Background**: DARK GREY or BLACK (#0d1117). Minimalist.
- **Lighting**: Moody, side-lit. Not overly bright.
- **Contrast**: High contrast between the dark background and the bright logos/text.

**Key Elements (The "Hot Take"):**
- **Tech Logos**: 2-4 recognizable logos (React, Next.js, Rust, Go, JS, etc.) relevant to the transcript.
- **The "Tier List" / "Vs" Layout**: Logos arranged to show comparison or ranking.
- **Text Labels**: Short, punchy judgments next to logos.
  - "Good." (Green text)
  - "Bad." (Red text)
  - "Mid." (White text)
  - "Goated." (Gold/Yellow text)
  - "Trash." (Red text)
- **Font**: Clean, bold sans-serif (Inter, Roboto). White text on dark background.

**Composition:**
- **Subject**: Occupies 30-40% of the frame.
- **Content**: Occupies 60-70% of the frame (logos, code snippets, text).
- **Code Snippets**: Optional faint code blocks in the background (syntax highlighted).

**DO NOT GENERATE:**
- The real Theo (unless requested).
- Bright, happy, colorful backgrounds.
- "MrBeast" style open mouth faces.
- Generic "hacker" imagery (matrix rain, hoods up).
- Cluttered designs. Keep it clean and "dark mode".

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'thumbnail-5min',
    label: 'Thumbnail (5-Min Crafts Style)',
    description: 'Split-screen, bright colors, "life hack" arrows & emojis',
    outputType: 'image',
    prompt: `Generate a "5-Minute Crafts" style DIY/Life Hack thumbnail.

⚠️ **CRITICAL - REFERENCE IMAGE RULES:**
- If a reference image is attached, use that person's hands or likeness demonstrating the craft.
- **HANDS PRIORITY**: If the image shows hands/objects, preserve the action but brighten the lighting.
- If NO reference image: show generic hands performing a "hack".

✂️ **GENERATE THIS EXACT IMAGE:**

**The Layout (Split Screen):**
- **Structure**: CLASSIC SPLIT SCREEN. Left side = "Before" (Problem), Right side = "After" (Solution).
- **Divider**: Distinct white or bright yellow line separating the two sides.
- **Arrows**: BIG RED ARROW pointing from the problem to the solution or the key tool.

**The Aesthetic (Candy Colored):**
- **Colors**: EXTREMELY BRIGHT, saturated pastels. Pink, Cyan, Yellow, Lime Green.
- **Lighting**: Flat, bright, shadowless "medical" or "studio" lighting. Everything is fully illuminated.
- **Background**: Solid bright colors (Pink/Blue) or clean white surfaces.

**Key Elements:**
- **Hands**: Manicured hands holding objects clearly.
- **Emojis**: 😱 (Shocked face), ✨ (Sparkles), ✅ (Checkmark), ❌ (Red X).
- **Objects**: Household items (toothpaste, eggs, glue gun, plastic bottles) looking "magical".

**Text Style:**
- **Font**: Bubble letters or bold sans-serif in bright colors.
- **Content**: "WOW!", "HACK", "SMART", "DIY".
- **Banners**: Text inside a jagged "burst" shape or rounded rectangle.

**DO NOT GENERATE:**
- Dark, moody, or cinematic lighting.
- Realistic/gritty textures.
- Complex backgrounds.
- Subtle expressions.

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'thumbnail-tweet',
    label: 'Thumbnail (Tweet Style)',
    description: 'Viral tweet overlay, realistic username, millions of views',
    outputType: 'image',
    prompt: `Generate a viral "Tweet Style" YouTube thumbnail.

⚠️ **CRITICAL - REFERENCE IMAGE RULES:**
- If a reference image is attached, YOU MUST use that EXACT person's face.
- **EXPRESSION**: Match the tweet's vibe (Thinking, Shocked, or Smug).
- If NO reference image: create a generic tech/business person or relevant figure.

🐦 **GENERATE THIS EXACT IMAGE:**

**Layout:**
- **Split Screen or Overlay**: Person on one side (or background), LARGE Tweet overlay on the other.
- **The Tweet**: Must look like a REAL dark mode Twitter/X post.

**Tweet Content (THE MOST IMPORTANT PART):**
- **Username/Name**: **DO NOT USE HARDCODED NAMES.** ANALYZE the transcript topic to pick the most relevant entity.
  - *Windows/PC?* -> Use "Microsoft @Microsoft" or "Satya Nadella @satyanadella"
  - *Apple/iPhone?* -> Use "Apple @Apple" or "Tim Cook @tim_cook"
  - *Coding/Web?* -> Use "Vercel @vercel" or "Guillermo Rauch @rauchg"
  - *General Tech?* -> Use "MKBHD @MKBHD" or "The Verge @verge"
- **Text**: EXTRACT a short, controversial "hot take" from the transcript.
  - **LENGTH RULE**: MAX 1-2 sentences. Short and punchy.
  - **Style**: Clickbait but believable.
- **Stats**: MUST show viral numbers. "2.4M Views", "15K Reposts", "85K Likes".
- **Date**: USE TODAY'S DATE (e.g., "Nov 25, 2025" or current date).

**Visual Style (EXACT UI REPLICATION):**
- **Font**: MUST use **Chirp**, **San Francisco**, or **Roboto**. NO generic serifs.
- **Background**: Dark mode (black/dark gray).
- **UI CHECKLIST (MUST INCLUDE):**
  - **Header**: Profile Pic (Circle) + Name (Bold) + Verified Badge (Blue/Gold) + Handle (@...) + **X Logo** (Top Right).
  - **Footer**: 4 Icons with numbers: 💬 (Reply), 🔁 (Repost), ❤️ (Like), 🔖 (Bookmark/Share).
  - **Stats Line**: "2.4M Views • Nov 25, 2025" (Separated by a dot).
- **Layout**: The Tweet should look like a floating "Card" or a direct screenshot overlay.

**DO NOT GENERATE:**
- Generic "Lorem Ipsum" text.
- Blurry text.
- Fake-looking "cartoon" tweets.
- Missing UI elements (like the X logo or footer icons).

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'infographic',
    label: 'Infographic',
    description: 'Visual data representation of key concepts (Image)',
    outputType: 'image',
    prompt: `Generate a clean modern infographic image based on the transcript.

📊 **GENERATE THIS INFOGRAPHIC:**

**Layout & Structure:**
- Bold title at top grabbing attention
- 4-6 key points extracted and visualized
- Numbered sections for processes/steps
- Arrows or lines showing concept relationships
- Summary or key takeaway section
- Generous whitespace (at least 20%)

**Visual Hierarchy:**
- Most important info = largest/boldest
- Clear progression: title > headers > body
- Reading flow: left-to-right, top-to-bottom
- Scannable in under 30 seconds

**Style:**
- 3-4 harmonious colors plus white/light gray background
- Consistent icon style (ALL flat OR ALL line-art - don't mix)
- Clean sans-serif typography
- Simple data viz: charts, progress bars, icon arrays, number callouts

**Content to Extract:**
- 4-6 main concepts, statistics, or steps
- Any numbers or percentages to visualize
- How concepts relate to each other
- 1-2 main insights to highlight prominently

**DO NOT:**
- Clutter the design with too many elements
- Mix different icon styles
- Use more than 5 colors
- Make text too small to read
- Add watermarks or logos

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'comic',
    label: 'Comic Strip',
    description: 'Comic-style visual story of the content (Image)',
    outputType: 'image',
    prompt: `Generate a fun engaging comic strip image based on the transcript.

📚 **GENERATE THIS COMIC:**

**Panels:**
- 3-6 clear panels telling the story visually
- Clear panel borders, easy to follow
- Mixed panel sizes - larger for important moments
- Left-to-right, top-to-bottom reading flow

**Characters:**
- Expressive cartoon characters with personality
- Exaggerated expressions and poses
- Consistent design across all panels
- Use characters to represent ideas or people

**Visual Elements:**
- Speech bubbles for key quotes
- Thought bubbles for inner thoughts
- Sound effects (POW, BOOM, etc.)
- Action lines and impact stars
- Speed lines for movement

**Style:**
- Bold vibrant colors that pop
- Fun and engaging, not boring
- Humor where it fits naturally
- Build to an "aha!" moment or punchline

**Storytelling:**
- Grab the main story/key points from transcript
- Make abstract concepts relatable
- Each panel has energy and purpose

**DO NOT:**
- Use boring static poses
- Make unclear panel flow
- Use dull muted colors
- Add too many words

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'mindmap',
    label: 'Mind Map',
    description: 'Organic tree-style mind map spreading from center',
    outputType: 'image',
    prompt: `Generate a beautiful professional mind map image based on the transcript.

🧠 **GENERATE THIS MIND MAP:**

**Center Node:**
- Circular badge in exact center
- Light beige/cream color with thin border
- Main topic title (2-4 words MAX)
- Small brain or lightbulb icon above text

**Main Branches (5-7):**
- THICK solid curved shapes like colorful ribbons
- NOT thin lines - these are SOLID FILLED SHAPES
- Radiate outward from center like tree limbs
- Each branch a different vibrant color
- Taper as they extend outward
- Short 2-4 word labels on each

**Branch Colors:**
- Forest green, lime green, teal, sky blue
- Orange, coral, purple, magenta
- Each main branch different color

**Sub-Branches:**
- 2-4 per main branch
- Smaller curved branches
- Same hue as parent but lighter shade
- 1-3 word labels with optional icons

**Layout:**
- Balanced and symmetrical
- Don't cluster branches on one side
- Pure white or light gray background
- Soft subtle shadows for depth
- Like MindMeister, XMind, or Miro quality

**DO NOT:**
- Use thin straight lines (branches must be THICK RIBBONS)
- Create cluttered unbalanced layout
- Make text too small to read
- Use dark background
- Add 3D effects or gradients on branches

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'whiteboard',
    label: 'Whiteboard',
    description: 'Hand-drawn whiteboard diagram with sketches and arrows',
    outputType: 'image',
    prompt: `Generate a realistic whiteboard diagram image based on the transcript.

✏️ **GENERATE THIS WHITEBOARD:**

**The Look:**
- Clean white/off-white whiteboard background with subtle texture
- Hand-drawn sketches with colorful markers
- Handwriting-style text (looks marker-written)
- Casual, slightly messy, authentic hand-made quality

**Layout:**
- Central title at top in box
- 3-5 main sections spread across whiteboard
- Arrows connecting related concepts
- Key takeaway at bottom

**Each Section:**
- Header in hand-drawn box
- 2-4 bullet points (hand-drawn dots)
- Small sketch icon
- Underlines and circles around key words

**Marker Colors:**
- Black: main text, outlines
- Blue: headers, important terms
- Red: highlights, warnings, key points
- Green: positive points, checkmarks
- Orange/Yellow: accents, stars, emphasis

**Sketch Elements:**
- Simple stick figures, objects
- Hand-drawn boxes and frames
- Curved arrows between concepts
- Lightbulbs, checkmarks, X marks, stars
- Simple charts/graphs

**The Feel:**
- Looks like someone sketched it during a meeting
- Organized but casual
- Educational and easy to scan
- Hand-drawn imperfection IS the aesthetic

**DO NOT:**
- Make it look digital or polished
- Use perfect straight lines
- Use typed fonts
- Make it too cluttered

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'quote-card',
    label: 'Quote Card',
    description: 'Shareable quote card with key insight (Image)',
    outputType: 'image',
    prompt: `Generate a shareable social media quote card image based on the transcript.

💬 **GENERATE THIS QUOTE CARD:**

**Format:**
- Square format (1:1) optimized for Instagram/Twitter
- Beautiful background that doesn't distract

**The Quote:**
- Most powerful, memorable line from transcript
- Something that makes people think or feel
- Under 30 words - punchy and impactful
- Works standalone without context
- Large prominent text, centered

**Visual Elements:**
- Large decorative quotation marks
- Clean readable typography
- High contrast for readability
- Subtle attribution at bottom (optional)
- Small accent icon or illustration (optional)

**Background Options:**
- Gradient with bold text
- Photo with dark overlay for contrast
- Minimal solid color with accent
- Abstract pattern that doesn't distract

**The Goal:**
- Something people would actually repost
- High contrast readable on any device
- Professional but shareable
- Clean and uncluttered - quote is the star

**DO NOT:**
- Clutter with too many elements
- Use low contrast hard-to-read text
- Make the text too small
- Add watermarks or logos

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'scene',
    label: 'Scene Visualization',
    description: 'Key scene or concept visualization (Image)',
    outputType: 'image',
    prompt: `Generate a cinematic scene visualization image based on the transcript.

⚠️ **CRITICAL - REFERENCE IMAGE RULES:**
- If a reference image is attached, incorporate that person/element as key part of the scene
- Match their likeness and features precisely
- If NO reference image: create the scene with appropriate generic elements

🎬 **GENERATE THIS SCENE:**

**The Moment:**
- Capture the MOST impactful moment from the content
- Tell the story in a single powerful frame
- Emotionally resonant - viewers should feel something
- Avoid clichés and generic stock photo compositions

**Composition:**
- Strong focal point using rule of thirds
- Clear foreground, midground, background layers
- Negative space for impact
- Professional cinematography feel

**Lighting:**
- Dramatic lighting that sets the mood
- Options: golden hour, blue hour, dramatic shadows, bright and airy
- NOT flat lighting
- Beautiful color grading

**Style Adaptation (based on content):**
- Real world topics → photorealistic, natural lighting
- Abstract ideas → stylized artistic illustration
- Tech content → futuristic, neon accents, clean lines
- Human stories → warm, emotional, intimate
- Business topics → professional, modern, clean
- Nature topics → epic landscapes, golden hour

**Atmosphere:**
- Match the emotional tone of the content
- 2-3 visual details that communicate the message without text
- Cinematic color grade (not oversaturated)
- Could be a movie still

**DO NOT:**
- Create flat boring compositions
- Use poor or flat lighting
- Make cluttered distracting images
- Create generic stock photo feel

### TRANSCRIPT
{transcript}`,
  },
  // ============================================
  // VIDEO GENERATION VARIANTS
  // Requires: Gemini only
  // ============================================
  {
    variant: 'video-ad',
    label: 'Video (Advertisement)',
    description: 'Short promotional ad clip based on transcript',
    outputType: 'video',
    prompt: `Analyze the transcript below and create a short promotional video ad.

🎬 **THE AD:**

**Hook:**
- Start with something that grabs attention immediately
- Bold text or motion graphics
- Make the value clear right away

**Core:**
- Show the main benefit from the transcript
- Dynamic movement and transitions
- Keep it polished and professional
- Hit the key selling points visually

**Close:**
- Clear call to action
- Professional finish
- End on a memorable frame

**Style:**
- Fast-paced, high energy
- Modern motion graphics
- Bold text animations
- Professional color grading

⚠️ No logos or creator branding—focus on the content.

**Analyze the transcript and create the ad:**

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'video-trailer',
    label: 'Video (Trailer)',
    description: 'Cinematic teaser trailer based on transcript',
    outputType: 'video',
    prompt: `Analyze the transcript below and create a cinematic trailer that builds anticipation.

🎬 **THE TRAILER:**

**Opening:**
- Dramatic establishing shot
- Moody, atmospheric lighting
- Build tension or curiosity

**Build-up:**
- Quick cuts of the highlights from the transcript
- Escalating energy
- Tease the best parts
- Sound design that hits

**Climax:**
- Most impactful moment from the content
- Title or key message
- Leave them wanting more

**Style:**
- Cinematic widescreen look
- Epic lighting and shadows
- Film grain or cinematic color grade
- Dramatic pacing

**Analyze the transcript and create the trailer:**

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'video-recap',
    label: 'Video (Quick Recap)',
    description: 'Fast-paced summary clip based on transcript',
    outputType: 'video',
    prompt: `Analyze the transcript below and create a fast-paced recap video.

🎬 **THE RECAP:**

**Structure:**
- Extract 3-4 main points from the transcript
- Show each point with text on screen
- Keep it punchy and digestible

**Visual Style:**
- Quick, snappy transitions
- Bold, readable text
- Visuals that match each point
- Consistent look throughout

**Pacing:**
- Fast but you can still follow
- Every frame counts
- Each shot has a purpose
- Keep the rhythm going

**Elements:**
- Highlight key stats or facts from the transcript
- Icons or graphics for clarity
- Optional progress indicator
- Satisfying ending

**Analyze the transcript and create the recap:**

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'video-explainer',
    label: 'Video (Explainer)',
    description: 'Educational explainer clip based on transcript',
    outputType: 'video',
    prompt: `Analyze the transcript below and create an educational explainer video.

🎬 **THE EXPLAINER:**

**Intro:**
- Show the main topic from the transcript
- Hook that sets the context
- Clean, professional look

**Explanation:**
- Step-by-step visual walkthrough of the key concepts
- Diagrams or animations that clarify
- Labels for important terms from the transcript
- Reveal info progressively

**Wrap-up:**
- Reinforce the main takeaway
- Visual summary
- Clean ending

**Style:**
- Minimal and clean
- Smooth animations
- Educational but engaging
- Whiteboard or infographic feel

**Analyze the transcript and create the explainer:**

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'video-cinematic',
    label: 'Video (Cinematic)',
    description: 'Artistic cinematic sequence based on transcript',
    outputType: 'video',
    prompt: `Analyze the transcript below and create a stunning cinematic video sequence.

🎬 **THE CINEMATIC:**

**Visual Poetry:**
- Aesthetics over information
- Evoke emotion through imagery inspired by the transcript
- Every frame could be a still

**Cinematography:**
- Smooth camera movements—dolly, crane, slow pan
- Beautiful depth of field
- Golden hour or atmospheric lighting
- Film-like color grading

**Mood:**
- Match the emotional tone of the transcript content
- Music video or film quality
- Let moments breathe
- Artistic transitions

**Elements:**
- Nature, architecture, or human moments related to the topic
- Symbolic imagery that ties to the content
- No text—pure visual
- Cinematic feel

**Analyze the transcript and create the cinematic video:**

### TRANSCRIPT
{transcript}`,
  },
  {
    variant: 'video-social',
    label: 'Video (Social Media)',
    description: 'Viral social media clip based on transcript',
    outputType: 'video',
    prompt: `Analyze the transcript below and create a viral social media video clip.

🎬 **THE SOCIAL VIDEO:**

**Aspect Ratio Guidance:**
- For 16:9 (wide): Optimize for YouTube, Twitter, LinkedIn feeds
- For 9:16 (vertical): Optimize for TikTok, Instagram Reels, YouTube Shorts
- Adapt all compositions and text placements to work perfectly for the specified aspect ratio

**Instant Hook (First 1-2 seconds):**
- Pattern interrupt right away
- Something unexpected from the content
- Make them stop scrolling
- Text hook visible immediately

**Content (Main Body):**
- Extract the most shareable moment from the transcript
- Adapt layout to aspect ratio (vertical = stacked, wide = side-by-side)
- Big, bold text optimized for mobile viewing
- High energy, quick cuts (0.5-2 second clips)
- Captions/subtitles always on screen

**Ending (Last 2-3 seconds):**
- Satisfying conclusion or cliffhanger
- Loop-friendly if possible
- Something worth sharing
- Clear CTA or memorable final frame

**Platform Style:**
- TikTok/Reels/Shorts aesthetic for vertical
- YouTube/Twitter style for wide
- Trendy effects and transitions
- Meme-aware styling when appropriate
- Sound design and music sync matters

**Visual Elements:**
- Large readable captions/subtitles (essential for muted autoplay)
- Emoji or reaction elements
- Trending visual styles (zooms, shake effects, highlights)
- Mobile-first design always
- Safe zones for UI elements (top/bottom margins)

**Analyze the transcript and create the social clip:**

### TRANSCRIPT
{transcript}`,
  },
];
