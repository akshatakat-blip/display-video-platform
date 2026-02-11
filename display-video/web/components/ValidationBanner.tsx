import { ProblemDetails } from '@/lib/types';

interface ValidationBannerProps {
  problemDetails: ProblemDetails | null;
  onDismiss?: () => void;
}

export default function ValidationBanner({ problemDetails, onDismiss }: ValidationBannerProps) {
  if (!problemDetails) return null;

  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xs font-medium text-red-900 mb-1">
            {problemDetails.title}
          </h3>
          <p className="text-xs text-red-800 mb-2">{problemDetails.detail}</p>
          {problemDetails.errors && problemDetails.errors.length > 0 && (
            <ul className="space-y-1">
              {problemDetails.errors.map((error, idx) => (
                <li key={idx} className="text-xs text-red-700">
                  <span className="font-medium">{error.field}:</span> {error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 text-red-400 hover:text-red-600"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
