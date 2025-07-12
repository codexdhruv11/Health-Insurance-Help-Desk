import React from 'react';

interface FilterSidebarProps {
  filters: {
    planType: string[];
    coverageAmount: { min: number; max: number };
    premium: { min: number; max: number };
    insurer: string[];
  };
  onFilterChange: (filters: any) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFilterChange }) => {
  const handlePlanTypeChange = (planType: string) => {
    const updatedPlanTypes = filters.planType.includes(planType)
      ? filters.planType.filter(type => type !== planType)
      : [...filters.planType, planType];
    
    onFilterChange({
      ...filters,
      planType: updatedPlanTypes,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Filter Plans</h3>
      
      <div className="mb-6">
        <h4 className="font-medium mb-2">Plan Type</h4>
        <div className="space-y-2">
          {['Individual', 'Family', 'Senior Citizen', 'Critical Illness'].map(type => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.planType.includes(type)}
                onChange={() => handlePlanTypeChange(type)}
                className="mr-2"
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-medium mb-2">Coverage Amount</h4>
        <div className="space-y-2">
          <label>
            Min: ₹
            <input
              type="number"
              value={filters.coverageAmount.min}
              onChange={(e) => onFilterChange({
                ...filters,
                coverageAmount: { ...filters.coverageAmount, min: Number(e.target.value) }
              })}
              className="ml-2 border rounded px-2 py-1 w-20"
            />
          </label>
          <label>
            Max: ₹
            <input
              type="number"
              value={filters.coverageAmount.max}
              onChange={(e) => onFilterChange({
                ...filters,
                coverageAmount: { ...filters.coverageAmount, max: Number(e.target.value) }
              })}
              className="ml-2 border rounded px-2 py-1 w-20"
            />
          </label>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-medium mb-2">Premium Range</h4>
        <div className="space-y-2">
          <label>
            Min: ₹
            <input
              type="number"
              value={filters.premium.min}
              onChange={(e) => onFilterChange({
                ...filters,
                premium: { ...filters.premium, min: Number(e.target.value) }
              })}
              className="ml-2 border rounded px-2 py-1 w-20"
            />
          </label>
          <label>
            Max: ₹
            <input
              type="number"
              value={filters.premium.max}
              onChange={(e) => onFilterChange({
                ...filters,
                premium: { ...filters.premium, max: Number(e.target.value) }
              })}
              className="ml-2 border rounded px-2 py-1 w-20"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
