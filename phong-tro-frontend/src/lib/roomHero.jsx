/** Panel hero phòng — gradient, không dùng ảnh stock. */
export function RoomHeroPanel({ roomNumber, subtitle, badge, footer, className = 'h-[280px]' }) {
  return (
    <div
      className={`relative rounded-[40px] overflow-hidden bg-gradient-to-br from-[#0F3A40] via-[#1F545B] to-[#14B8A6] ${className}`}
    >
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" aria-hidden />
      <div className="absolute inset-0 flex flex-col justify-end p-10 text-white">
        {badge ? (
          <span className="inline-flex w-fit mb-3 text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-lg">
            {badge}
          </span>
        ) : null}
        {roomNumber ? (
          <p className="text-[32px] font-bold leading-tight mb-1">{roomNumber}</p>
        ) : null}
        {subtitle ? <p className="text-white/80 text-[14px] font-medium max-w-md">{subtitle}</p> : null}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
