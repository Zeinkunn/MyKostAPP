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

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/log');
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Log Aktivitas (Audit Trail)</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Catatan jejak aktivitas pengelola dan transaksi sistem.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 bg-white"
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">User Pengelola</th>
                <th className="p-3.5">Aksi</th>
                <th className="p-3.5">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="p-3.5 text-slate-500 whitespace-nowrap">
                    {formatDateIndonesian(log.timestamp)}
                  </td>
                  <td className="p-3.5">
                    <strong className="text-slate-900">{log.user?.nama || 'Sistem'}</strong>
                    <span className="ml-1 text-[10px] text-blue-600 font-semibold">({log.user?.role})</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">{log.aksi}</td>
                  <td className="p-3.5 text-slate-600">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
