import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendAnalysisCompleteEmail(
  to: string,
  conversationId: string,
  analysisUrl: string
) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: '会話分析が完了しました',
    html: `
      <h2>会話分析完了のお知らせ</h2>
      <p>お待たせいたしました。会話分析が完了しました。</p>
      <p>以下のリンクから結果をご確認ください。</p>
      <p>
        <a href="${analysisUrl}" 
           style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">
          分析結果を確認する
        </a>
      </p>
      <p>※このメールは自動送信されています。</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        会話分析・評価システム<br>
        Conversation Analysis API
      </p>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('Email sent successfully to:', to)
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}