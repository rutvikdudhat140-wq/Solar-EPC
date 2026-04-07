// PDF Template Customizer Component
// Allows users to customize PDF design before downloading

import React, { useState, useCallback } from 'react';
import {
  Settings, Palette, Layout, Type, Image, FileText,
  Eye, Download, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Save, RotateCcw, Grid, Box, AlignLeft, AlignCenter, AlignRight,
  Sun, Moon, Leaf, Zap
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { cn } from '../../lib/utils';
import { TEMPLATE_CONFIG, Templates, createCustomTemplate, generateCustomPDF, downloadCustomPDF } from '../../lib/pdfTemplate';

// Predefined color themes
const COLOR_THEMES = {
  corporate: {
    name: 'Corporate Teal',
    colors: { primary: [0, 128, 128], accent: [255, 193, 7] },
    icon: Zap
  },
  minimal: {
    name: 'Minimal Gray',
    colors: { primary: [51, 51, 51], accent: [249, 115, 22] },
    icon: Box
  },
  solar: {
    name: 'Solar Orange',
    colors: { primary: [234, 88, 12], accent: [250, 204, 21] },
    icon: Sun
  },
  eco: {
    name: 'Eco Green',
    colors: { primary: [22, 163, 74], accent: [234, 179, 8] },
    icon: Leaf
  },
  dark: {
    name: 'Modern Dark',
    colors: { primary: [30, 41, 59], accent: [99, 102, 241] },
    icon: Moon
  }
};

// Header style options
const HEADER_STYLES = [
  { value: 'bar', label: 'Color Bar', description: 'Colored bar at top' },
  { value: 'box', label: 'Box Header', description: 'Boxed header design' },
  { value: 'line', label: 'Simple Line', description: 'Clean line separator' },
  { value: 'none', label: 'Minimal', description: 'No header decoration' }
];

// Card style options
const CARD_STYLES = [
  { value: 'rounded', label: 'Rounded', description: 'Rounded corners' },
  { value: 'square', label: 'Square', description: 'Sharp corners' },
  { value: 'shadow', label: 'Shadow', description: 'With shadow effect' }
];

const PDFTemplateCustomizer = ({
  isOpen,
  onClose,
  proposalData,
  onDownload
}) => {
  const [config, setConfig] = useState({ ...TEMPLATE_CONFIG });
  const [activeTab, setActiveTab] = useState('general');
  const [previewMode, setPreviewMode] = useState(false);

  // Update config helper
  const updateConfig = useCallback((path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  }, []);

  // Apply color theme
  const applyTheme = (themeKey) => {
    const theme = COLOR_THEMES[themeKey];
    if (theme) {
      setConfig(prev => ({
        ...prev,
        colors: { ...prev.colors, ...theme.colors }
      }));
    }
  };

  // Toggle section
  const toggleSection = (section) => {
    updateConfig(`sections.${section}`, !config.sections[section]);
  };

  // Handle download with custom config
  const handleDownload = () => {
    downloadCustomPDF(
      {
        ...proposalData,
        documentType: 'Proposal',
        documentNumber: proposalData.proposalNumber
      },
      undefined,
      config,
      `Proposal_${proposalData.proposalNumber || 'Custom'}.pdf`
    );
    onDownload?.();
  };

  // Reset to default
  const resetConfig = () => {
    setConfig({ ...TEMPLATE_CONFIG });
  };

  // Color input component
  const ColorInput = ({ label, value, onChange }) => {
    const safeValue = Array.isArray(value) ? value : [0, 102, 102]; // Default teal fallback
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
        <input
          type="color"
          value={`#${safeValue.map(v => v.toString(16).padStart(2, '0')).join('')}`}
          onChange={(e) => {
            const hex = e.target.value.slice(1);
            const rgb = [
              parseInt(hex.slice(0, 2), 16),
              parseInt(hex.slice(2, 4), 16),
              parseInt(hex.slice(4, 6), 16)
            ];
            onChange(rgb);
          }}
          className="w-8 h-8 rounded cursor-pointer border-0"
        />
      </div>
    );
  };

  // Section toggle component
  const SectionToggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
      <button
        onClick={onChange}
        className={cn(
          'w-5 h-5 rounded flex items-center justify-center transition-colors mt-0.5',
          checked
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--bg-hover)] border border-[var(--border-base)]'
        )}
      >
        {checked && <CheckCircle size={14} />}
      </button>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize PDF Template"
      size="xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Settings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
            {[
              { key: 'general', label: 'General', icon: Settings },
              { key: 'colors', label: 'Colors', icon: Palette },
              { key: 'layout', label: 'Layout', icon: Layout },
              { key: 'sections', label: 'Sections', icon: Grid }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Quick Themes</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(COLOR_THEMES).map(([key, theme]) => {
                    const Icon = theme.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => applyTheme(key)}
                        className="p-3 rounded-xl border border-[var(--border-base)] hover:border-[var(--primary)] transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `rgb(${theme.colors.primary.join(',')})` }}
                          >
                            <Icon size={16} style={{ color: `rgb(${theme.colors.accent.join(',')})` }} />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{theme.name}</p>
                      </button>
                    );
                  })}
                </div>

                <h4 className="text-sm font-bold text-[var(--text-primary)] pt-2">Document Settings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">Header Style</label>
                    <Select
                      value={config.style.headerStyle}
                      onChange={(v) => updateConfig('style.headerStyle', v)}
                      options={HEADER_STYLES.map(s => ({ value: s.value, label: s.label }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">Card Style</label>
                    <Select
                      value={config.style.cardStyle}
                      onChange={(v) => updateConfig('style.cardStyle', v)}
                      options={CARD_STYLES.map(s => ({ value: s.value, label: s.label }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Colors Tab */}
            {activeTab === 'colors' && (
              <div className="space-y-4">
                {/* Header Color Section */}
                <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border-2 border-[var(--primary)]">
                  <h4 className="text-sm font-bold text-[var(--primary)] mb-3 flex items-center gap-2">
                    <Layout size={16} />
                    Header Background Color
                  </h4>
                  <div className="flex items-center gap-4">
                    <ColorInput
                      label="Header Color"
                      value={config.colors.primary}
                      onChange={(v) => updateConfig('colors.primary', v)}
                    />
                    <div
                      className="w-20 h-12 rounded-lg border-2 border-[var(--border-base)]"
                      style={{ backgroundColor: `rgb(${config.colors.primary?.join(',') || '0,128,128'})` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Click color picker to change PDF header background
                  </p>
                </div>

                <h4 className="text-sm font-bold text-[var(--text-primary)]">Color Palette</h4>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-elevated)]">
                  <ColorInput
                    label="Primary Color"
                    value={config.colors.primary}
                    onChange={(v) => updateConfig('colors.primary', v)}
                  />
                  <ColorInput
                    label="Accent Color"
                    value={config.colors.accent}
                    onChange={(v) => updateConfig('colors.accent', v)}
                  />
                  <ColorInput
                    label="Primary Dark"
                    value={config.colors.primaryDark}
                    onChange={(v) => updateConfig('colors.primaryDark', v)}
                  />
                  <ColorInput
                    label="Secondary"
                    value={config.colors.secondary}
                    onChange={(v) => updateConfig('colors.secondary', v)}
                  />
                </div>

                <h4 className="text-sm font-bold text-[var(--text-primary)] pt-2">Table Colors</h4>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-elevated)]">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">Header Color</label>
                    <Select
                      value={config.table.headerColor}
                      onChange={(v) => updateConfig('table.headerColor', v)}
                      options={[
                        { value: 'primary', label: 'Primary' },
                        { value: 'accent', label: 'Accent' },
                        { value: 'gray', label: 'Gray' },
                        { value: 'black', label: 'Black' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">Show Alternating Rows</label>
                    <button
                      onClick={() => updateConfig('style.alternatingRows', !config.style.alternatingRows)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm w-full',
                        config.style.alternatingRows
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                      )}
                    >
                      {config.style.alternatingRows ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Layout Tab */}
            {activeTab === 'layout' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Page Layout</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">Border Radius</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={config.style.borderRadius}
                      onChange={(e) => updateConfig('style.borderRadius', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-[var(--text-muted)]">{config.style.borderRadius}px</span>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">Table Font Size</label>
                    <input
                      type="range"
                      min="7"
                      max="12"
                      value={config.table.fontSize}
                      onChange={(e) => updateConfig('table.fontSize', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-[var(--text-muted)]">{config.table.fontSize}pt</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-[var(--text-primary)] pt-2">Styling Options</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => updateConfig('style.accentLine', !config.style.accentLine)}
                    className={cn(
                      'flex items-center justify-between w-full p-3 rounded-lg',
                      config.style.accentLine ? 'bg-[var(--primary)]/10 border border-[var(--primary)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-base)]'
                    )}
                  >
                    <span className="text-sm text-[var(--text-primary)]">Show Accent Lines</span>
                    {config.style.accentLine && <CheckCircle size={16} className="text-[var(--primary)]" />}
                  </button>
                  <button
                    onClick={() => updateConfig('style.tableBorder', !config.style.tableBorder)}
                    className={cn(
                      'flex items-center justify-between w-full p-3 rounded-lg',
                      config.style.tableBorder ? 'bg-[var(--primary)]/10 border border-[var(--primary)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-base)]'
                    )}
                  >
                    <span className="text-sm text-[var(--text-primary)]">Table Borders</span>
                    {config.style.tableBorder && <CheckCircle size={16} className="text-[var(--primary)]" />}
                  </button>
                </div>
              </div>
            )}

            {/* Sections Tab */}
            {activeTab === 'sections' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Visible Sections</h4>
                <p className="text-xs text-[var(--text-muted)]">Toggle sections to show/hide in PDF</p>

                <div className="grid grid-cols-1 gap-2">
                  <SectionToggle
                    label="Header Section"
                    description="Company logo, name, contact info and document title"
                    checked={config.sections.header}
                    onChange={() => toggleSection('header')}
                  />
                  <SectionToggle
                    label="Client Information Card"
                    description="Client name, address, contact details in a styled box"
                    checked={config.sections.clientCard}
                    onChange={() => toggleSection('clientCard')}
                  />
                  <SectionToggle
                    label="Items Table"
                    description="Product/Service table with quantities and prices"
                    checked={config.sections.itemsTable}
                    onChange={() => toggleSection('itemsTable')}
                  />
                  <SectionToggle
                    label="Pricing Summary"
                    description="Subtotal, tax, discount and grand total box"
                    checked={config.sections.pricingSummary}
                    onChange={() => toggleSection('pricingSummary')}
                  />
                  <SectionToggle
                    label="Terms & Conditions"
                    description="Payment terms and conditions section"
                    checked={config.sections.terms}
                    onChange={() => toggleSection('terms')}
                  />
                  <SectionToggle
                    label="Additional Notes"
                    description="Custom notes section"
                    checked={config.sections.notes}
                    onChange={() => toggleSection('notes')}
                  />
                  <SectionToggle
                    label="Footer with Signatures"
                    description="Authorized signature and customer acceptance areas"
                    checked={config.sections.footer}
                    onChange={() => toggleSection('footer')}
                  />
                  <SectionToggle
                    label="Company Stamp Area"
                    description="Space for company stamp/seal"
                    checked={config.sections.stamp}
                    onChange={() => toggleSection('stamp')}
                  />
                  <SectionToggle
                    label="Page Numbers"
                    description="Show page numbers in footer"
                    checked={config.sections.pageNumbers}
                    onChange={() => toggleSection('pageNumbers')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview & Actions */}
        <div className="space-y-4">
          {/* Preview Card */}
          <div className="glass-card p-4">
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Eye size={16} />
              Live Preview
            </h4>
            <div className="aspect-[3/4] rounded-lg border border-[var(--border-base)] bg-white p-4 overflow-hidden">
              {/* Mini preview representation */}
              <div className="h-full flex flex-col gap-2 text-[8px]">
                {/* Preview Header */}
                {config?.sections?.header && (
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      {config?.sections?.companyLogo && (
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: `rgb(${(config?.colors?.primary || [0, 102, 102]).join(',')})` }}
                        >
                          <Sun size={12} style={{ color: `rgb(${(config?.colors?.accent || [255, 193, 7]).join(',')})` }} />
                        </div>
                      )}
                      <div>
                        <div className="font-bold" style={{ color: `rgb(${(config?.colors?.primary || [0, 102, 102]).join(',')})` }}>Sunvora Energy</div>
                        <div className="text-gray-400">Surat, Gujarat</div>
                      </div>
                    </div>
                    <div
                      className="text-right px-2 py-1 rounded"
                      style={{ backgroundColor: `rgb(${(config?.colors?.grayLight || [245, 245, 245]).join(',')})` }}
                    >
                      <div className="font-bold" style={{ color: `rgb(${(config?.colors?.primary || [0, 102, 102]).join(',')})` }}>PROPOSAL</div>
                      <div className="text-gray-400">#PROP-001</div>
                    </div>
                  </div>
                )}

                {/* Preview Client Card */}
                {config?.sections?.clientCard && (
                  <div
                    className="p-2 rounded"
                    style={{
                      backgroundColor: `rgb(${(config?.colors?.grayLight || [245, 245, 245]).join(',')})`,
                      borderLeft: `3px solid rgb(${(config?.colors?.primary || [0, 102, 102]).join(',')})`
                    }}
                  >
                    <div className="font-bold text-gray-600">BILL TO:</div>
                    <div>ABC Corporation</div>
                    <div className="text-gray-400">Mumbai, Maharashtra</div>
                  </div>
                )}

                {/* Preview Table */}
                {config?.sections?.itemsTable && (
                  <div className="flex-1">
                    <div
                      className="text-white p-1 rounded-t text-center font-bold"
                      style={{ backgroundColor: `rgb(${(config?.colors?.[config?.table?.headerColor || 'primary'] || [0, 102, 102]).join(',')})` }}
                    >
                      Items Table
                    </div>
                    <div className="border border-gray-200">
                      <div className="grid grid-cols-4 gap-1 p-1 bg-gray-50 text-gray-400">
                        <span>Sr</span><span>Item</span><span>Qty</span><span>Price</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 p-1 text-gray-600">
                        <span>1</span><span>Solar Panel</span><span>10</span><span>₹25,000</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Summary */}
                {config?.sections?.pricingSummary && (
                  <div
                    className="ml-auto w-24 p-2 rounded text-right"
                    style={{ backgroundColor: `rgb(${(config?.colors?.grayLight || [245, 245, 245]).join(',')})` }}
                  >
                    <div className="text-gray-400">Subtotal</div>
                    <div className="text-gray-400">GST 18%</div>
                    <div
                      className="text-white p-1 rounded font-bold mt-1"
                      style={{ backgroundColor: `rgb(${(config?.colors?.primary || [0, 102, 102]).join(',')})` }}
                    >
                      Total: ₹2,95,000
                    </div>
                  </div>
                )}

                {/* Preview Footer */}
                {config?.sections?.footer && (
                  <div className="mt-auto pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-gray-400">
                      <span>Authorized Signature</span>
                      <span>Customer Acceptance</span>
                    </div>
                    {config?.sections?.stamp && (
                      <div className="text-center mt-1">
                        <span
                          className="inline-block px-2 py-1 rounded-full border border-dashed"
                          style={{ borderColor: `rgb(${(config?.colors?.primary || [0, 102, 102]).join(',')})`, color: `rgb(${(config?.colors?.primary || [0, 102, 102]).join(',')})` }}
                        >
                          Stamp Area
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="glass-card p-4 space-y-3">
            <Button onClick={handleDownload} className="w-full flex items-center justify-center gap-2">
              <Download size={18} />
              Download Custom PDF
            </Button>
            <Button variant="secondary" onClick={resetConfig} className="w-full flex items-center justify-center gap-2">
              <RotateCcw size={18} />
              Reset to Default
            </Button>
          </div>

          {/* Tips */}
          <div className="glass-card p-3 bg-amber-500/5 border-amber-500/20">
            <p className="text-xs text-amber-600 font-medium mb-1">💡 Tips:</p>
            <ul className="text-xs text-[var(--text-muted)] space-y-1">
              <li>• Use light colors for better printing</li>
              <li>• Keep header style consistent</li>
              <li>• Disable unused sections to save space</li>
              <li>• A4 format recommended for printing</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PDFTemplateCustomizer;
