import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';

/**
 * Interface and provider implementation for LLM text operations.
 * Default provider: Google Gemini API via official @google/genai SDK.
 */
class LlmService {
  constructor() {
    this.provider = env.aiProvider;
    this.apiKey = env.geminiApiKey;
    this.client = null;

    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.error('[LlmService Init Error] Failed to initialize GoogleGenAI client:', err.message);
      }
    }
  }

  /**
   * Lazily re-initializes client if GEMINI_API_KEY was added dynamically
   */
  getClient() {
    const currentKey = env.geminiApiKey || process.env.GEMINI_API_KEY;
    if (currentKey && (!this.client || this.apiKey !== currentKey)) {
      this.apiKey = currentKey;
      this.client = new GoogleGenAI({ apiKey: currentKey });
    }
    return this.client;
  }

  /**
   * Format and normalize error messages from LLM / Gemini API
   */
  formatError(err) {
    if (!err) return new Error('Unknown AI error');

    const rawMsg = err.message || '';
    const isRateLimit =
      err.status === 429 ||
      err.statusCode === 429 ||
      rawMsg.includes('429') ||
      rawMsg.includes('RESOURCE_EXHAUSTED') ||
      rawMsg.includes('Quota exceeded') ||
      rawMsg.includes('rate limit');

    if (isRateLimit) {
      const quotaErr = new Error('Gemini API rate limit reached (Free tier allows 5 requests/min). Please wait 30 seconds and try again.');
      quotaErr.statusCode = 429;
      quotaErr.code = 'AI_RATE_LIMIT';
      return quotaErr;
    }

    if (rawMsg.includes('SAFETY') || err.code === 'AI_SAFETY_BLOCKED') {
      const safetyErr = new Error('This content was flagged by AI safety filters and cannot be processed.');
      safetyErr.statusCode = 400;
      safetyErr.code = 'AI_SAFETY_BLOCKED';
      return safetyErr;
    }

    if (err.code === 'AI_NOT_CONFIGURED') {
      err.statusCode = 503;
      return err;
    }

    try {
      if (rawMsg.startsWith('{')) {
        const parsed = JSON.parse(rawMsg);
        if (parsed?.error?.message) {
          const cleanErr = new Error(parsed.error.message);
          cleanErr.statusCode = parsed.error.code || 500;
          return cleanErr;
        }
      }
    } catch (_) {}

    return err;
  }

  /**
   * Resolve appropriate model identifier from env
   * @param {'fast' | 'smart' | 'default'} tier 
   * @returns {string}
   */
  resolveModel(tier = 'default') {
    if (tier === 'fast') return env.aiModelFast || 'gemini-2.5-flash';
    if (tier === 'smart') return env.aiModelSmart || 'gemini-2.5-flash';
    return env.aiModel || 'gemini-2.5-flash';
  }

  /**
   * Cleans JSON markdown code fence formatting from model responses
   * @param {string} text 
   * @returns {string}
   */
  cleanJsonResponse(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();

    // 1. Strip markdown fences if present anywhere in text
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    } else if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // 2. If text has leading or trailing non-JSON characters, extract outermost JSON structure
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      const startObj = cleaned.indexOf('{');
      const startArr = cleaned.indexOf('[');
      let startIdx = -1;
      if (startObj !== -1 && startArr !== -1) {
        startIdx = Math.min(startObj, startArr);
      } else {
        startIdx = Math.max(startObj, startArr);
      }
      if (startIdx !== -1) {
        const isObj = cleaned[startIdx] === '{';
        const endIdx = isObj ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');
        if (endIdx !== -1 && endIdx > startIdx) {
          cleaned = cleaned.substring(startIdx, endIdx + 1);
        }
      }
    }
    return cleaned.trim();
  }

  /**
   * Exponential backoff helper for HTTP 429 / Rate Limit errors
   */
  async retryWithBackoff(fn, retries = 2, initialDelayMs = 1200) {
    let delay = initialDelayMs;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isRateLimit =
          err?.status === 429 ||
          err?.message?.includes('429') ||
          err?.message?.includes('RESOURCE_EXHAUSTED') ||
          err?.message?.includes('rate limit');

        // Do not retry safety blocks or non-transient errors
        const isSafety =
          err?.message?.includes('SAFETY') ||
          err?.message?.includes('blocked') ||
          err?.code === 'AI_SAFETY_BLOCKED';

        if (isSafety || !isRateLimit || attempt === retries) {
          throw err;
        }

        console.warn(`[LlmService Warning] Rate limited (attempt ${attempt + 1}/${retries}). Retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2;
      }
    }
  }

  /**
   * Executes a model generation request with a strict 15s timeout
   */
  async executeWithTimeout(promise, timeoutMs = 15000) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error('AI request timed out after 15 seconds. Please try again.');
        err.code = 'AI_TIMEOUT';
        reject(err);
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate raw text from prompt
   * @param {Object} options
   * @param {string} options.feature Feature name for audit logging
   * @param {string} options.prompt Main prompt / user prompt
   * @param {string} [options.systemInstruction] System guidance
   * @param {'fast' | 'smart' | 'default'} [options.tier]
   * @param {number} [options.timeoutMs]
   */
  async generateText({
    feature = 'general_text',
    prompt,
    systemInstruction,
    tier = 'default',
    timeoutMs = 15000,
  }) {
    const client = this.getClient();
    if (!client) {
      const err = new Error('ConnectX AI is not configured on this server. Please check GEMINI_API_KEY in environment.');
      err.code = 'AI_NOT_CONFIGURED';
      throw err;
    }

    const model = this.resolveModel(tier);
    const startTime = Date.now();

    try {
      const response = await this.retryWithBackoff(() =>
        this.executeWithTimeout(
          client.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: systemInstruction || undefined,
              temperature: 0.2,
            },
          }),
          timeoutMs
        )
      );

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        const safetyErr = new Error('This content was flagged by AI safety filters and cannot be processed.');
        safetyErr.code = 'AI_SAFETY_BLOCKED';
        throw safetyErr;
      }

      const text = response.text || candidate?.content?.parts?.[0]?.text || '';
      const latencyMs = Date.now() - startTime;
      const tokens = response.usageMetadata?.totalTokenCount || 0;

      // Audit log (NEVER logs content)
      console.log(`[AI Audit] Feature: ${feature} | Model: ${model} | Latency: ${latencyMs}ms | Tokens: ${tokens} | Status: SUCCESS`);

      return {
        text: text.trim(),
        tokens,
        latencyMs,
      };
    } catch (err) {
      const formatted = this.formatError(err);
      const latencyMs = Date.now() - startTime;
      console.error(`[AI Audit] Feature: ${feature} | Model: ${model} | Latency: ${latencyMs}ms | Status: ERROR | Message: ${formatted.message}`);
      throw formatted;
    }
  }

  /**
   * Generate structured JSON output with Zod validation.
   * Discards and retries once on invalid schema output.
   * @param {Object} options
   * @param {string} options.feature
   * @param {string} options.prompt
   * @param {string} options.systemInstruction
   * @param {import('zod').ZodTypeAny} options.schema Zod schema
   * @param {'fast' | 'smart' | 'default'} [options.tier]
   * @param {number} [options.timeoutMs]
   */
  async generateStructured({
    feature = 'structured_task',
    prompt,
    systemInstruction,
    schema,
    tier = 'default',
    timeoutMs = 15000,
  }) {
    const client = this.getClient();
    if (!client) {
      const err = new Error('ConnectX AI is not configured on this server. Please check GEMINI_API_KEY in environment.');
      err.code = 'AI_NOT_CONFIGURED';
      throw err;
    }

    const model = this.resolveModel(tier);
    const startTime = Date.now();

    const runCall = async (retryPrompt = prompt) => {
      return await this.retryWithBackoff(() =>
        this.executeWithTimeout(
          client.models.generateContent({
            model,
            contents: retryPrompt,
            config: {
              systemInstruction: systemInstruction || undefined,
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
          timeoutMs
        )
      );
    };

    let response;
    try {
      response = await runCall();
    } catch (err) {
      const formatted = this.formatError(err);
      const latencyMs = Date.now() - startTime;
      console.error(`[AI Audit] Feature: ${feature} | Model: ${model} | Latency: ${latencyMs}ms | Status: ERROR | Message: ${formatted.message}`);
      throw formatted;
    }

    const candidate = response.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
      const safetyErr = new Error('This content was flagged by AI safety filters and cannot be processed.');
      safetyErr.code = 'AI_SAFETY_BLOCKED';
      throw safetyErr;
    }

    const rawText = response.text || candidate?.content?.parts?.[0]?.text || '{}';
    const cleanedJson = this.cleanJsonResponse(rawText);

    let parsedJson;
    try {
      parsedJson = JSON.parse(cleanedJson);
    } catch {
      parsedJson = null;
    }

    // Validate with Zod
    if (parsedJson && schema) {
      const validation = schema.safeParse(parsedJson);
      if (validation.success) {
        const latencyMs = Date.now() - startTime;
        const tokens = response.usageMetadata?.totalTokenCount || 0;
        console.log(`[AI Audit] Feature: ${feature} | Model: ${model} | Latency: ${latencyMs}ms | Tokens: ${tokens} | Status: SUCCESS`);
        return {
          ...(typeof validation.data === 'object' ? validation.data : {}),
          data: validation.data,
          tokens,
          latencyMs,
        };
      }
    }

    // Retry once if validation failed or JSON malformed
    console.warn(`[LlmService Warning] Output validation failed for ${feature}. Retrying once with strict schema reminder...`);
    try {
      const correctedPrompt = `${prompt}\n\nIMPORTANT: Output strictly valid JSON matching the required schema. No explanations, no markdown fences.`;
      const retryResponse = await runCall(correctedPrompt);
      const retryRaw = retryResponse.text || retryResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      let retryJson = null;
      try {
        retryJson = JSON.parse(this.cleanJsonResponse(retryRaw));
      } catch {
        retryJson = null;
      }

      if (retryJson && schema) {
        const retryValidation = schema.safeParse(retryJson);
        if (retryValidation.success) {
          const latencyMs = Date.now() - startTime;
          const tokens = (response.usageMetadata?.totalTokenCount || 0) + (retryResponse.usageMetadata?.totalTokenCount || 0);
          console.log(`[AI Audit] Feature: ${feature} (retry) | Model: ${model} | Latency: ${latencyMs}ms | Tokens: ${tokens} | Status: SUCCESS`);
          return {
            ...(typeof retryValidation.data === 'object' ? retryValidation.data : {}),
            data: retryValidation.data,
            tokens,
            latencyMs,
          };
        }
      }

      const fallbackObj = retryJson || parsedJson;
      if (fallbackObj && typeof fallbackObj === 'object') {
        console.warn(`[LlmService Warning] Output validation mismatch for ${feature}, salvaging parsed JSON object.`);
        return {
          ...fallbackObj,
          data: fallbackObj,
          tokens: (response.usageMetadata?.totalTokenCount || 0) + (retryResponse?.usageMetadata?.totalTokenCount || 0),
          latencyMs: Date.now() - startTime,
        };
      }

      throw new Error('AI output did not match expected structure after retry.');
    } catch (retryErr) {
      if (parsedJson && typeof parsedJson === 'object') {
        return {
          ...parsedJson,
          data: parsedJson,
          tokens: response.usageMetadata?.totalTokenCount || 0,
          latencyMs: Date.now() - startTime,
        };
      }
      const formatted = this.formatError(retryErr);
      const latencyMs = Date.now() - startTime;
      console.error(`[AI Audit] Feature: ${feature} (retry failed) | Model: ${model} | Latency: ${latencyMs}ms | Status: ERROR | Message: ${formatted.message}`);
      throw formatted;
    }
  }
}

export const llmService = new LlmService();
export default llmService;

