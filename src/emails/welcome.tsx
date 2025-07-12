import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
  policyNumber?: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  name,
  policyNumber,
}) => (
  <Html>
    <Head />
    <Preview>Welcome to Health Insurance Help Desk</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Health Insurance Help Desk!</Heading>
        <Text style={text}>Dear {name},</Text>
        <Text style={text}>
          Thank you for choosing Health Insurance Help Desk. We're excited to have you on board!
        </Text>
        {policyNumber && (
          <Text style={text}>
            Your policy number is: <strong>{policyNumber}</strong>
          </Text>
        )}
        <Text style={text}>
          If you have any questions or need assistance, our support team is here to help.
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