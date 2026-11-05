import { renderEmailLayout, htmlToPlainText } from './renderEmail.js';
import { env } from '../config/env.js';

export const emailTemplates = {
  /**
   * 1. Verify Email
   */
  verifyEmail: ({ name = 'there', verifyUrl }) => {
    const subject = `Verify your email for ${env.appName}`;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">Welcome to ${env.appName}, ${name}!</h2>
      <p>Thank you for signing up. Please verify your email address to unlock all features, search contacts, and start chatting.</p>
      <div class="callout">
        <strong>⏱️ Link valid for 24 hours.</strong> If it expires, you can request a new verification link from your account.
      </div>
      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Or paste this link into your browser:<br>
        <span style="word-break: break-all; color: #0284c7;">${verifyUrl}</span>
      </p>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Confirm your email to get started on ${env.appName}`,
      contentHtml,
      actionUrl: verifyUrl,
      actionText: 'Verify Email Address',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 2. Welcome
   */
  welcome: ({ name = 'there' }) => {
    const subject = `Welcome to ${env.appName}!`;
    const appUrl = env.clientUrl;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">You're all set, ${name}! 🎉</h2>
      <p>Your ConnectX account is active and verified. Here are three quick ways to get the most out of your experience:</p>
      <ul style="padding-left: 20px; line-height: 1.8; color: #334155;">
        <li><strong>Complete your profile:</strong> Upload an avatar and add an About bio.</li>
        <li><strong>Find your friends:</strong> Search by username to start instant real-time chats.</li>
        <li><strong>Stay notified:</strong> Enable desktop or push notifications so you never miss an update.</li>
      </ul>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Welcome to ConnectX. Here is how to get started.`,
      contentHtml,
      actionUrl: appUrl,
      actionText: 'Open ConnectX',
      footerNote: 'We are thrilled to have you with us!',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 3. Reset Password
   */
  resetPassword: ({ name = 'there', resetUrl }) => {
    const subject = `Reset your password for ${env.appName}`;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">Password Reset Request</h2>
      <p>Hello ${name}, we received a request to reset the password for your ${env.appName} account.</p>
      <div class="callout">
        <strong>🔒 Security Notice:</strong> This link is valid for <strong>30 minutes</strong> and can only be used once.
      </div>
      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        If button doesn't work, copy and paste this URL:<br>
        <span style="word-break: break-all; color: #0284c7;">${resetUrl}</span>
      </p>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Reset link for your ${env.appName} password (valid 30 minutes)`,
      contentHtml,
      actionUrl: resetUrl,
      actionText: 'Reset Password',
      footerNote: "If you didn't request a password reset, you can safely ignore this email. Your current password remains unchanged.",
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 4. Password Changed
   */
  passwordChanged: ({ name = 'there', timestamp = new Date().toUTCString() }) => {
    const subject = `Your ${env.appName} password has been changed`;
    const settingsUrl = `${env.clientUrl}/settings`;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">Password Changed Successfully</h2>
      <p>Hello ${name}, the password for your ${env.appName} account was successfully updated on <strong>${timestamp}</strong>.</p>
      <div class="callout" style="background-color: #fef2f2; border-color: #fecaca; color: #991b1b;">
        <strong>⚠️ If you did not make this change:</strong> Your account may be compromised. Please reset your password immediately and review your active sessions.
      </div>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Your ${env.appName} password was recently updated.`,
      contentHtml,
      actionUrl: settingsUrl,
      actionText: 'Review Account Security',
      footerNote: 'Security alert generated automatically by ConnectX.',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 5. New Sign-In Alert
   */
  newSignIn: ({
    name = 'there',
    deviceLabel = 'Unknown Device',
    ipTruncated = 'Unknown IP',
    timestamp = new Date().toUTCString(),
  }) => {
    const subject = `New sign-in to your ${env.appName} account`;
    const sessionsUrl = `${env.clientUrl}/settings?tab=security`;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">New Sign-in Detected</h2>
      <p>Hello ${name}, your account was just signed into from a device or location we haven't seen recently:</p>
      <div class="callout">
        <strong>📱 Device:</strong> ${deviceLabel}<br>
        <strong>🌐 Approximate IP:</strong> ${ipTruncated}<br>
        <strong>⏰ Time:</strong> ${timestamp}
      </div>
      <p>If this was you, you can ignore this alert. If you do not recognize this activity, revoke the session immediately.</p>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `New sign-in detected from ${deviceLabel}`,
      contentHtml,
      actionUrl: sessionsUrl,
      actionText: 'Manage Devices & Sessions',
      footerNote: 'You can manage sign-in alerts in Settings > Notifications.',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 6. Email Change Verification (Sent to NEW address)
   */
  emailChangeVerification: ({ name = 'there', newEmail, confirmUrl }) => {
    const subject = `Confirm your new email address for ${env.appName}`;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">Confirm Email Change</h2>
      <p>Hello ${name}, a request was made to update your ${env.appName} email address to <strong>${newEmail}</strong>.</p>
      <div class="callout">
        Please click the button below to confirm that you own this email address. The link expires in <strong>1 hour</strong>.
      </div>
      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Direct link:<br>
        <span style="word-break: break-all; color: #0284c7;">${confirmUrl}</span>
      </p>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Confirm ${newEmail} as your new email address`,
      contentHtml,
      actionUrl: confirmUrl,
      actionText: 'Confirm Email Change',
      footerNote: 'If you did not initiate this change, no action is needed and your account will not be affected.',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 7. Email Change Notice (Sent to OLD address)
   */
  emailChangeNotice: ({ name = 'there', newEmail, timestamp = new Date().toUTCString() }) => {
    const subject = `Security Alert: Request to change your ${env.appName} email`;
    const supportUrl = `${env.clientUrl}/help`;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">Email Change Requested</h2>
      <p>Hello ${name}, on <strong>${timestamp}</strong>, a request was submitted to change your account email address to: <strong>${newEmail}</strong>.</p>
      <div class="callout" style="background-color: #fef2f2; border-color: #fecaca; color: #991b1b;">
        <strong>⚠️ Did not request this?</strong> Someone may have access to your account. Please log in immediately, change your password, and contact our support team.
      </div>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Notice: Request to change your ${env.appName} email address`,
      contentHtml,
      actionUrl: supportUrl,
      actionText: 'Contact Support',
      footerNote: 'Notice sent for your security.',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 8. Account Deletion Scheduled
   */
  deletionScheduled: ({
    name = 'there',
    scheduledFor = '14 days',
    graceDays = 14,
    cancelUrl,
  }) => {
    const subject = `Your ${env.appName} account deletion has been scheduled`;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">Account Deletion Scheduled</h2>
      <p>Hello ${name}, you have requested to permanently delete your ${env.appName} account.</p>
      <div class="callout">
        <strong>🗓️ Grace Period: ${graceDays} days</strong><br>
        Your account is currently disabled and scheduled for permanent deletion on: <strong>${scheduledFor}</strong>.
      </div>
      <p>If you change your mind, simply log in before this date or click the button below to cancel your deletion request.</p>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Account deletion scheduled on ${scheduledFor}`,
      contentHtml,
      actionUrl: cancelUrl,
      actionText: 'Cancel Account Deletion',
      footerNote: 'All data will be permanently purged after the grace period.',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 9. Account Deletion Cancelled
   */
  deletionCancelled: ({ name = 'there', timestamp = new Date().toUTCString() }) => {
    const subject = `Your ${env.appName} account deletion was cancelled`;
    const appUrl = env.clientUrl;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">Account Restored</h2>
      <p>Hello ${name}, your account deletion request was successfully cancelled on <strong>${timestamp}</strong>.</p>
      <p>Your account and chat history have been fully restored.</p>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Your ${env.appName} account has been restored`,
      contentHtml,
      actionUrl: appUrl,
      actionText: 'Back to ConnectX',
      footerNote: 'Glad to have you back!',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 10. Data Export Ready
   */
  dataExportReady: ({ name = 'there', downloadUrl, expiresAt = '7 days' }) => {
    const subject = `Your ${env.appName} data export is ready to download`;
    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">Your Data Archive is Ready</h2>
      <p>Hello ${name}, we have finished compiling your account data, chat histories, settings, and media files into a secure ZIP archive.</p>
      <div class="callout">
        <strong>📦 Security Note:</strong> For your privacy, you must be signed in to download this file. This download link expires on <strong>${expiresAt}</strong>.
      </div>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Your requested data archive is ready for download`,
      contentHtml,
      actionUrl: downloadUrl,
      actionText: 'Download My Data (.ZIP)',
      footerNote: 'Keep your personal data archive in a secure location.',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },

  /**
   * 11. Moderation Notice (Warning or Suspension)
   */
  moderationNotice: ({
    name = 'there',
    actionType = 'warning', // 'warning' | 'suspended'
    reason = 'Violation of community guidelines',
    until = null,
    supportUrl = `${env.clientUrl}/help`,
  }) => {
    const isSuspended = actionType === 'suspended';
    const subject = isSuspended
      ? `Important notice regarding your ${env.appName} account suspension`
      : `Community Guideline Notice from ${env.appName}`;

    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">
        ${isSuspended ? 'Account Suspended' : 'Moderator Warning'}
      </h2>
      <p>Hello ${name}, our moderation team has reviewed reported activity on your account.</p>
      <div class="callout" style="background-color: #fef2f2; border-color: #fecaca; color: #991b1b;">
        <strong>Reason:</strong> ${reason}<br>
        ${until ? `<strong>Duration:</strong> Active until ${until}<br>` : ''}
      </div>
      <p>Please review our Community Guidelines. If you believe this decision was made in error, you may contact our support team to submit an appeal.</p>
    `;

    const html = renderEmailLayout({
      title: subject,
      preheader: `Account notice from ${env.appName} moderation team`,
      contentHtml,
      actionUrl: supportUrl,
      actionText: 'Contact Support & Appeal',
      footerNote: 'ConnectX Trust and Safety Team.',
    });

    return {
      subject,
      html,
      text: htmlToPlainText(html),
    };
  },
};

export default emailTemplates;

