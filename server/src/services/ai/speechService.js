import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';

const TranscriptSchema = z.object({
  text: z.string().default(''),
  language: z.string().default('en'),
  durationSec: z.number().default(0),
});

/**
 * Speech-to-Text abstraction service.
 * Default provider: Gemini Audio via official @google/genai SDK.
 */
class SpeechService {
  constructor() {
    this.provider = env.sttProvider;
    this.apiKey = env.sttApiKey || env.geminiApiKey;
    this.client = null;

    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.error('[SpeechService Init Error] Failed to initialize client:', err.message);
      }
    }
  }

  getClient() {
    const currentKey = env.sttApiKey || env.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!this.client && currentKey) {
      this.apiKey = currentKey;
      this.client = new GoogleGenAI({ apiKey: currentKey });
    }
    return this.client;
  }

  detectMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.webm': return 'audio/webm';
      case '.ogg':
      case '.opus': return 'audio/ogg';
      case '.mp3': return 'audio/mp3';
      case '.m4a': return 'audio/m4a';
      case '.wav': return 'audio/wav';
      case '.aac': return 'audio/aac';
      default: return 'audio/webm';
    }
  }

  /**
   * Transcribe an audio file
   * @param {string} filePath Absolute or relative path to audio file on local disk
   * @param {string} [languageHint] Optional hint (e.g. 'hi', 'en')
   * @returns {Promise<{ text: string, language: string, durationSec: number }>}
   */
  async transcribe(filePath, languageHint = '') {
    const client = this.getClient();
    if (!client) {
      const err = new Error('Speech recognition service is not configured. Please set GEMINI_API_KEY.');
      err.code = 'AI_NOT_CONFIGURED';
      throw err;
    }

    if (!fs.existsSync(filePath)) {
      const err = new Error(`Audio file not found at path: ${filePath}`);
      err.code = 'FILE_NOT_FOUND';
      throw err;
    }

    const stats = fs.statSync(filePath);
    const mimeType = this.detectMimeType(filePath);
    const model = env.sttModel || env.aiModel || 'gemini-2.5-flash';
    const startTime = Date.now();

    const systemInstruction = `
You are the ConnectX Speech-to-Text Transcription Engine.
Transcribe the voice message accurately verbatim.
Detect the spoken language (e.g., "en", "hi", "hinglish", "mr", "gu", etc.).
If the audio is silent or unintelligible noise, return "Couldn't make out speech." as text.
Output strict JSON matching:
{
  "text": string,
  "language": string,
  "durationSec": number
}
${languageHint ? `Spoken language hint: ${languageHint}.` : ''}
`;

    let uploadedFile = null;

    try {
      let contents;
      // If file is under 15MB, send inline data
      if (stats.size < 15 * 1024 * 1024) {
        const audioBuffer = fs.readFileSync(filePath);
        const base64Audio = audioBuffer.toString('base64');
        contents = [
          {
            inlineData: {
              data: base64Audio,
              mimeType,
            },
          },
          {
            text: 'Please transcribe this audio clip accurately into text and return the JSON schema.',
          },
        ];
      } else {
        // Upload using Gemini files API for larger audio clips
        uploadedFile = await client.files.upload({
          file: filePath,
          mimeType,
        });
        contents = [
          uploadedFile,
          {
            text: 'Please transcribe this audio clip accurately into text and return the JSON schema.',
          },
        ];
      }

      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      let json = {};
      try {
        json = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim());
      } catch {
        json = { text: rawText.trim() || "Couldn't make out speech.", language: languageHint || 'en', durationSec: 0 };
      }

      const parsed = TranscriptSchema.parse(json);
      const latencyMs = Date.now() - startTime;
      console.log(`[AI Speech Audit] Audio transcribed | Model: ${model} | Size: ${stats.size}b | Latency: ${latencyMs}ms | Status: SUCCESS`);

      return {
        text: parsed.text || "Couldn't make out speech.",
        language: parsed.language || 'en',
        durationSec: parsed.durationSec || 0,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      console.error(`[AI Speech Audit] Audio transcription error | Model: ${model} | Latency: ${latencyMs}ms | Status: ERROR | Message: ${err.message}`);
      throw err;
    } finally {
      // Promptly delete any temporary file uploaded to the STT provider
      if (uploadedFile?.name) {
        try {
          await client.files.delete({ name: uploadedFile.name });
          console.log(`[SpeechService Cleanup] Deleted temporary file from provider: ${uploadedFile.name}`);
        } catch (cleanupErr) {
          console.warn(`[SpeechService Warning] Could not delete provider file ${uploadedFile.name}: ${cleanupErr.message}`);
        }
      }
    }
  }
}

export const speechService = new SpeechService();
export default speechService;

