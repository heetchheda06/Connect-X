import { format, isToday, isYesterday, isThisYear } from 'date-fns';

/**
 * Format timestamp for message bubbles (e.g. "10:24 AM")
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatMessageTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return format(d, 'h:mm a');
};

/**
 * Format date for sticky date dividers ("Today", "Yesterday", "Mon, 12 Oct", "12 Oct 2025")
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatMessageDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisYear(d)) return format(d, 'EEE, d MMM');
  return format(d, 'd MMM yyyy');
};

/**
 * Format timestamp for sidebar conversation list preview
 * Today -> "10:24 AM"
 * Yesterday -> "Yesterday"
 * Within this week/year -> "Mon" or "12 Oct"
 * Older -> "12/10/25"
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatConversationTimestamp = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisYear(d)) return format(d, 'd MMM');
  return format(d, 'dd/MM/yy');
};

