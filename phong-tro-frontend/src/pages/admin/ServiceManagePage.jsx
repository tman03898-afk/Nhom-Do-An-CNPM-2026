import { useEffect, useState, useCallback } from 'react';
import {
  Zap, Droplet, Wifi, Trash2, Save, Plus, X,
  Settings2, User, Hash, Box, Info, UserCheck, XCircle, RefreshCw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

export default function ServiceManagePage() {
  const { addToast } = useToast();
  const { token } = useAuth();

  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFeeSubs, setPendingFeeSubs] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [busyFeeId, setBusyFeeId] = useState(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newSvc, setNewSvc] = useState({ title: '', desc: '', value: '', method: 'fixed' });
  const [dirtyIds, setDirtyIds] = useState(() => new Set());

  const getIcon = (name) => {
    switch (name) {
      case 'Zap': return <Zap className="w-6 h-6" fill="currentColor" />;
      case 'Droplet': return <Droplet className="w-6 h-6" fill="currentColor" />;
      case 'Wifi': return <Wifi className="w-6 h-6" />;
      case 'Trash2': return <Trash2 className="w-6 h-6" fill="currentColor" />;
      default: return <Settings2 className="w-6 h-6" />;
    }
  };

  const toUiMethod = (unit) => {
    if (unit === 'kWh' || unit === 'm3' || unit === 'm³') return 'meter';
    if (unit === 'person') return 'person';
    return 'fixed';
  };

  const fromUi = (svc) => {
    const method = svc.method;
    let unit = 'month';
    if (method === 'meter') unit = 'kWh';
    if (method === 'person') unit = 'person';
    if (method === 'fixed') unit = 'month';
    return {
      name: svc.title,
      unit,
      price: Number(svc.value || 0),
      is_active: true,
    };
  };

  const refresh = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiFetch('/admin/services', { token });
      const mapped = (data.services || []).map((s) => ({
        id: String(s.service_id),
        service_id: s.service_id,
        title: s.name,
        desc: s.unit ? `Đơn vị: ${s.unit}` : '',
        icon: 'Settings2',
        method: toUiMethod(s.unit),
        value: String(s.price ?? ''),
      }));
      setServices(mapped);
      setDirtyIds(new Set());
    } catch (e) {
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadPendingFeeSubs = useCallback(async () => {
    if (!token) return;
    setPendingLoading(true);
    try {
      const d = await apiFetch('/admin/fee-subscriptions/pending', { token });
      setPendingFeeSubs(d.pending || []);
    } catch {
      setPendingFeeSubs([]);
    } finally {
      setPendingLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPendingFeeSubs();
  }, [loadPendingFeeSubs]);

  const approveFeeSub = async (id) => {
    if (!token) return;
    setBusyFeeId(id);
    try {
      await apiFetch(`/admin/fee-subscriptions/${id}/approve`, { token, method: 'POST', body: {} });
      addToast('Đã duyệt. Phí sẽ cộng vào hóa đơn từ tháng sau.', 'success');
      await loadPendingFeeSubs();
    } catch (e) {
      addToast(e?.message || 'Không duyệt được.', 'error');
    } finally {
      setBusyFeeId(null);
    }
  };

  const rejectFeeSub = async (id) => {
    if (!token) return;
    const reason = window.prompt('Lý do từ chối (có thể để trống):') ?? '';
    setBusyFeeId(id);
    try {
      await apiFetch(`/admin/fee-subscriptions/${id}/reject`, { token, method: 'POST', body: { reason } });
      addToast('Đã từ chối yêu cầu.', 'success');
      await loadPendingFeeSubs();
    } catch (e) {
      addToast(e?.message || 'Không từ chối được.', 'error');
    } finally {
      setBusyFeeId(null);
    }
  };

  const getMethodLabel = (method) => {
    switch (method) {
      case 'meter': return 'Theo chỉ số (m³/kWh)';
      case 'person': return 'Theo đầu người';
      case 'fixed': return 'Cố định/Phòng';
      default: return 'Cố định';
    }
  };

  const getUnitLabel = (method) => {
    switch (method) {
      case 'meter': return 'VNĐ / Đơn vị';
      case 'person': return 'VNĐ / Người';
      case 'fixed': return 'VNĐ / Tháng';
      default: return 'VNĐ';
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dịch vụ này không?')) {
      setServices(services.filter(s => s.id !== id));
      addToast('Đã xóa dịch vụ thành công!');
    }
  };

  const handleAdd = () => {
    if (!newSvc.title || !newSvc.value) {
      addToast('Vui lòng điền tên và đơn giá dịch vụ!', 'error');
      return;
    }
    const run = async () => {
      if (!token) return;
      await apiFetch('/admin/services', { token, method: 'POST', body: fromUi(newSvc) });
      setNewSvc({ title: '', desc: '', value: '', method: 'fixed' });
      setIsAdding(false);
      addToast('Đã thêm dịch vụ mới!');
      await refresh();
    };
    run().catch((e) => addToast(e.message || 'Không thể thêm dịch vụ', 'error'));
  };

  const handleUpdate = (id, field, val) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: val } : s));
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleSaveAll = () => {
    const run = async () => {
      if (!token) return;
      const dirty = Array.from(dirtyIds);
      for (const id of dirty) {
        const svc = services.find((s) => s.id === id);
        if (!svc?.service_id) continue;
        const payload = fromUi(svc);
        await apiFetch(`/admin/services/${svc.service_id}`, { token, method: 'PUT', body: payload });
      }
      addToast('Đã lưu toàn bộ thay đổi hệ thống!');
      await refresh();
    };
    run().catch((e) => addToast(e.message || 'Không thể lưu thay đổi', 'error'));
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-32 relative flex flex-col min-h-[85vh]">
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-[600px]">
            <h1 className="text-[36px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none mb-4">
              Quản lý dịch vụ
            </h1>
            <p className="text-[15px] font-medium text-[#4A787C] leading-relaxed">
              Tùy chỉnh danh mục dịch vụ và cấu hình cách tính phí cho toàn bộ tòa nhà.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-[#0F3A40] hover:bg-[#1F545B] text-white px-6 py-3.5 rounded-2xl text-[14px] font-bold transition-all shadow-xl shadow-[#0F3A40]/10 flex items-center gap-2 h-fit"
          >
            <Plus className="w-5 h-5" /> Thêm dịch vụ
          </button>
        </div>

        {/* Duyệt đăng ký tiện ích (tenant → service_fees) */}
        <div className="mb-10 rounded-[32px] border border-[#BCE1E5]/60 bg-white p-6 shadow-[0_4px_24px_rgba(15,58,64,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F2FCFD] text-[#14B8A6] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0F3A40]">Duyệt đăng ký tiện ích</h2>
                <p className="text-xs text-[#4A787C] font-medium">
                  Tenant gửi từ trang dịch vụ. Sau khi duyệt, phí được cộng vào hóa đơn từ <span className="font-bold">kỳ tháng tiếp theo</span>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadPendingFeeSubs()}
              disabled={pendingLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#BCE1E5] text-[13px] font-bold text-[#0F3A40] hover:bg-[#F2FCFD] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${pendingLoading ? 'animate-spin' : ''}`} /> Làm mới
            </button>
          </div>
          {pendingLoading && pendingFeeSubs.length === 0 ? (
            <p className="text-sm text-[#4A787C] py-4">Đang tải…</p>
          ) : pendingFeeSubs.length === 0 ? (
            <p className="text-sm text-[#4A787C] py-2">Không có yêu cầu chờ duyệt.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#BCE1E5]/40">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-[#F2FCFD] text-[10px] font-bold uppercase tracking-wider text-[#82ABB0]">
                    <th className="px-3 py-2.5">Phòng</th>
                    <th className="px-3 py-2.5">Tenant</th>
                    <th className="px-3 py-2.5">Tiện ích</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Phí/tháng</th>
                    <th className="px-3 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingFeeSubs.map((row) => {
                    const busy = busyFeeId === row.id;
                    return (
                      <tr key={row.id} className="border-t border-[#BCE1E5]/30">
                        <td className="px-3 py-2.5 font-bold text-[#0F3A40]">{row.room_number || '—'}</td>
                        <td className="px-3 py-2.5 text-[#4A787C]">
                          <div className="font-medium text-[#0F3A40]">{row.tenant_name || '—'}</div>
                          <div className="text-xs">{row.tenant_email || ''}</div>
                        </td>
                        <td className="px-3 py-2.5 text-[#0F3A40]">{row.fee_name}</td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                          {Number(row.monthly_price || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => approveFeeSub(row.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#14B8A6] text-white text-xs font-bold mr-2 hover:bg-[#0da090] disabled:opacity-50"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => rejectFeeSub(row.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Từ chối
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Adding New Service Form (Inline Card) */}
        {isAdding && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-[#14B8A6] rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 space-y-6 w-full">
                  <div className="flex items-center gap-3 text-white">
                    <Plus className="bg-white/20 p-1.5 rounded-lg w-8 h-8" />
                    <h3 className="text-xl font-bold">Thêm dịch vụ phát sinh mới</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Tên dịch vụ (VD: Phí giữ xe...)"
                      value={newSvc.title}
                      onChange={(e) => setNewSvc({ ...newSvc, title: e.target.value })}
                      className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3.5 text-white placeholder:text-white/60 focus:bg-white/20 outline-none transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Mô tả ngắn"
                      value={newSvc.desc}
                      onChange={(e) => setNewSvc({ ...newSvc, desc: e.target.value })}
                      className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3.5 text-white placeholder:text-white/60 focus:bg-white/20 outline-none transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Đơn giá"
                      value={newSvc.value}
                      onChange={(e) => setNewSvc({ ...newSvc, value: e.target.value })}
                      className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3.5 text-white placeholder:text-white/60 focus:bg-white/20 outline-none transition-all"
                    />
                    <div className="relative">
                      <select 
                         value={newSvc.method}
                         onChange={(e) => setNewSvc({...newSvc, method: e.target.value})}
                         className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 pr-12 py-3.5 text-white focus:bg-white/20 outline-none transition-all cursor-pointer appearance-none"
                      >
                         <option value="fixed" className="text-[#0F3A40]">Cố định / Trọn gói</option>
                         <option value="person" className="text-[#0F3A40]">Theo đầu người</option>
                         <option value="meter" className="text-[#0F3A40]">Theo chỉ số (Điện/Nước)</option>
                      </select>
                      <Settings2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setIsAdding(false)} className="px-6 py-3.5 rounded-2xl text-white font-bold bg-white/10 hover:bg-white/20 transition-all">Hủy</button>
                  <button onClick={handleAdd} className="px-8 py-3.5 rounded-2xl bg-white text-[#14B8A6] font-bold shadow-lg hover:bg-[#F2FCFD] transition-all">Hoàn tất</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {isLoading ? (
            <div className="col-span-full text-center text-[#4A787C] font-medium py-10">Đang tải dịch vụ...</div>
          ) : services.length === 0 ? (
            <div className="col-span-full text-center text-[#4A787C] font-medium py-10">Chưa có dịch vụ nào.</div>
          ) : services.map((svc) => (
            <div key={svc.id} className="bg-white rounded-[40px] p-8 shadow-[0_4px_25px_rgba(15,58,64,0.06)] border border-[#BCE1E5]/20 hover:border-[#14B8A6]/40 transition-all group relative overflow-hidden">
              <button
                onClick={() => handleDelete(svc.id)}
                className="absolute top-6 right-6 p-2 text-[#82ABB0] hover:text-[#D14D4D] hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-5 mb-10">
                <div className="w-[60px] h-[60px] rounded-[20px] bg-[#F2FCFD] text-[#14B8A6] flex items-center justify-center shadow-inner group-hover:bg-[#14B8A6] group-hover:text-white transition-all duration-500">
                  {getIcon(svc.icon)}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={svc.title}
                    onChange={(e) => handleUpdate(svc.id, 'title', e.target.value)}
                    className="text-[20px] font-bold text-[#0F3A40] mb-0.5 bg-transparent border-b border-transparent hover:border-[#14B8A6]/30 focus:border-[#14B8A6] outline-none w-full"
                  />
                  <input
                    type="text"
                    value={svc.desc}
                    onChange={(e) => handleUpdate(svc.id, 'desc', e.target.value)}
                    className="text-[12px] font-medium text-[#82ABB0] bg-transparent border-b border-transparent hover:border-[#14B8A6]/30 focus:border-[#14B8A6] outline-none w-full"
                  />
                </div>
              </div>

              {/* Calculation Method Select */}
              <div className="mb-8">
                <label className="text-[10px] font-bold text-[#82ABB0] uppercase tracking-widest mb-2 block pl-1">Cách tính phí</label>
                <div className="relative">
                    <select 
                       value={svc.method}
                       onChange={(e) => handleUpdate(svc.id, 'method', e.target.value)}
                       className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl px-5 pr-12 py-3.5 text-[14px] font-bold text-[#0F3A40] outline-none appearance-none cursor-pointer focus:border-[#14B8A6]/40"
                    >
                    <option value="meter">Theo chỉ số (Tự động tính theo mức chênh lệch)</option>
                    <option value="person">Theo đầu người (Số khách x Đơn giá)</option>
                    <option value="fixed">Cố định / Trọn gói (Áp dụng theo từng hóa đơn)</option>
                  </select>
                  <Settings2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#82ABB0] pointer-events-none" />
                </div>
              </div>

              <div className="relative">
                <div className="absolute -top-3 left-6 z-10 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-[#4A787C] tracking-widest uppercase shadow-sm border border-[#BCE1E5]/30 flex items-center gap-2">
                  {svc.method === 'meter' ? <Hash size={10} /> : svc.method === 'person' ? <User size={10} /> : <Box size={10} />}
                  {getUnitLabel(svc.method)}
                </div>
                <div className="flex items-center bg-[#DDF5F7]/40 rounded-[28px] px-8 py-5 border-2 border-transparent focus-within:border-[#14B8A6]/30 transition-all shadow-inner">
                  <input
                    type="number"
                    value={svc.value}
                    onChange={(e) => handleUpdate(svc.id, 'value', e.target.value)}
                    className="flex-1 bg-transparent font-bold text-[28px] text-[#0F3A40] outline-none"
                  />
                  <span className="text-[#14B8A6] font-bold text-[18px]">VNĐ</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Note / Info */}
        <div className="bg-[#0F3A40]/5 rounded-[32px] p-6 flex items-start gap-4 border border-[#0F3A40]/10 mb-12">
          <div className="p-2 rounded-xl bg-white text-[#0F3A40] shadow-sm">
            <Info size={20} />
          </div>
          <p className="text-[14px] text-[#4A787C] font-medium leading-relaxed">
            **Lưu ý:** Việc thay đổi cách tính phí sẽ ảnh hưởng trực tiếp đến quy trình lập hóa đơn. <br />
            Ví dụ: Dịch vụ **"Theo chỉ số"** sẽ yêu cầu người quản lý nhập chỉ số cũ và mới khi chốt sổ hàng tháng.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-auto pt-8 pb-12 items-center z-10">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isLoading || dirtyIds.size === 0}
            className="text-[#4A787C] hover:text-[#0F3A40] font-bold px-6 py-3.5 transition-colors text-[14px] disabled:opacity-40"
          >
            Hủy mọi thay đổi
          </button>
          <button
            onClick={handleSaveAll}
            className="bg-[#14B8A6] hover:bg-[#0da090] text-white px-10 py-4 rounded-full text-[15px] font-bold transition-all shadow-xl shadow-[#14B8A6]/20 flex items-center gap-3 animate-pulse-slow"
          >
            <Save className="w-5 h-5" /> ÁP DỤNG HỆ THỐNG
          </button>
        </div>
      </div>
    </div>
  );
}
