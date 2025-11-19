/**
 * Text-to-Speech Controller
 * Handles reading summaries aloud with chunking and playback controls
 */
import { showToast } from '../ui-utils.js';

export interface TTSOptions {
  voiceName?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export class TTSController {
  private isSpeaking: boolean = false;
  private speakBtn: HTMLElement | null;

  constructor(
    speakBtnId: string,
    private onStateChange: (isSpeaking: boolean) => void
  ) {
    this.speakBtn = document.getElementById(speakBtnId);

    // Cleanup listeners
    window.addEventListener('beforeunload', () => this.stop());
    window.addEventListener('pagehide', () => this.stop());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isSpeaking) this.stop();
    });
  }

  toggle(text: string): void {
    if (this.isSpeaking) {
      this.stop();
      showToast('Stopped reading', 2000, 'info');
    } else {
      this.speak(text);
    }
  }

  stop(): void {
    if (this.isSpeaking) {
      chrome.tts.stop();
      this.updateState(false);
    }
  }

  private speak(text: string): void {
    if (!text) {
      showToast('No summary available to read', 2000, 'error');
      return;
    }

    const cleanText = this.cleanMarkdownForSpeech(text);

    this.updateState(true);
    showToast('Reading summary aloud...', 2000, 'info');

    this.speakTextInChunks(cleanText, {
      voiceName: 'Google US English',
      lang: 'en-US',
      rate: 1.0,
      onComplete: () => {
        this.updateState(false);
        showToast('Finished reading', 2000, 'success');
      },
      onError: () => {
        this.updateState(false);
        showToast('Error reading summary', 2000, 'error');
      },
      onInterrupted: () => {
        this.updateState(false);
      },
    });
  }

  private updateState(speaking: boolean): void {
    this.isSpeaking = speaking;
    this.onStateChange(speaking);
    this.updateButtonIcon(speaking);
  }

  private updateButtonIcon(speaking: boolean): void {
    if (!this.speakBtn) return;

    const svg = this.speakBtn.querySelector('svg');
    if (!svg) return;

    if (speaking) {
      this.speakBtn.title = 'Stop reading';
      this.speakBtn.setAttribute('aria-label', 'Stop reading aloud');
      svg.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z">
        </path>
      `;
    } else {
      this.speakBtn.title = 'Read summary aloud';
      this.speakBtn.setAttribute('aria-label', 'Read summary aloud');
      svg.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z">
        </path>
      `;
    }
  }

  private speakTextInChunks(
    text: string,
    options: TTSOptions & {
      onComplete?: () => void;
      onError?: () => void;
      onInterrupted?: () => void;
    }
  ): void {
    const MAX_CHUNK_SIZE = 1800;
    const {
      voiceName,
      lang = 'en-US',
      rate = 1.0,
      pitch = 1.0,
      volume = 1.0,
      onComplete,
      onError,
      onInterrupted,
    } = options;

    const chunks = this.splitTextIntoChunks(text, MAX_CHUNK_SIZE);
    let currentChunkIndex = 0;
    let wasInterrupted = false;

    const speakNextChunk = () => {
      if (!this.isSpeaking || wasInterrupted) return;

      if (currentChunkIndex >= chunks.length) {
        if (onComplete) onComplete();
        return;
      }

      const chunk = chunks[currentChunkIndex++] || '';
      const ttsOptions: any = {
        lang,
        rate,
        pitch,
        volume,
        enqueue: false,
        onEvent: (event: any) => {
          if (event.type === 'end') {
            speakNextChunk();
          } else if (event.type === 'interrupted' || event.type === 'cancelled') {
            wasInterrupted = true;
            if (onInterrupted) onInterrupted();
          } else if (event.type === 'error') {
            console.error('TTS error:', event);
            wasInterrupted = true;
            if (onError) onError();
          }
        },
      };

      if (voiceName) ttsOptions.voiceName = voiceName;

      chrome.tts.speak(chunk, ttsOptions, () => {
        if (chrome.runtime.lastError) {
          console.error('TTS callback error:', chrome.runtime.lastError.message);
          if (chunk) {
            this.tryWebSpeechFallback(chunk, { lang, rate, pitch });
          }
        }
      });
    };

    speakNextChunk();
  }

  private splitTextIntoChunks(text: string, maxSize: number): string[] {
    if (text.length <= maxSize) return [text];

    const chunks: string[] = [];
    let remainingText = text;

    while (remainingText.length > 0) {
      if (remainingText.length <= maxSize) {
        chunks.push(remainingText);
        break;
      }

      let splitIndex = maxSize;
      const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];

      let lastSentenceEnd = -1;
      for (const ending of sentenceEndings) {
        const index = remainingText.lastIndexOf(ending, maxSize);
        if (index > lastSentenceEnd && index > maxSize * 0.5) {
          lastSentenceEnd = index + ending.length;
        }
      }

      if (lastSentenceEnd > 0) {
        splitIndex = lastSentenceEnd;
      } else {
        const lastSpace = remainingText.lastIndexOf(' ', maxSize);
        if (lastSpace > maxSize * 0.7) {
          splitIndex = lastSpace + 1;
        }
      }

      chunks.push(remainingText.slice(0, splitIndex).trim());
      remainingText = remainingText.slice(splitIndex).trim();
    }

    return chunks;
  }

  private tryWebSpeechFallback(
    text: string,
    options: { lang: string; rate: number; pitch: number }
  ): void {
    try {
      if (window && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options.lang;
        utterance.rate = options.rate;
        utterance.pitch = options.pitch;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Web Speech API fallback failed:', error);
    }
  }

  private cleanMarkdownForSpeech(markdown: string): string {
    let text = markdown;
    text = text.replace(/^#{1,6}\s+/gm, '');
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/__(.+?)__/g, '$1');
    text = text.replace(/_(.+?)_/g, '$1');
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`(.+?)`/g, '$1');
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    text = text.replace(/<[^>]*>/g, '');

    // Common emojis and symbols
    text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
    text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
    text = text.replace(/[→←↑↓↔⇒⇐⇑⇓⇔]/g, '');
    text = text.replace(/[✓✔✕✖✗✘]/g, '');

    text = text.replace(/^[\*\-\+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');
    text = text.replace(/^[-_*]{3,}$/gm, '');
    text = text.replace(/^>\s+/gm, '');

    text = text.replace(/\n\n+/g, '. ');
    text = text.replace(/\n/g, '. ');
    text = text.replace(/\s\s+/g, ' ');

    return text.trim();
  }
}
