'use client';

import { useState } from 'react';

interface ProjectCreateProps {
  onBack: () => void;
  onProjectCreated: (projectId: string) => void;
}

interface ProjectFormData {
  project_id: string;
  project_name: string;
  description: string;
  status: 'Active' | 'Archived';
}

export default function ProjectCreate({ onBack, onProjectCreated }: ProjectCreateProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    project_id: '',
    project_name: '',
    description: '',
    status: 'Active'
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Project ID 검증
    if (!formData.project_id.trim()) {
      newErrors.project_id = '프로젝트 ID는 필수입니다.';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.project_id)) {
      newErrors.project_id = '프로젝트 ID는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능합니다.';
    } else if (formData.project_id.length > 50) {
      newErrors.project_id = '프로젝트 ID는 50자를 초과할 수 없습니다.';
    }

    // Project Name 검증
    if (!formData.project_name.trim()) {
      newErrors.project_name = '프로젝트 이름은 필수입니다.';
    } else if (formData.project_name.length > 100) {
      newErrors.project_name = '프로젝트 이름은 100자를 초과할 수 없습니다.';
    }

    // Description 검증 (선택사항이지만 길이 제한)
    if (formData.description.length > 1000) {
      newErrors.description = '설명은 1000자를 초과할 수 없습니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const createdProject = await response.json();
        onProjectCreated(createdProject.project_id);
      } else {
        const errorData = await response.json();
        if (response.status === 409) {
          setErrors({ project_id: '이미 존재하는 프로젝트 ID입니다.' });
        } else {
          setErrors({ submit: errorData.error || '프로젝트 생성에 실패했습니다.' });
        }
      }
    } catch (error) {
      setErrors({ submit: '서버 연결에 실패했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 입력 시 해당 필드의 에러 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generateProjectId = () => {
    const name = formData.project_name.trim();
    if (name) {
      // 프로젝트 이름을 기반으로 ID 생성
      const id = name
        .toLowerCase()
        .replace(/[^a-zA-Z0-9가-힣\s]/g, '') // 특수문자 제거
        .replace(/\s+/g, '-') // 공백을 하이픈으로
        .replace(/[가-힣]/g, match => {
          // 한글을 영문으로 간단 변환 (예시)
          const korean = '가나다라마바사아자차카타파하';
          const english = 'gnadramabasaajachkatapaha';
          const index = korean.indexOf(match);
          return index !== -1 ? english[index] : match;
        })
        .substring(0, 30); // 길이 제한
      
      setFormData(prev => ({ ...prev, project_id: id }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="container mx-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <span>←</span>
              프로젝트 목록으로 돌아가기
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
            <header className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                새 프로젝트 생성
              </h1>
              <p className="text-slate-600">
                QA 작업을 위한 새로운 프로젝트를 설정하세요.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 프로젝트 이름 */}
              <div>
                <label htmlFor="project_name" className="block text-sm font-semibold text-slate-700 mb-2">
                  프로젝트 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e) => handleInputChange('project_name', e.target.value)}
                  onBlur={generateProjectId}
                  className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.project_name ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="예: 모바일 앱 v2.0"
                  disabled={isSubmitting}
                />
                {errors.project_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.project_name}</p>
                )}
              </div>

              {/* 프로젝트 ID */}
              <div>
                <label htmlFor="project_id" className="block text-sm font-semibold text-slate-700 mb-2">
                  프로젝트 ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="project_id"
                  value={formData.project_id}
                  onChange={(e) => handleInputChange('project_id', e.target.value)}
                  className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.project_id ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="예: mobile-app-v2"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-slate-500">
                  영문, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능. 최대 50자
                </p>
                {errors.project_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>
                )}
              </div>

              {/* 설명 */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                  프로젝트 설명
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.description ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="프로젝트에 대한 상세 설명을 입력하세요."
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {formData.description.length}/1000자
                </p>
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* 상태 */}
              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-slate-700 mb-2">
                  프로젝트 상태
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as 'Active' | 'Archived')}
                  className="w-full p-3 border border-slate-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="Active">활성</option>
                  <option value="Archived">보관됨</option>
                </select>
              </div>

              {/* 에러 메시지 */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      생성 중...
                    </span>
                  ) : (
                    '프로젝트 생성'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}