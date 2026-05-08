import nodemailer from 'nodemailer';
import { FlightOffer } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

export async function sendNotificationEmail(newOffers: FlightOffer[]): Promise<boolean> {
  if (newOffers.length === 0) {
    console.log('[Mailer] No new offers to notify');
    return true;
  }
  
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const recipientEmail = process.env.RECIPIENT_EMAIL;
  
  if (!gmailUser || !gmailPass || !recipientEmail) {
    console.error('[Mailer] Required environment variables (GMAIL_USER, GMAIL_PASS, RECIPIENT_EMAIL) not found');
    return false;
  }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
  
  try {
    await transporter.verify();
    console.log('[Mailer] Gmail connection verified');
    
    const emailBody = formatEmailBody(newOffers);
    
    const mailOptions = {
      from: gmailUser,
      to: recipientEmail,
      subject: `✈️ ZipAir 2026年8月 空き状況更新 (${newOffers.length}件の日付に空き)`,
      html: emailBody,
      text: emailBody.replace(/<[^>]*>/g, ''),
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Email sent successfully. Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('[Mailer] Error sending email:', error);
    throw error;
  }
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatEmailBody(offers: FlightOffer[]): string {
  let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .offer { margin: 15px 0; padding: 10px; background-color: white; border-radius: 3px; border-left: 4px solid #27ae60; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .offer-title { font-weight: bold; color: #2c3e50; margin-bottom: 5px; font-size: 16px; }
    .offer-detail { margin-left: 10px; font-size: 14px; }
    .offer-detail-label { font-weight: 500; color: #555; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
    .cta { margin-top: 20px; text-align: center; }
    .btn { background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">✈️ ZipAir 空き状況通知 (2026年8月)</h2>
      <p style="margin: 10px 0 0 0;">東京(NRT) → バンクーバー(YVR)</p>
    </div>
    <div class="content">
      <p>以下の日付でStandardフライトの空きが見つかりました。</p>
`;
  
  offers.forEach((offer) => {
    html += `
      <div class="offer">
        <div class="offer-title">${escapeHtml(offer.date)}</div>
        <div class="offer-detail">
          <div><span class="offer-detail-label">価格:</span> ${escapeHtml(offer.price)} ${escapeHtml(offer.currency)}</div>
        </div>
      </div>
`;
  });
  
  html += `
      <div class="cta">
        <a href="https://www.zipair.net/en" class="btn">ZipAir公式サイトで予約する</a>
      </div>
      <div class="footer">
        <p>このメールは自動生成されています。返信不可</p>
        <p>監視システム: ZipAir Monitor (GitHub Actions)</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  
  return html;
}
