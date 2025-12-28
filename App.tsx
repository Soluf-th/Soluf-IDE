
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IDEType, ProjectState, FileEntry, WorkflowRun, WorkflowStatus, TerminalInstance, TerminalTheme, Task } from './types';
import { NeonButton, GlassCard, TechLoader, StatusDot, WorkflowBadge, TerminalTab, TaskItem } from './components/UiverseElements';
import { analyzeCode, chatWithAI } from './services/gemini';

const INITIAL_FILES: FileEntry[] = [
  { 
    id: '1', name: 'contracts', type: 'folder', children: [
      { id: '2', name: 'Storage.sol', type: 'file', language: 'solidity', content: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract Storage {\n    uint256 public val;\n    function store(uint256 x) public {\n        val = x;\n    }\n}' },
      { id: '3', name: 'Token.sol', type: 'file', language: 'solidity', content: 'contract Token { mapping(address=>uint) balances; }' }
    ]
  },
  { id: '4', name: '.github', type: 'folder', children: [
    { id: '5', name: 'workflows', type: 'folder', children: [
      { id: '6', name: 'main.yml', type: 'file', language: 'yaml', content: 'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n      - name: Run Tests\n        run: npm test' },
      { id: '8', name: 'deploy.yml', type: 'file', language: 'yaml', content: 'name: CD\non: [manual]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n      - name: Deploy to Mainnet\n        run: hardhat deploy' }
    ]}
  ]},
  { id: '7', name: 'README.md', type: 'file', language: 'markdown', content: '# Soluf-th Project\nDeveloper hub simulation.' }
];

const INITIAL_WORKFLOWS: WorkflowRun[] = [
  { id: 'wf1', workflowName: 'CI Pipeline', status: 'success', logs: ['Build started', 'npm install successful', 'Tests passed', 'Build finished'] },
  { id: 'wf2', workflowName: 'CD Deployment', status: 'idle', logs: [] }
];

const INITIAL_TERMINALS: TerminalInstance[] = [
  { id: 'term-1', name: 'bash', logs: ['Welcome to Soluf-th Bash v5.1', 'Type "help" for available commands.'] },
  { id: 'term-2', name: 'node', logs: ['Welcome to Node.js v18.16.0.', 'Type ".help" for more information.'] }
];

const INITIAL_TASKS: Task[] = [
  { id: 't1', text: 'Optimize Solidity Storage', completed: false, createdAt: Date.now() },
  { id: 't2', text: 'Update GitHub Actions config', completed: true, createdAt: Date.now() - 100000 }
];

const COMMANDS = ['help', 'clear', 'ls', 'npm test', 'npm deploy', 'audit', 'whoami', 'theme monokai', 'theme cyberpunk', 'theme github-dark'];

const App: React.FC = () => {
  const [state, setState] = useState<ProjectState>({
    activeIDE: IDEType.VSCODE,
    files: INITIAL_FILES,
    currentFileId: '2',
    isTerminalOpen: true,
    isAISidebarOpen: true,
    activeSidebarTab: 'explorer',
    workflows: INITIAL_WORKFLOWS,
    terminals: INITIAL_TERMINALS,
    activeTerminalId: 'term-1',
    terminalTheme: 'github-dark',
    tasks: INITIAL_TASKS
  });

  const [aiResponse, setAiResponse] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  
  const terminalLogsRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [state.terminals, state.activeTerminalId]);

  const addLog = (msg: string, termId?: string) => {
    const targetId = termId || state.activeTerminalId;
    setState(s => ({
      ...s,
      terminals: s.terminals.map(t => t.id === targetId ? { ...t, logs: [...t.logs, msg] } : t)
    }));
  };

  const activeTerminal = state.terminals.find(t => t.id === state.activeTerminalId);

  const activeFile = useCallback(() => {
    const findFile = (files: FileEntry[], id: string): FileEntry | undefined => {
      for (const f of files) {
        if (f.id === id) return f;
        if (f.children) {
          const found = findFile(f.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    return state.currentFileId ? findFile(state.files, state.currentFileId) : null;
  }, [state.currentFileId, state.files]);

  const handleCommand = async (cmd: string) => {
    const cleanCmd = cmd.trim().toLowerCase();
    addLog(`soluf-th@dev:~$ ${cmd}`);

    if (cleanCmd === 'clear') {
      setState(s => ({
        ...s,
        terminals: s.terminals.map(t => t.id === s.activeTerminalId ? { ...t, logs: [] } : t)
      }));
    } else if (cleanCmd === 'ls') {
      addLog('contracts/  .github/  README.md  package.json');
    } else if (cleanCmd === 'help') {
      addLog('Available commands: help, clear, ls, npm test, npm deploy, audit, whoami, theme [monokai|cyberpunk|github-dark]');
    } else if (cleanCmd === 'whoami') {
      addLog('soluf-th-developer-agent-01');
    } else if (cleanCmd === 'audit') {
      handleAnalyze();
    } else if (cleanCmd === 'npm test') {
      addLog('Running tests...');
      await new Promise(r => setTimeout(r, 1000));
      addLog('✓ Storage.sol compiled');
      addLog('✓ Storage.sol tests passed');
      addLog('Tests completed successfully.');
    } else if (cleanCmd.startsWith('theme ')) {
      const themeName = cleanCmd.split(' ')[1] as TerminalTheme;
      if (['monokai', 'cyberpunk', 'github-dark'].includes(themeName)) {
        setState(s => ({ ...s, terminalTheme: themeName }));
        addLog(`Terminal theme switched to ${themeName}`);
      } else {
        addLog(`Unknown theme: ${themeName}`);
      }
    } else if (cleanCmd === 'npm deploy') {
      runWorkflow('wf2');
    } else if (cleanCmd !== '') {
      addLog(`Command not found: ${cleanCmd}`);
    }
    setCommandInput('');
    setSuggestion('');
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(commandInput);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestion) {
        setCommandInput(suggestion);
        setSuggestion('');
      }
    }
  };

  const onCommandChange = (val: string) => {
    setCommandInput(val);
    if (val.trim()) {
      const match = COMMANDS.find(c => c.startsWith(val.toLowerCase()));
      setSuggestion(match || '');
    } else {
      setSuggestion('');
    }
  };

  const handleAnalyze = async () => {
    const file = activeFile();
    if (!file || !file.content) return;
    setIsAiLoading(true);
    addLog(`AI: Analyzing ${file.name}...`);
    try {
      const result = await analyzeCode(file.content, file.language || 'text');
      setAiResponse(result);
      addLog(`AI: Analysis complete for ${file.name}. Found ${result.issues.length} concerns.`);
    } catch (err) {
      addLog(`AI Error: Failed to analyze code.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsAiLoading(true);
    try {
      const response = await chatWithAI(userMsg, activeFile()?.content || '');
      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err) {
      addLog(`AI Error: Failed to generate response.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const runWorkflow = async (workflowId: string) => {
    const wf = state.workflows.find(w => w.id === workflowId);
    if (!wf || wf.status === 'running') return;

    setState(s => ({
      ...s,
      isTerminalOpen: true,
      workflows: s.workflows.map(w => w.id === workflowId ? { ...w, status: 'running', logs: [] } : w)
    }));

    const steps = [
      `[${wf.workflowName}] Starting runner...`,
      `[${wf.workflowName}] Checking out code...`,
      `[${wf.workflowName}] Deployment success!`,
      `[${wf.workflowName}] Job finished.`
    ];

    for (const step of steps) {
      addLog(step);
      await new Promise(r => setTimeout(r, 800));
    }

    setState(s => ({
      ...s,
      workflows: s.workflows.map(w => w.id === workflowId ? { ...w, status: 'success' } : w)
    }));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      completed: false,
      createdAt: Date.now()
    };
    setState(s => ({ ...s, tasks: [newTask, ...s.tasks] }));
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setState(s => ({
      ...s,
      tasks: s.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  const deleteTask = (id: string) => {
    setState(s => ({
      ...s,
      tasks: s.tasks.filter(t => t.id !== id)
    }));
  };

  const createNewTerminal = () => {
    const newId = `term-${Date.now()}`;
    const newTerm: TerminalInstance = { id: newId, name: 'bash', logs: ['Terminal created.'] };
    setState(s => ({ ...s, terminals: [...s.terminals, newTerm], activeTerminalId: newId }));
  };

  const closeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (state.terminals.length <= 1) return;
    const newTerms = state.terminals.filter(t => t.id !== id);
    setState(s => ({ 
      ...s, 
      terminals: newTerms, 
      activeTerminalId: s.activeTerminalId === id ? newTerms[0].id : s.activeTerminalId 
    }));
  };

  const renderFileTree = (files: FileEntry[], depth = 0) => {
    return files.map(file => (
      <div key={file.id} style={{ paddingLeft: `${depth * 12}px` }}>
        <button
          onClick={() => file.type === 'file' && setState(s => ({ ...s, currentFileId: file.id }))}
          className={`w-full text-left px-2 py-1 text-sm rounded transition-colors flex items-center gap-2 ${
            state.currentFileId === file.id ? 'bg-[#373e47] text-white' : 'text-gray-400 hover:bg-[#21262d] hover:text-gray-200'
          }`}
        >
          {file.type === 'folder' ? (
             <svg className="w-3.5 h-3.5 text-blue-400/80" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
          ) : (
             <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          )}
          {file.name}
        </button>
        {file.children && renderFileTree(file.children, depth + 1)}
      </div>
    ));
  };

  // Theme styles for Terminal
  const themeStyles = {
    'github-dark': { bg: 'bg-[#0a0c10]', text: 'text-gray-400', prompt: 'text-green-500', workflow: 'text-blue-400/80' },
    'cyberpunk': { bg: 'bg-[#1a1b26]', text: 'text-[#bb9af7]', prompt: 'text-[#f7768e]', workflow: 'text-[#7aa2f7]' },
    'monokai': { bg: 'bg-[#272822]', text: 'text-[#f8f8f2]', prompt: 'text-[#a6e22e]', workflow: 'text-[#66d9ef]' }
  }[state.terminalTheme];

  return (
    <div className="flex h-screen w-full bg-[#0d1117] overflow-hidden select-none">
      {/* Activity Bar */}
      <div className="w-16 bg-[#161b22] border-r border-[#30363d] flex flex-col items-center py-4 gap-6 z-10">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(37,99,235,0.4)]">S</div>
        <div className="flex flex-col gap-6 text-gray-500">
          <button 
            title="Explorer"
            onClick={() => setState(s => ({ ...s, activeSidebarTab: 'explorer' }))}
            className={`${state.activeSidebarTab === 'explorer' ? 'text-white' : 'hover:text-gray-300'} transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            {state.activeSidebarTab === 'explorer' && <div className="absolute -left-5 top-0 w-1 h-6 bg-blue-500"></div>}
          </button>
          
          <button 
            title="Workflows"
            onClick={() => setState(s => ({ ...s, activeSidebarTab: 'actions' }))}
            className={`${state.activeSidebarTab === 'actions' ? 'text-white' : 'hover:text-gray-300'} transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {state.activeSidebarTab === 'actions' && <div className="absolute -left-5 top-0 w-1 h-6 bg-blue-500"></div>}
          </button>

          <button 
            title="Tasks"
            onClick={() => setState(s => ({ ...s, activeSidebarTab: 'tasks' }))}
            className={`${state.activeSidebarTab === 'tasks' ? 'text-white' : 'hover:text-gray-300'} transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            {state.activeSidebarTab === 'tasks' && <div className="absolute -left-5 top-0 w-1 h-6 bg-blue-500"></div>}
          </button>

          <button onClick={() => setState(s => ({...s, isAISidebarOpen: !s.isAISidebarOpen}))} className={`${state.isAISidebarOpen ? 'text-blue-400' : 'hover:text-gray-300'} transition-colors`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></button>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="w-64 bg-[#0d1117] border-r border-[#30363d] flex flex-col">
        {state.activeSidebarTab === 'explorer' && (
          <>
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Explorer</span>
              <StatusDot status="online" />
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              {renderFileTree(state.files)}
            </div>
          </>
        )}
        
        {state.activeSidebarTab === 'actions' && (
          <>
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-blue-400">GitHub Actions</span>
              <StatusDot status="busy" />
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-3">
              {state.workflows.map(wf => (
                <div key={wf.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 hover:border-blue-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-semibold text-gray-200">{wf.workflowName}</div>
                    <WorkflowBadge status={wf.status} />
                  </div>
                  <div className="text-[10px] text-gray-500 mb-3">On: push to main</div>
                  <NeonButton 
                    disabled={wf.status === 'running'}
                    onClick={() => runWorkflow(wf.id)}
                    className="w-full justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {wf.status === 'running' ? <TechLoader size="w-1 h-1" /> : 'Run Workflow'}
                  </NeonButton>
                </div>
              ))}
            </div>
          </>
        )}

        {state.activeSidebarTab === 'tasks' && (
          <>
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-green-400">Dev Tasks</span>
              <div className="text-[10px] text-gray-500 font-mono">
                {state.tasks.filter(t => t.completed).length}/{state.tasks.length}
              </div>
            </div>
            <div className="px-4 mb-4">
              <form onSubmit={addTask} className="relative">
                <input 
                  type="text" 
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="New task..."
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-md py-1.5 pl-3 pr-8 text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition-all"
                />
                <button type="submit" className="absolute right-2 top-1.5 text-blue-500 hover:text-blue-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                </button>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {state.tasks.length > 0 ? (
                state.tasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    text={task.text} 
                    completed={task.completed} 
                    onToggle={() => toggleTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))
              ) : (
                <div className="text-center py-10 opacity-30">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="text-[10px] uppercase tracking-tighter">No tasks pending</p>
                </div>
              )}
            </div>
          </>
        )}
        
        <div className="p-4 border-t border-[#30363d]">
          <div className="text-[10px] text-gray-500 mb-2 font-semibold uppercase tracking-widest">Environment</div>
          <select 
            value={state.activeIDE}
            onChange={(e) => setState(s => ({...s, activeIDE: e.target.value as IDEType}))}
            className="w-full bg-[#161b22] border border-[#30363d] rounded p-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.values(IDEType).map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Editor Tabs */}
        <div className="h-10 bg-[#161b22] border-b border-[#30363d] flex items-center overflow-x-auto">
          {activeFile() && (
            <div className="px-4 h-full border-r border-[#30363d] bg-[#0d1117] flex items-center gap-2 text-xs text-gray-300 border-t-2 border-t-blue-500">
              <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              {activeFile()?.name}
              <button className="hover:bg-gray-700 rounded px-1 ml-2">×</button>
            </div>
          )}
        </div>

        {/* Code Editor View */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 p-4 code-font text-[13px] leading-relaxed overflow-y-auto bg-[#0d1117]">
            {activeFile()?.content?.split('\n').map((line, i) => (
              <div key={i} className="flex gap-4 group/line">
                <span className="w-8 text-right text-gray-600 select-none opacity-50">{i + 1}</span>
                <span className="text-gray-300 whitespace-pre">{line}</span>
              </div>
            )) || (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                 <div className="w-24 h-24 mb-6 opacity-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-xl"></div>
                 <p className="text-xs uppercase tracking-widest font-bold">Project Soluf-th</p>
                 <p className="text-[10px] mt-2 opacity-50">Select workspace file to begin development</p>
              </div>
            )}
          </div>
          
          {activeFile() && (
            <div className="absolute bottom-6 right-6 flex gap-3">
              <NeonButton onClick={handleAnalyze} disabled={isAiLoading}>
                {isAiLoading ? <TechLoader size="w-1.5 h-1.5" /> : 'Analyze & Audit'}
              </NeonButton>
            </div>
          )}
        </div>

        {/* Console / Terminal Section */}
        {state.isTerminalOpen && (
          <div className="h-72 bg-[#161b22] border-t border-[#30363d] flex flex-col transition-all">
            {/* Terminal Header with Tabs */}
            <div className="h-9 bg-[#161b22] flex items-center px-1 overflow-x-auto border-b border-[#30363d]">
              {state.terminals.map(term => (
                <TerminalTab 
                  key={term.id} 
                  name={term.name} 
                  active={state.activeTerminalId === term.id}
                  onClick={() => setState(s => ({ ...s, activeTerminalId: term.id }))}
                  onClose={(e) => closeTerminal(term.id, e)}
                />
              ))}
              <button 
                onClick={createNewTerminal}
                className="px-3 h-full text-gray-500 hover:text-white hover:bg-[#1f242b] transition-colors"
              >
                +
              </button>
              <div className="flex-1"></div>
              <div className="px-4 flex gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <select 
                  value={state.terminalTheme}
                  onChange={(e) => setState(s => ({ ...s, terminalTheme: e.target.value as TerminalTheme }))}
                  className="bg-transparent hover:text-white focus:outline-none cursor-pointer"
                >
                  <option value="github-dark">Theme: Dark</option>
                  <option value="monokai">Theme: Monokai</option>
                  <option value="cyberpunk">Theme: Cyberpunk</option>
                </select>
                <button onClick={() => setState(s => ({...s, isTerminalOpen: false}))} className="hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div 
              ref={terminalLogsRef}
              className={`flex-1 p-3 code-font text-xs overflow-y-auto ${themeStyles.bg} transition-colors duration-500`}
            >
              <div className="space-y-0.5">
                {activeTerminal?.logs.map((log, i) => {
                  const isError = log.includes('failed') || log.includes('Error');
                  const isSuccess = log.includes('success') || log.includes('passed');
                  const isWf = log.startsWith('[');
                  const isUserCmd = log.startsWith('soluf-th@dev:~$');

                  return (
                    <div key={i} className={`flex gap-2 ${isError ? 'text-red-400' : isSuccess ? 'text-green-400' : isWf ? themeStyles.workflow : themeStyles.text}`}>
                      {!isUserCmd && <span className="opacity-30 select-none">❯</span>}
                      {isUserCmd ? (
                        <div className="flex gap-2">
                           <span className={themeStyles.prompt}>soluf-th@dev:~$</span>
                           <span>{log.replace('soluf-th@dev:~$', '')}</span>
                        </div>
                      ) : (
                        <span>{log}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Interactive Prompt */}
              <div className="mt-1 flex gap-2 relative">
                <span className={`${themeStyles.prompt} select-none`}>soluf-th@dev:~$</span>
                <div className="relative flex-1">
                  {suggestion && (
                    <span className="absolute left-0 top-0 text-gray-600 whitespace-pre pointer-events-none">
                      {suggestion}
                    </span>
                  )}
                  <input
                    ref={commandInputRef}
                    autoFocus
                    type="text"
                    value={commandInput}
                    onChange={(e) => onCommandChange(e.target.value)}
                    onKeyDown={handleCommandKeyDown}
                    className={`bg-transparent border-none outline-none w-full p-0 m-0 ${themeStyles.text} caret-blue-500`}
                  />
                </div>
              </div>

              {aiResponse && (
                <div className="mt-4 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                  <div className="text-blue-400 font-bold text-[10px] mb-3 uppercase tracking-widest flex items-center gap-2">
                    <StatusDot status="busy" /> AI Smart Audit
                  </div>
                  <div className="text-gray-300 mb-3">{aiResponse.summary}</div>
                  <div className="space-y-2">
                    {aiResponse.issues.map((issue: any, idx: number) => (
                      <div key={idx} className="bg-[#161b22] border border-[#30363d] p-2 rounded flex items-start gap-3">
                         <div className={`mt-1 p-1 rounded ${issue.severity === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                           <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                         </div>
                         <div>
                           <div className="text-[10px] font-bold uppercase tracking-wider mb-1">{issue.severity} Severity</div>
                           <div className="text-xs text-gray-400">{issue.message} <span className="opacity-40 ml-1">(Line {issue.line})</span></div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Intelligence Sidebar */}
      {state.isAISidebarOpen && (
        <div className="w-80 bg-[#161b22] border-l border-[#30363d] flex flex-col z-20">
          <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/50">
            <h2 className="text-[10px] font-bold text-blue-400 flex items-center gap-2 uppercase tracking-widest">
              <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-blue-500"></span> 
              Soluf-th Intelligence
            </h2>
            <button onClick={() => setState(s => ({...s, isAISidebarOpen: false}))} className="text-gray-500 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <GlassCard title="Live Monitoring">
              <div className="text-[11px] text-gray-400 space-y-2">
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="text-blue-400 font-mono">{activeFile()?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Language:</span>
                  <span className="text-gray-300 font-mono">{activeFile()?.language || 'N/A'}</span>
                </div>
                <p className="mt-4 text-xs italic opacity-70 border-l-2 border-blue-500 pl-2">
                  "I am actively monitoring your CI pipelines and smart contracts for anomalies."
                </p>
              </div>
            </GlassCard>

            <div className="space-y-4">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-xl text-xs leading-relaxed shadow-sm ${
                    m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#21262d] text-gray-300 rounded-bl-none border border-[#30363d]'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#21262d] p-3 rounded-xl border border-[#30363d]">
                    <TechLoader size="w-1.5 h-1.5" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-[#30363d] bg-[#0d1117]/50">
            <form onSubmit={handleChat} className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask intelligence agent..."
                className="w-full bg-[#161b22] border border-[#30363d] rounded-xl py-2.5 pl-4 pr-10 text-xs text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={isAiLoading}
                className="absolute right-2.5 top-2.5 text-blue-500 hover:text-blue-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-6 bg-[#007acc] text-white flex items-center px-3 text-[10px] font-medium z-[100] shadow-[0_-1px_10px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 h-full">
          <span className="flex items-center gap-1 hover:bg-white/10 px-2 h-full cursor-pointer transition-colors">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.464 15.05a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0z" /></svg>
            main*
          </span>
          <span className="hover:bg-white/10 px-2 h-full cursor-pointer flex items-center gap-1 transition-colors">
             <span className="opacity-70">Ln {activeFile()?.content?.split('\n').length || 0}, Col 1</span>
          </span>
          <span className="hover:bg-white/10 px-2 h-full cursor-pointer transition-colors border-l border-white/10">
            {state.workflows.filter(w => w.status === 'running').length} actions
          </span>
          <span className="hover:bg-white/10 px-2 h-full cursor-pointer transition-colors border-l border-white/10">
            {state.tasks.filter(t => !t.completed).length} tasks
          </span>
        </div>
        <div className="flex-1 h-full"></div>
        <div className="flex items-center gap-0 h-full">
          <span className="hover:bg-white/10 px-2 h-full cursor-pointer transition-colors border-l border-white/10">{state.terminalTheme.replace('-', ' ')}</span>
          <span className="hover:bg-white/10 px-2 h-full cursor-pointer transition-colors border-l border-white/10">UTF-8</span>
          <span className="hover:bg-white/10 px-2 h-full cursor-pointer transition-colors border-l border-white/10">{activeFile()?.language || 'Plain Text'}</span>
          <span className="hover:bg-white/10 px-2 h-full cursor-pointer flex items-center gap-2 transition-colors border-l border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
            Feedback
          </span>
          <span className="bg-white/20 px-3 h-full cursor-pointer font-bold flex items-center border-l border-white/10">SOLUF-TH DEV HUB</span>
        </div>
      </div>
    </div>
  );
};

export default App;
