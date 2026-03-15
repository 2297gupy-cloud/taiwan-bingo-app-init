/**
 * 數據控制面板元件
 * 位於頁面頂部右上角，提供即時更新和下載數據功能
 */

import React, { useState } from 'react';
import { RefreshCw, Download, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DataControlPanelProps {
  onRefresh?: () => void;
  className?: string;
}

export default function DataControlPanel({ onRefresh, className = '' }: DataControlPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // 即時更新 API 調用
  const refreshMutation = trpc.backup.executeBackup.useMutation({
    onSuccess: (data: any) => {
      toast.success(`備份成功: ${data.fileName}`);
      setIsRefreshing(false);
      onRefresh?.();
    },
    onError: (error: any) => {
      toast.error(`備份失敗: ${error.message}`);
      setIsRefreshing(false);
    },
  });

  /**
   * 處理即時更新
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshMutation.mutateAsync({ backupType: 'daily' });
  };

  /**
   * 處理下載 CSV
   */
  const handleDownload = async (type: 'draws' | 'predictions' | 'stats') => {
    setIsDownloading(true);
    setShowMenu(false);

    try {
      let csvContent = '';
      let fileName = '';

      switch (type) {
        case 'draws': {
          const result = await (trpc.backup.exportDrawRecordsCSV as any)({ days: 30 });
          csvContent = result.content;
          fileName = result.fileName;
          break;
        }
        case 'predictions': {
          const result = await (trpc.backup.exportAIPredictionsCSV as any)({ days: 30 });
          csvContent = result.content;
          fileName = result.fileName;
          break;
        }
        case 'stats': {
          const result = await (trpc.backup.exportPlayerStatsCSV as any)();
          csvContent = result.content;
          fileName = result.fileName;
          break;
        }
      }

      downloadCSV(csvContent, fileName);
      toast.success(`已下載: ${fileName}`);
    } catch (error: any) {
      toast.error(`下載失敗: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * 下載 CSV 文件
   */
  const downloadCSV = (content: string, fileName: string): void => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/csv;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      {/* 主卡片容器 */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg border border-amber-500/30 p-3 backdrop-blur-sm">
        {/* 按鈕組 */}
        <div className="flex items-center gap-2">
          {/* 即時更新按鈕 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="group relative p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 hover:border-amber-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="即時更新數據"
          >
            <RefreshCw
              size={18}
              className={`text-amber-400 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`}
            />
            {/* 懸停提示 */}
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-950 text-amber-300 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              即時更新
            </div>
          </button>

          {/* 下載按鈕 */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={isDownloading}
              className="group relative p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/50 hover:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="下載數據"
            >
              <Download
                size={18}
                className={`text-blue-400 ${isDownloading ? 'animate-pulse' : ''}`}
              />
              {/* 懸停提示 */}
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-950 text-blue-300 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                下載數據
              </div>
            </button>

            {/* 下載菜單 */}
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 bg-slate-900 border border-blue-500/50 rounded-lg shadow-xl overflow-hidden z-10 min-w-48">
                <button
                  onClick={() => handleDownload('draws')}
                  className="w-full text-left px-4 py-2 hover:bg-blue-500/20 text-blue-300 text-sm transition-colors border-b border-slate-700 flex items-center gap-2"
                >
                  <Download size={14} />
                  開獎記錄 (CSV)
                </button>
                <button
                  onClick={() => handleDownload('predictions')}
                  className="w-full text-left px-4 py-2 hover:bg-blue-500/20 text-blue-300 text-sm transition-colors border-b border-slate-700 flex items-center gap-2"
                >
                  <Download size={14} />
                  AI 預測 (CSV)
                </button>
                <button
                  onClick={() => handleDownload('stats')}
                  className="w-full text-left px-4 py-2 hover:bg-blue-500/20 text-blue-300 text-sm transition-colors flex items-center gap-2"
                >
                  <Download size={14} />
                  玩家統計 (CSV)
                </button>
              </div>
            )}
          </div>

          {/* 狀態指示器 */}
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-400">即時</span>
          </div>
        </div>

        {/* 信息提示 */}
        <div className="mt-2 text-xs text-slate-400 flex items-start gap-1">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-amber-500/60" />
          <span>過去 30 天數據可下載</span>
        </div>
      </div>

      {/* 背景點擊關閉菜單 */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
