import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  PhoneCall,
  MessageCircle,
  Lock,
  ShieldCheck,
  LogOut,
  ChevronRight,
  BadgeCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function toIsoDateInput(value) {
  if (!value) return '';
  const s = typeof value === 'string' ? value : String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

function formatDateVi(iso) {
  const d = toIsoDateInput(iso);
  if (!d) return '—';
  const [y, mo, day] = d.split('-');
  return `${day}/${mo}/${y}`;
}

function normEmail(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function resolveTenantAvatarSrc(row) {
  const raw = row?.avatar_url;
  const name = row?.full_name || 'User';
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=14B8A6&color=fff`;
  if (!raw) return fallback;
  if (String(raw).startsWith('http')) return raw;
  const api = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const origin = api.replace(/\/api\/?$/, '');
  return `${origin}${String(raw).startsWith('/') ? raw : `/${raw}`}`;
}

/** modal: identity | phone | email | password — mỗi loại chỉ sửa đúng phần đó */
export default function ProfilePage() {
  const { user, token, logout, refreshUser } = useAuth();
  const [tenantProfile, setTenantProfile] = useState(null);

  const [modal, setModal] = useState(null);

  const [identity, setIdentity] = useState({
    full_name: '',
    cccd: '',
    date_of_birth: '',
    otp: '',
  });
  const [phoneEdit, setPhoneEdit] = useState({ phone: '', otp: '' });
  const [emailEdit, setEmailEdit] = useState({ email: '', email_otp: '', otp: '' });
  const [pwEdit, setPwEdit] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    otp: '',
  });
  /** current → nhập MK hiện tại; otp → MK mới + OTP SMS; recovery_* → quên MK */
  const [pwStep, setPwStep] = useState('current');
  /** @type {null | 'sms' | 'email'} */
  const [recoveryChannel, setRecoveryChannel] = useState(null);

  const [otpSending, setOtpSending] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState(null);
  const [formErr, setFormErr] = useState(null);
  const [lastMaskedPhone, setLastMaskedPhone] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState(null);
  const avatarInputRef = useRef(null);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/tenant/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) return;
      setTenantProfile(data.tenant);
    } catch {
      setTenantProfile(null);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!modal || !tenantProfile) return;
    if (modal === 'identity') {
      setIdentity({
        full_name: tenantProfile.full_name || '',
        cccd: tenantProfile.cccd || '',
        date_of_birth: toIsoDateInput(tenantProfile.date_of_birth),
        otp: '',
      });
    } else if (modal === 'phone') {
      setPhoneEdit({ phone: tenantProfile.phone || '', otp: '' });
    } else if (modal === 'email') {
      setEmailEdit({
        email: tenantProfile.email || '',
        email_otp: '',
        otp: '',
      });
    } else if (modal === 'password') {
      setPwEdit({
        current_password: '',
        new_password: '',
        confirm_password: '',
        otp: '',
      });
      setPwStep('current');
      setRecoveryChannel(null);
    }
    setFormMsg(null);
    setFormErr(null);
    setLastMaskedPhone(null);
  }, [modal, tenantProfile]);

  const view = useMemo(() => {
    return {
      fullName: tenantProfile?.full_name || user?.full_name || user?.name || 'Khách thuê',
      email: tenantProfile?.email || user?.email || '—',
      phone: tenantProfile?.phone || '—',
      roomNumber: tenantProfile?.room_number || '—',
      cccd: tenantProfile?.cccd || null,
      dob: tenantProfile?.date_of_birth || null,
    };
  }, [tenantProfile, user]);

  const settingsItems = [
    {
      title: 'Cập nhật số điện thoại',
      desc: 'Chỉ đổi SĐT — OTP SMS',
      icon: <Phone size={18} />,
      color: 'bg-[#E6F8F6] text-[#14B8A6]',
      onClick: () => setModal('phone'),
    },
    {
      title: 'Đổi mật khẩu',
      desc: 'Xác nhận mật khẩu hiện tại, OTP SMS hoặc quên mật khẩu qua SMS/Gmail',
      icon: <Lock size={18} />,
      color: 'bg-[#EBF4FF] text-[#3B82F6]',
      onClick: () => setModal('password'),
    },
    {
      title: 'Xác thực 2 bước',
      desc: 'Bảo vệ thông tin cá nhân',
      icon: <ShieldCheck size={18} />,
      color: 'bg-[#EAFDFB] text-[#14B8A6]',
    },
    {
      title: 'Đăng xuất',
      desc: 'Thoát khỏi phiên làm việc',
      icon: <LogOut size={18} />,
      color: 'bg-[#FFF0F0] text-[#D14D4D]',
      onClick: logout,
    },
  ];

  async function postTenantJson(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.message || 'Không thực hiện được.');
    }
    return data;
  }

  async function postProfileUpdate(body) {
    const res = await fetch(`${API_BASE}/tenant/profile/update`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.message || 'Không lưu được.');
    }
    setTenantProfile(data.tenant);
    await refreshUser();
    return data;
  }

  async function handleSendOtp() {
    if (!token) return;
    setFormErr(null);
    setFormMsg(null);
    setOtpSending(true);
    try {
      const res = await fetch(`${API_BASE}/tenant/profile/request-otp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setFormErr(data?.message || 'Không gửi được mã OTP.');
        return;
      }
      setFormMsg(data.message || 'Đã gửi mã OTP.');
      if (data.masked_phone) setLastMaskedPhone(data.masked_phone);
      if (data.demo_otp) {
        setFormMsg(`${data.message || ''} Mã demo: ${data.demo_otp}`);
      } else if (data.debug_otp) {
        setFormMsg(`${data.message || ''} (OTP_DEBUG: ${data.debug_otp})`);
      }
    } catch {
      setFormErr('Không kết nối được máy chủ.');
    } finally {
      setOtpSending(false);
    }
  }

  async function handleSendEmailCode() {
    if (!token) return;
    setFormErr(null);
    setFormMsg(null);
    const target = normEmail(emailEdit.email);
    if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setFormErr('Nhập email mới hợp lệ trước khi gửi mã.');
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch(`${API_BASE}/tenant/profile/request-email-code`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_email: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setFormErr(data?.message || 'Không gửi được mã email.');
        return;
      }
      let msg = data.message || 'Đã gửi mã tới email.';
      if (data.debug_email_code) {
        msg = `${msg} (mã thử: ${data.debug_email_code})`;
      }
      setFormMsg(msg);
    } catch {
      setFormErr('Không kết nối được máy chủ.');
    } finally {
      setEmailSending(false);
    }
  }

  async function saveIdentity(e) {
    e.preventDefault();
    if (!token) return;
    setFormErr(null);
    setFormMsg(null);
    const otp = identity.otp.trim();
    if (!/^\d{6}$/.test(otp)) {
      setFormErr('Nhập mã OTP SMS (6 số).');
      return;
    }
    const base = tenantProfile || {};
    const body = { otp };
    if (identity.full_name.trim() !== String(base.full_name || '').trim()) {
      body.full_name = identity.full_name.trim();
    }
    if (identity.cccd.trim() !== String(base.cccd || '').trim()) {
      body.cccd = identity.cccd.trim();
    }
    const dobCur = toIsoDateInput(base.date_of_birth) || '';
    if (identity.date_of_birth.trim() !== dobCur) {
      body.date_of_birth = identity.date_of_birth.trim();
    }
    if (Object.keys(body).length <= 1) {
      setFormErr('Bạn chưa thay đổi họ tên, CCCD hoặc ngày sinh.');
      return;
    }
    setSaving(true);
    try {
      await postProfileUpdate(body);
      setModal(null);
    } catch (err) {
      setFormErr(err.message || 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  }

  async function savePhone(e) {
    e.preventDefault();
    if (!token) return;
    setFormErr(null);
    setFormMsg(null);
    const otp = phoneEdit.otp.trim();
    if (!/^\d{6}$/.test(otp)) {
      setFormErr('Nhập mã OTP SMS (6 số).');
      return;
    }
    const base = tenantProfile || {};
    if (phoneEdit.phone.trim() === String(base.phone || '').trim()) {
      setFormErr('Số điện thoại giống số hiện tại.');
      return;
    }
    setSaving(true);
    try {
      await postProfileUpdate({
        otp,
        phone: phoneEdit.phone.trim(),
      });
      setModal(null);
    } catch (err) {
      setFormErr(err.message || 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  }

  async function saveEmail(e) {
    e.preventDefault();
    if (!token) return;
    setFormErr(null);
    setFormMsg(null);
    const otp = emailEdit.otp.trim();
    if (!/^\d{6}$/.test(otp)) {
      setFormErr('Nhập mã OTP SMS (6 số).');
      return;
    }
    const base = tenantProfile || {};
    const next = normEmail(emailEdit.email);
    if (!next || next === normEmail(base.email || '')) {
      setFormErr('Nhập email mới khác email hiện tại.');
      return;
    }
    const eo = emailEdit.email_otp.replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(eo)) {
      setFormErr('Nhập mã 6 số gửi tới email mới.');
      return;
    }
    setSaving(true);
    try {
      await postProfileUpdate({
        otp,
        email: next,
        email_otp: eo,
      });
      setModal(null);
    } catch (err) {
      setFormErr(err.message || 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token) return;
    setAvatarErr(null);
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch(`${API_BASE}/tenant/profile/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Không tải được ảnh.');
      }
      setTenantProfile(data.tenant);
      await refreshUser();
    } catch (err) {
      setAvatarErr(err instanceof Error ? err.message : 'Lỗi upload.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function verifyCurrentPasswordClick(e) {
    e.preventDefault();
    if (!token) return;
    setFormErr(null);
    setFormMsg(null);
    const cur = pwEdit.current_password.trim();
    if (!cur) {
      setFormErr('Nhập mật khẩu hiện tại.');
      return;
    }
    setSaving(true);
    try {
      await postTenantJson('/tenant/profile/verify-current-password', {
        current_password: cur,
      });
      setPwStep('otp');
      setFormMsg('Đã xác nhận mật khẩu hiện tại. Nhập mật khẩu mới và OTP SMS.');
    } catch (err) {
      setFormErr(err.message || 'Mật khẩu không đúng.');
    } finally {
      setSaving(false);
    }
  }

  async function sendRecoveryCode(ch) {
    if (!token) return;
    setFormErr(null);
    setFormMsg(null);
    setOtpSending(true);
    try {
      const up = ch === 'sms' ? 'SMS' : 'EMAIL';
      const data = await postTenantJson('/tenant/profile/password-recovery/request', { channel: up });
      setRecoveryChannel(ch);
      setPwStep('recovery_code');
      setPwEdit((x) => ({ ...x, new_password: '', confirm_password: '', otp: '' }));
      let msg = data.message || 'Đã gửi mã.';
      if (data.demo_otp) msg = `${msg} (mã demo: ${data.demo_otp})`;
      if (data.debug_otp) msg = `${msg} (OTP_DEBUG: ${data.debug_otp})`;
      if (data.debug_email_code) msg = `${msg} (mã thử: ${data.debug_email_code})`;
      setFormMsg(msg);
      if (data.masked_phone) setLastMaskedPhone(data.masked_phone);
    } catch (err) {
      setFormErr(err.message || 'Không gửi được mã.');
    } finally {
      setOtpSending(false);
    }
  }

  async function applyPasswordRecovery(e) {
    e.preventDefault();
    if (!token) return;
    setFormErr(null);
    setFormMsg(null);
    const otp = pwEdit.otp.trim();
    if (!/^\d{6}$/.test(otp)) {
      setFormErr('Nhập đủ mã 6 số.');
      return;
    }
    if (pwEdit.new_password.length < 8) {
      setFormErr('Mật khẩu mới tối thiểu 8 ký tự.');
      return;
    }
    if (pwEdit.new_password !== pwEdit.confirm_password) {
      setFormErr('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!recoveryChannel) {
      setFormErr('Thiếu kênh xác thực.');
      return;
    }
    setSaving(true);
    try {
      const data = await postTenantJson('/tenant/profile/password-recovery/apply', {
        channel: recoveryChannel === 'sms' ? 'SMS' : 'EMAIL',
        code: otp,
        new_password: pwEdit.new_password.trim(),
        password_confirm: pwEdit.confirm_password.trim(),
      });
      setTenantProfile(data.tenant);
      await refreshUser();
      setModal(null);
    } catch (err) {
      setFormErr(err.message || 'Không cập nhật được.');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (!token || pwStep !== 'otp') return;
    setFormErr(null);
    setFormMsg(null);
    const otp = pwEdit.otp.trim();
    if (!/^\d{6}$/.test(otp)) {
      setFormErr('Nhập mã OTP SMS (6 số).');
      return;
    }
    if (pwEdit.new_password !== pwEdit.confirm_password) {
      setFormErr('Mật khẩu mới nhập lại không khớp.');
      return;
    }
    if (!pwEdit.new_password?.trim() || pwEdit.new_password.trim().length < 8) {
      setFormErr('Mật khẩu mới tối thiểu 8 ký tự.');
      return;
    }
    setSaving(true);
    try {
      await postProfileUpdate({
        otp,
        new_password: pwEdit.new_password.trim(),
        current_password: pwEdit.current_password || '',
      });
      setModal(null);
    } catch (err) {
      setFormErr(err.message || 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">
          Thông tin cá nhân
        </h1>
      </div>
      <div className="relative bg-[#BDDEE2] rounded-[40px] p-10 flex items-center gap-8 overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 border-[40px] border-white/10 rounded-full" />
        <div className="absolute bottom-[-30px] right-[100px] w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={onAvatarFileChange}
          />
          <button
            type="button"
            disabled={avatarBusy}
            onClick={() => avatarInputRef.current?.click()}
            className="w-[180px] h-[180px] rounded-full border-[6px] border-white shadow-xl overflow-hidden relative group cursor-pointer disabled:opacity-70 text-left"
          >
            <img
              src={resolveTenantAvatarSrc({
                avatar_url: tenantProfile?.avatar_url,
                full_name: view.fullName,
              })}
              alt=""
              key={tenantProfile?.avatar_url || 'default'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <Camera className="text-white" size={32} />
            </div>
            <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#1E4D54] border-4 border-white flex items-center justify-center text-white shadow-lg pointer-events-none">
              <Camera size={16} />
            </div>
          </button>
          {avatarBusy ? (
            <p className="text-[12px] text-[#1E4D54]/70 mt-2 text-center w-[180px]">Đang tải ảnh…</p>
          ) : null}
          {avatarErr ? (
            <p className="text-[12px] text-red-600 mt-2 text-center max-w-[180px]">{avatarErr}</p>
          ) : null}
          <p className="text-[11px] text-[#1E4D54]/50 mt-1 text-center w-[180px]">Bấm để đổi ảnh</p>
        </div>

        <div className="relative flex flex-col gap-2">
          <span className="text-[12px] font-bold text-[#1E4D54]/60 uppercase tracking-[0.2em]">
            CƯ DÂN CAO CẤP
          </span>
          <h1 className="text-[48px] font-sans font-extrabold text-[#1E4D54] tracking-tight leading-none mb-2">
            {view.fullName}
          </h1>
          <div className="flex items-center gap-4">
            <div className="bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/30 shadow-sm">
              <span className="text-[13px] font-bold text-[#1E4D54]/60 tracking-wider">
                Phòng: {view.roomNumber}
              </span>
            </div>
            <div className="bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/30 shadow-sm">
              <BadgeCheck size={16} className="text-[#14B8A6] fill-[#14B8A6]/10" />
              <span className="text-[13px] font-bold text-[#1E4D54]">Đã xác thực</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[40px] p-10 border border-white shadow-sm flex flex-col h-full">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-10">
            <h3 className="text-[20px] font-bold text-[#0F3A40]">Thông tin chi tiết</h3>
            <button
              type="button"
              onClick={() => setModal('identity')}
              className="text-[13px] font-bold text-[#14B8A6] hover:underline whitespace-nowrap"
            >
              Sửa họ tên &amp; giấy tờ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
            <div className="flex items-start gap-4 md:col-span-2">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6] shrink-0">
                <Phone size={18} className="fill-current" />
              </div>
              <div className="flex-1 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest mb-1.5">
                    SỐ ĐIỆN THOẠI
                  </p>
                  <p className="text-[16px] font-bold text-[#0F3A40]">{view.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal('phone')}
                  className="text-[13px] font-bold text-[#14B8A6] hover:underline shrink-0"
                >
                  Đổi SĐT
                </button>
              </div>
            </div>

            <div className="flex items-start gap-4 md:col-span-2">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6] shrink-0">
                <Mail size={18} className="fill-current" />
              </div>
              <div className="flex-1 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest mb-1.5">
                    EMAIL CÁ NHÂN
                  </p>
                  <p className="text-[16px] font-bold text-[#0F3A40] break-all">{view.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal('email')}
                  className="text-[13px] font-bold text-[#14B8A6] hover:underline shrink-0"
                >
                  Đổi email
                </button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                <CreditCard size={18} className="fill-current" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest mb-1.5">
                  CCCD/CMND
                </p>
                <p className="text-[16px] font-bold text-[#0F3A40]">{view.cccd || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                <Calendar size={18} className="fill-current" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest mb-1.5">
                  NGÀY SINH
                </p>
                <p className="text-[16px] font-bold text-[#0F3A40]">{formatDateVi(view.dob)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[380px] bg-[#1E4D54] rounded-[40px] p-8 flex flex-col shadow-xl shadow-[#1E4D54]/20 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />

          <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2">
            HỖ TRỢ KỸ THUẬT
          </span>
          <h3 className="text-[28px] font-bold mb-4 tracking-tight">Cần giúp đỡ?</h3>
          <p className="text-white/70 text-[14px] leading-relaxed mb-10">
            Đội ngũ CSKH luôn sẵn sàng hỗ trợ bạn 24/7 cho mọi vấn đề.
          </p>

          <div className="space-y-4">
            <div className="bg-white rounded-full py-4 px-8 flex items-center justify-between text-[#1E4D54] shadow-lg">
              <span className="font-extrabold text-[18px]">1800 1234</span>
              <PhoneCall size={20} className="fill-current" />
            </div>
            <button
              type="button"
              className="w-full bg-[#14B8A6] hover:bg-[#109284] text-white py-4 px-8 rounded-full flex items-center justify-center gap-3 font-bold text-[15px] transition-all shadow-lg shadow-[#14B8A6]/20 group/btn"
            >
              Nhắn tin Zalo ngay
              <MessageCircle size={20} className="fill-current group-hover/btn:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[18px] font-bold text-[#0F3A40] px-2">Cài đặt tài khoản</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsItems.map((item, idx) => (
            <div
              key={idx}
              role={item.onClick ? 'button' : undefined}
              tabIndex={item.onClick ? 0 : undefined}
              onClick={item.onClick}
              onKeyDown={(ev) => {
                if (!item.onClick) return;
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  item.onClick();
                }
              }}
              className={`bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-sm flex items-center gap-5 ${
                item.onClick
                  ? 'hover:bg-white hover:scale-[1.02] transition-all cursor-pointer group'
                  : 'opacity-80'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${item.color}`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[16px] font-bold text-[#0F3A40] mb-0.5">{item.title}</h4>
                <p className="text-[13px] text-[#82ABB0] font-medium">{item.desc}</p>
              </div>
              {item.onClick ? (
                <div className="text-[#BCE1E5] group-hover:text-[#14B8A6] transition-colors pr-2">
                  <ChevronRight size={20} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          role="presentation"
          onClick={() => !saving && setModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] bg-white shadow-2xl border border-[#E6F4F5] p-8"
            onClick={(ev) => ev.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F0FAFB] text-[#1E4D54]"
              onClick={() => !saving && setModal(null)}
              aria-label="Đóng"
            >
              <X size={22} />
            </button>

            {modal === 'identity' ? (
              <form onSubmit={saveIdentity} className="space-y-4">
                <h2 className="text-[22px] font-bold text-[#0F3A40] mb-1">Sửa họ tên &amp; giấy tờ</h2>
                <p className="text-[13px] text-[#82ABB0] mb-4">
                  Chỉ cập nhật các ô bạn thay đổi. Xác nhận bằng OTP SMS gửi tới số đăng ký.
                </p>
                <div>
                  <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                    Họ và tên
                  </label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-semibold text-[#0F3A40] outline-none focus:border-[#14B8A6]"
                    value={identity.full_name}
                    onChange={(e) => setIdentity((x) => ({ ...x, full_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                    CCCD/CMND
                  </label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-semibold text-[#0F3A40] outline-none focus:border-[#14B8A6]"
                    value={identity.cccd}
                    onChange={(e) => setIdentity((x) => ({ ...x, cccd: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-semibold text-[#0F3A40] outline-none focus:border-[#14B8A6]"
                    value={identity.date_of_birth}
                    onChange={(e) => setIdentity((x) => ({ ...x, date_of_birth: e.target.value }))}
                  />
                </div>
                <div className="pt-2 space-y-2 border-t border-[#EEF6F7]">
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      disabled={otpSending}
                      onClick={handleSendOtp}
                      className="rounded-full bg-[#E6F8F6] text-[#0F3A40] font-bold text-[13px] px-5 py-2.5 hover:bg-[#D4F2EE] disabled:opacity-50"
                    >
                      {otpSending ? 'Đang gửi…' : 'Gửi mã OTP SMS'}
                    </button>
                    {lastMaskedPhone ? (
                      <span className="text-[12px] text-[#82ABB0]">Gửi tới {lastMaskedPhone}</span>
                    ) : null}
                  </div>
                  <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                    Mã OTP SMS (6 số)
                  </label>
                  <input
                    className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-mono tracking-widest outline-none focus:border-[#14B8A6]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={identity.otp}
                    onChange={(e) =>
                      setIdentity((x) => ({
                        ...x,
                        otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                  />
                </div>
                {formErr ? <p className="text-[13px] text-red-600 font-medium">{formErr}</p> : null}
                {formMsg ? <p className="text-[13px] text-[#14B8A6] font-medium">{formMsg}</p> : null}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-full border border-[#D5EBED] py-3.5 font-bold text-[#82ABB0] hover:bg-[#F7FAFB]"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-full bg-[#14B8A6] py-3.5 font-bold text-white hover:bg-[#109284] disabled:opacity-50"
                  >
                    {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            ) : null}

            {modal === 'phone' ? (
              <form onSubmit={savePhone} className="space-y-4">
                <h2 className="text-[22px] font-bold text-[#0F3A40] mb-1">Đổi số điện thoại</h2>
                <p className="text-[13px] text-[#82ABB0] mb-4">
                  Chỉ nhập số mới và OTP SMS — không ảnh hưởng email hay mật khẩu.
                </p>
                <div>
                  <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                    Số điện thoại mới
                  </label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-semibold text-[#0F3A40] outline-none focus:border-[#14B8A6]"
                    inputMode="tel"
                    value={phoneEdit.phone}
                    onChange={(e) => setPhoneEdit((x) => ({ ...x, phone: e.target.value }))}
                  />
                </div>
                <div className="pt-2 space-y-2 border-t border-[#EEF6F7]">
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      disabled={otpSending}
                      onClick={handleSendOtp}
                      className="rounded-full bg-[#E6F8F6] text-[#0F3A40] font-bold text-[13px] px-5 py-2.5 hover:bg-[#D4F2EE] disabled:opacity-50"
                    >
                      {otpSending ? 'Đang gửi…' : 'Gửi mã OTP SMS'}
                    </button>
                    {lastMaskedPhone ? (
                      <span className="text-[12px] text-[#82ABB0]">Gửi tới {lastMaskedPhone}</span>
                    ) : null}
                  </div>
                  <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                    Mã OTP SMS (6 số)
                  </label>
                  <input
                    className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-mono tracking-widest outline-none focus:border-[#14B8A6]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={phoneEdit.otp}
                    onChange={(e) =>
                      setPhoneEdit((x) => ({
                        ...x,
                        otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                  />
                </div>
                {formErr ? <p className="text-[13px] text-red-600 font-medium">{formErr}</p> : null}
                {formMsg ? <p className="text-[13px] text-[#14B8A6] font-medium">{formMsg}</p> : null}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-full border border-[#D5EBED] py-3.5 font-bold text-[#82ABB0] hover:bg-[#F7FAFB]"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-full bg-[#14B8A6] py-3.5 font-bold text-white hover:bg-[#109284] disabled:opacity-50"
                  >
                    {saving ? 'Đang lưu…' : 'Lưu số mới'}
                  </button>
                </div>
              </form>
            ) : null}

            {modal === 'email' ? (
              <form onSubmit={saveEmail} className="space-y-4">
                <h2 className="text-[22px] font-bold text-[#0F3A40] mb-1">Đổi email</h2>
                <p className="text-[13px] text-[#82ABB0] mb-4">
                  Mã gửi tới email mới + OTP SMS tới số đăng ký.
                </p>
                <div>
                  <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                    Email mới
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    className="mt-1 w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-semibold text-[#0F3A40] outline-none focus:border-[#14B8A6]"
                    value={emailEdit.email}
                    onChange={(e) => setEmailEdit((x) => ({ ...x, email: e.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    disabled={emailSending}
                    onClick={handleSendEmailCode}
                    className="rounded-full bg-[#EBF4FF] text-[#0F3A40] font-bold text-[13px] px-5 py-2.5 hover:bg-[#E0EFFF] disabled:opacity-50"
                  >
                    {emailSending ? 'Đang gửi…' : 'Gửi mã tới email'}
                  </button>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                    Mã xác nhận email (6 số)
                  </label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-mono tracking-widest outline-none focus:border-[#14B8A6]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={emailEdit.email_otp}
                    onChange={(e) =>
                      setEmailEdit((x) => ({
                        ...x,
                        email_otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                  />
                </div>
                <div className="pt-2 space-y-2 border-t border-[#EEF6F7]">
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      disabled={otpSending}
                      onClick={handleSendOtp}
                      className="rounded-full bg-[#E6F8F6] text-[#0F3A40] font-bold text-[13px] px-5 py-2.5 hover:bg-[#D4F2EE] disabled:opacity-50"
                    >
                      {otpSending ? 'Đang gửi…' : 'Gửi mã OTP SMS'}
                    </button>
                    {lastMaskedPhone ? (
                      <span className="text-[12px] text-[#82ABB0]">Gửi tới {lastMaskedPhone}</span>
                    ) : null}
                  </div>
                  <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                    Mã OTP SMS (6 số)
                  </label>
                  <input
                    className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-mono tracking-widest outline-none focus:border-[#14B8A6]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={emailEdit.otp}
                    onChange={(e) =>
                      setEmailEdit((x) => ({
                        ...x,
                        otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                  />
                </div>
                {formErr ? <p className="text-[13px] text-red-600 font-medium">{formErr}</p> : null}
                {formMsg ? <p className="text-[13px] text-[#14B8A6] font-medium">{formMsg}</p> : null}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-full border border-[#D5EBED] py-3.5 font-bold text-[#82ABB0] hover:bg-[#F7FAFB]"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-full bg-[#14B8A6] py-3.5 font-bold text-white hover:bg-[#109284] disabled:opacity-50"
                  >
                    {saving ? 'Đang lưu…' : 'Xác nhận đổi email'}
                  </button>
                </div>
              </form>
            ) : null}

            {modal === 'password' ? (
              <div className="space-y-4">
                <h2 className="text-[22px] font-bold text-[#0F3A40] mb-1">Đổi mật khẩu</h2>

                {pwStep === 'current' ? (
                  <form onSubmit={verifyCurrentPasswordClick} className="space-y-4">
                    <p className="text-[13px] text-[#82ABB0]">
                      Nhập mật khẩu hiện tại. Đúng thì bước tiếp theo mới hiện ô mật khẩu mới và OTP SMS.
                    </p>
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Mật khẩu hiện tại"
                      className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] outline-none focus:border-[#14B8A6]"
                      value={pwEdit.current_password}
                      onChange={(e) =>
                        setPwEdit((x) => ({ ...x, current_password: e.target.value }))
                      }
                    />
                    {formErr ? <p className="text-[13px] text-red-600 font-medium">{formErr}</p> : null}
                    {formMsg ? <p className="text-[13px] text-[#14B8A6] font-medium">{formMsg}</p> : null}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setModal(null)}
                        className="flex-1 rounded-full border border-[#D5EBED] py-3.5 font-bold text-[#82ABB0] hover:bg-[#F7FAFB]"
                      >
                        Huỷ
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 rounded-full bg-[#14B8A6] py-3.5 font-bold text-white hover:bg-[#109284] disabled:opacity-50"
                      >
                        {saving ? 'Đang kiểm tra…' : 'Tiếp tục'}
                      </button>
                    </div>
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormErr(null);
                          setFormMsg(null);
                          setPwStep('recovery_pick');
                        }}
                        className="text-[13px] font-semibold text-[#14B8A6] hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  </form>
                ) : null}

                {pwStep === 'otp' ? (
                  <form onSubmit={savePassword} className="space-y-4">
                    <p className="text-[13px] text-[#82ABB0]">
                      Nhập mật khẩu mới (tối thiểu 8 ký tự), xác nhận và mã OTP SMS gửi tới số đăng ký.
                    </p>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mật khẩu mới"
                      className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] outline-none focus:border-[#14B8A6]"
                      value={pwEdit.new_password}
                      onChange={(e) => setPwEdit((x) => ({ ...x, new_password: e.target.value }))}
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] outline-none focus:border-[#14B8A6]"
                      value={pwEdit.confirm_password}
                      onChange={(e) =>
                        setPwEdit((x) => ({ ...x, confirm_password: e.target.value }))
                      }
                    />
                    <div className="pt-2 space-y-2 border-t border-[#EEF6F7]">
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          type="button"
                          disabled={otpSending}
                          onClick={handleSendOtp}
                          className="rounded-full bg-[#E6F8F6] text-[#0F3A40] font-bold text-[13px] px-5 py-2.5 hover:bg-[#D4F2EE] disabled:opacity-50"
                        >
                          {otpSending ? 'Đang gửi…' : 'Gửi mã OTP SMS'}
                        </button>
                        {lastMaskedPhone ? (
                          <span className="text-[12px] text-[#82ABB0]">Gửi tới {lastMaskedPhone}</span>
                        ) : null}
                      </div>
                      <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                        Mã OTP SMS (6 số)
                      </label>
                      <input
                        className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-mono tracking-widest outline-none focus:border-[#14B8A6]"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="••••••"
                        value={pwEdit.otp}
                        onChange={(e) =>
                          setPwEdit((x) => ({
                            ...x,
                            otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                          }))
                        }
                      />
                    </div>
                    {formErr ? <p className="text-[13px] text-red-600 font-medium">{formErr}</p> : null}
                    {formMsg ? <p className="text-[13px] text-[#14B8A6] font-medium">{formMsg}</p> : null}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setModal(null)}
                        className="flex-1 rounded-full border border-[#D5EBED] py-3.5 font-bold text-[#82ABB0] hover:bg-[#F7FAFB]"
                      >
                        Huỷ
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 rounded-full bg-[#14B8A6] py-3.5 font-bold text-white hover:bg-[#109284] disabled:opacity-50"
                      >
                        {saving ? 'Đang lưu…' : 'Đổi mật khẩu'}
                      </button>
                    </div>
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormErr(null);
                          setFormMsg(null);
                          setPwStep('recovery_pick');
                        }}
                        className="text-[13px] font-semibold text-[#14B8A6] hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  </form>
                ) : null}

                {pwStep === 'recovery_pick' ? (
                  <div className="space-y-4">
                    <p className="text-[13px] text-[#82ABB0]">
                      Chọn cách nhận mã 6 số để đặt lại mật khẩu (không cần nhớ mật khẩu cũ).
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        disabled={otpSending}
                        onClick={() => void sendRecoveryCode('sms')}
                        className="w-full rounded-2xl border border-[#D5EBED] py-4 font-bold text-[#0F3A40] hover:bg-[#E6F8F6] flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <PhoneCall size={18} className="text-[#14B8A6]" />
                        Gửi mã qua SMS
                      </button>
                      <button
                        type="button"
                        disabled={otpSending}
                        onClick={() => void sendRecoveryCode('email')}
                        className="w-full rounded-2xl border border-[#D5EBED] py-4 font-bold text-[#0F3A40] hover:bg-[#E6F8F6] flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Mail size={18} className="text-[#14B8A6]" />
                        Gửi mã qua Gmail
                      </button>
                    </div>
                    {formErr ? <p className="text-[13px] text-red-600 font-medium">{formErr}</p> : null}
                    {formMsg ? <p className="text-[13px] text-[#14B8A6] font-medium">{formMsg}</p> : null}
                    <button
                      type="button"
                      onClick={() => {
                        setFormErr(null);
                        setFormMsg(null);
                        setPwStep('current');
                      }}
                      className="text-[13px] font-semibold text-[#82ABB0] hover:text-[#14B8A6]"
                    >
                      ← Quay lại nhập mật khẩu hiện tại
                    </button>
                  </div>
                ) : null}

                {pwStep === 'recovery_code' ? (
                  <form onSubmit={applyPasswordRecovery} className="space-y-4">
                    <p className="text-[13px] text-[#82ABB0]">
                      {recoveryChannel === 'sms'
                        ? 'Nhập mã SMS và mật khẩu mới.'
                        : 'Nhập mã gửi tới email đăng ký và mật khẩu mới.'}
                    </p>
                    <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                      Mã 6 số
                    </label>
                    <input
                      className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] font-mono tracking-widest outline-none focus:border-[#14B8A6]"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={pwEdit.otp}
                      onChange={(e) =>
                        setPwEdit((x) => ({
                          ...x,
                          otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                        }))
                      }
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                      className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] outline-none focus:border-[#14B8A6]"
                      value={pwEdit.new_password}
                      onChange={(e) => setPwEdit((x) => ({ ...x, new_password: e.target.value }))}
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Xác nhận mật khẩu mới"
                      className="w-full rounded-2xl border border-[#D5EBED] px-4 py-3 text-[15px] outline-none focus:border-[#14B8A6]"
                      value={pwEdit.confirm_password}
                      onChange={(e) =>
                        setPwEdit((x) => ({ ...x, confirm_password: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        disabled={otpSending || !recoveryChannel}
                        onClick={() => recoveryChannel && void sendRecoveryCode(recoveryChannel)}
                        className="rounded-full bg-[#E6F8F6] text-[#0F3A40] font-bold text-[13px] px-5 py-2.5 hover:bg-[#D4F2EE] disabled:opacity-50"
                      >
                        {otpSending ? 'Đang gửi…' : 'Gửi lại mã'}
                      </button>
                    </div>
                    {formErr ? <p className="text-[13px] text-red-600 font-medium">{formErr}</p> : null}
                    {formMsg ? <p className="text-[13px] text-[#14B8A6] font-medium">{formMsg}</p> : null}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          setFormErr(null);
                          setFormMsg(null);
                          setPwStep('recovery_pick');
                          setRecoveryChannel(null);
                        }}
                        className="flex-1 rounded-full border border-[#D5EBED] py-3.5 font-bold text-[#82ABB0] hover:bg-[#F7FAFB]"
                      >
                        Quay lại
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 rounded-full bg-[#14B8A6] py-3.5 font-bold text-white hover:bg-[#109284] disabled:opacity-50"
                      >
                        {saving ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
