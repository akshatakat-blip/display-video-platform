'use client';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </>
  );
}
