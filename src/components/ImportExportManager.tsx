'use client';

import { useState } from 'react';

interface ImportExportManagerProps {
  projectId: string;
  projectName: string;
  onDataImported: () => void;
}

export default function ImportExportManager({ 
  projectId, 
  projectName, 
  onDataImported 
}: ImportExportManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/export`);
      if (response.ok) {
        const data = await response.json();
        
        // Create download
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectId}_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || isImporting) return;

    setIsImporting(true);
    try {
      const fileText = await importFile.text();
      const importData = JSON.parse(fileText);

      const response = await fetch(`/api/projects/${projectId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Import 완료:\n카테고리: ${result.categories_imported}개 추가, ${result.categories_skipped}개 건너뜀\n테스트 케이스: ${result.test_cases_imported}개 추가, ${result.test_cases_skipped}개 건너뜀${result.errors.length > 0 ? '\n\n오류:\n' + result.errors.join('\n') : ''}`);
        setImportFile(null);
        onDataImported();
      } else {
        const error = await response.json();
        alert(error.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Invalid JSON file or import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-lg font-semibold text-slate-800">
          데이터 가져오기/내보내기
        </h3>
        <span className="text-slate-500">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-6">
          {/* Export Section */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-md font-medium text-green-800 mb-2">
              📤 프로젝트 데이터 내보내기
            </h4>
            <p className="text-sm text-green-700 mb-3">
              현재 프로젝트의 모든 카테고리, 테스트 케이스, 결과를 JSON 파일로 내보냅니다.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? '내보내는 중...' : `${projectName} 데이터 내보내기`}
            </button>
          </div>

          {/* Import Section */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-md font-medium text-blue-800 mb-2">
              📥 프로젝트 데이터 가져오기
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              JSON 파일에서 카테고리와 테스트 케이스를 가져옵니다. 중복 항목은 자동으로 건너뜁니다.
            </p>
            
            <form onSubmit={handleImport} className="space-y-3">
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!importFile || isImporting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? '가져오는 중...' : 'JSON 파일 가져오기'}
                </button>
                
                {importFile && (
                  <button
                    type="button"
                    onClick={() => setImportFile(null)}
                    className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    파일 취소
                  </button>
                )}
              </div>
              
              {importFile && (
                <p className="text-xs text-slate-600">
                  선택된 파일: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </form>
          </div>

          {/* Usage Instructions */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-md font-medium text-amber-800 mb-2">
              💡 사용 방법
            </h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• <strong>내보내기</strong>: 현재 프로젝트의 모든 데이터를 JSON 파일로 저장</li>
              <li>• <strong>가져오기</strong>: 다른 프로젝트에서 내보낸 JSON 파일을 현재 프로젝트로 복사</li>
              <li>• <strong>중복 처리</strong>: 같은 이름의 카테고리/테스트 케이스는 자동으로 건너뜀</li>
              <li>• <strong>백업 용도</strong>: 프로젝트 데이터 백업 및 복원에 활용 가능</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}