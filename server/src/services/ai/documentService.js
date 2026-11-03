import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import Message from '../../models/message.model.js';
import DocAnalysis from '../../models/docAnalysis.model.js';
import { llmService } from './llmService.js';
import { contextGateway } from './contextGateway.js';
import { wrapChatData, PROMPT_INJECTION_DEFENSE } from './prompts.js';
import { env } from '../../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.join(__dirname, '../../../uploads');

const docAnalysisSchema = z.object({
  summary: z.string().default(''),
  keyPoints: z.array(z.string()).default([]),
  entities: z
    .array(
      z.object({
        type: z.string().default('General'),
        name: z.string(),
      })
    )
    .default([]),
  tables: z
    .array(
      z.object({
        headers: z.array(z.string()),
        rows: z.array(z.array(z.string())),
      })
    )
    .default([]),
});

const docAskSchema = z.object({
  answer: z.string(),
  pageOrSection: z.string().default(''),
  confidence: z.number().default(0.8),
});

const DOC_ANALYSIS_PROMPT = `
You are the ConnectX Document Analysis Engine.
Analyze the document text provided inside <chat_data> and extract:
1. "summary": Executive overview in 2-4 sentences.
2. "keyPoints": 4 to 8 critical takeaways, clauses, obligations, or findings.
3. "entities": Key people, organizations, dates, milestones, or monetary amounts.
4. "tables": Extracted tabular data or statistics if applicable.
If the document is a contract or legal agreement, include notable risk flags with the note "Informational only, not legal advice".
${PROMPT_INJECTION_DEFENSE}
`;

export class DocumentService {
  /**
   * Analyze an uploaded document
   */
  async analyzeDocument({ messageId, userId }) {
    const message = await Message.findById(messageId);
    if (!message || !message.attachment?.url) {
      const err = new Error('Message does not contain a document attachment');
      err.status = 400;
      throw err;
    }

    // Verify conversation access through gateway
    await contextGateway.buildAiContext({
      userId,
      conversationId: message.conversation,
      feature: 'document_analysis',
      trigger: 'manual',
      range: 5,
    });

    // Check cached analysis
    const existing = await DocAnalysis.findOne({ message: message._id });
    if (existing) return existing;

    const filename = path.basename(message.attachment.url);
    const localPath = path.join(uploadsDirectory, filename);

    let docText = '';
    if (fs.existsSync(localPath)) {
      try {
        const rawContent = fs.readFileSync(localPath, 'utf8');
        docText = rawContent.slice(0, 50000); // Up to 50k characters
      } catch (e) {
        docText = `Document: ${message.attachment.name} (${message.attachment.mimeType}).`;
      }
    } else {
      docText = `Document: ${message.attachment.name} (${message.attachment.mimeType}).`;
    }

    const wrappedDoc = wrapChatData(docText, 'document_content');
    const userPrompt = `Analyze the document "${message.attachment.name}". Extract executive summary, key points, entities and tables.`;

    const result = await llmService.generateStructured({
      systemInstruction: DOC_ANALYSIS_PROMPT,
      prompt: `${wrappedDoc}\n\n${userPrompt}`,
      schema: docAnalysisSchema,
      modelTier: env.aiModelSmart || env.aiModel,
    });

    const analysis = await DocAnalysis.create({
      message: message._id,
      summary: result.summary,
      keyPoints: result.keyPoints,
      entities: result.entities,
      tables: result.tables,
      status: 'ready',
    });

    return analysis;
  }

  /**
   * Ask questions about a document
   */
  async askDocument({ messageId, question, userId }) {
    const analysis = await DocAnalysis.findOne({ message: messageId });
    const message = await Message.findById(messageId);

    const docContext = analysis
      ? `Summary: ${analysis.summary}\nKey Points: ${analysis.keyPoints.join('; ')}`
      : `Document: ${message?.attachment?.name || 'File'}`;

    const prompt = `
Document Details:
${docContext}

Question: "${question}"

Answer the question about this document accurately with the relevant section or page.`;

    const result = await llmService.generateStructured({
      systemInstruction: `You are the ConnectX Document Q&A Assistant. Answer strictly from the document. ${PROMPT_INJECTION_DEFENSE}`,
      prompt,
      schema: docAskSchema,
      modelTier: env.aiModelFast || env.aiModel,
    });

    return result;
  }
}

export const documentService = new DocumentService();
export default documentService;
