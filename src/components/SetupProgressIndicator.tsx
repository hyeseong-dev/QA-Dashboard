'use client';

interface SetupProgressIndicatorProps {
  projectId: string;
  userId: string;
  os: string;
  device: string;
}

export default function SetupProgressIndicator({ 
  projectId, 
  userId, 
  os, 
  device 
}: SetupProgressIndicatorProps) {
  const requirements = [
    { key: 'project', value: projectId, label: '프로젝트', icon: '📋' },
    { key: 'tester', value: userId, label: '테스터', icon: '👤' },
    { key: 'os', value: os, label: 'OS 환경', icon: '💻' },
  ];

  const completedCount = requirements.filter(req => req.value).length;
  const progress = (completedCount / requirements.length) * 100;

  const getStatusColor = (isComplete: boolean) => {
    if (isComplete) return 'text-green-600 bg-green-50';
    return 'text-orange-600 bg-orange-50';
  };

  const getProgressColor = () => {
    if (completedCount === requirements.length) return 'bg-green-500';
    if (completedCount > 0) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          QA 환경 설정 진행률
        </h3>
        <span className="text-sm font-medium text-gray-600">
          {completedCount}/{requirements.length} 완료
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Requirements Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {requirements.map((req) => (
          <div 
            key={req.key}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              req.value 
                ? 'border-green-200 bg-green-50' 
                : 'border-orange-200 bg-orange-50'
            }`}
          >
            <span className="text-lg">{req.icon}</span>
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">
                {req.label}
              </span>
              {req.value ? (
                <span className="ml-2 text-xs text-green-600">✓</span>
              ) : (
                <span className="ml-2 text-xs text-orange-600">필수</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Status Message */}
      {completedCount < requirements.length && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">다음 단계:</span> 
            {completedCount === 0 && " 테스터를 선택하여 시작하세요"}
            {completedCount === 1 && " OS 환경을 선택하세요"}
            {completedCount === 2 && " 설정 완료! 테스트를 시작할 수 있습니다"}
          </p>
        </div>
      )}

      {completedCount === requirements.length && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <span className="font-medium">✅ 설정 완료!</span> 
            모든 테스트 기능을 사용할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}