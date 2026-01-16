import { X, RefreshCw, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PasswordGeneratorProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export function PasswordGenerator({ onClose, isDarkMode }: PasswordGeneratorProps) {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    let charset = '';
    let newPassword = '';

    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset === '') {
      charset = 'abcdefghijklmnopqrstuvwxyz';
    }

    for (let i = 0; i < length; i++) {
      newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    setPassword(newPassword);
    setCopied(false);
  };

  useEffect(() => {
    generatePassword();
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStrengthColor = () => {
    if (length < 8) return 'bg-red-500';
    if (length < 12) return 'bg-yellow-500';
    if (length < 16) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (length < 8) return 'Weak';
    if (length < 12) return 'Fair';
    if (length < 16) return 'Good';
    return 'Strong';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`rounded-lg shadow-xl w-full max-w-lg ${isDarkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-xl">Password Generator</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Generated Password Display */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Generated Password</label>
              <div className={`px-2 py-0.5 rounded text-xs text-white ${getStrengthColor()}`}>
                {getStrengthText()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex-1 px-4 py-3 border rounded-lg font-mono text-lg break-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
                {password}
              </div>
              <button
                onClick={copyToClipboard}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
              </button>
              <button
                onClick={generatePassword}
                className={`p-3 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                title="Generate new password"
              >
                <RefreshCw className="size-5" />
              </button>
            </div>
          </div>

          {/* Length Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="length" className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Length
              </label>
              <span className={`text-sm px-2 py-1 rounded ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-900'}`}>
                {length}
              </span>
            </div>
            <input
              type="range"
              id="length"
              min="6"
              max="32"
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
            />
            <div className={`flex justify-between text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <span>6</span>
              <span>32</span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className={`text-sm mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Character Types</div>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeUppercase}
                onChange={(e) => setIncludeUppercase(e.target.checked)}
                className={`size-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300'}`}
              />
              <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Uppercase Letters (A-Z)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLowercase}
                onChange={(e) => setIncludeLowercase(e.target.checked)}
                className={`size-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300'}`}
              />
              <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Lowercase Letters (a-z)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNumbers}
                onChange={(e) => setIncludeNumbers(e.target.checked)}
                className={`size-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300'}`}
              />
              <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Numbers (0-9)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSymbols}
                onChange={(e) => setIncludeSymbols(e.target.checked)}
                className={`size-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300'}`}
              />
              <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Symbols (!@#$%^&*)</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}