'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { useQAEnvironment } from '@/contexts/QAEnvironmentContext';
import { useAuth } from '@/contexts/AuthContext';

interface QAEnvironmentSetupProps {
  onSetupComplete: () => void;
}

export default function QAEnvironmentSetup({ onSetupComplete }: QAEnvironmentSetupProps) {
  const { setQAEnvironment } = useQAEnvironment();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    userId: user?.user_id || '',
    os: '',
    device: '',
    version: ''
  });
  
  // 모바일 화면 감지 (768px 이하)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, userId: user.user_id }));
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.os) return;

    setLoading(true);
    
    const selectedUser = users.find(u => u.user_id === formData.userId);
    
    const qaEnvironment = {
      userId: formData.userId,
      userName: selectedUser?.user_name || '',
      env: {
        os: formData.os,
        device: formData.device,
        version: formData.version
      }
    };

    setQAEnvironment(qaEnvironment);
    onSetupComplete();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            QA 환경 설정
          </h1>
          <p className="text-slate-600">
            테스트 환경을 설정해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 테스터 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              테스터 <span className="text-red-500">*</span>
            </label>
            <select 
              className="w-full p-3 border border-slate-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.userId}
              onChange={(e) => handleInputChange('userId', e.target.value)}
              required
            >
              <option value="">테스터 선택</option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.user_name} ({user.role})
                </option>
              ))}
            </select>
          </div>

          {/* OS 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              OS <span className="text-red-500">*</span>
            </label>
            <select 
              className="w-full p-3 border border-slate-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.os}
              onChange={(e) => handleInputChange('os', e.target.value)}
              required
            >
              <option value="">OS 선택</option>
              <option value="iOS">iOS</option>
              <option value="Android">Android</option>
              <option value="Web">Web</option>
            </select>
          </div>

          {/* 기기명 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              기기명 (선택)
            </label>
            <input 
              type="text" 
              placeholder="예: iPhone 15, Galaxy S24, Chrome" 
              className="w-full p-3 border border-slate-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.device}
              onChange={(e) => handleInputChange('device', e.target.value)}
            />
          </div>

          {/* OS 버전 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              OS 버전 (선택)
            </label>
            <input 
              type="text" 
              placeholder="예: 18.0, 14.0, Latest" 
              className="w-full p-3 border border-slate-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.version}
              onChange={(e) => handleInputChange('version', e.target.value)}
            />
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={!formData.userId || !formData.os || loading}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '설정 중...' : '테스트 시작하기'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            이 설정은 세션 동안 유지되며, 언제든 변경할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}