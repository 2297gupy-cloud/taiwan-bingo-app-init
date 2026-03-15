/**
 * 數據控制面板元件
 * 提供即時更新、30天抓取、CSV 範圍下載、數據完整度檢查功能
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertCircle, Database, Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DataControlPanelProps {
  onRefresh?: () => void;
  className?: string;
}

type CsvDays = 7 | 14 | 30;

export default function DataControlPanel({ onRefresh, className = '' }: DataControlPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing30Days, setIsSyncing30Days] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [csvDays, setCsvDays] = useState<CsvDays>(30);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('autoSyncEnabled') === 'true';
  });
  const [nextSyncTime, setNextSyncTime] = useState<string>('');

  // 數據完整度查詢
  const integrityQuery = trpc.sync.dataIntegrity.useQuery(
    { days: 14 },
    { enabled: showIntegrity, staleTime: 60000 }
  );

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
      onRefresh?.();
      integrityQuery.refetch();
    },
    onError: (error) => {
      toast.error(`同步失敗: ${error.message}`);
      setIsSyncing30Days(false);
    },
  });

  // CSV 查詢（依選擇的天數）
  const drawCsvQuery = trpc.backup.exportDrawRecordsCSV.useQuery(
    { days: csvDays },
    { enabled: false }
  );
  const predictionCsvQuery = trpc.backup.exportAIPredictionsCSV.useQuery(
    { days: csvDays },
    { enabled: false }
  );
  const playerStatsCsvQuery = trpc.backup.exportPlayerStatsCSV.useQuery(
    undefined,
    { enabled: false }
  );

  // 定時自動同步邏輯（每 5 分鐘同步今日數據）
  useEffect(() => {
    if (!autoSyncEnabled) {
      setNextSyncTime('');
      return;
    }

    const calcNext = () => {
      const now = new Date();
      const next = new Date(now.getTime() + 5 * 60 * 1000);
      setNextSyncTime(next.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }));
    };
    calcNext();

    const interval = setInterval(() => {
      syncTodayMutation.mutate();
      calcNext();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoSyncEnabled]);

  const handleToggleAutoSync = () => {
    const next = !autoSyncEnabled;
    setAutoSyncEnabled(next);
    localStorage.setItem('autoSyncEnabled', String(next));
    toast.success(next ? '✅ 已開啟自動同步（每 5 分鐘）' : '⏹ 已關閉自動同步');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    syncTodayMutation.mutate();
  };

  const handleSync30Days = () => {
    setIsSyncing30Days(true);
    syncRecentDaysMutation.mutate({ days: 30 });
  };

  const handleDownload = async (type: 'draws' | 'predictions' | 'stats') => {
    setIsDownloading(true);
    setShowMenu(false);

    try {
      let csvContent = '';
      let fileName = '';

      switch (type) {
        case 'draws': {
          const result = await drawCsvQuery.refetch();
          if (result.data) { csvContent = result.data.content; fileName = result.data.fileName; }
          break;
        }
        case 'predictions': {
          const result = await predictionCsvQuery.refetch();
          if (result.data) { csvContent = result.data.content; fileName = result.data.fileName; }
          break;
        }
        case 'stats': {
          const result = await playerStatsCsvQuery.refetch();
          if (result.data) { csvContent = result.data.content; fileName = result.data.fileName; }
          break;
        }
      }

      if (csvContent && fileName) {
        const element = document.createElement('a');
        const bom = '\uFEFF';
        const file = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
        element.href = URL.createObjectURL(file);
        element.download = fileName;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
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

  const missingCount = integrityQuery.data?.days.filter(d => d.missing).length ?? 0;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg border border-amber-500/30 p-3 backdrop-blur-sm min-w-[200px]">

        {/* ── 主按鈕列 ── */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* 即時更新 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="group relative p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 hover:border-amber-500 transition-all disabled:opacity-50"
            title="同步今日數據"
          >
            <RefreshCw size={16} className={`text-amber-400 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
            <span className="absolute bottom-full right-0 mb-1.5 px-1.5 py-0.5 bg-slate-950 text-amber-300 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">今日同步</span>
          </button>

          {/* 抓取 30 天 */}
          <button
            onClick={handleSync30Days}
            disabled={isSyncing30Days}
            className="group relative p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 hover:border-emerald-500 transition-all disabled:opacity-50"
            title="抓取 30 天數據"
          >
            {isSyncing30Days ? <Loader2 size={16} className="text-emerald-400 animate-spin" /> : <Database size={16} className="text-emerald-400" />}
            <span className="absolute bottom-full right-0 mb-1.5 px-1.5 py-0.5 bg-slate-950 text-emerald-300 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">抓取30天</span>
          </button>

          {/* 定時自動同步切換 */}
          <button
            onClick={handleToggleAutoSync}
            className={`group relative p-2 rounded-lg transition-all border ${
              autoSyncEnabled
                ? 'bg-violet-500/20 border-violet-500/70 hover:bg-violet-500/30'
                : 'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50'
            }`}
            title={autoSyncEnabled ? '關閉自動同步' : '開啟自動同步'}
          >
            <Clock size={16} className={autoSyncEnabled ? 'text-violet-400' : 'text-slate-500'} />
            <span className="absolute bottom-full right-0 mb-1.5 px-1.5 py-0.5 bg-slate-950 text-violet-300 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {autoSyncEnabled ? '自動同步開啟' : '開啟自動同步'}
            </span>
          </button>

          {/* 數據完整度 */}
          <button
            onClick={() => setShowIntegrity(!showIntegrity)}
            className={`group relative p-2 rounded-lg transition-all border ${
              showIntegrity
                ? 'bg-blue-500/20 border-blue-500/70'
                : 'bg-blue-500/10 border-blue-500/50 hover:bg-blue-500/20'
            }`}
            title="數據完整度"
          >
            {missingCount > 0
              ? <XCircle size={16} className="text-red-400" />
              : <CheckCircle2 size={16} className="text-blue-400" />
            }
            <span className="absolute bottom-full right-0 mb-1.5 px-1.5 py-0.5 bg-slate-950 text-blue-300 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">完整度檢查</span>
          </button>

          {/* 下載 CSV */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={isDownloading}
              className="group relative p-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/50 hover:border-sky-500 transition-all disabled:opacity-50"
              title="下載 CSV"
            >
              {isDownloading ? <Loader2 size={16} className="text-sky-400 animate-spin" /> : <Download size={16} className="text-sky-400" />}
              <span className="absolute bottom-full right-0 mb-1.5 px-1.5 py-0.5 bg-slate-950 text-sky-300 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">下載CSV</span>
            </button>

            {showMenu && (
              <div className="absolute top-full right-0 mt-2 bg-slate-900 border border-sky-500/50 rounded-lg shadow-xl overflow-hidden z-20 min-w-52">
                {/* CSV 天數選擇 */}
                <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/60">
                  <p className="text-[10px] text-slate-400 mb-1.5">選擇下載範圍</p>
                  <div className="flex gap-1">
                    {([7, 14, 30] as CsvDays[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setCsvDays(d)}
                        className={`flex-1 text-[10px] py-0.5 rounded border transition-colors ${
                          csvDays === d
                            ? 'bg-sky-500/30 border-sky-500 text-sky-300'
                            : 'border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {d}天
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDownload('draws')} className="w-full text-left px-3 py-2 hover:bg-sky-500/20 text-sky-300 text-xs transition-colors border-b border-slate-700 flex items-center gap-2">
                  <Download size={12} /> 開獎記錄 ({csvDays}天)
                </button>
                <button onClick={() => handleDownload('predictions')} className="w-full text-left px-3 py-2 hover:bg-sky-500/20 text-sky-300 text-xs transition-colors border-b border-slate-700 flex items-center gap-2">
                  <Download size={12} /> AI 預測 ({csvDays}天)
                </button>
                <button onClick={() => handleDownload('stats')} className="w-full text-left px-3 py-2 hover:bg-sky-500/20 text-sky-300 text-xs transition-colors flex items-center gap-2">
                  <Download size={12} /> 玩家統計
                </button>
              </div>
            )}
          </div>

          {/* 即時指示器 */}
          <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-800/50 rounded border border-slate-700/50">
            <div className={`w-1.5 h-1.5 rounded-full ${autoSyncEnabled ? 'bg-violet-400 animate-pulse' : 'bg-green-500 animate-pulse'}`}></div>
            <span className="text-[10px] text-slate-400">{autoSyncEnabled ? '自動' : '即時'}</span>
          </div>
        </div>

        {/* ── 定時同步狀態 ── */}
        {autoSyncEnabled && nextSyncTime && (
          <div className="mt-2 text-[10px] text-violet-400 flex items-center gap-1">
            <Clock size={10} />
            <span>下次同步：{nextSyncTime}</span>
          </div>
        )}

        {/* ── 同步進度 ── */}
        {isSyncing30Days && (
          <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            <span>正在抓取 30 天數據，請稍候...</span>
          </div>
        )}

        {/* ── 數據完整度面板 ── */}
        {showIntegrity && (
          <div className="mt-2 border-t border-slate-700 pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-300 font-medium">近 14 天數據完整度</span>
              {missingCount > 0 && (
                <span className="text-[9px] text-red-400">{missingCount} 天缺漏</span>
              )}
            </div>
            {integrityQuery.isLoading ? (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Loader2 size={10} className="animate-spin" /> 載入中...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-0.5">
                {integrityQuery.data?.days.slice(0, 14).reverse().map((day) => {
                  const pct = Math.min(100, Math.round((day.count / day.expected) * 100));
                  const color = day.missing ? 'bg-red-500/80' : pct >= 100 ? 'bg-emerald-500/80' : 'bg-yellow-500/80';
                  const [, mmdd] = day.date.split('-').slice(1);
                  const label = `${parseInt(day.date.split('-')[1])}/${parseInt(day.date.split('-')[2])}`;
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-0.5" title={`${day.date}: ${day.count}/${day.expected} (${pct}%)`}>
                      <div className={`w-full h-6 rounded-sm ${color} flex items-center justify-center`}>
                        <span className="text-[8px] text-white font-bold">{pct}%</span>
                      </div>
                      <span className="text-[8px] text-slate-500">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {missingCount > 0 && (
              <button
                onClick={handleSync30Days}
                disabled={isSyncing30Days}
                className="mt-1.5 w-full text-[10px] py-1 rounded bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isSyncing30Days ? '同步中...' : '⚡ 一鍵補抓缺漏數據'}
              </button>
            )}
          </div>
        )}

        {/* ── 底部提示 ── */}
        {!isSyncing30Days && !showIntegrity && (
          <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
            <AlertCircle size={10} className="text-amber-500/60" />
            <span>過去 {csvDays} 天數據可下載</span>
          </div>
        )}
      </div>

      {/* 背景點擊關閉菜單 */}
      {showMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
}
