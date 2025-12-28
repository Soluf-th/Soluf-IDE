
export enum IDEType {
  VSCODE = 'VS Code',
  VS2026 = 'Visual Studio 2026',
  SOLIDE = 'Solide IDE',
  SOLID_IDE = 'Solid-IDE',
  SOLIDITY_IDE = 'Solidity-IDE'
}

export type WorkflowStatus = 'idle' | 'running' | 'success' | 'failed';
export type TerminalTheme = 'github-dark' | 'cyberpunk' | 'monokai';

export interface WorkflowRun {
  id: string;
  workflowName: string;
  status: WorkflowStatus;
  startTime?: number;
  logs: string[];
}

export interface TerminalInstance {
  id: string;
  name: string;
  logs: string[];
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface FileEntry {
  id: string;
  name: string;
  type: 'file' | 'folder';
  language?: string;
  content?: string;
  isOpen?: boolean;
  children?: FileEntry[];
}

export interface ProjectState {
  activeIDE: IDEType;
  files: FileEntry[];
  currentFileId: string | null;
  isTerminalOpen: boolean;
  isAISidebarOpen: boolean;
  activeSidebarTab: 'explorer' | 'actions' | 'tasks';
  workflows: WorkflowRun[];
  terminals: TerminalInstance[];
  activeTerminalId: string;
  terminalTheme: TerminalTheme;
  tasks: Task[];
}
