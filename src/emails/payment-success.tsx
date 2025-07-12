import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
} from '@react-email/components';

interface PaymentSuccessEmailProps {
  name: string;
  amount: number;
  policyNumber: string;
  planName: string;
}

export const PaymentSuccessEmail: React.FC<PaymentSuccessEmailProps> = ({
  name,
  amount,
  policyNumber,
  planName,
}) => (
  <Html>
    <Head />
    <Preview>Your payment was successful</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment Successful</Heading>
        <Text style={text}>Dear {name},</Text>
        <Text style={text}>
          Thank you for your payment. Your insurance policy is now active!
        </Text>
        
        <Section style={details}>
          <Text style={detailsHeader}>Payment Details:</Text>
          <Text style={detailsText}>Amount Paid: ${amount.toFixed(2)}</Text>
          <Text style={detailsText}>Policy Number: {policyNumber}</Text>
          <Text style={detailsText}>Plan: {planName}</Text>
        </Section>

        <Text style={text}>
          You can view your policy details and download your policy documents by logging into your account.
        </Text>
        
        <Text style={text}>
          If you have any questions about your policy, please don't hesitate to contact our support team.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.1',
  margin: '0 0 15px',
};

const text = {
  color: '#444',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 10px',
};

const details = {
  backgroundColor: '#f9f9f9',
  padding: '15px',
  borderRadius: '4px',
  margin: '20px 0',
};

const detailsHeader = {
  ...text,
  fontWeight: '600',
  margin: '0 0 15px',
};

const detailsText = {
  ...text,
  margin: '5px 0',
}; 