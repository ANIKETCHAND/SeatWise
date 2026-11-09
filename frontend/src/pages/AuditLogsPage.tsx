import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Search, Filter, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({ action: actionFilter || undefined, limit: 100 });
      setLogs(res.audit_logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono border border-zinc-200 mb-1">
              <ShieldCheck className="w-3 h-3 text-black" />
              Immutable Audit Trail
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              System & Security Audit Logs
            </h1>
            <p className="text-xs text-zinc-500">
              Complete chronological audit trail of authentication events, user provisioning, password resets, and bootstrap lifecycle.
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 rounded-xl border border-zinc-200 hover:border-black bg-white text-xs font-semibold text-zinc-800 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Records
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-zinc-600">Filter Action:</span>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-xs p-2 bg-white border border-zinc-300 rounded-xl focus:ring-1 focus:ring-black cursor-pointer font-mono"
        >
          <option value="">All Actions</option>
          <option value="ADMIN_BOOTSTRAP">ADMIN_BOOTSTRAP</option>
          <option value="ADMIN_BOOTSTRAP_CLI">ADMIN_BOOTSTRAP_CLI</option>
          <option value="USER_CREATED">USER_CREATED</option>
          <option value="USER_UPDATED">USER_UPDATED</option>
          <option value="PASSWORD_RESET_ADMIN">PASSWORD_RESET_ADMIN</option>
          <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
          <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
          <option value="USER_REACTIVATED">USER_REACTIVATED</option>
          <option value="PERMISSIONS_UPDATED">PERMISSIONS_UPDATED</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="md" />
            <p className="text-xs text-zinc-500 font-mono mt-2">Loading audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500 font-mono">
            No audit records matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-mono text-[10px] uppercase">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-zinc-950 px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-700 truncate max-w-[150px]">
                      {log.actor_user_id || log.user_id || 'System'}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {log.affected_resource || log.entity_type || '—'}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 max-w-xs truncate font-sans text-[11px]">
                      {JSON.stringify(log.details || log.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
