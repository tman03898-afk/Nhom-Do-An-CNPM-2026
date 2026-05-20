import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Camera,
  Lock,
  LogOut,
  Mail,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch, resolveBackendAssetUrl } from '../../lib/api';

function avatarSrc(user) {
  if (user?.avatar_url) return resolveBackendAssetUrl(user.avatar_url);
  const name = user?.full_name || user?.email || 'Admin';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=14B8A6&color=fff`;
}

export default function AdminProfilePage() {
  const { user, token, logout, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [modal, setModal] = useState(null);
  const [formErr, setFormErr] = useState('');
  const [formMsg, setFormMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarRef = useRef(null);

  const [infoForm, setInfoForm] = useState({ full_name: '', email: '', current_password: '' });
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    password_confirm: '',
  });
  const [recoveryForm, setRecoveryForm] = useState({
    code: '',
    new_password: '',
    password_confirm: '',
  });

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/admin/profile/me', { token });
      setProfile(data.user);
    } catch {
      setProfile(user || null);
    }
  }, [token, user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const view = useMemo(
    () => ({
      fullName: profile?.full_name || user?.full_name || 'Administrator',
      email: profile?.email || user?.email || '—',
      role: profile?.role || user?.role || 'ADMIN',
    }),
    [profile, user]
  );

  const openInfoModal = () => {
    setFormErr('');
    setFormMsg('');
    setInfoForm({
      full_name: view.fullName,
      email: view.email,
      current_password: '',
    });
    setModal('info');
  };

  const openPasswordModal = () => {
    setFormErr('');
    setFormMsg('');
    setPwForm({ current_password: '', new_password: '', password_confirm: '' });
    setModal('password');
  };

  const openRecoveryModal = () => {
    setFormErr('');
    setFormMsg('');
    setRecoveryForm({ code: '', new_password: '', password_confirm: '' });
    setModal('recovery');
  };

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE}/admin/profile/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Upload thất bại');
      setProfile(data.user);
      await refreshUser();
      addToast('Đã cập nhật ảnh đại diện.', 'success');
    } catch (err) {
      addToast(err?.message || 'Không tải được ảnh.', 'error');
    } finally {
      setAvatarBusy(false);
      if (avatarRef.current) avatarRef.current.value = '';
    }
  };

  const saveInfo = async (e) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setFormErr('');
    try {
      const data = await apiFetch('/admin/profile/update', {
        token,
        method: 'POST',
        body: {
          full_name: infoForm.full_name.trim(),
          email: infoForm.email.trim(),
          current_password: infoForm.current_password,
        },
      });
      setProfile(data.user);
      await refreshUser();
      addToast('Đã cập nhật thông tin.', 'success');
      setModal(null);
    } catch (err) {
      setFormErr(err?.message || 'Không lưu được.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setFormErr('');
    try {
      await apiFetch('/admin/profile/change-password', {
        token,
        method: 'POST',
        body: pwForm,
      });
      addToast('Đã đổi mật khẩu.', 'success');
      setModal(null);
    } catch (err) {
      setFormErr(err?.message || 'Không đổi được mật khẩu.');
    } finally {
      setBusy(false);
    }
  };

  const requestRecoveryCode = async () => {
    if (!token) return;
    setBusy(true);
    setFormErr('');
    setFormMsg('');
    try {
      const data = await apiFetch('/admin/profile/password-recovery/request', {
        token,
        method: 'POST',
        body: {},
      });
      let msg = data.message || 'Đã gửi mã.';
      if (data.debug_otp) msg += ` (mã thử: ${data.debug_otp})`;
      setFormMsg(msg);
    } catch (err) {
      setFormErr(err?.message || 'Không gửi được mã.');
    } finally {
      setBusy(false);
    }
  };

  const applyRecovery = async (e) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setFormErr('');
    try {
      await apiFetch('/admin/profile/password-recovery/apply', {
        token,
        method: 'POST',
        body: recoveryForm,
      });
      addToast('Đã đặt mật khẩu mới.', 'success');
      setModal(null);
    } catch (err) {
      setFormErr(err?.message || 'Không đặt được mật khẩu.');
    } finally {
      setBusy(false);
    }
  };

  const settingsItems = [
    {
      title: 'Cập nhật thông tin',
      desc: 'Họ tên, email (cần mật khẩu hiện tại)',
      icon: <User size={18} />,
      color: 'bg-[#E6F8F6] text-[#14B8A6]',
      onClick: openInfoModal,
    },
    {
      title: 'Đổi mật khẩu',
      desc: 'Nhập mật khẩu hiện tại và mật khẩu mới',
      icon: <Lock size={18} />,
      color: 'bg-[#EBF4FF] text-[#3B82F6]',
      onClick: openPasswordModal,
    },
    {
      title: 'Khôi phục mật khẩu',
      desc: 'Gửi mã OTP qua email đăng ký',
      icon: <Mail size={18} />,
      color: 'bg-[#FFF3E0] text-[#E68A00]',
      onClick: openRecoveryModal,
    },
    {
      title: 'Đăng xuất',
      desc: 'Thoát khỏi phiên làm việc',
      icon: <LogOut size={18} />,
      color: 'bg-[#FFF0F0] text-[#D14D4D]',
      onClick: logout,
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-[900px]">
      <div>
        <h1 className="text-[32px] font-bold text-[#0F3A40] tracking-tight">Hồ sơ Admin</h1>
        <p className="text-[14px] text-[#4A787C] font-medium mt-2">
          Cập nhật thông tin cá nhân và quản lý mật khẩu tài khoản quản trị.
        </p>
      </div>

      <div className="bg-[#BDDEE2] rounded-[32px] p-8 flex flex-col sm:flex-row items-center gap-8">
        <div className="relative shrink-0">
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
          <button
            type="button"
            disabled={avatarBusy}
            onClick={() => avatarRef.current?.click()}
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden group relative"
          >
            <img
              src={avatarSrc(profile || user)}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center">
              <Camera className="text-white" size={28} />
            </div>
          </button>
        </div>
        <div>
          <span className="text-[11px] font-bold text-[#1E4D54]/60 uppercase tracking-widest">Quản trị viên</span>
          <h2 className="text-3xl font-bold text-[#1E4D54] mt-1">{view.fullName}</h2>
          <p className="text-[#4A787C] font-medium mt-1">{view.email}</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full">
            <BadgeCheck size={16} className="text-[#14B8A6]" />
            <span className="text-[12px] font-bold text-[#1E4D54]">{view.role}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {settingsItems.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={item.onClick}
            className="text-left bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#14B8A6]/30 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
              {item.icon}
            </div>
            <h3 className="font-bold text-[#0F3A40]">{item.title}</h3>
            <p className="text-[12px] text-[#82ABB0] font-medium mt-1">{item.desc}</p>
          </button>
        ))}
      </div>

      <p className="text-[12px] text-[#82ABB0]">
        Quên mật khẩu khi chưa đăng nhập?{' '}
        <Link to="/forgot-password" className="text-[#14B8A6] font-bold hover:underline">
          Khôi phục qua trang Đặt lại mật khẩu
        </Link>
      </p>

      {modal === 'info' && (
        <Modal title="Cập nhật thông tin" onClose={() => !busy && setModal(null)}>
          <form className="space-y-4" onSubmit={saveInfo}>
            <Field label="Họ và tên">
              <input
                value={infoForm.full_name}
                onChange={(e) => setInfoForm((p) => ({ ...p, full_name: e.target.value }))}
                className="input-field"
                required
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={infoForm.email}
                onChange={(e) => setInfoForm((p) => ({ ...p, email: e.target.value }))}
                className="input-field"
                required
              />
            </Field>
            <Field label="Mật khẩu hiện tại (xác nhận)">
              <input
                type="password"
                value={infoForm.current_password}
                onChange={(e) => setInfoForm((p) => ({ ...p, current_password: e.target.value }))}
                className="input-field"
                required
              />
            </Field>
            <FormMessages err={formErr} msg={formMsg} />
            <SubmitRow busy={busy} onCancel={() => setModal(null)} />
          </form>
        </Modal>
      )}

      {modal === 'password' && (
        <Modal title="Đổi mật khẩu" onClose={() => !busy && setModal(null)}>
          <form className="space-y-4" onSubmit={savePassword}>
            <Field label="Mật khẩu hiện tại">
              <input
                type="password"
                value={pwForm.current_password}
                onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
                className="input-field"
                required
              />
            </Field>
            <Field label="Mật khẩu mới (tối thiểu 8 ký tự)">
              <input
                type="password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))}
                className="input-field"
                required
              />
            </Field>
            <Field label="Nhập lại mật khẩu mới">
              <input
                type="password"
                value={pwForm.password_confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, password_confirm: e.target.value }))}
                className="input-field"
                required
              />
            </Field>
            <FormMessages err={formErr} msg={formMsg} />
            <SubmitRow busy={busy} onCancel={() => setModal(null)} />
          </form>
        </Modal>
      )}

      {modal === 'recovery' && (
        <Modal title="Khôi phục mật khẩu" onClose={() => !busy && setModal(null)}>
          <form className="space-y-4" onSubmit={applyRecovery}>
            <p className="text-[13px] text-[#4A787C]">
              Mã OTP sẽ gửi tới email đăng ký: <span className="font-bold">{view.email}</span>
            </p>
            <button
              type="button"
              onClick={requestRecoveryCode}
              disabled={busy}
              className="w-full py-2.5 rounded-full border border-[#14B8A6] text-[#14B8A6] font-bold text-[13px] hover:bg-[#EBFDFB]"
            >
              Gửi mã OTP
            </button>
            <Field label="Mã OTP (6 số)">
              <input
                value={recoveryForm.code}
                onChange={(e) => setRecoveryForm((p) => ({ ...p, code: e.target.value }))}
                className="input-field"
                maxLength={6}
                required
              />
            </Field>
            <Field label="Mật khẩu mới">
              <input
                type="password"
                value={recoveryForm.new_password}
                onChange={(e) => setRecoveryForm((p) => ({ ...p, new_password: e.target.value }))}
                className="input-field"
                required
              />
            </Field>
            <Field label="Nhập lại mật khẩu mới">
              <input
                type="password"
                value={recoveryForm.password_confirm}
                onChange={(e) => setRecoveryForm((p) => ({ ...p, password_confirm: e.target.value }))}
                className="input-field"
                required
              />
            </Field>
            <FormMessages err={formErr} msg={formMsg} />
            <SubmitRow busy={busy} onCancel={() => setModal(null)} label="Đặt mật khẩu mới" />
          </form>
        </Modal>
      )}

      <style>{`
        .input-field {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          padding: 0.75rem 1rem;
          outline: none;
          font-weight: 600;
          color: #0f3a40;
        }
        .input-field:focus { border-color: #14b8a6; }
      `}</style>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-[28px] p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-[#0F3A40]">{title}</h3>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function FormMessages({ err, msg }) {
  return (
    <>
      {err ? <p className="text-sm text-red-600 font-medium">{err}</p> : null}
      {msg ? <p className="text-sm text-[#14B8A6] font-medium">{msg}</p> : null}
    </>
  );
}

function SubmitRow({ busy, onCancel, label = 'Lưu' }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} disabled={busy} className="flex-1 py-3 rounded-full font-bold text-[#4A787C]">
        Hủy
      </button>
      <button
        type="submit"
        disabled={busy}
        className="flex-1 py-3 rounded-full bg-[#14B8A6] text-white font-bold disabled:opacity-60"
      >
        {busy ? 'Đang xử lý...' : label}
      </button>
    </div>
  );
}
