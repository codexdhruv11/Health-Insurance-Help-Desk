import React from 'react';

interface ComparisonTableProps {
  plans: Array<{
    id: string;
    name: string;
    insurerName: string;
    coverageAmount: number;
    planType: string;
    features: string[];
  }>;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ plans }) => {
  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th>Plan Name</th>
          <th>Insurer</th>
          <th>Coverage Amount</th>
          <th>Type</th>
          <th>Features</th>
        </tr>
      </thead>
      <tbody>
        {plans.map(plan => (
          <tr key={plan.id}>
            <td>{plan.name}</td>
            <td>{plan.insurerName}</td>
            <td>₹{plan.coverageAmount}</td>
            <td>{plan.planType}</td>
            <td>{plan.features.join(', ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ComparisonTable;

