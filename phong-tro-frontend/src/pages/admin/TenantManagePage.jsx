import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, X, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function TenantManagePage() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', email: '' });
  const [editError, setEditError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteContracts, setDeleteContracts] = useState([]);
  const [deleteModalLoading, setDeleteModalLoading] = useState(false);
  const [deleteModalDeleting, setDeleteModalDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [createForm, setCreateForm] = useState({ full_name: '', phone: '', room_number: '', email: '', password: '' });
  const [tenantsFromApi, setTenantsFromApi] = useState([]);

  const tenants = useMemo(() => {
    if (tenantsFromApi.length > 0) {
      return tenantsFromApi.map((t) => ({
        tenantId: t.tenant_id,
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
    } catch {
      setTenantsFromApi([]);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openEditModal = (tenant) => {
    setEditForm({
      full_name: tenant.name || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
    });
    setEditError('');
    setEditModal({
      tenantId: tenant.tenantId,
      name: tenant.name,
    });
  };

  const closeEditModal = () => {
    if (isEditSubmitting) return;
    setEditModal(null);
    setEditError('');
  };

  const handleUpdateTenant = async (event) => {
    event.preventDefault();
    if (!token || !editModal) return;

    const trimmedName = editForm.full_name.trim();
    const trimmedPhone = editForm.phone.trim();
    const trimmedEmail = editForm.email.trim();

    if (!trimmedName || !trimmedPhone || !trimmedEmail) {
      setEditError('Vui lòng nhập đủ họ tên, số điện thoại và email.');
      return;
    }

    setEditError('');
    setIsEditSubmitting(true);
    try {
      await apiFetch(`/admin/tenants/${editModal.tenantId}`, {
        token,
        method: 'PUT',
        body: {
          full_name: trimmedName,
          phone: trimmedPhone,
          email: trimmedEmail,
        },
      });
      setEditModal(null);
      await fetchTenants();
    } catch (error) {
      const msg = error?.message || '';
      let vnMsg = msg;
      if (msg.includes('email already exists') || msg === 'User already exists') vnMsg = 'Email này đã được dùng bởi tài khoản khác.';
      else if (msg === 'internal error') vnMsg = 'Lỗi hệ thống máy chủ (Vui lòng thử lại sau).';
      else if (msg === 'validation error') vnMsg = 'Dữ liệu nhập không hợp lệ.';
      setEditError(vnMsg || 'Không cập nhật được thông tin khách thuê.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const openDeleteModal = async (tenant) => {
    if (!token) return;
    setDeleteModalError('');
    setDeleteModal({
      tenantId: tenant.tenantId,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      room: tenant.room,
    });
    setDeleteContracts([]);
    setDeleteModalLoading(true);
    try {
      const data = await apiFetch('/admin/contracts', { token });
      const list = data.contracts || [];
      setDeleteContracts(list.filter((c) => Number(c.tenant_id) === Number(tenant.tenantId)));
    } catch {
      setDeleteContracts([]);
      setDeleteModalError('Không tải được danh sách hợp đồng (vẫn có thể xóa khách).');
    } finally {
      setDeleteModalLoading(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleteModalDeleting) return;
    setDeleteModal(null);
    setDeleteContracts([]);
    setDeleteModalError('');
  };

  const confirmDeleteTenant = async () => {
    if (!token || !deleteModal) return;
    setDeleteModalDeleting(true);
    setDeleteModalError('');
    try {
      await apiFetch(`/admin/tenants/${deleteModal.tenantId}`, { token, method: 'DELETE' });
      window.dispatchEvent(new Event('admin-nav-badges-refresh'));
      setDeleteModal(null);
      setDeleteContracts([]);
      setDeleteModalError('');
      await fetchTenants();
    } catch (error) {
      let msg = error?.message || '';
      if (msg.includes('referenced by other records')) {
        msg = 'Không thể xóa vì tài khoản này đang có hợp đồng/hóa đơn liên quan.';
      } else if (msg === 'internal error') {
        msg = 'Lỗi hệ thống máy chủ (Vui lòng thử lại sau).';
      }
      setDeleteModalError(msg || 'Không xóa được khách thuê.');
    } finally {
      setDeleteModalDeleting(false);
    }
  };

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
      let msg = error?.message || '';
      if (msg.includes('email already exists') || msg === 'User already exists') msg = 'Email này đã được dùng bởi tài khoản khác.';
      else if (msg === 'internal error') msg = 'Lỗi hệ thống máy chủ (Vui lòng thử lại sau).';
      else if (msg === 'validation error') msg = 'Dữ liệu nhập không hợp lệ.';
      setFormError(msg || 'Có lỗi xảy ra khi tạo tài khoản khách thuê');
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
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-2 text-[12px] font-bold text-nest-text-secondary mb-4 px-4">
            <span>Họ và tên</span>
            <span>Email</span>
            <span>Số điện thoại</span>
            <span>Phòng</span>
            <span className="text-right pr-1">Thao tác</span>
          </div>
          <div className="space-y-3">
            {isLoadingTenants ? (
              <div className="px-4 py-8 text-sm font-medium text-nest-text-secondary">Đang tải danh sách...</div>
            ) : tenants.length === 0 ? (
              <div className="px-4 py-8 text-sm font-medium text-nest-text-secondary">Chưa có khách thuê nào.</div>
            ) : (
              tenants.map((tenant) => (
                <div
                  key={tenant.tenantId}
                  className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-2 items-center bg-white rounded-2xl px-4 py-3 border border-slate-100"
                >
                  <span className="font-semibold truncate">{tenant.name}</span>
                  <span className="truncate">{tenant.email}</span>
                  <span>{tenant.phone}</span>
                  <span>{tenant.room}</span>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(tenant)}
                      className="p-2 rounded-xl text-nest-primary hover:bg-nest-primary/10 transition-colors"
                      title="Chỉnh sửa khách thuê"
                      aria-label={`Chỉnh sửa ${tenant.name}`}
                    >
                      <Pencil className="w-[18px] h-[18px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(tenant)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Xóa khách thuê"
                      aria-label={`Xóa ${tenant.name}`}
                    >
                      <Trash2 className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {editModal && (
        <div
          className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !isEditSubmitting && closeEditModal()}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-tenant-title"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 id="edit-tenant-title" className="text-2xl font-bold text-nest-text-primary">
                Chỉnh sửa khách thuê
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isEditSubmitting}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[13px] font-medium text-nest-text-secondary mb-4">
              Cập nhật thông tin cho <span className="font-bold text-nest-text-primary">{editModal.name}</span>
            </p>
            <form className="space-y-4" onSubmit={handleUpdateTenant}>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Họ và tên"
              />
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Số điện thoại"
              />
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Email đăng nhập"
              />

              {editError && <p className="text-sm font-medium text-red-500">{editError}</p>}

              <button
                type="submit"
                disabled={isEditSubmitting}
                className="w-full rounded-full bg-nest-primary py-3 font-bold text-white hover:bg-[#0da090] disabled:opacity-70"
              >
                {isEditSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          onClick={() => !deleteModalDeleting && closeDeleteModal()}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[28px] shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-tenant-title"
          >
            <div className="p-6 sm:p-8 border-b border-slate-100">
              <h3 id="delete-tenant-title" className="text-xl font-bold text-nest-text-primary pr-8">
                Xác nhận xóa khách thuê
              </h3>
              <p className="mt-2 text-[13px] font-medium text-nest-text-secondary leading-relaxed">
                Kiểm tra thông tin bên dưới. Sau khi xóa, toàn bộ hợp đồng và hóa đơn gắn khách này sẽ bị gỡ; tài khoản đăng nhập sẽ bị <span className="text-nest-text-primary font-bold">vô hiệu hóa</span>.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="rounded-2xl bg-[#F8FAFB] border border-slate-100 p-4">
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-wide mb-3">Khách thuê</p>
                <dl className="grid grid-cols-1 gap-2 text-[13px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-nest-text-secondary font-medium">Họ tên</dt>
                    <dd className="font-bold text-nest-text-primary text-right">{deleteModal.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-nest-text-secondary font-medium">Email</dt>
                    <dd className="font-semibold text-nest-text-primary text-right break-all">{deleteModal.email}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-nest-text-secondary font-medium">Điện thoại</dt>
                    <dd className="font-semibold text-nest-text-primary">{deleteModal.phone || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-nest-text-secondary font-medium">Phòng</dt>
                    <dd className="font-semibold text-nest-text-primary">{deleteModal.room || '—'}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-wide mb-2">Hợp đồng liên quan</p>
                {deleteModalLoading ? (
                  <p className="text-[13px] text-nest-text-secondary py-4">Đang tải...</p>
                ) : deleteContracts.length === 0 ? (
                  <p className="text-[13px] font-medium text-nest-text-secondary rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center">
                    Không có hợp đồng nào gắn với khách này.
                  </p>
                ) : (
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-slate-50 text-left text-[10px] font-bold text-nest-text-secondary uppercase tracking-wide">
                          <th className="px-3 py-2">Mã</th>
                          <th className="px-3 py-2">Phòng</th>
                          <th className="px-3 py-2">Thời hạn</th>
                          <th className="px-3 py-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deleteContracts.map((c) => (
                          <tr key={c.contract_id} className="border-t border-slate-100">
                            <td className="px-3 py-2.5 font-mono font-bold text-nest-text-primary">#{c.contract_id}</td>
                            <td className="px-3 py-2.5 font-semibold">{c.room_number ?? '—'}</td>
                            <td className="px-3 py-2.5 text-nest-text-secondary">
                              {c.start_date && c.end_date ? `${c.start_date} → ${c.end_date}` : '—'}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold uppercase">
                                {c.status || '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-100/80 p-4 text-[13px] text-amber-900">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  Bạn có chắc muốn xóa <span className="font-bold">{deleteModal.name}</span>? Thao tác không hoàn tác.
                </p>
              </div>

              {deleteModalError && (
                <p className="text-sm font-medium text-red-600">{deleteModalError}</p>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleteModalDeleting}
                  className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-nest-text-secondary hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteTenant}
                  disabled={deleteModalDeleting}
                  className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20 disabled:opacity-60"
                >
                  {deleteModalDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={deleteModalDeleting}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
