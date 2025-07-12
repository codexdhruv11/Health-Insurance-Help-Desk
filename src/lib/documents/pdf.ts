import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PolicyDocument } from './policy-document';

export async function generatePolicyPDF(policy: any) {
  // Import PDF components dynamically to avoid SSR issues
  const { pdf } = await import('@react-pdf/renderer');
  return pdf(React.createElement(PolicyDocument, { policy })).toBuffer();
}
