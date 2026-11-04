import Task from '../models/task.model.js';
import { insightService } from '../services/ai/insightService.js';

export const extractInsights = async (req, res, next) => {
  try {
    const { conversationId, range = 50 } = req.body;
    const io = req.app.get('io');
    const result = await insightService.extractInsights({
      conversationId,
      userId: req.user._id,
      range: Number(range),
      trigger: 'manual',
      socketIo: io,
    });
    return res.status(200).json({
      success: true,
      message: 'Insights and tasks extracted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const listTasks = async (req, res, next) => {
  try {
    const { scope = 'conversation', conversationId, status } = req.query;
    const query = {};

    if (scope === 'mine') {
      query.$or = [{ assignee: req.user._id }, { createdBy: req.user._id }];
    } else if (conversationId) {
      query.conversation = conversationId;
    }

    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .populate('assignee', 'name username avatar')
      .populate('createdBy', 'name username')
      .populate('conversation', 'name type')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: { tasks },
    });
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { conversationId, title, description, assignee, dueAt, priority = 'medium' } = req.body;
    if (!title || !conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Title and conversationId are required',
        data: null,
      });
    }

    const task = await Task.create({
      conversation: conversationId,
      title: title.trim(),
      description: description?.trim() || '',
      assignee: assignee || null,
      createdBy: req.user._id,
      dueAt: dueAt ? new Date(dueAt) : null,
      priority,
      status: 'open',
      origin: 'manual',
    });

    const populated = await Task.findById(task._id)
      .populate('assignee', 'name username avatar')
      .populate('createdBy', 'name username');

    const io = req.app.get('io');
    if (io) {
      io.to(task.conversation.toString()).emit('task:created', { task: populated });
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: populated },
    });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, title, description, assignee, dueAt, priority } = req.body;

    const updates = {};
    if (status) {
      updates.status = status;
      if (status === 'done') updates.completedAt = new Date();
    }
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (assignee !== undefined) updates.assignee = assignee || null;
    if (dueAt !== undefined) updates.dueAt = dueAt ? new Date(dueAt) : null;
    if (priority) updates.priority = priority;

    const task = await Task.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate('assignee', 'name username avatar')
      .populate('createdBy', 'name username');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found', data: null });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(task.conversation.toString()).emit('task:updated', { task });
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found', data: null });
    }
    const io = req.app.get('io');
    if (io) {
      io.to(task.conversation.toString()).emit('task:deleted', { taskId: id });
    }
    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

export const exportTasksIcs = async (req, res, next) => {
  try {
    const { conversationId } = req.query;
    const query = { dueAt: { $ne: null } };
    if (conversationId) query.conversation = conversationId;
    else query.$or = [{ assignee: req.user._id }, { createdBy: req.user._id }];

    const tasks = await Task.find(query).lean();

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ConnectX//AI Tasks//EN',
      'CALSCALE:GREGORIAN',
    ];

    for (const t of tasks) {
      const dt = t.dueAt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      ics.push(
        'BEGIN:VEVENT',
        `UID:task-${t._id}@connectx.internal`,
        `DTSTAMP:${dt}`,
        `DTSTART:${dt}`,
        `SUMMARY:${t.title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${(t.description || '').replace(/\n/g, ' ')}`,
        'END:VEVENT'
      );
    }
    ics.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="connectx-tasks.ics"');
    return res.send(ics.join('\r\n'));
  } catch (err) {
    next(err);
  }
};
