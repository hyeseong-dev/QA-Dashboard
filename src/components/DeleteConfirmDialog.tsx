'use client';

import { useState } from 'react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  itemName,
  isDeleting = false,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">{message}</p>
          <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-red-400">
            <p className="text-sm font-medium text-gray-800">
              삭제할 항목: <span className="text-red-600">"{itemName}"</span>
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-amber-400">💡</span>
            </div>
            <div className="ml-2">
              <p className="text-xs text-amber-700">
                <strong>주의:</strong> 삭제된 테스트 케이스와 관련된 모든 테스트 결과도 함께 삭제됩니다. 
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '확인 삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}