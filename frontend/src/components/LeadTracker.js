import React, { useState, useEffect } from 'react';
import { leadsApi } from '../services/leadsApi';
import { Button } from './ui/Button';
import { CheckCircle2, Circle, Clock, ChevronRight } from 'lucide-react';

const LeadTracker = ({ leadId, statusOptions, currentStage, onStageChange, onNavigate }) => {
  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (leadId) {
      fetchTracker();
    }
  }, [leadId]);

  const fetchTracker = async () => {
    try {
      setLoading(true);
      console.log('[LeadTracker] Fetching tracker for leadId:', leadId);
      const result = await leadsApi.getTracker(leadId);
      console.log('[LeadTracker] API result:', result);
      console.log('[LeadTracker] API result type:', typeof result);
      console.log('[LeadTracker] API result.success:', result?.success);
      console.log('[LeadTracker] API result.data:', result?.data);
      
      // Handle different response structures
      // Backend returns: { success: true, data: { stages, progress, ... } }
      // apiClient interceptor returns: response.data (the wrapped object)
      let data = result;
      
      // If result has success and data (standard API wrapper), extract the inner data
      if (result && result.success === true && result.data) {
        data = result.data;
        console.log('[LeadTracker] Extracted from wrapper:', data);
      } else if (result && result.data && !result.stages) {
        // If result has data but no stages directly, try extracting
        data = result.data;
        console.log('[LeadTracker] Extracted from result.data:', data);
      }
      
      // If data is still not valid, try using result directly
      if (!data || (!data.stages && !data.progress)) {
        if (result && (result.stages || result.progress || result.leadId)) {
          data = result;
          console.log('[LeadTracker] Using result directly:', data);
        }
      }
      
      console.log('[LeadTracker] Final data:', data);
      console.log('[LeadTracker] data.stages:', data?.stages);
      console.log('[LeadTracker] data.progress:', data?.progress);
      console.log('[LeadTracker] data.leadId:', data?.leadId);
      
      setTracker(data);
      setError(null);
    } catch (err) {
      console.error('[LeadTracker] Failed to fetch tracker:', err);
      setError('Failed to load tracker: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage) => {
    console.log('[LeadTracker] handleStageChange called with:', newStage);
    console.log('[LeadTracker] onNavigate:', onNavigate);
    console.log('[LeadTracker] currentStage:', currentStage);
    
    // Special handling for survey stage - redirect to survey page (even if current)
    if ((newStage === 'survey' || newStage === 'site-survey' || newStage === 'site_survey') && onNavigate) {
      console.log('[LeadTracker] Navigating to survey page');
      onNavigate('survey');
      return;
    }
    
    if (newStage === currentStage) {
      console.log('[LeadTracker] Same as current stage, returning');
      return;
    }
    
    try {
      setLoading(true);
      console.log('[LeadTracker] Updating stage to:', newStage);
      await leadsApi.updateStage(leadId, newStage);
      await fetchTracker();
      if (onStageChange) onStageChange();
    } catch (err) {
      console.error('Failed to update stage:', err);
      setError(err.message || 'Failed to update stage');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !tracker) {
    return (
      <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[var(--border-base)] rounded w-1/3"></div>
          <div className="h-2 bg-[var(--border-base)] rounded w-full"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-[var(--border-base)] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !tracker) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm text-red-600">{error}</p>
        <Button size="sm" variant="ghost" onClick={fetchTracker} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (!tracker) {
    return (
      <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
        <p className="text-sm text-[var(--text-muted)] mb-2">
          {loading ? 'Loading tracker data...' : 'No tracker data available.'}
        </p>
        <Button size="sm" variant="outline" onClick={fetchTracker} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
    );
  }

  if (!tracker.stages || tracker.stages.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
        <p className="text-sm text-[var(--text-muted)] mb-2">
          No stages available for this lead.
        </p>
        <Button size="sm" variant="outline" onClick={fetchTracker} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
    );
  }

  const { stages, progress } = tracker;
  const currentStageIndex = stages.findIndex(s => s.isCurrent);

  return (
    <div className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Lead Progress
          </p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
            {progress}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--text-muted)]">
            Stage {currentStageIndex + 1} of {stages.length}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[var(--border-subtle)] rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-400 to-emerald-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage List */}
      <div className="space-y-2">
        {stages.map((stage, index) => {
          const currentStageIndex = stages.findIndex(s => s.isCurrent);
          const isAboveCurrent = index < currentStageIndex;
          const isCurrent = stage.isCurrent;
          const isBelowCurrent = index > currentStageIndex;

          return (
            <div
              key={stage.stage}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer
                ${isCurrent ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/20' : 
                  isAboveCurrent ? 'bg-emerald-50/50' : 'bg-transparent hover:bg-[var(--bg-hovered)]'}
              `}
              onClick={() => handleStageChange(stage.stage)}
            >
              {/* Stage Icon */}
              <div className="shrink-0">
                {isAboveCurrent ? (
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: stage.color || '#22c55e' }}
                  >
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                ) : isCurrent ? (
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-offset-1"
                    style={{ 
                      backgroundColor: stage.color || '#3b82f6',
                      ringColor: stage.color || '#3b82f6'
                    }}
                  >
                    <Clock size={14} className="text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--border-base)] flex items-center justify-center">
                    <Circle size={14} className="text-[var(--text-muted)]" />
                  </div>
                )}
              </div>

              {/* Stage Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate
                  ${isCurrent ? 'text-[var(--primary)]' : 
                    isAboveCurrent ? 'text-[var(--text-muted)] line-through decoration-gray-600' : 'text-[var(--text-primary)]'}
                `}>
                  {stage.label}
                </p>
                {stage.completedAt && (
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {new Date(stage.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Arrow for current */}
              {isCurrent && (
                <ChevronRight size={16} className="text-[var(--primary)] shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 mt-3 text-center">{error}</p>
      )}
    </div>
  );
};

export default LeadTracker;
