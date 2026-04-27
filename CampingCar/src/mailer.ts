import nodemailer from 'nodemailer';
import { RelocationOffer } from './types';

const RECIPIENT_EMAIL = 'kawaguchi8656@gmail.com';

export async function sendNotificationEmail(newOffers: RelocationOffer[]): Promise<boolean> {
  if (newOffers.length === 0) {
    console.log('[Mailer] No new offers to notify');
    return true;
  }
  
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  
  if (!gmailUser || !gmailPass) {
    console.error('[Mailer] Gmail credentials not found in environment variables (GMAIL_USER, GMAIL_PASS)');
    throw new Error('Gmail credentials missing');
  }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
  
  try {
    // Verify connection
    await transporter.verify();
    console.log('[Mailer] Gmail connection verified');
    
    // Format email body
    const emailBody = formatEmailBody(newOffers);
    
    const mailOptions = {
      from: gmailUser,
      to: RECIPIENT_EMAIL,
      subject: `🚐 新しいRelocation Specialsが見つかりました (${newOffers.length}件)`,
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

function formatEmailBody(offers: RelocationOffer[]): string {
  const offersBySource = groupOffersBySource(offers);
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .source { margin-top: 20px; padding: 15px; background-color: white; border-left: 4px solid #007bff; }
    .source-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #007bff; }
    .offer { margin: 15px 0; padding: 10px; background-color: #f0f0f0; border-radius: 3px; }
    .offer-title { font-weight: bold; color: #1a5276; margin-bottom: 5px; }
    .offer-detail { margin-left: 10px; font-size: 14px; }
    .offer-detail-label { font-weight: 500; color: #555; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">🚐 新しいRelocation Specialsが見つかりました</h2>
      <p style="margin: 10px 0 0 0;">合計 ${offers.length} 件の新規募集です</p>
    </div>
    <div class="content">
`;
  
  for (const [source, sourceOffers] of Object.entries(offersBySource)) {
    const sourceName = source === 'canadream' ? 'Canadream' : 'FraserWay';
    html += `
      <div class="source">
        <div class="source-title">📍 ${sourceName} (${sourceOffers.length}件)</div>
`;
    
    sourceOffers.forEach((offer, index) => {
      html += `
        <div class="offer">
          <div class="offer-title">${index + 1}. ${offer.departure} → ${offer.destination}</div>
          <div class="offer-detail">
            <div><span class="offer-detail-label">期間:</span> ${offer.startDate} 〜 ${offer.endDate}</div>
            <div><span class="offer-detail-label">料金:</span> ${offer.price}</div>
            <div><span class="offer-detail-label">車両:</span> ${offer.vehicleInfo}</div>
            <div><span class="offer-detail-label">スクレイプ時刻:</span> ${new Date(offer.scrapedAt).toLocaleString('ja-JP')}</div>
          </div>
        </div>
`;
    });
    
    html += `
      </div>
`;
  }
  
  html += `
      <div class="footer">
        <p>このメールは自動生成されています。返信不可</p>
        <p>監視システム: Relocation Specials Monitor (GitHub Actions)</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  
  return html;
}

function groupOffersBySource(offers: RelocationOffer[]): { [key: string]: RelocationOffer[] } {
  return offers.reduce((acc, offer) => {
    if (!acc[offer.source]) {
      acc[offer.source] = [];
    }
    acc[offer.source].push(offer);
    return acc;
  }, {} as { [key: string]: RelocationOffer[] });
}
