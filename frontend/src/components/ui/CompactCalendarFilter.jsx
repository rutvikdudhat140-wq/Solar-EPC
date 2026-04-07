import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

/**
 * CompactCalendarFilter Component
 * 
 * A compact date picker for Project and Inventory modules.
 * Same logic as CalendarFilter but with compact ERP-style button.
 */
const CompactCalendarFilter = ({ onDateChange, initialYear, initialMonth }) => {
  const currentDate = new Date();
  const [viewYear, setViewYear] = useState(initialYear || currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth !== undefined ? initialMonth : currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialYear || currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth !== undefined ? initialMonth : currentDate.getMonth());
  const [isToday, setIsToday] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigate to previous year
  const goToPreviousYear = () => {
    setViewYear(prev => prev - 1);
  };

  // Navigate to next year
  const goToNextYear = () => {
    setViewYear(prev => prev + 1);
  };

  // Select a specific month (undefined means full year)
  const selectMonth = (monthIndex) => {
    setSelectedMonth(monthIndex);
    setSelectedYear(viewYear);
    setIsToday(false);
    
    // Calculate date range for the selected month or full year
    let startDate, endDate;
    if (monthIndex !== undefined && monthIndex !== null) {
      // Month selected - filter by month
      startDate = new Date(viewYear, monthIndex, 1);
      endDate = new Date(viewYear, monthIndex + 1, 0); // Last day of month
    } else {
      // Full year selected
      startDate = new Date(viewYear, 0, 1); // Jan 1
      endDate = new Date(viewYear, 11, 31); // Dec 31
    }
    
    // Format dates as ISO strings
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Call the onDateChange callback with all relevant info
    if (onDateChange) {
      onDateChange({
        year: viewYear,
        month: monthIndex,
        day: undefined,
        isToday: false,
        monthName: monthIndex !== undefined && monthIndex !== null ? months[monthIndex] : null,
        startDate: startDateStr,
        endDate: endDateStr,
        startDateObj: startDate,
        endDateObj: endDate,
        isFullYear: monthIndex === undefined || monthIndex === null
      });
    }
    
    setIsOpen(false);
    setIsYearDropdownOpen(false);
  };

  // Jump to today's date
  const goToToday = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    
    setViewYear(currentYear);
    setViewMonth(currentMonth);
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    setIsToday(true);
    
    const startDate = new Date(currentYear, currentMonth, currentDay);
    const endDate = new Date(currentYear, currentMonth, currentDay, 23, 59, 59);
    
    if (onDateChange) {
      onDateChange({
        year: currentYear,
        month: currentMonth,
        day: currentDay,
        isToday: true,
        monthName: months[currentMonth],
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startDateObj: startDate,
        endDateObj: endDate
      });
    }
    
    setIsOpen(false);
  };

  // Clear/reset filter (show all data)
  const clearFilter = () => {
    setIsToday(false);
    if (onDateChange) {
      onDateChange(null);
    }
    setIsOpen(false);
  };

  // Generate year range: current year ± 10 years
  const currentYear = currentDate.getFullYear();
  const yearRange = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // Update state when initialYear/initialMonth props change
  useEffect(() => {
    if (initialYear !== undefined) {
      setSelectedYear(initialYear);
      setViewYear(initialYear);
    } else {
      // When initialYear is undefined (all data), reset to current date for display
      setSelectedYear(null);
      setViewYear(currentDate.getFullYear());
      setIsToday(false);
    }
    
    if (initialMonth !== undefined) {
      setSelectedMonth(initialMonth);
      setViewMonth(initialMonth);
    } else {
      setSelectedMonth(null);
      setViewMonth(currentDate.getMonth());
      setIsToday(false);
    }
  }, [initialYear, initialMonth]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.calendar-filter-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayText = isToday
    ? 'Today'
    : selectedYear 
      ? (selectedMonth !== undefined && selectedMonth !== null 
          ? `${months[selectedMonth]} ${selectedYear}`
          : `${selectedYear}`)
      : 'All Data';

  return (
    <div className="calendar-filter-container relative">
      {/* Trigger Button - Compact ERP Style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] transition-all focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      >
        <Calendar size={14} className="text-[var(--text-muted)]" />
        <span className="max-w-[100px] truncate">{displayText}</span>
        <svg 
          className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-slate-900 rounded-lg shadow-2xl border border-slate-700 dark:bg-slate-900">
          {/* Header with Year Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <button
              onClick={goToPreviousYear}
              className="p-1 hover:bg-slate-800 rounded-full transition-colors"
              title="Previous Year"
            >
              <ChevronLeft size={20} className="text-slate-400" />
            </button>
            
            <span className="text-lg font-semibold text-slate-100">{viewYear}</span>
            
            <button
              onClick={goToNextYear}
              className="p-1 hover:bg-slate-800 rounded-full transition-colors"
              title="Next Year"
            >
              <ChevronRight size={20} className="text-slate-400" />
            </button>
          </div>

          {/* Quick Year Selection - Custom Scrollable Dropdown */}
          <div className="px-4 py-2 border-b border-slate-700 relative">
            <button
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="w-full px-2 py-1 text-sm border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-800 text-slate-200 text-left flex items-center justify-between"
            >
              <span>{viewYear}</span>
              <svg 
                className={`w-4 h-4 text-slate-400 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isYearDropdownOpen && (
              <div className="absolute z-50 left-4 right-4 mt-1 max-h-40 overflow-y-auto bg-slate-900 border border-slate-700 rounded shadow-lg">
                {/* Full Year Option */}
                <button
                  onClick={() => {
                    setViewYear(viewYear);
                    selectMonth(undefined);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-800 transition-colors font-medium border-b border-slate-700 ${
                    selectedYear === viewYear && (selectedMonth === undefined || selectedMonth === null) ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-slate-200'
                  }`}
                >
                  Full Year
                </button>
                {yearRange.map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      setViewYear(year);
                      setIsYearDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-800 transition-colors ${
                      year === viewYear ? 'bg-[var(--primary)]/20 text-[var(--primary)] font-medium' : 'text-slate-200'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Month Grid */}
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              {months.map((month, index) => {
                const isSelected = selectedYear === viewYear && selectedMonth === index;
                const isCurrentMonth = 
                  currentDate.getFullYear() === viewYear && 
                  currentDate.getMonth() === index;

                return (
                  <button
                    key={month}
                    onClick={() => selectMonth(index)}
                    className={`
                      py-2 px-1 text-sm font-medium rounded-lg transition-all
                      ${isSelected 
                        ? 'bg-[var(--primary)] text-white shadow-md' 
                        : isCurrentMonth
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }
                    `}
                  >
                    {month.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800 rounded-b-lg">
            <button
              onClick={goToToday}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
            >
              <Clock size={14} />
              Today
            </button>
            
            <button
              onClick={clearFilter}
              className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactCalendarFilter;
