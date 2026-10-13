import React, { useState, useEffect } from 'react';
import { ShieldCheck, RotateCw, CheckCircle2, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import { AuditLog } from '../../types';
import { formatDate } from '../../utils/format';
import { Header } from '../../components/layout/Header';

export function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const PAGE_SIZE = 25;

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.getLogs(page, PAGE_SIZE, actionFilter, statusFilter);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Audit & Security Logs" onRefresh={loadLogs} />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full flex-1">
        {/* Header + Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Security Audit Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable operational records (passwords and raw keys are strictly sanitized).
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="WARNING">Warning</option>
              <option value="FAILURE">Failure</option>
            </select>

            <button
              onClick={loadLogs}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">IP Address</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      Loading audit records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      No audit log events found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-indigo-300 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="px-5 py-3.5 text-slate-200 font-medium whitespace-nowrap">
                        {log.username || 'System Guest'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-md truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {log.ip_address}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                            log.status === 'SUCCESS'
                              ? 'text-emerald-400'
                              : log.status === 'WARNING'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {log.status === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {log.status === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {log.status === 'FAILURE' && <AlertCircle className="w-3.5 h-3.5" />}
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/40">
              <span>
                Page {page + 1} of {totalPages} ({total} events)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
