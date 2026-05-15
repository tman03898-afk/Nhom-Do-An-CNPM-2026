import { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

function fmt(dt) {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    return Number.isNaN(d.getTime()) ? String(dt) : d.toLocaleString('vi-VN');
  } catch {
    return String(dt);
  }
}

export default function RemovalHistoryPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [banner, setBanner] = useState(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch('/admin/removal-log?limit=150', { token });
      setEntries(data.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleRestoreLogin = async (logId) => {
    if (!token) return;
    setRestoringId(logId);
    setBanner(null);
    try {
      const data = await apiFetch(`/admin/removal-log/${logId}/restore-tenant-user`, {
        token,
        method: 'POST',
      });
      setBanner({ type: 'ok', text: data.message || 'Đã bật lại đăng nhập (is_active = true).' });
      await load();
    } catch (e) {
      setBanner({ type: 'err', text: e?.message || 'Không khôi phục được.' });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto mt-2 px-4 pb-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-[#F2FCFD] flex items-center justify-center text-[#14B8A6]">
          <History className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-nest-text-primary">Lịch sử đã xóa</h1>
          <p className="text-sm font-medium text-nest-text-secondary mt-0.5">
            Xóa hợp đồng / xóa khách được lưu lại. Với dòng <strong className="text-nest-text-primary">Khách thuê</strong>, có thể{' '}
            <strong className="text-nest-text-primary">Khôi phục</strong> để bật lại đăng nhập (<code className="text-xs">is_active = true</code>).
          </p>
        </div>
      </div>

      <div className="bg-white/80 rounded-[28px] p-5 sm:p-8 border border-slate-200/60">
        {banner ? (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-[13px] font-medium ${
              banner.type === 'ok' ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}
          >
            {banner.text}
          </div>
        ) : null}
        {loading ? (
          <p className="text-sm font-medium text-nest-text-secondary py-8 text-center">Đang tải...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm font-medium text-nest-text-secondary py-8 text-center">Chưa có bản ghi xóa.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-wide border-b border-slate-100">
                  <th className="pb-3 pr-4">Thời điểm</th>
                  <th className="pb-3 pr-4">Loại</th>
                  <th className="pb-3 pr-4">Mã</th>
                  <th className="pb-3">Tóm tắt</th>
                  <th className="pb-3 text-right">Người thao tác</th>
                  <th className="pb-3 text-right pl-2">Khôi phục</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="py-3 pr-4 whitespace-nowrap text-nest-text-secondary font-medium">{fmt(e.deleted_at)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          e.kind === 'TENANT' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {e.kind === 'TENANT' ? 'Khách thuê' : 'Hợp đồng'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-nest-text-primary">#{e.entity_id}</td>
                    <td className="py-3 text-nest-text-primary font-medium max-w-md">{e.summary}</td>
                    <td className="py-3 text-right text-nest-text-secondary">{e.deleted_by_name || '—'}</td>
                    <td className="py-3 text-right pl-2 whitespace-nowrap">
                      {e.kind === 'TENANT' ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreLogin(e.id)}
                          disabled={restoringId === e.id}
                          title="Bật lại đăng nhập (is_active = true)"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#F2FCFD] text-[#14B8A6] border border-[#14B8A6]/25 hover:bg-[#EBFDFB] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {restoringId === e.id ? '…' : 'Khôi phục'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-nest-text-secondary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
