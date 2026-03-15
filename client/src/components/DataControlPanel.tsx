/**
 * 數據控制面板元件
 * 位於頁面頂部右上角，提供即時更新、30天抓取和下載數據功能
 */

import React, { useState } from 'react';
import { RefreshCw, Download, AlertCircle, Database, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DataControlPanelProps {
  onRefresh?: () => void;
  className?: string;
}

export default function DataControlPanel({ onRefresh, className = '' }: DataControlPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSyncing30Days, setIsSyncing30Days] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  // 同步今日數據
  const syncTodayMutation = trpc.sync.today.useMutation({
    onSuccess: (data) => {
      toast.success(`今日同步完成：${data.count} 筆`);
      setIsRefreshing(false);
      onRefresh?.();
    },
    onError: (error) => {
      toast.error(`同步失敗: ${error.message}`);
      setIsRefreshing(false);
    },
  });

  // 同步最近 N 天數據
  const syncRecentDaysMutation = trpc.sync.recentDays.useMutation({
    onSuccess: (data) => {
      toast.success(`30 天數據同步完成！共 ${data.total} 筆`);
      setIsSyncing30Days(false);
      setSyncProgress('');
      onRefresh?.();
    },
    onError: (error) => {
      toast.error(`同步失敗: ${error.message}`);
      setIsSyncing30Days(false);
      setSyncProgress('');
    },
  });

  // CSV 下載查詢
  const drawCsvQuery = trpc.backup.exportDrawRecordsCSV.useQuery(
    { days: 30 },
    { enabled: false }
  );
  const predictionCsvQuery = trpc.backup.exportAIPredictionsCSV.useQuery(
    { days: 30 },
    { enabled: false }
  );
  const playerStatsCsvQuery = trpc.backup.exportPlayerStatsCSV.useQuery(
    undefined,
    { enabled: false }
  );

  /**
   * 處理即時更新（今日）
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    syncTodayMutation.mutate();
  };

  /**
   * 處理抓取 30 天數據
   */
  const handleSync30Days = () => {
    setIsSyncing30Days(true);
    setSyncProgress('正在抓取 30 天數據...');
    syncRecentDaysMutation.mutate({ days: 30 });
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
          const result = await drawCsvQuery.refetch();
          if (result.data) {
            csvContent = result.data.content;
            fileName = result.data.fileName;
          }
          break;
        }
        case 'predictions': {
          const result = await predictionCsvQuery.refetch();
          if (result.data) {
            csvContent = result.data.content;
            fileName = result.data.fileName;
          }
          break;
        }
        case 'stats': {
          const result = await playerStatsCsvQuery.refetch();
          if (result.data) {
            csvContent = result.data.content;
            fileName = result.data.fileName;
          }
          break;
        }
      }

      if (csvContent && fileName) {
        downloadCSV(csvContent, fileName);
        toast.success(`已下載: ${fileName}`);
      } else {
        toast.error('無資料可下載');
      }
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
    const bom = '\uFEFF';
    const file = new Blob([bom + content], { type: 'text/csv;charset=utf-8' });
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
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-950 text-amber-300 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              即時更新
            </div>
          </button>

          {/* 抓取 30 天按鈕 */}
          <button
            onClick={handleSync30Days}
            disabled={isSyncing30Days}
            className="group relative p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 hover:border-emerald-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="抓取 30 天數據"
          >
            {isSyncing30Days ? (
              <Loader2 size={18} className="text-emerald-400 animate-spin" />
            ) : (
              <Database size={18} className="text-emerald-400" />
            )}
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-950 text-emerald-300 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              抓取 30 天
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
              {isDownloading ? (
                <Loader2 size={18} className="text-blue-400 animate-spin" />
              ) : (
                <Download size={18} className="text-blue-400" />
              )}
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

        {/* 進度提示 */}
        {isSyncing30Days && (
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            <span>{syncProgress || '正在抓取 30 天數據，請稍候...'}</span>
          </div>
        )}

        {/* 信息提示 */}
        {!isSyncing30Days && (
          <div className="mt-2 text-xs text-slate-400 flex items-start gap-1">
            <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-amber-500/60" />
            <span>過去 30 天數據可下載</span>
          </div>
        )}
      </div>

      {/* 背景點擊關閉菜單 */}
      {showMenu && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
