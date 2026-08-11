import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ColorfulSelect({ value, onChange, options, placeholder, required }: { value: string, onChange: (v: string) => void, options: {label: string, value: string, disabled?: boolean, badge?: string}[], placeholder: string, required?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If there is less than 280px below and more space above, open upwards
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);
  
  const colors = [
    'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200',
    'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
    'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
    'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200',
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-200',
    'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'
  ];

  const getColor = (str: string) => {
    if (!str) return 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-[40]' : 'z-0'}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2.5 border rounded-lg text-sm cursor-pointer flex justify-between items-center transition-colors font-medium ${getColor(value)}`}
      >
        <span className="truncate pr-2">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {/* Hidden input for HTML required validation if needed */}
      {required && <input type="text" className="absolute opacity-0 w-0 h-0 p-0 m-0" value={value} readOnly required />}
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className={`absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto p-1.5 flex flex-col gap-1.5 custom-scrollbar ${openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}>
            <div 
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="p-2.5 cursor-pointer rounded-md text-sm bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium border border-slate-200"
            >
              {placeholder}
            </div>
            {options.map(opt => (
              <div 
                key={opt.value}
                onClick={() => { 
                  if (opt.disabled) return;
                  onChange(opt.value); 
                  setIsOpen(false); 
                }}
                className={`p-2.5 rounded-md text-sm border font-medium flex justify-between items-center transition-all ${
                  opt.disabled 
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-40' 
                    : `cursor-pointer ${getColor(opt.value)}`
                }`}
              >
                <span className="truncate pr-2">{opt.label}</span>
                {opt.badge !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                    opt.disabled 
                      ? 'bg-slate-200 text-slate-500' 
                      : 'bg-white/80 text-slate-800 shadow-sm'
                  }`}>
                    {opt.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
