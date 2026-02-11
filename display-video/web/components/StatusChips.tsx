interface StatusChipsProps {
  userStatus?: string;
  servingStatus?: string;
  lifecycleStatus?: string;
}

export default function StatusChips({ userStatus, servingStatus, lifecycleStatus }: StatusChipsProps) {
  const getStatusColor = (status: string, type: 'user' | 'serving' | 'lifecycle') => {
    if (type === 'user') {
      if (status === 'ACTIVE') return 'bg-green-100 text-green-800';
      if (status === 'PAUSED') return 'bg-yellow-100 text-yellow-800';
      if (status === 'ARCHIVED') return 'bg-slate-100 text-slate-800';
    }
    if (type === 'serving') {
      if (status === 'ELIGIBLE') return 'bg-blue-100 text-blue-800';
      if (status === 'NOT_ELIGIBLE') return 'bg-red-100 text-red-800';
      if (status === 'PENDING') return 'bg-orange-100 text-orange-800';
    }
    if (type === 'lifecycle') {
      if (status === 'ACTIVE') return 'bg-green-100 text-green-800';
      if (status === 'ENDED') return 'bg-slate-100 text-slate-800';
      if (status === 'SCHEDULED') return 'bg-purple-100 text-purple-800';
    }
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="flex items-center gap-1.5">
      {userStatus && (
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(userStatus, 'user')}`}>
          {userStatus}
        </span>
      )}
      {servingStatus && (
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(servingStatus, 'serving')}`}>
          {servingStatus}
        </span>
      )}
      {lifecycleStatus && (
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(lifecycleStatus, 'lifecycle')}`}>
          {lifecycleStatus}
        </span>
      )}
    </div>
  );
}
