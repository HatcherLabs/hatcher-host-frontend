'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Plus,
  Trash2,
  Save,
  X,
  Power,
  PowerOff,
  Pencil,
  Loader2,
  MessageCircle,
  Calendar,
  Webhook,
  Search,
  Send,
  Globe,
  Zap,
  Clock,
  Variable,
  GitBranch,
  Type,
  Timer,
  FileText,
  SmilePlus,
  ChevronRight,
  GitMerge,
} from 'lucide-react';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
} from '../AgentContext';
import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────

interface WorkflowData {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

interface NodeConfig {
  label: string;
  subtype: string;
  category: 'trigger' | 'action' | 'condition' | 'response';
  [key: string]: unknown;
}

// ─── Node Category Colors ─────────────────────────────────────

const CATEGORY_COLORS = {
  trigger: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-400', accent: '#10b981' },
  action: { bg: 'bg-blue-500/15', border: 'border-blue-500/40', text: 'text-blue-400', accent: '#3b82f6' },
  condition: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', text: 'text-yellow-400', accent: '#eab308' },
  response: { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-400', accent: '#a855f7' },
};

// ─── Node Definitions (toolbar items) ──────────────────────────

const NODE_CATALOG = [
  { category: 'trigger' as const, subtype: 'message_received', label: 'Message Received', icon: MessageCircle, desc: 'Triggered when a message arrives' },
  { category: 'trigger' as const, subtype: 'schedule', label: 'Schedule', icon: Calendar, desc: 'Triggered on a cron schedule' },
  { category: 'trigger' as const, subtype: 'webhook', label: 'Webhook', icon: Webhook, desc: 'Triggered by incoming webhook' },
  { category: 'trigger' as const, subtype: 'keyword_match', label: 'Keyword Match', icon: Search, desc: 'Triggered when keyword detected' },
  { category: 'action' as const, subtype: 'send_reply', label: 'Send Reply', icon: Send, desc: 'Send a reply message' },
  { category: 'action' as const, subtype: 'call_api', label: 'Call API', icon: Globe, desc: 'Make an HTTP request' },
  { category: 'action' as const, subtype: 'run_skill', label: 'Run Skill', icon: Zap, desc: 'Execute an agent skill' },
  { category: 'action' as const, subtype: 'wait_delay', label: 'Wait / Delay', icon: Clock, desc: 'Pause execution' },
  { category: 'action' as const, subtype: 'set_variable', label: 'Set Variable', icon: Variable, desc: 'Store a value' },
  { category: 'condition' as const, subtype: 'if_else', label: 'If / Else', icon: GitBranch, desc: 'Branch based on condition' },
  { category: 'condition' as const, subtype: 'keyword_contains', label: 'Keyword Contains', icon: Type, desc: 'Check text for keyword' },
  { category: 'condition' as const, subtype: 'time_check', label: 'Time Check', icon: Timer, desc: 'Check current time' },
  { category: 'condition' as const, subtype: 'variable_check', label: 'Variable Check', icon: Variable, desc: 'Check variable value' },
  { category: 'response' as const, subtype: 'send_message', label: 'Send Message', icon: MessageCircle, desc: 'Send to channel' },
  { category: 'response' as const, subtype: 'send_file', label: 'Send File', icon: FileText, desc: 'Send a file attachment' },
  { category: 'response' as const, subtype: 'react_emoji', label: 'React with Emoji', icon: SmilePlus, desc: 'Add emoji reaction' },
];

const CATEGORY_LABELS: Record<string, string> = {
  trigger: 'Triggers',
  action: 'Actions',
  condition: 'Conditions',
  response: 'Responses',
};

// ─── Custom React Flow Node ─────────────────────────────────

function WorkflowNodeComponent({ data, selected }: NodeProps<NodeConfig>) {
  const colors = CATEGORY_COLORS[data.category] || CATEGORY_COLORS.action;
  const catalogEntry = NODE_CATALOG.find(n => n.subtype === data.subtype);
  const Icon = catalogEntry?.icon || Zap;

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl border backdrop-blur-md
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-[#f97316] shadow-[0_0_20px_rgba(249,115,22,0.3)]' : ''}
        min-w-[180px] transition-shadow duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#A5A1C2] !border-2 !border-[#1a1730] hover:!bg-[#f97316] transition-colors"
      />
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text}`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium ${colors.text}`}>{data.label}</div>
          {data.subtype && (
            <div className="text-[10px] text-[#71717a] truncate mt-0.5">
              {catalogEntry?.desc || data.subtype}
            </div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#A5A1C2] !border-2 !border-[#1a1730] hover:!bg-[#f97316] transition-colors"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

// ─── Node Config Panel ────────────────────────────────────────

function NodeConfigPanel({
  node,
  onUpdate,
  onClose,
}: {
  node: Node<NodeConfig>;
  onUpdate: (id: string, data: Partial<NodeConfig>) => void;
  onClose: () => void;
}) {
  const d = node.data;
  const colors = CATEGORY_COLORS[d.category] || CATEGORY_COLORS.action;

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute right-0 top-0 bottom-0 w-80 bg-[#0D0B1A]/95 backdrop-blur-lg border-l border-[rgba(46,43,74,0.4)] z-20 overflow-y-auto"
    >
      <div className="p-4 border-b border-[rgba(46,43,74,0.3)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-sm font-semibold ${colors.text}`}>Configure Node</h3>
          <button onClick={onClose} className="p-1 text-[#71717a] hover:text-[#A5A1C2] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="text-xs text-[#71717a]">{d.label} ({d.category})</div>
      </div>

      <div className="p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="block text-xs text-[#A5A1C2] mb-1.5">Label</label>
          <input
            type="text"
            value={d.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 transition-colors"
          />
        </div>

        {/* Trigger: Message Received */}
        {d.subtype === 'message_received' && (
          <>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Channel Filter</label>
              <select
                value={(d.channel as string) || 'any'}
                onChange={(e) => onUpdate(node.id, { channel: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50"
              >
                <option value="any">Any Channel</option>
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="twitter">Twitter</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="slack">Slack</option>
                <option value="webchat">Web Chat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Keyword Filter (optional)</label>
              <input
                type="text"
                value={(d.keywords as string) || ''}
                onChange={(e) => onUpdate(node.id, { keywords: e.target.value })}
                placeholder="e.g. /start, help, price"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a]"
              />
            </div>
          </>
        )}

        {/* Trigger: Schedule */}
        {d.subtype === 'schedule' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">Cron Expression</label>
            <input
              type="text"
              value={(d.cron as string) || ''}
              onChange={(e) => onUpdate(node.id, { cron: e.target.value })}
              placeholder="e.g. 0 */6 * * *"
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] font-mono"
            />
            <p className="text-[10px] text-[#71717a] mt-1">min hour day month weekday</p>
          </div>
        )}

        {/* Trigger: Webhook */}
        {d.subtype === 'webhook' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">Webhook Path</label>
            <input
              type="text"
              value={(d.path as string) || ''}
              onChange={(e) => onUpdate(node.id, { path: e.target.value })}
              placeholder="/my-hook"
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] font-mono"
            />
          </div>
        )}

        {/* Trigger: Keyword Match */}
        {d.subtype === 'keyword_match' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">Keywords (comma-separated)</label>
            <input
              type="text"
              value={(d.keywords as string) || ''}
              onChange={(e) => onUpdate(node.id, { keywords: e.target.value })}
              placeholder="hello, help, price"
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a]"
            />
          </div>
        )}

        {/* Action: Send Reply */}
        {d.subtype === 'send_reply' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">Message Template</label>
            <textarea
              value={(d.message as string) || ''}
              onChange={(e) => onUpdate(node.id, { message: e.target.value })}
              placeholder="Hello {{user}}! How can I help?"
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] resize-none"
            />
            <p className="text-[10px] text-[#71717a] mt-1">Use {'{{variable}}'} for dynamic values</p>
          </div>
        )}

        {/* Action: Call API */}
        {d.subtype === 'call_api' && (
          <>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">URL</label>
              <input
                type="text"
                value={(d.url as string) || ''}
                onChange={(e) => onUpdate(node.id, { url: e.target.value })}
                placeholder="https://api.example.com/data"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Method</label>
              <select
                value={(d.method as string) || 'GET'}
                onChange={(e) => onUpdate(node.id, { method: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Headers (JSON)</label>
              <textarea
                value={(d.headers as string) || ''}
                onChange={(e) => onUpdate(node.id, { headers: e.target.value })}
                placeholder='{"Authorization": "Bearer ..."}'
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] font-mono resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Body (JSON)</label>
              <textarea
                value={(d.body as string) || ''}
                onChange={(e) => onUpdate(node.id, { body: e.target.value })}
                placeholder='{"key": "value"}'
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] font-mono resize-none"
              />
            </div>
          </>
        )}

        {/* Action: Run Skill */}
        {d.subtype === 'run_skill' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">Skill Name</label>
            <input
              type="text"
              value={(d.skillName as string) || ''}
              onChange={(e) => onUpdate(node.id, { skillName: e.target.value })}
              placeholder="research, scan-token, etc."
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a]"
            />
          </div>
        )}

        {/* Action: Wait/Delay */}
        {d.subtype === 'wait_delay' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">Delay (seconds)</label>
            <input
              type="number"
              value={(d.delaySecs as number) || 5}
              onChange={(e) => onUpdate(node.id, { delaySecs: Number(e.target.value) })}
              min={1}
              max={3600}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50"
            />
          </div>
        )}

        {/* Action: Set Variable */}
        {d.subtype === 'set_variable' && (
          <>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Variable Name</label>
              <input
                type="text"
                value={(d.varName as string) || ''}
                onChange={(e) => onUpdate(node.id, { varName: e.target.value })}
                placeholder="my_var"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Value</label>
              <input
                type="text"
                value={(d.varValue as string) || ''}
                onChange={(e) => onUpdate(node.id, { varValue: e.target.value })}
                placeholder="some value or {{expression}}"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a]"
              />
            </div>
          </>
        )}

        {/* Condition: If/Else */}
        {d.subtype === 'if_else' && (
          <>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Variable</label>
              <input
                type="text"
                value={(d.variable as string) || ''}
                onChange={(e) => onUpdate(node.id, { variable: e.target.value })}
                placeholder="{{message}}"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Operator</label>
              <select
                value={(d.operator as string) || 'equals'}
                onChange={(e) => onUpdate(node.id, { operator: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Value</label>
              <input
                type="text"
                value={(d.condValue as string) || ''}
                onChange={(e) => onUpdate(node.id, { condValue: e.target.value })}
                placeholder="expected value"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a]"
              />
            </div>
          </>
        )}

        {/* Condition: Keyword Contains */}
        {d.subtype === 'keyword_contains' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">Keyword</label>
            <input
              type="text"
              value={(d.keyword as string) || ''}
              onChange={(e) => onUpdate(node.id, { keyword: e.target.value })}
              placeholder="price, help, etc."
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a]"
            />
          </div>
        )}

        {/* Condition: Time Check */}
        {d.subtype === 'time_check' && (
          <>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">After (HH:MM)</label>
              <input
                type="time"
                value={(d.afterTime as string) || '09:00'}
                onChange={(e) => onUpdate(node.id, { afterTime: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Before (HH:MM)</label>
              <input
                type="time"
                value={(d.beforeTime as string) || '17:00'}
                onChange={(e) => onUpdate(node.id, { beforeTime: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50"
              />
            </div>
          </>
        )}

        {/* Condition: Variable Check */}
        {d.subtype === 'variable_check' && (
          <>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Variable Name</label>
              <input
                type="text"
                value={(d.varName as string) || ''}
                onChange={(e) => onUpdate(node.id, { varName: e.target.value })}
                placeholder="my_var"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A5A1C2] mb-1.5">Expected Value</label>
              <input
                type="text"
                value={(d.expectedValue as string) || ''}
                onChange={(e) => onUpdate(node.id, { expectedValue: e.target.value })}
                placeholder="expected"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a]"
              />
            </div>
          </>
        )}

        {/* Response: Send Message */}
        {d.subtype === 'send_message' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">Message</label>
            <textarea
              value={(d.message as string) || ''}
              onChange={(e) => onUpdate(node.id, { message: e.target.value })}
              placeholder="The response message..."
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] resize-none"
            />
          </div>
        )}

        {/* Response: Send File */}
        {d.subtype === 'send_file' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">File Path / URL</label>
            <input
              type="text"
              value={(d.filePath as string) || ''}
              onChange={(e) => onUpdate(node.id, { filePath: e.target.value })}
              placeholder="/workspace/report.pdf or https://..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a] font-mono"
            />
          </div>
        )}

        {/* Response: React Emoji */}
        {d.subtype === 'react_emoji' && (
          <div>
            <label className="block text-xs text-[#A5A1C2] mb-1.5">Emoji</label>
            <input
              type="text"
              value={(d.emoji as string) || ''}
              onChange={(e) => onUpdate(node.id, { emoji: e.target.value })}
              placeholder="e.g. thumbs_up"
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#1a1730] border border-[rgba(46,43,74,0.4)] text-[#FFFFFF] outline-none focus:border-[#f97316]/50 placeholder-[#71717a]"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Workflow Editor ──────────────────────────────────────────

function WorkflowEditor({
  workflow,
  onSave,
  onCancel,
  saving,
}: {
  workflow: WorkflowData | null;
  onSave: (name: string, nodes: Node[], edges: Edge[]) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(workflow?.name || 'New Workflow');
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node<NodeConfig> | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['trigger', 'action', 'condition', 'response']));
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({
      ...connection,
      animated: true,
      style: { stroke: '#f97316', strokeWidth: 2 },
    }, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<NodeConfig>);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeDataUpdate = useCallback((nodeId: string, data: Partial<NodeConfig>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
    );
    setSelectedNode((prev) =>
      prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev,
    );
  }, [setNodes]);

  const addNode = useCallback((catalogItem: typeof NODE_CATALOG[0]) => {
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newNode: Node<NodeConfig> = {
      id,
      type: 'workflowNode',
      position: { x: 250 + Math.random() * 100, y: 150 + nodes.length * 80 },
      data: {
        label: catalogItem.label,
        subtype: catalogItem.subtype,
        category: catalogItem.category,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const groupedCatalog = useMemo(() => {
    const groups: Record<string, typeof NODE_CATALOG> = {};
    for (const item of NODE_CATALOG) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, []);

  return (
    <div className="relative flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(46,43,74,0.3)] bg-[#0D0B1A]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 text-[#71717a] hover:text-[#A5A1C2] transition-colors"
          >
            <X size={18} />
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-lg font-semibold text-[#FFFFFF] outline-none border-b border-transparent focus:border-[#f97316]/50 transition-colors"
            placeholder="Workflow name..."
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedNode && (
            <button
              onClick={deleteSelectedNode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 size={14} />
              Delete Node
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded-lg border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[#f97316]/40 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name, nodes, edges)}
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-[#f97316] text-white hover:bg-[#ea580c] transition-all disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Toolbar */}
        <div className="w-56 border-r border-[rgba(46,43,74,0.3)] bg-[#0D0B1A]/60 overflow-y-auto flex-shrink-0">
          <div className="p-3">
            <h4 className="text-xs font-semibold text-[#A5A1C2] uppercase tracking-wider mb-3">Node Palette</h4>
            {Object.entries(groupedCatalog).map(([cat, items]) => {
              const colors = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS];
              return (
                <div key={cat} className="mb-2">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs font-medium ${colors.text} hover:bg-white/5 rounded-lg transition-colors`}
                  >
                    <ChevronRight
                      size={12}
                      className={`transition-transform ${expandedCategories.has(cat) ? 'rotate-90' : ''}`}
                    />
                    {CATEGORY_LABELS[cat]}
                  </button>
                  <AnimatePresence>
                    {expandedCategories.has(cat) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.subtype}
                              onClick={() => addNode(item)}
                              className={`
                                flex items-center gap-2 w-full px-2.5 py-2 text-left text-xs rounded-lg
                                ${colors.bg} ${colors.border} border mb-1 ml-2 mr-1
                                hover:brightness-125 transition-all cursor-grab active:cursor-grabbing
                              `}
                            >
                              <Icon size={13} className={colors.text} />
                              <span className="text-[#FFFFFF] truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#f97316', strokeWidth: 2 },
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#2e2b4a40"
            />
            <Controls
              className="!bg-[#1a1730] !border-[rgba(46,43,74,0.4)] !rounded-lg [&_button]:!bg-[#1a1730] [&_button]:!border-[rgba(46,43,74,0.4)] [&_button]:!text-[#A5A1C2] [&_button:hover]:!bg-[#2e2b4a]"
            />
            <MiniMap
              nodeColor={(n) => {
                const cat = (n.data as NodeConfig)?.category;
                return CATEGORY_COLORS[cat]?.accent || '#71717a';
              }}
              maskColor="rgba(13,11,26,0.8)"
              className="!bg-[#1a1730] !border-[rgba(46,43,74,0.4)] !rounded-lg"
            />
          </ReactFlow>
        </div>

        {/* Config Panel */}
        <AnimatePresence>
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onUpdate={handleNodeDataUpdate}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main WorkflowsTab ─────────────────────────────────────

export function WorkflowsTab() {
  const { agent, id: agentId } = useAgentContext();
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowData | null | 'new'>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getAgentWorkflows(agentId);
    setLoading(false);
    if (res.success) {
      setWorkflows(res.data as unknown as WorkflowData[]);
    } else {
      setError(res.error || 'Failed to load workflows');
    }
  }, [agentId]);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  const handleCreate = async (name: string, nodes: Node[], edges: Edge[]) => {
    setSaving(true);
    const res = await api.createAgentWorkflow(agentId, { name, nodes: nodes as unknown[], edges: edges as unknown[] });
    setSaving(false);
    if (res.success) {
      setEditingWorkflow(null);
      loadWorkflows();
    } else {
      setError(res.error || 'Failed to create workflow');
    }
  };

  const handleUpdate = async (name: string, nodes: Node[], edges: Edge[]) => {
    if (!editingWorkflow || editingWorkflow === 'new') return;
    setSaving(true);
    const res = await api.updateAgentWorkflow(agentId, editingWorkflow.id, {
      name,
      nodes: nodes as unknown[],
      edges: edges as unknown[],
    });
    setSaving(false);
    if (res.success) {
      setEditingWorkflow(null);
      loadWorkflows();
    } else {
      setError(res.error || 'Failed to update workflow');
    }
  };

  const handleToggle = async (workflowId: string) => {
    setTogglingId(workflowId);
    const res = await api.toggleAgentWorkflow(agentId, workflowId);
    setTogglingId(null);
    if (res.success) {
      setWorkflows((prev) =>
        prev.map((w) => (w.id === workflowId ? { ...w, enabled: res.data.enabled } : w)),
      );
    }
  };

  const handleDelete = async (workflowId: string) => {
    setDeletingId(workflowId);
    const res = await api.deleteAgentWorkflow(agentId, workflowId);
    setDeletingId(null);
    if (res.success) {
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
    }
  };

  // ─── Editor View ──
  if (editingWorkflow !== null) {
    return (
      <motion.div
        key="editor"
        variants={tabContentVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <GlassCard className="!p-0 overflow-hidden">
          <WorkflowEditor
            workflow={editingWorkflow === 'new' ? null : editingWorkflow}
            onSave={editingWorkflow === 'new' ? handleCreate : handleUpdate}
            onCancel={() => setEditingWorkflow(null)}
            saving={saving}
          />
        </GlassCard>
      </motion.div>
    );
  }

  // ─── List View ──
  return (
    <motion.div
      key="list"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#FFFFFF]">Workflows</h2>
          <p className="text-xs text-[#71717a] mt-0.5">
            Visual automation flows for your agent
          </p>
        </div>
        <button
          onClick={() => setEditingWorkflow('new')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-[#f97316] text-white hover:bg-[#ea580c] transition-all"
        >
          <Plus size={14} />
          New Workflow
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#f97316]" />
        </div>
      )}

      {/* Empty State */}
      {!loading && workflows.length === 0 && (
        <GlassCard className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#f97316]/10 flex items-center justify-center mb-4">
            <GitMerge size={28} className="text-[#f97316]" />
          </div>
          <h3 className="text-base font-semibold text-[#FFFFFF] mb-2">No workflows yet</h3>
          <p className="text-sm text-[#71717a] mb-6 max-w-md mx-auto">
            Create visual automation flows to define how your agent responds to triggers, processes data, and takes actions.
          </p>
          <button
            onClick={() => setEditingWorkflow('new')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm rounded-lg bg-[#f97316] text-white hover:bg-[#ea580c] transition-all"
          >
            <Plus size={16} />
            Create Your First Workflow
          </button>
        </GlassCard>
      )}

      {/* Workflow List */}
      <AnimatePresence>
        {workflows.map((wf, i) => (
          <motion.div
            key={wf.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-lg ${wf.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#71717a]/15 text-[#71717a]'}`}>
                  <GitMerge size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-[#FFFFFF] truncate">{wf.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      wf.enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-[#71717a]/10 text-[#71717a] border-[#71717a]/30'
                    }`}>
                      {wf.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-[#71717a] mt-0.5">
                    {(wf.nodes?.length || 0)} node{(wf.nodes?.length || 0) !== 1 ? 's' : ''} &middot; {(wf.edges?.length || 0)} connection{(wf.edges?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(wf.id)}
                  disabled={togglingId === wf.id}
                  className={`p-1.5 rounded-lg border transition-all ${
                    wf.enabled
                      ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                      : 'border-[rgba(46,43,74,0.4)] text-[#71717a] hover:border-[#f97316]/40 hover:text-[#A5A1C2]'
                  } disabled:opacity-40`}
                  title={wf.enabled ? 'Disable' : 'Enable'}
                >
                  {togglingId === wf.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : wf.enabled ? (
                    <Power size={14} />
                  ) : (
                    <PowerOff size={14} />
                  )}
                </button>

                {/* Edit */}
                <button
                  onClick={() => setEditingWorkflow(wf)}
                  className="p-1.5 rounded-lg border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[#f97316]/40 hover:text-[#f97316] transition-all"
                  title="Edit workflow"
                >
                  <Pencil size={14} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(wf.id)}
                  disabled={deletingId === wf.id}
                  className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                  title="Delete workflow"
                >
                  {deletingId === wf.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
