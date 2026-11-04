import Call from '../models/call.model.js';

/**
 * Get call history for current user
 * GET /api/calls
 */
export const getCallHistory = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const calls = await Call.find({
      $or: [{ caller: currentUserId }, { callee: currentUserId }],
    })
      .sort({ startedAt: -1 })
      .limit(100)
      .populate('caller', '_id name username avatar')
      .populate('callee', '_id name username avatar')
      .populate('conversation', '_id name type avatar')
      .lean();

    return res.status(200).json({
      success: true,
      data: { calls },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a call record from history
 * DELETE /api/calls/:id
 */
export const deleteCallRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const call = await Call.findOne({
      _id: id,
      $or: [{ caller: currentUserId }, { callee: currentUserId }],
    });

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call record not found' });
    }

    await Call.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Call record deleted',
      data: { callId: id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get STUN/TURN ICE servers configuration
 * GET /api/calls/ice-servers
 */
export const getIceServers = async (req, res, next) => {
  try {
    // High-availability public STUN servers + Metered/OpenRelay TURN fallback if env vars present
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ];

    if (process.env.TURN_SERVER_URL && process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
      iceServers.push({
        urls: process.env.TURN_SERVER_URL,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD,
      });
    }

    return res.status(200).json({
      success: true,
      data: { iceServers },
    });
  } catch (error) {
    next(error);
  }
};
