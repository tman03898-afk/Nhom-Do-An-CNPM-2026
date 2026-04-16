import { useState } from 'react';
import {
  Zap, Droplet, Wifi, Trash2, Save, Plus, X,
  Settings2, User, Hash, Box, Info
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function ServiceManagePage() {
  const { addToast } = useToast();

  const [services, setServices] = useState([
    {
      id: 'dien',
      title: 'Giá điện',
      desc: 'Đơn giá áp dụng theo số ký (kWh)',
      icon: 'Zap',
      method: 'meter', // Theo chỉ số
      value: '3500'
    },
    {
      id: 'nuoc',
      title: 'Giá nước',
      desc: 'Đơn giá áp dụng theo khối (m³)',
      icon: 'Droplet',
      method: 'meter', // Theo chỉ số
      value: '25000'
    },
    {
      id: 'wifi',
      title: 'Wifi',
      desc: 'Phí trọn gói hàng tháng',
      icon: 'Wifi',
      method: 'fixed', // Cố định
      value: '100000'
    },
    {
      id: 'rac',
      title: 'Rác',
      desc: 'Phí thu gom rác định kỳ',
      icon: 'Trash2',
      method: 'fixed', // Cố định
      value: '50000'
    }
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newSvc, setNewSvc] = useState({ title: '', desc: '', value: '', method: 'fixed' });

  const getIcon = (name) => {
    switch (name) {
      case 'Zap': return <Zap className="w-6 h-6" fill="currentColor" />;
      case 'Droplet': return <Droplet className="w-6 h-6" fill="currentColor" />;
      case 'Wifi': return <Wifi className="w-6 h-6" />;
      case 'Trash2': return <Trash2 className="w-6 h-6" fill="currentColor" />;
      default: return <Settings2 className="w-6 h-6" />;
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
    const id = Date.now().toString();
    setServices([...services, { ...newSvc, id, icon: 'Settings2' }]);
    setNewSvc({ title: '', desc: '', value: '', method: 'fixed' });
    setIsAdding(false);
    addToast('Đã thêm dịch vụ phát sinh mới!');
  };

  const handleUpdate = (id, field, val) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleSaveAll = () => {
    addToast('Đã lưu toàn bộ thay đổi hệ thống!');
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
          {services.map((svc) => (
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
          <button className="text-[#4A787C] hover:text-[#0F3A40] font-bold px-6 py-3.5 transition-colors text-[14px]">
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
