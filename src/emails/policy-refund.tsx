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

interface PolicyRefundEmailProps {
  customerName: string;
  policyNumber: string;
  refundAmount: number;
}

export const PolicyRefundEmail = ({
  customerName,
  policyNumber,
  refundAmount,
}: PolicyRefundEmailProps) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(refundAmount);

  return (
    <Html>
      <Head />
      <Preview>Refund Processed for Your Insurance Policy</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Refund Processed</Heading>
          
          <Text style={text}>Dear {customerName},</Text>
          
          <Text style={text}>
            We have processed the refund for your health insurance policy
            (Policy Number: {policyNumber}).
          </Text>

          <Section style={details}>
            <Text style={detailsTitle}>Refund Details:</Text>
            <Text style={detailsText}>Policy Number: {policyNumber}</Text>
            <Text style={detailsText}>Refund Amount: {formattedAmount}</Text>
            <Text style={detailsText}>
              The refund will be credited to your original payment method within 5-7 business days.
            </Text>
          </Section>

          <Text style={text}>
            Please note that your policy has been cancelled and is no longer active.
            If you wish to purchase a new policy in the future, you can visit our{' '}
            <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}`} style={link}>
              website
            </Link>
            .
          </Text>

          <Section style={helpSection}>
            <Text style={helpTitle}>Need Help?</Text>
            <Text style={text}>
              If you have any questions about your refund, please contact our support team:
            </Text>
            <Text style={detailsText}>• Email: support@healthinsurance.com</Text>
            <Text style={detailsText}>• Phone: 1800-XXX-XXXX (Toll Free)</Text>
            <Text style={detailsText}>• WhatsApp: +91 XXXXX XXXXX</Text>
          </Section>

          <Text style={text}>
            We value your trust and hope to serve you again in the future.
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
  padding: '24px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
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