'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, MessageSquare, RefreshCw } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

export default function OwnerPengaturanPage() {
  const [hargaDefault, setHargaDefault] = useState('1500000');
  const [dendaPerHari, setDendaPerHari] = useState('50000');
  const [dendaMode, setDendaMode] = useState<'HARIAN' | 'TETAP'>('HARIAN');
  const [batasReminderHari, setBatasReminderHari] = useState('3');
  const [waTemplate, setWaTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pengaturan');
      const data = await res.json();
      if (data) {
        setHargaDefault(String(data.harga_default || '1500000'));
        setDendaPerHari(String(data.denda_per_hari || '50000'));
        setDendaMode(data.denda_mode || 'HARIAN');
        setBatasReminderHari(String(data.batas_reminder_hari ?? 3));
        setWaTemplate(data.wa_template || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/pengaturan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          harga_default: Number(hargaDefault),
          denda_per_hari: Number(dendaPerHari),
          denda_mode: dendaMode,
          batas_reminder_hari: Number(batasReminderHari),
          wa_template: waTemplate,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Pengaturan Sistem & Denda Dinamis</h1>
        <p className="text-xs md:text-sm text-slate-500">
          Kelola harga sewa default, mode dan besaran denda keterlambatan, batas pengingat, dan template pesan WA.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan sistem berhasil disimpan!</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-400 text-xs">Memuat pengaturan...</div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Harga Sewa Kamar Default (Rp/bulan)</label>
            <input
              type="number"
              required
              value={hargaDefault}
              onChange={(e) => setHargaDefault(e.target.value)}
              className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Pratinjau: <strong>{formatRupiah(hargaDefault)}</strong> per bulan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700">Skema / Mode Denda Keterlambatan</label>
              <select
                value={dendaMode}
                onChange={(e) => setDendaMode(e.target.value as 'HARIAN' | 'TETAP')}
                className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="HARIAN">HARIAN (Dikalikan jumlah hari terlambat)</option>
                <option value="TETAP">TETAP (Flat nominal satu kali saja)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Besaran Denda (Rp)</label>
              <input
                type="number"
                required
                value={dendaPerHari}
                onChange={(e) => setDendaPerHari(e.target.value)}
                className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {dendaMode === 'HARIAN'
                  ? `Denda per hari: ${formatRupiah(dendaPerHari)}`
                  : `Denda tetap: ${formatRupiah(dendaPerHari)} (flat)`}
              </p>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Batas Pengingat Tagihan (Hari Sebelum Jatuh Tempo)</label>
            <input
              type="number"
              min="1"
              max="30"
              required
              value={batasReminderHari}
              onChange={(e) => setBatasReminderHari(e.target.value)}
              className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Sistem akan mulai mengirimkan reminder WA saat H-{batasReminderHari} sebelum tanggal jatuh tempo (maks 1 kali per 24 jam).
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Template Pesan WhatsApp Reminder</label>
            <textarea
              rows={4}
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Variabel otomatis: {'{NAMA}'}, {'{KAMAR}'}, {'{PERIODE}'}, {'{JUMLAH}'}, {'{JATUH_TEMPO}'}
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan ke Database'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
