import { PDFDocument, rgb } from 'pdf-lib';
import { format } from 'date-fns';

export async function generatePolicyPDF(policy: any): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points

  const { width, height } = page.getSize();
  const fontSize = 12;
  const lineHeight = fontSize * 1.2;

  // Add content
  page.drawText('Health Insurance Policy Certificate', {
    x: 50,
    y: height - 50,
    size: 20,
    color: rgb(0, 0, 0),
  });

  // Policy details
  let y = height - 100;
  const drawLine = (label: string, value: string) => {
    page.drawText(label, {
      x: 50,
      y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    page.drawText(value, {
      x: 200,
      y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  };

  drawLine('Policy Number:', policy.policyNumber);
  drawLine('Status:', policy.status);
  drawLine('Effective Date:', format(new Date(policy.effectiveDate), 'dd/MM/yyyy'));
  drawLine('Expiry Date:', format(new Date(policy.expiryDate), 'dd/MM/yyyy'));
  drawLine('Plan Name:', policy.plan.name);
  drawLine('Insurer:', policy.plan.insurer.name);

  // Customer details
  y -= lineHeight * 2;
  page.drawText('Policyholder Details', {
    x: 50,
    y,
    size: 16,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight;

  drawLine('Name:', `${policy.customer.firstName} ${policy.customer.lastName}`);
  drawLine('Email:', policy.customer.user.email);
  drawLine('Phone:', policy.customer.phone || 'N/A');
  drawLine('Address:', policy.customer.address || 'N/A');

  // Convert to Buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
} 