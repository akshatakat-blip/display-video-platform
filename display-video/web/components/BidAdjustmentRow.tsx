'use client';

/** Single row for Bid Adjustments: targeting input (flex) | Increase/Decrease dropdown (fixed) | % input (fixed). */
export default function BidAdjustmentRow({
  label,
  inputValue,
  onInputChange,
  typeValue,
  onTypeChange,
  pctValue,
  onPctChange,
}: {
  label: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  typeValue: 'increase' | 'decrease';
  onTypeChange: (value: 'increase' | 'decrease') => void;
  pctValue: string;
  onPctChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_100px_72px] gap-2 items-end">
      <div>
        <label className="block text-slate-600 mb-0.5 text-xs">{label}</label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded text-xs h-[34px] box-border"
        />
      </div>
      <div>
        <label className="block text-slate-600 mb-0.5 text-xs opacity-0 select-none">Type</label>
        <select
          value={typeValue}
          onChange={(e) => onTypeChange(e.target.value as 'increase' | 'decrease')}
          className="w-full px-2 py-2 border border-slate-300 rounded text-xs h-[34px]"
        >
          <option value="increase">Increase</option>
          <option value="decrease">Decrease</option>
        </select>
      </div>
      <div>
        <label className="block text-slate-600 mb-0.5 text-xs opacity-0 select-none">%</label>
        <div className="flex items-center gap-0.5 h-[34px] border border-slate-300 rounded px-2 box-border">
          <input
            type="text"
            inputMode="numeric"
            value={pctValue}
            onChange={(e) => onPctChange(e.target.value)}
            className="flex-1 min-w-0 border-0 p-0 text-xs h-full bg-transparent focus:ring-0 focus:outline-none"
          />
          <span className="text-xs text-slate-600 shrink-0">%</span>
        </div>
      </div>
    </div>
  );
}
