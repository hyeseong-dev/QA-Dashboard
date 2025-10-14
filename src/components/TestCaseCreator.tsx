'use client';

import { useState, useEffect } from 'react';
import { Category, TestCase } from '@/types';

interface TestCaseCreatorProps {
  projectId: string;
  onTestCaseCreated: () => void;
  refreshKey?: number;
}

export default function TestCaseCreator({ projectId, onTestCaseCreated, refreshKey }: TestCaseCreatorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    category_id: '',
    item: '',
    steps: '',
    expected: '',
    priority: 'Mid' as 'High' | 'Mid' | 'Low',
    parent_id: '',
    case_id: '',
    use_auto_case_id: true
  });
  
  const [caseIdValidation, setCaseIdValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    isValidating: false,
    isValid: null,
    message: ''
  });

  useEffect(() => {
    loadCategories();
    loadTestCases();
  }, [projectId, refreshKey]);

  // Debounced case ID validation
  useEffect(() => {
    if (!formData.use_auto_case_id && formData.case_id.trim()) {
      const timeoutId = setTimeout(() => {
        validateCaseId(formData.case_id.trim());
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setCaseIdValidation({
        isValidating: false,
        isValid: null,
        message: ''
      });
    }
  }, [formData.case_id, formData.use_auto_case_id, projectId]);

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

  const loadTestCases = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/cases`);
      if (response.ok) {
        const data = await response.json();
        setTestCases(data);
      }
    } catch (error) {
      console.error('Error loading test cases:', error);
    }
  };

  const validateCaseId = async (caseId: string) => {
    setCaseIdValidation({
      isValidating: true,
      isValid: null,
      message: 'Validating...'
    });

    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases/validate-case-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId })
      });

      if (response.ok) {
        const result = await response.json();
        setCaseIdValidation({
          isValidating: false,
          isValid: result.valid,
          message: result.valid ? result.message : result.error
        });
      } else {
        setCaseIdValidation({
          isValidating: false,
          isValid: false,
          message: 'Validation failed'
        });
      }
    } catch (error) {
      console.error('Error validating case ID:', error);
      setCaseIdValidation({
        isValidating: false,
        isValid: false,
        message: 'Validation error'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || !formData.item.trim() || isLoading) return;
    
    // Check custom case ID validation
    if (!formData.use_auto_case_id && (!formData.case_id.trim() || caseIdValidation.isValid !== true)) {
      return;
    }

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
          priority: formData.priority,
          parent_id: formData.parent_id || undefined,
          custom_case_id: !formData.use_auto_case_id ? formData.case_id.trim() : undefined
        })
      });

      if (response.ok) {
        setFormData({
          category_id: '',
          item: '',
          steps: '',
          expected: '',
          priority: 'Mid',
          parent_id: '',
          case_id: '',
          use_auto_case_id: true
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

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field === 'use_auto_case_id') {
      setFormData(prev => ({ ...prev, [field]: value === 'true' || value === true }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
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
          {/* Case ID Configuration */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">케이스 ID 설정</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="case_id_option"
                    checked={formData.use_auto_case_id}
                    onChange={() => handleInputChange('use_auto_case_id', 'true')}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700">자동 생성</span>
                </label>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="case_id_option"
                    checked={!formData.use_auto_case_id}
                    onChange={() => handleInputChange('use_auto_case_id', 'false')}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700">직접 입력</span>
                </label>
              </div>
              
              {!formData.use_auto_case_id && (
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.case_id}
                      onChange={(e) => handleInputChange('case_id', e.target.value.toUpperCase())}
                      placeholder="예: LOGIN-001, API-VALIDATION-001"
                      className={`w-full p-2 border rounded-lg text-sm text-black font-mono pr-8 ${
                        caseIdValidation.isValid === true 
                          ? 'border-green-500 bg-green-50' 
                          : caseIdValidation.isValid === false 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-slate-300'
                      }`}
                      pattern="^[A-Z0-9\-_]+$"
                      title="영문 대문자, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능"
                    />
                    
                    {/* Validation Status Icon */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {caseIdValidation.isValidating && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {caseIdValidation.isValid === true && (
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {caseIdValidation.isValid === false && (
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  
                  {/* Validation Message */}
                  <p className={`text-xs mt-1 ${
                    caseIdValidation.isValid === true 
                      ? 'text-green-600' 
                      : caseIdValidation.isValid === false 
                      ? 'text-red-600' 
                      : 'text-slate-500'
                  }`}>
                    {caseIdValidation.message || '영문 대문자, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능합니다.'}
                  </p>
                </div>
              )}
              
              {formData.use_auto_case_id && (
                <p className="text-xs text-slate-500">
                  프로젝트명과 순번을 기반으로 자동 생성됩니다. (예: APP-001)
                </p>
              )}
            </div>
          </div>
          
          {/* Category, Priority, and Parent */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                상위 테스트 케이스 (선택)
              </label>
              <select
                value={formData.parent_id}
                onChange={(e) => handleInputChange('parent_id', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm text-black"
              >
                <option value="">최상위 레벨</option>
                {testCases.map(testCase => (
                  <option key={testCase.case_id} value={testCase.case_id}>
                    {'  '.repeat(testCase.depth - 1)}{testCase.case_id}: {testCase.item}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                선택한 테스트 케이스의 하위 항목으로 생성됩니다
              </p>
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
              disabled={
                !formData.category_id || 
                !formData.item.trim() || 
                isLoading ||
                (!formData.use_auto_case_id && (!formData.case_id.trim() || caseIdValidation.isValid !== true))
              }
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