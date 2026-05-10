import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, X } from 'lucide-react';

export default function TenantManagePage() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [createForm, setCreateForm] = useState({ full_name: '', phone: '', room_number: '', email: '', password: '' });
  const [tenantsFromApi, setTenantsFromApi] = useState([]);

  const tenants = useMemo(() => {
    if (tenantsFromApi.length > 0) {
      return tenantsFromApi.map((t) => ({
        name: t.full_name,
        email: t.email,
        phone: t.phone || '',
        room: t.room_number || '',
      }));
    }
    return [];
  }, [tenantsFromApi]);

  const openCreateModal = () => {
    setCreateForm({ full_name: '', phone: '', room_number: '', email: '', password: '' });
    setFormError('');
    setFormSuccess('');
    setIsCreateModalOpen(true);
  };

  const fetchTenants = async () => {
    if (!token) return;
    setIsLoadingTenants(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Không thể tải danh sách khách thuê');
      }
      setTenantsFromApi(data.tenants || []);
    } catch (error) {
      setTenantsFromApi([]);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleCreateTenant = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!createForm.full_name || !createForm.phone || !createForm.room_number || !createForm.email || !createForm.password) {
      setFormError('Vui lòng nhập đủ họ tên, số điện thoại, số phòng, email và mật khẩu.');
      return;
    }

    if (!token) {
      setFormError('Phiên đăng nhập admin đã hết hạn, vui lòng đăng nhập lại.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/auth/users/tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createForm),
      });
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Không thể tạo tài khoản tenant');
      }

      setFormSuccess(`Đã tạo tài khoản cho ${data.user.full_name} (${data.user.email})`);
      setCreateForm({ full_name: '', phone: '', room_number: '', email: '', password: '' });
      await fetchTenants();
    } catch (error) {
      setFormError(error.message || 'Có lỗi xảy ra khi tạo tài khoản tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl sm:text-[32px] font-sans font-bold text-nest-text-primary">Quản lý Khách thuê</h1>
          <button
            onClick={openCreateModal}
            className="bg-nest-primary hover:bg-[#0da090] text-white px-6 py-2.5 rounded-full text-[14px] font-bold transition-colors shadow-lg shadow-nest-primary/20 flex items-center gap-2"
          >
            <UserPlus className="w-[18px] h-[18px]" /> Thêm khách
          </button>
        </div>

        <div className="bg-white/80 rounded-[32px] p-4 sm:p-8 border border-slate-200/60">
          <div className="grid grid-cols-4 text-[12px] font-bold text-nest-text-secondary mb-4 px-4">
            <span>Họ và tên</span>
            <span>Email</span>
            <span>Số điện thoại</span>
            <span>Phòng</span>
          </div>
          <div className="space-y-3">
            {isLoadingTenants ? (
              <div className="px-4 py-8 text-sm font-medium text-nest-text-secondary">Đang tải danh sách...</div>
            ) : tenants.length === 0 ? (
              <div className="px-4 py-8 text-sm font-medium text-nest-text-secondary">Chưa có khách thuê nào.</div>
            ) : (
              tenants.map((tenant, idx) => (
                <div key={idx} className="grid grid-cols-4 items-center bg-white rounded-2xl px-4 py-3 border border-slate-100">
                  <span className="font-semibold">{tenant.name}</span>
                  <span>{tenant.email}</span>
                  <span>{tenant.phone}</span>
                  <span>{tenant.room}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-nest-text-primary">Cấp tài khoản khách thuê</h3>
              <button
                onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleCreateTenant}>
              <input
                type="text"
                value={createForm.full_name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Họ và tên"
              />
              <input
                type="text"
                value={createForm.phone}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Số điện thoại"
              />
              <input
                type="text"
                value={createForm.room_number}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, room_number: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Số phòng (ví dụ: P.301)"
              />
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Email đăng nhập"
              />
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Mật khẩu tạm thời"
              />

              {formError && <p className="text-sm font-medium text-red-500">{formError}</p>}
              {formSuccess && <p className="text-sm font-medium text-emerald-600">{formSuccess}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-nest-primary py-3 font-bold text-white hover:bg-[#0da090] disabled:opacity-70"
              >
                {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
