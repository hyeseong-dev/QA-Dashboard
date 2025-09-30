'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/types';

interface TestCaseCreatorProps {
  projectId: string;
  onTestCaseCreated: () => void;
}

export default function TestCaseCreator({ projectId, onTestCaseCreated }: TestCaseCreatorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    category_id: '',
    item: '',
    steps: '',
    expected: '',
    priority: 'Mid' as 'High' | 'Mid' | 'Low'
  });

  useEffect(() => {
    loadCategories();
  }, [projectId]);

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || !formData.item.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: parseInt(formData.category_id),
          item: formData.item.trim(),
          steps: formData.steps.trim() || undefined,
          expected: formData.expected.trim() || undefined,
          priority: formData.priority
        })
      });

      if (response.ok) {
        setFormData({
          category_id: '',
          item: '',
          steps: '',
          expected: '',
          priority: 'Mid'
        });
        onTestCaseCreated();
        setIsExpanded(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create test case');
      }
    } catch (error) {
      console.error('Error creating test case:', error);
      alert('Failed to create test case');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-lg font-semibold text-slate-800">
          새 테스트 케이스 추가
        </h3>
        <span className="text-slate-500">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Category and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleInputChange('category_id', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm text-black"
                required
              >
                <option value="">카테고리 선택</option>
                {categories.map(category => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  먼저 카테고리를 생성해주세요
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                우선순위
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm text-black"
              >
                <option value="High">높음</option>
                <option value="Mid">보통</option>
                <option value="Low">낮음</option>
              </select>
            </div>
          </div>

          {/* Test Item */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              테스트 항목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.item}
              onChange={(e) => handleInputChange('item', e.target.value)}
              placeholder="예: 로그인 기능 테스트"
              className="w-full p-2 border border-slate-300 rounded-lg text-sm text-black"
              required
            />
          </div>

          {/* Test Steps */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              테스트 절차 (선택)
            </label>
            <textarea
              value={formData.steps}
              onChange={(e) => handleInputChange('steps', e.target.value)}
              placeholder="1. 로그인 페이지 접속&#10;2. 유효한 계정 정보 입력&#10;3. 로그인 버튼 클릭"
              className="w-full p-2 border border-slate-300 rounded-lg text-sm text-black"
              rows={3}
            />
          </div>

          {/* Expected Result */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              예상 결과 (선택)
            </label>
            <textarea
              value={formData.expected}
              onChange={(e) => handleInputChange('expected', e.target.value)}
              placeholder="성공적으로 로그인되어 대시보드 페이지로 이동"
              className="w-full p-2 border border-slate-300 rounded-lg text-sm text-black"
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!formData.category_id || !formData.item.trim() || isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '생성 중...' : '테스트 케이스 생성'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}