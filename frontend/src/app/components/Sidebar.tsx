import { Key, Plus, Zap, Folder, Star, Globe, Server, Sun, Moon, LogOut } from 'lucide-react';

interface SidebarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onAddNew: () => void;
  onOpenGenerator: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout?: () => void;
}

export function Sidebar({ 
  categories, 
  selectedCategory, 
  onSelectCategory, 
  onAddNew,
  onOpenGenerator,
  isDarkMode,
  onToggleTheme,
  onLogout
}: SidebarProps) {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="size-8 text-blue-400" />
          <h1 className="text-xl">PassVault</h1>
        </div>
        <button
          onClick={onToggleTheme}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <Sun className="size-5 text-yellow-400" />
          ) : (
            <Moon className="size-5 text-blue-400" />
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2">
        <button
          onClick={onAddNew}
          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus className="size-5" />
          <span>Add Password</span>
        </button>
        <button
          onClick={onOpenGenerator}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Zap className="size-5" />
          <span>Generate Password</span>
        </button>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Favorites */}
        <div className="mb-4">
          <div className="mb-2 px-2 text-xs uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Star className="size-3" />
            Favorites
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onSelectCategory('Application')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                selectedCategory === 'Application'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Globe className="size-4" />
              <span>Application</span>
            </button>
            <button
              onClick={() => onSelectCategory('Server')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                selectedCategory === 'Server'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Server className="size-4" />
              <span>Server</span>
            </button>
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="mb-2 px-2 text-xs uppercase tracking-wider text-gray-500">
            Categories
          </div>
          <div className="space-y-1">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Folder className="size-4" />
                <span>{category}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        {onLogout ? (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-800 transition-colors mb-3"
            title="Log out"
          >
            <LogOut className="size-4" />
            <span>Log out</span>
          </button>
        ) : null}

        <div>Password Manager</div>
        <div className="mt-1">Secure & Private</div>
      </div>
    </div>
  );
}