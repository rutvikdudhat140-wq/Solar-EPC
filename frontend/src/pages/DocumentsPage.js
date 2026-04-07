import React from 'react';
import { KPICard } from '../components/ui/KPICard';
import { FileText, FolderOpen, CheckCircle, Clock, Upload, Download } from 'lucide-react';

const DocumentsPage = () => {
  // Mock data for document KPIs
  const docStats = {
    totalDocuments: 1245,
    totalFolders: 48,
    approved: 892,
    pending: 127,
    uploadedToday: 23,
    downloadedToday: 156
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Documents</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Document management and organization</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="Total Documents"
          value={docStats.totalDocuments}
          sub="All files"
          icon={FileText}
          variant="blue"
        />
        <KPICard
          label="Total Folders"
          value={docStats.totalFolders}
          sub="Organized folders"
          icon={FolderOpen}
          variant="indigo"
        />
        <KPICard
          label="Approved"
          value={docStats.approved}
          sub="Verified documents"
          icon={CheckCircle}
          variant="emerald"
        />
        <KPICard
          label="Pending Review"
          value={docStats.pending}
          sub="Awaiting approval"
          icon={Clock}
          variant="amber"
        />
        <KPICard
          label="Uploaded Today"
          value={docStats.uploadedToday}
          sub="New files"
          icon={Upload}
          variant="purple"
        />
        <KPICard
          label="Downloaded Today"
          value={docStats.downloadedToday}
          sub="File access"
          icon={Download}
          variant="blue"
        />
      </div>

      {/* Coming Soon Message */}
      <div className="glass-card p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/20 flex items-center justify-center mx-auto mb-4">
          <FileText size={32} className="text-[var(--primary)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Document Management</h2>
        <p className="text-[var(--text-muted)]">Advanced document management features coming soon...</p>
      </div>
    </div>
  );
};

export default DocumentsPage;
