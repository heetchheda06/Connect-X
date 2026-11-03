import Decision from '../models/decision.model.js';
import Message from '../models/message.model.js';

export const listDecisions = async (req, res, next) => {
  try {
    const { conversationId, status } = req.query;
    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'conversationId is required', data: null });
    }

    const query = { conversation: conversationId };
    if (status) query.status = status;

    const decisions = await Decision.find(query)
      .sort({ pinned: -1, decidedAt: -1 })
      .populate('proposedBy', 'name username avatar')
      .populate('agreedBy', 'name username')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Decisions retrieved successfully',
      data: { decisions },
    });
  } catch (err) {
    next(err);
  }
};

export const updateDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, pinned, text, context } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (typeof pinned === 'boolean') updates.pinned = pinned;
    if (text) updates.text = text.trim();
    if (context !== undefined) updates.context = context.trim();

    const decision = await Decision.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate('proposedBy', 'name username avatar');

    if (!decision) {
      return res.status(404).json({ success: false, message: 'Decision not found', data: null });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(decision.conversation.toString()).emit('decision:updated', { decision });
    }

    return res.status(200).json({
      success: true,
      message: 'Decision updated successfully',
      data: { decision },
    });
  } catch (err) {
    next(err);
  }
};

export const exportDecisionsMarkdown = async (req, res, next) => {
  try {
    const { conversationId } = req.query;
    const decisions = await Decision.find({ conversation: conversationId })
      .sort({ decidedAt: -1 })
      .populate('proposedBy', 'name')
      .lean();

    let md = `# ConnectX Decision Log\n\n`;
    for (const d of decisions) {
      md += `### ${d.text}\n`;
      md += `- **Status**: ${d.status}\n`;
      md += `- **Date**: ${new Date(d.decidedAt).toLocaleString()}\n`;
      if (d.context) md += `- **Context**: ${d.context}\n`;
      if (d.proposedBy) md += `- **Proposed By**: ${d.proposedBy.name}\n`;
      md += `\n---\n\n`;
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="decisions.md"');
    return res.send(md);
  } catch (err) {
    next(err);
  }
};
