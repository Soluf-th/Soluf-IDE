
import React from 'react';

// Neon Button Pattern
export const NeonButton: React.FC<{ onClick?: () => void, children: React.ReactNode, active?: boolean, className?: string, disabled?: boolean }> = ({ onClick, children, active, className = '', disabled = false }) => (
  <button 
    disabled={disabled}
    onClick={onClick}
    className={`relative px-4 py-2 rounded-md transition-all duration-300 font-medium text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
      ${active 
        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
        : 'hover:bg-gray-800 text-gray-400 border border-transparent hover:border-gray-700 bg-[#161b22]'
      } ${className}`}
  >
    {children}
  </button>
);

// Glassmorphism Card Pattern
export const GlassCard: React.FC<{ children: React.ReactNode, title?: string, className?: string }> = ({ children, title, className = '' }) => (
  <div className={`bg-[#161b22]/80 backdrop-blur-md border border-[#30363d] rounded-xl p-4 shadow-xl ${className}`}>
    {title && <h3 className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-widest">{title}</h3>}
    {children}
  </div>
);

// Tech Loader Pattern
export const TechLoader: React.FC<{ size?: string }> = ({ size = 'w-2 h-2' }) => (
  <div className="flex items-center justify-center space-x-1">
    <div className={`${size} bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]`}></div>
    <div className={`${size} bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]`}></div>
    <div className={`${size} bg-blue-500 rounded-full animate-bounce`}></div>
  </div>
);

// Cyberpunk Status Dot
export const StatusDot: React.FC<{ status: 'online' | 'offline' | 'busy' | 'success' | 'failed' | 'running' }> = ({ status }) => {
  const colors = {
    online: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    offline: 'bg-gray-500',
    busy: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
    success: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]',
    failed: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    running: 'bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]'
  };
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[status]}`}></div>;
};

// Workflow Badge
export const WorkflowBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles = {
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    idle: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] border font-bold uppercase tracking-tighter ${styles}`}>
      {status}
    </span>
  );
};

// Terminal Tab Component
export const TerminalTab: React.FC<{ name: string, active: boolean, onClick: () => void, onClose: (e: React.MouseEvent) => void }> = ({ name, active, onClick, onClose }) => (
  <div 
    onClick={onClick}
    className={`group flex items-center gap-2 px-3 h-full cursor-pointer transition-all border-b-2 text-[10px] font-bold uppercase tracking-wider
      ${active ? 'bg-[#0d1117] text-gray-200 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-[#1f242b]'}`}
  >
    <span>{name}</span>
    <button 
      onClick={onClose}
      className={`opacity-0 group-hover:opacity-100 hover:text-white rounded px-1 transition-opacity`}
    >
      ×
    </button>
  </div>
);

// Task Item UI Component
export const TaskItem: React.FC<{ text: string, completed: boolean, onToggle: () => void, onDelete: () => void }> = ({ text, completed, onToggle, onDelete }) => (
  <div className="group flex items-center justify-between p-2 rounded-md hover:bg-[#1f242b] transition-all border border-transparent hover:border-[#30363d]">
    <div className="flex items-center gap-3 overflow-hidden">
      <button 
        onClick={onToggle}
        className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
          completed ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#484f58] hover:border-blue-500'
        }`}
      >
        {completed && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
      </button>
      <span className={`text-xs truncate transition-all ${completed ? 'text-gray-500 line-through italic' : 'text-gray-300'}`}>
        {text}
      </span>
    </div>
    <button 
      onClick={onDelete}
      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>
  </div>
);
