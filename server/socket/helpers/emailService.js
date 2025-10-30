import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

export async function sendFeedbackEmail(feedback, userIP) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('Email not configured. Feedback:', feedback);
    return;
  }

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: 'Omegle Web - New User Feedback',
    html: `
      <h2>New Feedback Received</h2>
      <p><strong>From IP:</strong> ${userIP}</p>
      <p><strong>Feedback:</strong></p>
      <p>${feedback}</p>
      <p><em>Sent at: ${new Date().toLocaleString()}</em></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Feedback email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

export async function sendReportEmail(reportedIP, reportReason, reportCount) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('Email not configured. Report:', reportReason);
    return;
  }

  const status = reportCount >= 4 ? 'BLOCKED' : 'REPORTED';
  
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `Omegle Web - User ${status}`,
    html: `
      <h2>User Report Alert</h2>
      <p><strong>Reported IP:</strong> ${reportedIP}</p>
      <p><strong>Report Reason:</strong> ${reportReason}</p>
      <p><strong>Total Reports:</strong> ${reportCount}</p>
      <p><strong>Status:</strong> ${status}</p>
      ${reportCount >= 4 ? '<p style="color: red;"><strong>⚠️ This IP has been automatically blocked!</strong></p>' : ''}
      <p><em>Report time: ${new Date().toLocaleString()}</em></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Report email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
