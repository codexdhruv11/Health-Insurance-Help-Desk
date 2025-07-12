export async function generatePolicyPDF(policy: any): Promise<Buffer> {
  // For now, return a simple placeholder buffer to unblock the build
  // This should be replaced with actual PDF generation logic
  const placeholderPDF = Buffer.from(`Policy Document
  
  Policy Number: ${policy.policyNumber}
  Policyholder: ${policy.customer.firstName} ${policy.customer.lastName}
  Plan: ${policy.plan.name}
  Status: ${policy.status}
  
  This is a placeholder PDF document.`);
  
  return placeholderPDF;
}
