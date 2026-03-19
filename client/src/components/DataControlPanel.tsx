/**
 * 數據控制面板元件
 * 提供即時更新、30天抓取、CSV 下載（期數/天數選擇）、數據完整度檢查功能
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Database, Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DataControlPanelProps {
  onRefresh?: () => void;
  className?: string;
}

type CsvMode = 'limit' | 'days';
type CsvLimit = 50 | 100 | 500 | 1000;
type CsvDays = 7 | 14 | 30;

export default function DataControlPanel({ onRefresh, className = '' }: DataControlPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing30Days, setIsSyncing30Days] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [csvMode, setCsvMode] = useState<CsvMode>('limit');
  const [csvLimit, setCsvLimit] = useState<CsvLimit>(50);
  const [csvDays, setCsvDays] = useState<CsvDays>(7);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    try { return localStorage.getItem('autoSyncEnabled') === 'true'; } catch { return false; }
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
      toast.success(`今日同步完成：${(data as any).count ?? '?'} 筆`);
      setIsRefreshing(false);
      onRefresh?.();
    },
    onError: (error) => {
      toast.error(`同步失敗: ${error.message}`);
      setIsRefreshing(false);
    },
  });

  // 同步最近 30 天數據
  const syncRecentDaysMutation = trpc.sync.recentDays.useMutation({
    onSuccess: (data) => {
      toast.success(`30 天數據同步完成！共 ${(data as any).total ?? '?'} 筆`);
      setIsSyncing30Days(false);
      onRefresh?.();
      integrityQuery.refetch();
    },
    onError: (error) => {
      toast.error(`同步失敗: ${error.message}`);
      setIsSyncing30Days(false);
    },
  });

  // CSV 查詢（依選擇的模式）
  const drawCsvByLimitQuery = trpc.backup.exportDrawRecordsCSV.useQuery(
    { limit: csvLimit },
    { enabled: false }
  );
  const drawCsvByDaysQuery = trpc.backup.exportDrawRecordsCSV.useQuery(
    { days: csvDays },
    { enabled: false }
  );

  // 定時自動同步（每 5 分鐘）
  useEffect(() => {
    if (!autoSyncEnabled) { setNextSyncTime(''); return; }
    const calcNext = () => {
      const next = new Date(Date.now() + 5 * 60 * 1000);
      setNextSyncTime(next.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }));
    };
    calcNext();
    const interval = setInterval(() => { syncTodayMutation.mutate(); calcNext(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoSyncEnabled]);

  const handleToggleAutoSync = () => {
    const next = !autoSyncEnabled;
    setAutoSyncEnabled(next);
    try { localStorage.setItem('autoSyncEnabled', String(next)); } catch {}
    toast.success(next ? '✅ 已開啟自動同步（每 5 分鐘）' : '⏹ 已關閉自動同步');
  };

  const handleRefresh = () => { setIsRefreshing(true); syncTodayMutation.mutate(); };
  const handleSync30Days = () => { setIsSyncing30Days(true); syncRecentDaysMutation.mutate({ days: 30 }); };

  const handleDownload = async () => {
    setIsDownloading(true);
    setShowMenu(false);
    try {
      const result = csvMode === 'limit'
        ? await drawCsvByLimitQuery.refetch()
        : await drawCsvByDaysQuery.refetch();

      const data = result.data;
      if (data?.content && data?.fileName) {
        const bom = '\uFEFF';
        const blob = new Blob([bom + data.content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`✅ 已下載 ${data.recordCount} 筆：${data.fileName}`);
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
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-xl border border-amber-500/30 p-3 backdrop-blur-sm w-52">

        {/* ── 主按鈕列 ── */}
        <div className="flex items-center gap-1.5 mb-2">

          {/* 即時更新 */}
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="group relative flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 hover:border-amber-500 transition-all disabled:opacity-50 text-amber-400 text-[10px]"
            title="同步今日數據">
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>今日同步</span>
          </button>

          {/* 抓取 30 天 */}
          <button onClick={handleSync30Days} disabled={isSyncing30Days}
            className="group relative flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 hover:border-emerald-500 transition-all disabled:opacity-50 text-emerald-400 text-[10px]"
            title="抓取 30 天數據">
            {isSyncing30Days ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
            <span>抓30天</span>
          </button>

          {/* 定時同步 */}
          <button onClick={handleToggleAutoSync}
            className={`p-1.5 rounded-lg transition-all border ${autoSyncEnabled ? 'bg-violet-500/20 border-violet-500/70 text-violet-400' : 'bg-slate-700/30 border-slate-600/50 text-slate-500 hover:text-slate-400'}`}
            title={autoSyncEnabled ? '關閉自動同步' : '開啟自動同步（每5分鐘）'}>
            <Clock size={13} />
          </button>

          {/* 完整度 */}
          <button onClick={() => setShowIntegrity(!showIntegrity)}
            className={`p-1.5 rounded-lg transition-all border ${showIntegrity ? 'bg-blue-500/20 border-blue-500/70' : 'bg-blue-500/10 border-blue-500/50 hover:bg-blue-500/20'}`}
            title="數據完整度">
            {missingCount > 0 ? <XCircle size={13} className="text-red-400" /> : <CheckCircle2 size={13} className="text-blue-400" />}
          </button>
        </div>

        {/* ── CSV 下載區 ── */}
        <div className="border border-sky-500/30 rounded-lg p-2 bg-sky-500/5">
          <div className="text-[10px] text-sky-300 font-medium mb-1.5 flex items-center gap-1">
            <Download size={10} />
            下載開獎 CSV
          </div>

          {/* 模式切換 */}
          <div className="flex gap-1 mb-1.5">
            <button onClick={() => setCsvMode('limit')}
              className={`flex-1 text-[10px] py-0.5 rounded border transition-colors ${csvMode === 'limit' ? 'bg-sky-500/30 border-sky-500 text-sky-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
              最新 N 期
            </button>
            <button onClick={() => setCsvMode('days')}
              className={`flex-1 text-[10px] py-0.5 rounded border transition-colors ${csvMode === 'days' ? 'bg-sky-500/30 border-sky-500 text-sky-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
              最近 N 天
            </button>
          </div>

          {/* 期數選擇 */}
          {csvMode === 'limit' && (
            <div className="flex gap-1 mb-2">
              {([50, 100, 500, 1000] as CsvLimit[]).map(n => (
                <button key={n} onClick={() => setCsvLimit(n)}
                  className={`flex-1 text-[9px] py-0.5 rounded border transition-colors ${csvLimit === n ? 'bg-sky-500/30 border-sky-500 text-sky-300' : 'border-slate-600 text-slate-500 hover:border-slate-500'}`}>
                  {n >= 1000 ? `${n/1000}k` : n}
                </button>
              ))}
            </div>
          )}

          {/* 天數選擇 */}
          {csvMode === 'days' && (
            <div className="flex gap-1 mb-2">
              {([7, 14, 30] as CsvDays[]).map(d => (
                <button key={d} onClick={() => setCsvDays(d)}
                  className={`flex-1 text-[10px] py-0.5 rounded border transition-colors ${csvDays === d ? 'bg-sky-500/30 border-sky-500 text-sky-300' : 'border-slate-600 text-slate-500 hover:border-slate-500'}`}>
                  {d}天
                </button>
              ))}
            </div>
          )}

          {/* 下載按鈕 */}
          <button onClick={handleDownload} disabled={isDownloading}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/60 hover:border-sky-500 text-sky-300 text-[11px] font-medium transition-all disabled:opacity-50">
            {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {isDownloading ? '下載中...' : csvMode === 'limit' ? `下載最新 ${csvLimit} 期` : `下載最近 ${csvDays} 天`}
          </button>
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
            <span>正在抓取 30 天數據...</span>
          </div>
        )}

        {/* ── 數據完整度面板 ── */}
        {showIntegrity && (
          <div className="mt-2 border-t border-slate-700 pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-300 font-medium">近 14 天完整度</span>
              {missingCount > 0 && <span className="text-[9px] text-red-400">{missingCount} 天缺漏</span>}
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
              <button onClick={handleSync30Days} disabled={isSyncing30Days}
                className="mt-1.5 w-full text-[10px] py-1 rounded bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50">
                {isSyncing30Days ? '同步中...' : '⚡ 一鍵補抓缺漏數據'}
              </button>
            )}
          </div>
        )}

        {/* ── 即時指示器 ── */}
        <div className="mt-2 flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${autoSyncEnabled ? 'bg-violet-400 animate-pulse' : 'bg-green-500 animate-pulse'}`}></div>
          <span className="text-[9px] text-slate-500">{autoSyncEnabled ? '自動同步中' : '即時更新'}</span>
        </div>
      </div>
    </div>
  );
}
