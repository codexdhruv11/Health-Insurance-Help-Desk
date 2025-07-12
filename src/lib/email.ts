import nodemailer from 'nodemailer';
import { WelcomeEmail } from '@/emails/welcome';
import { PaymentSuccessEmail } from '@/emails/payment-success';
import { renderEmailTemplate } from './email-renderer';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templates = {
  welcome: {
    subject: 'Welcome to Health Insurance Help Desk',
    component: WelcomeEmail,
  },
  paymentSuccess: {
    subject: 'Payment Successful',
    component: PaymentSuccessEmail,
  },
} as const;

export type EmailTemplate = keyof typeof templates;

export async function sendEmail(
  to: string,
  templateName: EmailTemplate,
  data: Record<string, any>
) {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  const html = await renderEmailTemplate(template.component, data);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: template.subject,
    html,
  });
}