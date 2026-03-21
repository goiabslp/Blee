import React, { useState, useEffect, useRef } from 'react';
import { Phone, ChevronDown } from 'lucide-react';

interface Country {
  code: string;
  flag: string;
  dialCode: string;
  mask: string;
  placeholder: string;
}

const countries: Country[] = [
  { code: 'BR', flag: '🇧🇷', dialCode: '+55', mask: '(99) 9 9999-9999', placeholder: '(DD) 9 0000-0000' },
  { code: 'US', flag: '🇺🇸', dialCode: '+1', mask: '(999) 999-9999', placeholder: '(000) 000-0000' },
  { code: 'PT', flag: '🇵🇹', dialCode: '+351', mask: '999 999 999', placeholder: '000 000 000' },
  { code: 'AR', flag: '🇦🇷', dialCode: '+54', mask: '9 99 9999-9999', placeholder: '9 00 0000-0000' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, error, className = '' }) => {
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [localValue, setLocalValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function applyMask(val: string, mask: string) {
    const raw = val.replace(/\D/g, '');
    let formatted = '';
    let rawIndex = 0;
    
    for (let i = 0; i < mask.length && rawIndex < raw.length; i++) {
       if (mask[i] === '9') {
          formatted += raw[rawIndex];
          rawIndex++;
       } else {
          formatted += mask[i];
       }
    }
    return formatted;
  }

  // Initial value parsing if provided
  useEffect(() => {
    if (value && !localValue) {
      const country = countries.find(c => value.startsWith(c.dialCode));
      if (country) {
        setSelectedCountry(country);
        const formatted = applyMask(value.slice(country.dialCode.length), country.mask);
        setLocalValue(formatted);
      }
    }
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = applyMask(e.target.value, selectedCountry.mask);
    setLocalValue(formatted);
    const normalized = selectedCountry.dialCode + formatted.replace(/\D/g, '');
    onChange(normalized);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    const normalized = country.dialCode + localValue.replace(/\D/g, '');
    onChange(normalized);
  };

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      <div className="relative flex group" ref={dropdownRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`
              flex py-2.5 items-center gap-2 rounded-l-xl border border-r-0 border-slate-100 
              bg-slate-50 pl-4 pr-3 transition-all hover:bg-slate-100
              focus:outline-none focus:ring-2 focus:ring-emerald-500/20 z-10 relative
              ${isDropdownOpen ? 'bg-white border-emerald-500' : 'self-stretch'}
              ${error ? 'border-rose-500' : ''}
            `}
          >
            <span className="text-xl leading-none">{selectedCountry.flag}</span>
            <span className="text-sm font-bold text-slate-600 leading-none">{selectedCountry.dialCode}</span>
            <ChevronDown 
              size={14} 
              className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
            />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-[60] w-48 overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-2xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-60 overflow-y-auto">
                {countries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`
                      flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all
                      ${selectedCountry.code === c.code ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-100 text-slate-600'}
                    `}
                  >
                    <span className="text-xl leading-none">{c.flag}</span>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-tight opacity-50">{c.code}</span>
                      <span className="text-sm font-bold">{c.dialCode}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex-1">
          <input
            type="tel"
            inputMode="numeric"
            value={localValue}
            onChange={handleChange}
            placeholder={selectedCountry.placeholder}
            className={`
              py-2.5 w-full rounded-r-xl border border-slate-100 bg-slate-50 pl-4 pr-4
              text-slate-900 font-medium placeholder:text-slate-400 outline-none transition-all
              focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20
              ${error ? 'border-rose-500 focus:border-rose-500 border-r-0' : ''}
            `}
          />
        </div>
      </div>
      {error && <p className="pl-1 text-[10px] font-bold text-rose-600 animate-in fade-in slide-in-from-top-1">{error}</p>}
    </div>
  );
};
