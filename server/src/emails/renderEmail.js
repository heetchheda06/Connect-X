import { env } from '../config/env.js';

/**
 * Wraps email content into the signature ConnectX Ocean Light responsive layout.
 *
 * @param {object} options
 * @param {string} options.title - Header / Subject Title
 * @param {string} options.preheader - Preview snippet shown in email clients
 * @param {string} options.contentHtml - Main HTML markup for the body
 * @param {string} options.actionUrl - Optional primary call-to-action link
 * @param {string} options.actionText - Optional primary call-to-action button label
 * @param {string} options.footerNote - Optional extra note in the footer
 * @returns {string} Fully assembled responsive HTML
 */
export function renderEmailLayout({
  title,
  preheader = '',
  contentHtml,
  actionUrl = '',
  actionText = '',
  footerNote = "If you did not request this, you can safely ignore this email. Your ConnectX account remains secure.",
}) {
  const appName = env.appName || 'ConnectX';
  const supportEmail = env.supportEmail || 'support@connectx.local';
  const currentYear = new Date().getFullYear();

  const buttonHtml = actionUrl && actionText ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%); color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">
            ${actionText}
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f0fdf4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f8fafc;
      padding: 40px 16px;
    }
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      max-width: 580px;
      border-radius: 18px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
      padding: 28px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
    }
    .content {
      padding: 32px;
      line-height: 1.6;
      font-size: 15px;
      color: #334155;
    }
    .callout {
      background-color: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
      font-size: 14px;
      color: #0369a1;
    }
    .footer {
      padding: 24px 32px;
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer a {
      color: #0284c7;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${preheader}
  </div>
  <table class="wrapper" role="presentation" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table class="main" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td class="header">
              <h1>🌊 ${appName}</h1>
              <p>Real-Time Messaging & Collaboration</p>
            </td>
          </tr>
          <tr>
            <td class="content">
              ${contentHtml}
              ${buttonHtml}
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p style="margin: 0 0 10px 0;">${footerNote}</p>
              <p style="margin: 0;">
                Need help? Contact <a href="mailto:${supportEmail}">${supportEmail}</a><br>
                &copy; ${currentYear} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Strips HTML tags and collapses spaces for clean plain-text fallback.
 * @param {string} html
 * @returns {string}
 */
export function htmlToPlainText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}
