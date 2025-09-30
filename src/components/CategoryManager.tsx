'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/types';

interface CategoryManagerProps {
  projectId: string;
  onCategoryCreated: () => void;
}

export default function CategoryManager({ projectId, onCategoryCreated }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_name: newCategoryName.trim() })
      });

      if (response.ok) {
        setNewCategoryName('');
        loadCategories();
        onCategoryCreated();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-lg font-semibold text-slate-800">
          카테고리 관리 ({categories.length}개)
        </h3>
        <span className="text-slate-500">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Category List */}
          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-2">기존 카테고리</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <span
                  key={category.category_id}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                  {category.category_name}
                </span>
              ))}
              {categories.length === 0 && (
                <span className="text-sm text-slate-500">등록된 카테고리가 없습니다</span>
              )}
            </div>
          </div>

          {/* Add New Category */}
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="새 카테고리 이름 입력"
              className="flex-1 p-2 border border-slate-300 rounded-lg text-sm text-black"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '추가 중...' : '카테고리 추가'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}