import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface PolicyWelcomeEmailProps {
  customerName: string;
  policyNumber: string;
  planName: string;
  insurerName: string;
  effectiveDate: Date;
  coverageAmount: number;
}

export const PolicyWelcomeEmail = ({
  customerName,
  policyNumber,
  planName,
  insurerName,
  effectiveDate,
  coverageAmount,
}: PolicyWelcomeEmailProps) => {
  const formattedDate = new Date(effectiveDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(coverageAmount);

  return (
    <Html>
      <Head />
      <Preview>Welcome to your new health insurance policy</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Your Health Insurance Policy</Heading>
          
          <Text style={text}>Dear {customerName},</Text>
          
          <Text style={text}>
            Thank you for choosing us for your health insurance needs. Your policy is now active
            and ready to provide you with comprehensive health coverage.
          </Text>

          <Section style={details}>
            <Text style={detailsTitle}>Policy Details:</Text>
            <Text style={detailsText}>Policy Number: {policyNumber}</Text>
            <Text style={detailsText}>Plan: {planName}</Text>
            <Text style={detailsText}>Insurer: {insurerName}</Text>
            <Text style={detailsText}>Effective Date: {formattedDate}</Text>
            <Text style={detailsText}>Coverage Amount: {formattedAmount}</Text>
          </Section>

          <Text style={text}>
            Your policy documents are attached to this email. Please keep them safe for future reference.
          </Text>

          <Text style={text}>
            To access your policy details, claims information, and our network of hospitals,
            please visit your{' '}
            <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/customer/dashboard`} style={link}>
              customer dashboard
            </Link>
            .
          </Text>

          <Section style={helpSection}>
            <Text style={helpTitle}>Need Help?</Text>
            <Text style={text}>
              Our customer support team is available 24/7 to assist you:
            </Text>
            <Text style={detailsText}>• Email: support@healthinsurance.com</Text>
            <Text style={detailsText}>• Phone: 1800-XXX-XXXX (Toll Free)</Text>
            <Text style={detailsText}>• WhatsApp: +91 XXXXX XXXXX</Text>
          </Section>

          <Text style={text}>
            Thank you for trusting us with your health insurance needs.
          </Text>

          <Text style={signature}>
            Best regards,<br />
            The Health Insurance Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.1',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const details = {
  margin: '24px 0',
  padding: '24px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
};

const detailsTitle = {
  ...text,
  fontWeight: '600',
  margin: '0 0 16px',
};

const detailsText = {
  ...text,
  margin: '8px 0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const helpSection = {
  margin: '32px 0',
};

const helpTitle = {
  ...text,
  fontSize: '18px',
  fontWeight: '600',
};

const signature = {
  ...text,
  borderTop: '1px solid #e5e7eb',
  marginTop: '32px',
  paddingTop: '32px',
}; 