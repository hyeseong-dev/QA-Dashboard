'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface User {
  user_id: string;
  user_name: string;
  email: string;
  role: 'Admin' | 'Tester';
  department?: string;
  position?: string;
  phone?: string;
  profile_image?: string;
  is_online?: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'Admin' | 'Tester'>('all');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // 온라인 상태만 업데이트하는 함수
  const updateOnlineStatus = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token || users.length === 0) return;
    
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const newData = await response.json();
        // 온라인 상태만 업데이트
        setUsers(prevUsers => 
          prevUsers.map(user => {
            const updatedUser = newData.find((u: User) => u.user_id === user.user_id);
            return updatedUser ? { ...user, is_online: updatedUser.is_online } : user;
          })
        );
      }
    } catch (err) {
      // 온라인 상태 업데이트 실패는 조용히 무시
      console.error('Failed to update online status:', err);
    }
  };

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) {
      return;
    }
    
    // 관리자 권한 체크
    if (!user) {
      router.push('/');
      return;
    }
    
    if (user.role !== 'Admin') {
      alert('관리자만 접근 가능합니다.');
      router.push('/');
      return;
    }

    // 초기 로드가 아직 안 되었을 때만 로드
    if (!initialLoadDone) {
      loadUsers();
      setInitialLoadDone(true);
    }
  }, [user, authLoading, router, initialLoadDone]);

  // 주기적 온라인 상태 업데이트 (실시간 기능 대체)
  useEffect(() => {
    if (!user || !initialLoadDone) return;
    
    // 30초마다 온라인 상태 업데이트
    const interval = setInterval(updateOnlineStatus, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user, initialLoadDone]);

  const loadUsers = async () => {
    try {
      // 초기 로드시에만 로딩 상태 설정
      if (!initialLoadDone) {
        setLoading(true);
      }
      
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setError(null); // 성공 시 에러 상태 초기화
      } else {
        const errorData = await response.json();
        setError(errorData.error || '사용자 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      if (!initialLoadDone) {
        setLoading(false);
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 초기 인증 체크 중이거나 첫 로딩 중일 때만 로딩 화면 표시
  if (authLoading || (loading && !initialLoadDone)) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">
            {authLoading ? '인증 확인 중...' : '사용자 목록을 불러오는 중...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">오류 발생</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-slate-900">
                👥 사용자 관리
              </h1>
              {/* 데이터 업데이트 정보 */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-500">
                  정기 업데이트 (30초)
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600"
            >
              ← 프로젝트 목록
            </button>
          </div>
          <p className="text-slate-600">
            등록된 사용자를 확인하고 관리할 수 있습니다.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                🔍 검색
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="이름, 이메일, ID로 검색..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                👤 역할 필터
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as typeof filterRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체</option>
                <option value="Admin">관리자</option>
                <option value="Tester">테스터</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">👥</span>
              </div>
              <div>
                <p className="text-sm text-slate-500">전체 사용자</p>
                <p className="text-xl font-bold text-slate-900">{users.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">🟢</span>
              </div>
              <div>
                <p className="text-sm text-slate-500">온라인</p>
                <p className="text-xl font-bold text-slate-900">
                  {users.filter(u => u.is_online).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">👔</span>
              </div>
              <div>
                <p className="text-sm text-slate-500">관리자</p>
                <p className="text-xl font-bold text-slate-900">
                  {users.filter(u => u.role === 'Admin').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                <span className="text-cyan-600 font-bold">🧪</span>
              </div>
              <div>
                <p className="text-sm text-slate-500">테스터</p>
                <p className="text-xl font-bold text-slate-900">
                  {users.filter(u => u.role === 'Tester').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    사용자 ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    가입일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          user.is_online ? 'bg-green-500' : 'bg-gray-300'
                        }`} title={user.is_online ? '온라인' : '오프라인'} />
                        <div className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                          {user.user_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {user.user_name}
                        </div>
                        {(user.department || user.position) && (
                          <div className="text-xs text-slate-500">
                            {user.department && <span>{user.department}</span>}
                            {user.department && user.position && <span> · </span>}
                            {user.position && <span>{user.position}</span>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-slate-600">
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="text-xs text-slate-500">
                            📞 {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'Admin' ? '👔 관리자' : '🧪 테스터'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-slate-600">
                          {user.created_at ? formatDate(user.created_at) : '-'}
                        </div>
                        {user.last_login_at && (
                          <div className="text-xs text-slate-500">
                            마지막 로그인: {formatDate(user.last_login_at)}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <div className="text-slate-400 text-4xl mb-4">🔍</div>
                <p className="text-slate-600">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}