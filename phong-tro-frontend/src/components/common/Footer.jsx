export default function Footer() {
  return (
    <footer className="bg-white rounded-t-[3rem] pt-16 pb-8 px-8 md:px-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-nest-text-secondary text-sm">
        <div className="col-span-1 md:col-span-1">
          <div className="font-sans font-bold text-[#14B8A6] text-xl mb-4">The Nest Living</div>
          <p>Atmospheric Dummy Text nơi bạn tận hưởng không gian sống đẳng cấp.</p>
        </div>
        <div>
           <h4 className="font-bold text-nest-text-primary mb-4">Kết nối</h4>
           <p className="mb-2">Phone: +84 123 456 789</p>
           <a href="#" className="text-[#14B8A6] hover:underline">Nhắn tin Zalo ngay</a>
        </div>
        <div>
           <h4 className="font-bold text-nest-text-primary mb-4">Vị trí</h4>
           <p className="mb-2">Address: Ho Chi Minh City</p>
           <a href="#" className="text-[#14B8A6] hover:underline">View on Map</a>
        </div>
        <div>
           <h4 className="font-bold text-nest-text-primary mb-4">Mạng xã hội</h4>
           <div className="flex gap-4">
              <a href="#" className="w-8 h-8 rounded-full bg-[#CFE8EA] flex items-center justify-center text-[#14B8A6] hover:bg-[#14B8A6] hover:text-white transition-colors">fb</a>
              <a href="#" className="w-8 h-8 rounded-full bg-[#CFE8EA] flex items-center justify-center text-[#14B8A6] hover:bg-[#14B8A6] hover:text-white transition-colors">ig</a>
           </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
         &copy; 2024 The Nest Living. All rights reserved.
      </div>
    </footer>
  );
}
