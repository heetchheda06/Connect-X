import SupportTicket from '../models/supportTicket.model.js';
import { emailQueue } from '../services/emailQueue.js';

export const createTicket = async (req, res) => {
  try {
    const { email, subject, category, message } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Email, subject, and message are required',
      });
    }

    const ticket = await SupportTicket.create({
      user: req.user?._id || null,
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      category: category || 'general',
      message: message.trim(),
    });

    // Send confirmation email asynchronously
    emailQueue.enqueue({
      to: ticket.email,
      template: 'supportTicketReceived',
      data: {
        ticketId: ticket._id.toString(),
        subject: ticket.subject,
        category: ticket.category,
      },
    }).catch((err) => console.error('Failed to enqueue support confirmation email:', err.message));

    return res.status(201).json({
      success: true,
      data: ticket,
      message: 'Support ticket submitted successfully. Our team will review it shortly.',
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit support ticket',
    });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const tickets = await SupportTicket.find({
      $or: [{ user: req.user._id }, { email: req.user.email }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: tickets,
      message: 'Support tickets retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve support tickets',
    });
  }
};

