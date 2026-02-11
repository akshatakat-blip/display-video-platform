'use client';

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: Array<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ label: string; value: string }>;
  }>;
}

export default function FilterBar({ searchValue, onSearchChange, filters }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {onSearchChange && (
        <input
          type="text"
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      )}
      {filters?.map((filter, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <label className="text-xs text-slate-600">{filter.label}:</label>
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
