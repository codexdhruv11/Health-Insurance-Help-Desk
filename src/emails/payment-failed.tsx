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

interface PaymentFailedEmailProps {
  customerName: string;
  policyNumber: string;
  retryLink: string;
}

export const PaymentFailedEmail = ({
  customerName,
  policyNumber,
  retryLink,
}: PaymentFailedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Payment Failed for Your Insurance Policy</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Failed</Heading>
          
          <Text style={text}>Dear {customerName},</Text>
          
          <Text style={text}>
            We regret to inform you that the payment for your health insurance policy
            (Policy Number: {policyNumber}) was not successful.
          </Text>

          <Section style={details}>
            <Text style={detailsTitle}>What Happened?</Text>
            <Text style={text}>
              The payment could not be processed due to one of the following reasons:
            </Text>
            <Text style={detailsText}>• Insufficient funds</Text>
            <Text style={detailsText}>• Card declined by bank</Text>
            <Text style={detailsText}>• Invalid card details</Text>
            <Text style={detailsText}>• Network or technical issues</Text>
          </Section>

          <Section style={actionSection}>
            <Text style={text}>
              Please click the button below to retry your payment and activate your policy:
            </Text>
            <Link href={retryLink} style={button}>
              Retry Payment
            </Link>
          </Section>

          <Text style={text}>
            If you continue to face issues, please contact our support team:
          </Text>

          <Section style={helpSection}>
            <Text style={detailsText}>• Email: support@healthinsurance.com</Text>
            <Text style={detailsText}>• Phone: 1800-XXX-XXXX (Toll Free)</Text>
            <Text style={detailsText}>• WhatsApp: +91 XXXXX XXXXX</Text>
          </Section>

          <Text style={text}>
            Please note that your policy will not be active until the payment is successfully processed.
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
  color: '#dc2626',
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
  backgroundColor: '#fef2f2',
  borderRadius: '6px',
};

const detailsTitle = {
  ...text,
  fontWeight: '600',
  margin: '0 0 16px',
  color: '#dc2626',
};

const detailsText = {
  ...text,
  margin: '8px 0',
};

const actionSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const helpSection = {
  margin: '24px 0',
  padding: '24px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
};

const signature = {
  ...text,
  borderTop: '1px solid #e5e7eb',
  marginTop: '32px',
  paddingTop: '32px',
}; 