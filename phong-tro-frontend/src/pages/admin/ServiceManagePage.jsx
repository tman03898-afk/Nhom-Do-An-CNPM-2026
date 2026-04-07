import { Zap, Droplet, Wifi, Trash2, Save } from 'lucide-react';

export default function ServiceManagePage() {
  const services = [
    {
      id: 'dien',
      title: 'Giá điện',
      desc: 'Đơn giá áp dụng theo số ký (kWh)',
      icon: <Zap className="w-6 h-6" fill="currentColor" />,
      label: 'GIÁ VNĐ/KWH',
      value: '3500'
    },
    {
      id: 'nuoc',
      title: 'Giá nước',
      desc: 'Đơn giá áp dụng theo khối (m³)',
      icon: <Droplet className="w-6 h-6" fill="currentColor" />,
      label: 'GIÁ VNĐ/M³',
      value: '25000'
    },
    {
      id: 'wifi',
      title: 'Wifi',
      desc: 'Phí trọn gói hàng tháng',
      icon: <Wifi className="w-6 h-6" />,
      label: 'GIÁ VNĐ/THÁNG',
      value: '100000'
    },
    {
      id: 'rac',
      title: 'Rác',
      desc: 'Phí thu gom rác định kỳ',
      icon: <Trash2 className="w-6 h-6" fill="currentColor" />,
      label: 'GIÁ VNĐ/THÁNG',
      value: '50000'
    }
  ];

  return (
    <div className="w-full max-w-[1000px] mx-auto mt-2 px-4 pb-12 relative flex flex-col h-full min-h-[85vh]">
      {/* Background Architectural Illustration */}
      <div className="absolute bottom-0 right-0 left-0 h-[400px] overflow-hidden pointer-events-none rounded-b-[40px] opacity-20 mix-blend-multiply">
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2000&auto=format&fit=crop" 
          alt="Abstract architecture" 
          className="w-full h-full object-cover grayscale brightness-150 contrast-150"
        />
        {/* Gradient fade out to top */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-[#DDF5F7]"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Page Header */}
        <div className="max-w-[600px] mb-12">
          <h1 className="text-[36px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none mb-4">
            Cài đặt dịch vụ
          </h1>
          <p className="text-[15px] font-medium text-[#4A787C] leading-relaxed">
            Điều chỉnh đơn giá cho các tiện ích và dịch vụ tại The Nest Living. Các thay đổi sẽ được áp dụng cho chu kỳ hóa đơn tiếp theo.
          </p>
        </div>

        {/* Configuration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {services.map((svc) => (
            <div key={svc.id} className="bg-white rounded-[32px] p-8 shadow-[0_4px_20px_rgba(15,58,64,0.04)] border border-transparent hover:border-[#14B8A6]/20 transition-colors">
               <div className="flex items-center gap-5 mb-10">
                  <div className="w-[52px] h-[52px] rounded-[16px] bg-[#EBFDFB] text-[#14B8A6] flex items-center justify-center shadow-sm">
                     {svc.icon}
                  </div>
                  <div>
                     <h3 className="text-[20px] font-bold text-[#0F3A40] mb-0.5">{svc.title}</h3>
                     <span className="text-[12px] font-medium text-[#82ABB0]">{svc.desc}</span>
                  </div>
               </div>

               <div className="relative">
                  <div className="absolute -top-3 left-6 z-10 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-[#4A787C] tracking-widest uppercase shadow-sm border border-[#BCE1E5]/30">
                     {svc.label}
                  </div>
                  <input 
                     type="text" 
                     defaultValue={svc.value} 
                     className="w-full h-[72px] bg-[#DDF5F7] rounded-[24px] px-8 font-bold text-[24px] text-[#0F3A40] outline-none border-2 border-transparent focus:border-[#14B8A6]/40 transition-colors shadow-inner"
                  />
               </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-auto pt-8 items-center z-10">
           <button className="text-[#4A787C] hover:text-[#0F3A40] font-bold px-6 py-3.5 transition-colors text-[14px]">
              Hủy bỏ
           </button>
           <button className="bg-[#14B8A6] hover:bg-[#0da090] text-white px-8 py-3.5 rounded-full text-[14px] font-bold transition-colors shadow-md flex items-center gap-2.5">
              <Save className="w-5 h-5" /> Lưu thay đổi
           </button>
        </div>
      </div>
    </div>
  );
}
