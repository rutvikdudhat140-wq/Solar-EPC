import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

/**
 * CalendarFilter Component
 * 
 * A dynamic date picker that allows users to:
 * - Navigate to any year (past or future)
 * - Select any month
 * - Jump to today's date with a "Today" button
 * - Filter financial data by selected date range
 */
const CalendarFilter = ({ onDateChange, initialYear, initialMonth, initialDay, availableYears }) => {
  const currentDate = new Date();
  
  // Check if initially today is selected
  const isInitiallyToday = initialDay !== undefined && 
    initialYear === currentDate.getFullYear() && 
    initialMonth === currentDate.getMonth() && 
    initialDay === currentDate.getDate();
  
  const [viewYear, setViewYear] = useState(initialYear || currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth !== undefined ? initialMonth : currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialYear || currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth !== undefined ? initialMonth : currentDate.getMonth());
  const [isToday, setIsToday] = useState(isInitiallyToday);
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

  // Update state when initialYear/initialMonth props change (e.g., when "Show All Data" is clicked)
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
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg hover:bg-[var(--bg-hover)] hover:border-[var(--border-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      >
        <Calendar size={14} className="text-[var(--text-muted)]" />
        <span>{displayText}</span>
        <svg 
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-[var(--bg-elevated)] rounded-lg shadow-2xl border border-[var(--border-base)]">
          {/* Header with Year Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-muted)]">
            <button
              onClick={goToPreviousYear}
              className="p-1 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
              title="Previous Year"
            >
              <ChevronLeft size={20} className="text-[var(--text-muted)]" />
            </button>
            
            <span className="text-lg font-semibold text-[var(--text-primary)]">{viewYear}</span>
            
            <button
              onClick={goToNextYear}
              className="p-1 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
              title="Next Year"
            >
              <ChevronRight size={20} className="text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Quick Year Selection - Custom Scrollable Dropdown */}
          <div className="px-4 py-2 border-b border-[var(--border-muted)] relative">
            <button
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="w-full px-2 py-1 text-sm border border-[var(--border-base)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-left flex items-center justify-between"
            >
              <span>{viewYear}</span>
              <svg 
                className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isYearDropdownOpen && (
              <div className="absolute z-50 left-4 right-4 mt-1 max-h-40 overflow-y-auto bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded shadow-lg">
                {/* Full Year Option */}
                <button
                  onClick={() => {
                    setViewYear(viewYear);
                    selectMonth(undefined);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-hover)] transition-colors font-medium border-b border-[var(--border-muted)] ${
                    selectedYear === viewYear && (selectedMonth === undefined || selectedMonth === null) ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-[var(--text-primary)]'
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
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-hover)] transition-colors ${
                      year === viewYear ? 'bg-[var(--primary)]/20 text-[var(--primary)] font-medium' : 'text-[var(--text-primary)]'
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
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-muted)] bg-[var(--bg-surface)] rounded-b-lg">
            <button
              onClick={goToToday}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
            >
              <Clock size={14} />
              Today
            </button>
            
            <button
              onClick={clearFilter}
              className="px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarFilter;
