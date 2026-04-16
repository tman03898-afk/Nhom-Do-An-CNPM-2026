import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ label, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex-1 w-full" ref={dropdownRef}>
      <label className="block text-[10px] font-bold text-nest-text-secondary uppercase mb-2 ml-1 tracking-wider">
        {label}
      </label>
      <div className="relative w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-[#D1EDF1] text-nest-text-primary px-4 py-3 pr-10 rounded-xl border-none font-medium text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-nest-primary-container transition-all duration-300 shadow-sm hover:shadow-md ${
            isOpen ? 'ring-2 ring-nest-primary-container' : ''
          }`}
        >
          <span className="truncate">{value}</span>
          <ChevronDown
            className={`w-5 h-5 opacity-70 transition-transform duration-500 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="py-2 max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={`w-full px-5 py-3 text-left text-[13px] font-bold transition-all duration-200 flex items-center justify-between group ${
                    value === option 
                    ? 'text-nest-primary-container bg-nest-primary/10' 
                    : 'text-nest-text-primary hover:bg-[#D1EDF1]/50'
                  }`}
                >
                  {option}
                  {value === option && (
                    <div className="w-1.5 h-1.5 rounded-full bg-nest-primary"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
