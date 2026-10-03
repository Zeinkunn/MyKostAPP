'use client';

import { useState, useEffect } from 'react';
import { History, Shield, RefreshCw } from 'lucide-react';
import { formatDateIndonesian } from '@/lib/utils';

interface LogItem {
  id: string;
  aksi: string;
  detail: string;
  timestamp: string;
  user: { nama: string; email: string; role: string };
}

export default function OwnerLogPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const fetchLogs = async (targetPage = 1) => {
    if (targetPage === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch(`/api/log?page=${targetPage}&limit=20`);
      const result = await res.json();

      const items = Array.isArray(result) ? result : result.data || [];
      const more = result.pagination ? result.pagination.hasMore : false;

      if (targetPage === 1) {
        setLogs(items);
      } else {
        setLogs((prev) => [...prev, ...items]);
      }

      setPage(targetPage);
      setHasMore(more);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Log Aktivitas (Audit Trail)</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Catatan jejak aktivitas pengelola dan transaksi sistem dengan paginasi.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(1)}
          className="p-2 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 bg-white shadow-xs"
          title="Segarkan Log"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Memuat log aktivitas...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          Belum ada catatan log aktivitas.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 text-xs">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 capitalize">
                        {log.aksi.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{log.detail}</p>
                    <p className="text-[11px] text-slate-400">
                      Oleh: <strong className="text-slate-600">{log.user?.nama}</strong> ({log.user?.role})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => fetchLogs(page + 1)}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-xs transition-all disabled:opacity-50"
              >
                {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak Log'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
