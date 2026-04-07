import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Zap, 
  Package, 
  Calculator, 
  FileText, 
  Send, 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Projector,
  ChevronRight,
  Loader2,
  Box,
  Layers,
  Scale,
  Mail
} from 'lucide-react';
import api from '../lib/apiClient';
import { toast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input, Textarea, FormField } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { CURRENCY } from '../config/app.config';
import { cn } from '../lib/utils';

const QuotationBuilderPage = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Quotation State
  const [quotation, setQuotation] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    systemConfig: {
      systemSize: 0,
      panelCount: 0,
      inverterType: '',
      batteryOption: '',
      mountingStructure: ''
    },
    paymentTerms: '', // User will enter payment terms percentage
    visitInMonth: '', // Number of visits per month
    totalVisit: '', // Total number of visits
    materials: [{
      itemId: `TEMP-${Date.now()}`,
      name: '',
      category: '',
      unit: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      availableStock: 0
    }],
    materialTotal: 0,
    installationCost: 0,
    transportCost: 0,
    gstPercentage: 18,
    tax: 0,
    finalQuotationPrice: 0,
    notes: '',
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [itemsRes, leadsRes, catRes, unitRes] = await Promise.all([
          api.get('/items'),
          api.get('/leads'),
          api.get('/lookups/categories'),
          api.get('/lookups/units')
        ]);
        
        console.log('Raw leads response:', leadsRes);
        
        // Extract data from standard API response structure { success: true, data: [...] }
        const extractData = (res) => {
          if (Array.isArray(res)) return res;
          if (res?.data && Array.isArray(res.data)) return res.data;
          if (res?.leads && Array.isArray(res.leads)) return res.leads;
          if (res?.items && Array.isArray(res.items)) return res.items;
          return [];
        };

        const itemsData = extractData(itemsRes);
        const leadsData = extractData(leadsRes);
        
        console.log('Extracted leads:', leadsData);
        console.log('Leads count:', leadsData.length);
        
        if (leadsData.length === 0) {
          console.warn('No leads found - checking if customers endpoint exists...');
          // Try customers endpoint as fallback
          try {
            const customersRes = await api.get('/leads/customers');
            console.log('Customers response:', customersRes);
            const customersData = extractData(customersRes);
            console.log('Extracted customers:', customersData);
            setCustomers(customersData);
          } catch (err) {
            console.log('Customers endpoint failed:', err);
            setCustomers([]);
          }
        } else {
          setCustomers(leadsData);
        }
        
        setInventoryItems(itemsData);
        setCategories(extractData(catRes));
        setUnits(extractData(unitRes));
      } catch (err) {
        console.error('Error fetching builder data:', err);
        toast.error('Failed to load data from modules');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sync customer details when selected
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c._id === selectedCustomerId || c.id === selectedCustomerId);
      if (customer) {
        setQuotation(prev => ({
          ...prev,
          customerId: selectedCustomerId,
          customerName: customer.name,
          customerPhone: customer.phone || '',
          customerEmail: customer.email || '',
          customerAddress: (customer.city ? `${customer.city}, ${customer.state}` : '')
        }));
      }
    }
  }, [selectedCustomerId, customers]);

  // Pricing Engine
  const totals = useMemo(() => {
    const materialTotal = quotation.materials.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const installationCost = Number(quotation.installationCost) || 0;
    const transportCost = Number(quotation.transportCost) || 0;
    
    const subtotal = materialTotal + installationCost + transportCost;
    const gstPercent = Number(quotation.gstPercentage) || 0;
    const tax = Math.round((subtotal * gstPercent) / 100);
    const finalPrice = subtotal + tax;
    
    return { materialTotal, tax, finalPrice, subtotal };
  }, [quotation.materials, quotation.installationCost, quotation.transportCost, quotation.gstPercentage]);

  // Update totals in state when memo changes
  useEffect(() => {
    setQuotation(prev => {
      // Only update if values actually changed to prevent infinite loops
      if (prev.materialTotal === totals.materialTotal && 
          prev.tax === totals.tax && 
          prev.finalQuotationPrice === totals.finalPrice) {
        return prev;
      }
      return {
        ...prev,
        materialTotal: totals.materialTotal,
        tax: totals.tax,
        finalQuotationPrice: totals.finalPrice
      };
    });
  }, [totals]);

  const handleAddMaterial = () => {
    const newItem = {
      itemId: `TEMP-${Date.now()}`,
      name: '',
      category: '',
      unit: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      availableStock: 0
    };

    setQuotation(prev => ({
      ...prev,
      materials: [...prev.materials, newItem]
    }));
  };

  const handleSelectInventoryItem = (index, itemId) => {
    const item = inventoryItems.find(i => i._id === itemId || i.itemId === itemId);
    if (!item) return;

    const updatedMaterials = [...quotation.materials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      itemId: item._id || item.itemId,
      name: item.description || item.name,
      category: item.category || '',
      unit: item.unit || '',
      unitPrice: item.rate || item.sellingPrice || 0,
      availableStock: item.stock || item.currentStock || 0,
      totalPrice: (updatedMaterials[index].quantity || 1) * (item.rate || item.sellingPrice || 0)
    };

    setQuotation(prev => ({
      ...prev,
      materials: updatedMaterials
    }));
  };

  const handleUpdateMaterial = (index, field, value) => {
    const updatedMaterials = [...quotation.materials];
    const material = updatedMaterials[index];
    
    let newValue = value;
    if (field === 'quantity') newValue = Math.max(0, parseInt(value) || 0);
    if (field === 'unitPrice') newValue = Math.max(0, parseFloat(value) || 0);

    updatedMaterials[index] = {
      ...material,
      [field]: newValue
    };

    if (field === 'quantity' || field === 'unitPrice') {
      updatedMaterials[index].totalPrice = updatedMaterials[index].quantity * updatedMaterials[index].unitPrice;
    }

    setQuotation(prev => ({
      ...prev,
      materials: updatedMaterials
    }));

    if (field === 'quantity' && newValue > material.availableStock && material.availableStock > 0) {
      toast.warning(`Insufficient inventory for ${material.name || 'this item'}`);
    }
  };

  const handleRemoveMaterial = (index) => {
    setQuotation(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (status = 'Draft') => {
    if (!quotation.customerName || quotation.materials.length === 0) {
      toast.error('Please select a customer and add materials');
      return;
    }

    // Validation for customerId (must be a valid MongoDB ObjectId)
    if (!quotation.customerId || !/^[0-9a-fA-F]{24}$/.test(quotation.customerId)) {
      toast.error('Invalid customer selection. Please re-select a lead/customer.');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...quotation, status };
      console.log('Payload being sent:', payload); // Debug paymentTerms
      const response = await api.post('/quotations', payload);
      console.log('Response:', response.data); // Debug saved quotation
      toast.success(`Quotation ${status === 'Draft' ? 'saved as draft' : 'created'}!`);
      
      // Navigate to documents page to show saved quotation
      setTimeout(() => {
        window.location.href = '/documents';
      }, 1500);
    } catch (err) {
      console.error('Save error:', err);
      // Detailed error message from backend
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save quotation';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!quotation.customerName || quotation.materials.length === 0) {
      toast.error('Please add customer and materials first');
      return;
    }

    try {
      // For preview, we first save as draft to get an ID, or just send current state
      // Simplest way for preview is to have an endpoint that returns PDF buffer for current state
      // or just use the generated PDF from a saved record.
      // For now, let's assume we want to preview the current state.
      toast.info('Generating preview...');
      
      // If the quotation doesn't have an ID yet, we might need to save it first
      // or use a temporary preview endpoint.
      // Let's implement a direct download for the PDF if it's already saved.
      // If not saved, we'll save it as draft first.
      
      const payload = { ...quotation, status: 'Draft' };
      const res = await api.post('/quotations', payload);
      const savedQuotation = res.data || res;
      const id = savedQuotation._id || savedQuotation.id;

      if (id) {
        window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/quotations/${id}/pdf`, '_blank');
      }
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Failed to generate preview');
    }
  };

  const handleSendEmail = async () => {
    if (!quotation.customerEmail) {
      toast.error('Please enter a customer email');
      return;
    }
    if (!quotation.customerName || quotation.materials.length === 0) {
      toast.error('Please add customer and materials first');
      return;
    }

    setSendingEmail(true);
    try {
      toast.info('Sending quotation via email...');
      
      // First save the quotation to get an ID
      const payload = { ...quotation, status: 'Draft' };
      const res = await api.post('/quotations', payload);
      const savedQuotation = res.data || res;
      const id = savedQuotation._id || savedQuotation.id;

      if (!id) {
        toast.error('Failed to save quotation');
        return;
      }

      // Send email with PDF
      await api.post(`/quotations/${id}/email`, {
        email: quotation.customerEmail,
        subject: `Solar Quotation - ${quotation.customerName}`,
        message: `Dear ${quotation.customerName},\n\nPlease find attached your solar quotation.\n\nBest regards,\nSolar EPC Team`
      });

      toast.success(`Quotation sent to ${quotation.customerEmail}`);
    } catch (err) {
      console.error('Email send error:', err);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-[var(--primary)]" size={40} /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-fade-in">
      <PageHeader 
        title="Quotation Builder" 
        subtitle="Create professional solar quotes using inventory data"
        actions={[
          { label: 'Preview PDF', icon: Eye, variant: 'outline', onClick: handlePreviewPdf },
          { label: 'Save Draft', icon: Save, variant: 'secondary', onClick: () => handleSave('Draft') },
          { label: 'Create Quotation', icon: CheckCircle2, variant: 'primary', onClick: () => handleSave('Sent') }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Config */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Customer */}
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-base)] p-6">
            <div className="flex items-center gap-2 mb-6 text-[var(--primary)]">
              <User size={20} />
              <h2 className="font-bold text-lg">Customer Selection</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Existing Customer / Lead">
                <select 
                  className="w-full h-10 px-3 border border-[var(--border-base)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--text-primary)]"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {customers.length === 0 && (
                    <option value="" disabled>No customers/leads found</option>
                  )}
                  {customers.map(c => (
                    <option key={c._id || c.id || c.leadId} value={c._id || c.id || c.leadId}>
                      {c.name || c.customerName || 'Unnamed'} {c.phone ? `(${c.phone})` : c.email ? `(${c.email})` : ''}
                    </option>
                  ))}
                </select>
                {customers.length === 0 && !loading && (
                  <p className="text-xs text-[var(--primary)] mt-1">No leads found. Please add leads in CRM first.</p>
                )}
              </FormField>
              <FormField label="Customer Name">
                <Input 
                  value={quotation.customerName}
                  onChange={(e) => setQuotation(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </FormField>
              <FormField label="Email">
                <div className="flex gap-2">
                  <Input 
                    value={quotation.customerEmail}
                    onChange={(e) => setQuotation(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="customer@example.com"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendEmail}
                    disabled={!quotation.customerEmail || sendingEmail}
                    className="px-3"
                    title="Send PDF to this email"
                  >
                    {sendingEmail ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Mail size={18} />
                    )}
                  </Button>
                </div>
              </FormField>
              <FormField label="Phone">
                <Input 
                  value={quotation.customerPhone}
                  onChange={(e) => setQuotation(prev => ({ ...prev, customerPhone: e.target.value }))}
                />
              </FormField>
              <FormField label="Address" className="md:col-span-2">
                <Textarea 
                  value={quotation.customerAddress}
                  onChange={(e) => setQuotation(prev => ({ ...prev, customerAddress: e.target.value }))}
                  rows={2}
                />
              </FormField>
            </div>
          </div>

          {/* Section 2: Project Information & Quick Material Add */}
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-base)] p-6">
            <div className="flex items-center gap-2 mb-6 text-[var(--primary)]">
              <Zap size={20} />
              <h2 className="font-bold text-lg">Project Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <FormField label="Project Name">
                <Input 
                  placeholder="e.g., 10kW Solar Rooftop Installation"
                  value={quotation.notes}
                  onChange={(e) => setQuotation(prev => ({ ...prev, notes: e.target.value }))}
                />
              </FormField>
              <FormField label="Project Location">
                <Input 
                  placeholder="e.g., Surat, Gujarat"
                  value={quotation.customerAddress}
                  onChange={(e) => setQuotation(prev => ({ ...prev, customerAddress: e.target.value }))}
                />
              </FormField>
              <FormField label="System Size (kW)">
                <Input 
                  type="number"
                  placeholder="e.g., 10"
                  value={quotation.systemConfig.systemSize}
                  onChange={(e) => setQuotation(prev => ({ 
                    ...prev, 
                    systemConfig: { ...prev.systemConfig, systemSize: parseFloat(e.target.value) || 0 } 
                  }))}
                />
              </FormField>
              <FormField label="Payment Terms %">
                <Input 
                  type="number"
                  placeholder="e.g., 50"
                  value={quotation.paymentTerms}
                  onChange={(e) => setQuotation(prev => ({ 
                    ...prev, 
                    paymentTerms: e.target.value === '' ? '' : parseFloat(e.target.value)
                  }))}
                />
              </FormField>
              <FormField label="Visit in Month">
                <Input 
                  type="number"
                  placeholder="e.g., 2"
                  value={quotation.visitInMonth}
                  onChange={(e) => setQuotation(prev => ({ 
                    ...prev, 
                    visitInMonth: e.target.value === '' ? '' : parseInt(e.target.value)
                  }))}
                />
              </FormField>
              <FormField label="Total Visit">
                <Input 
                  type="number"
                  placeholder="e.g., 24"
                  value={quotation.totalVisit}
                  onChange={(e) => setQuotation(prev => ({ 
                    ...prev, 
                    totalVisit: e.target.value === '' ? '' : parseInt(e.target.value)
                  }))}
                />
              </FormField>
            </div>

            {/* QUICK MATERIAL ADD - AS REQUESTED */}
            <div className="pt-6 border-t border-[var(--border-muted)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Quick Add Material</h3>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddMaterial} className="flex items-center gap-1">
                  <Plus size={16} /> Add More Rows
                </Button>
              </div>
              
              <div className="space-y-4">
                {quotation.materials.map((m, idx) => (
                  <div key={m.itemId + idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-base)] items-end">
                    <div className="md:col-span-2">
                      <FormField label="Item Name">
                        <select 
                          className="w-full h-10 px-3 border border-[var(--border-base)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--text-primary)]"
                          style={{ backgroundColor: 'var(--bg-surface)' }}
                          value={m.itemId.startsWith('TEMP-') ? '' : m.itemId}
                          onChange={(e) => handleSelectInventoryItem(idx, e.target.value)}
                        >
                          <option value="">-- Select Item --</option>
                          {inventoryItems.map(item => (
                            <option key={item._id} value={item._id}>{item.description || item.name}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                    <div>
                      <FormField label="Category">
                        <select 
                          className="w-full h-10 px-3 border border-[var(--border-base)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--text-primary)]"
                          style={{ backgroundColor: 'var(--bg-surface)' }}
                          value={m.category}
                          onChange={(e) => handleUpdateMaterial(idx, 'category', e.target.value)}
                        >
                          <option value="">-- Select --</option>
                          {categories.map(cat => (
                            <option key={cat._id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                    <div>
                      <FormField label="Unit">
                        <select 
                          className="w-full h-10 px-3 border border-[var(--border-base)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--text-primary)]"
                          style={{ backgroundColor: 'var(--bg-surface)' }}
                          value={m.unit}
                          onChange={(e) => handleUpdateMaterial(idx, 'unit', e.target.value)}
                        >
                          <option value="">-- Select --</option>
                          {units.map(u => (
                            <option key={u._id} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <FormField label="Quantity">
                          <Input 
                            type="number"
                            value={m.quantity}
                            onChange={(e) => handleUpdateMaterial(idx, 'quantity', e.target.value)}
                          />
                        </FormField>
                      </div>
                      <button 
                        onClick={() => handleRemoveMaterial(idx)}
                        className="mb-2 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {quotation.materials.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-[var(--border-base)] rounded-2xl">
                    <p className="text-sm text-[var(--text-muted)]">No items added yet. Click "Add More Rows" to start.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Detailed Table (Summary View) */}
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-base)] p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-6 text-[var(--primary)]">
              <Package size={20} />
              <h2 className="font-bold text-lg">Material Breakdown</h2>
            </div>
            
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-elevated)] border-y border-[var(--border-base)]">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase">Description</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase text-center w-20">Qty</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase text-right">Unit Price</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quotation.materials.map((m, idx) => (
                    <tr key={m.itemId + idx} className="hover:bg-[var(--bg-elevated)]/50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{m.name || 'Unnamed Item'}</p>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase">{m.category} • {m.unit}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium">{m.quantity}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Input 
                          type="number"
                          className="h-8 text-right text-xs w-24 ml-auto"
                          value={m.unitPrice}
                          onChange={(e) => handleUpdateMaterial(idx, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{CURRENCY.format(m.totalPrice)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-base)] p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-6 text-[var(--primary)]">
              <Calculator size={20} />
              <h2 className="font-bold text-lg">Price Summary</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Material Total</span>
                <span className="font-semibold">{CURRENCY.format(totals.materialTotal)}</span>
              </div>
              
              <div className="space-y-3 pt-2">
                <FormField label="Installation Cost">
                  <Input 
                    type="number"
                    value={quotation.installationCost}
                    onChange={(e) => setQuotation(prev => ({ ...prev, installationCost: Number(e.target.value) || 0 }))}
                    className="h-9"
                  />
                </FormField>
                <FormField label="Transport Cost">
                  <Input 
                    type="number"
                    value={quotation.transportCost}
                    onChange={(e) => setQuotation(prev => ({ ...prev, transportCost: Number(e.target.value) || 0 }))}
                    className="h-9"
                  />
                </FormField>
                <FormField label="GST Percentage (%)">
                  <Input 
                    type="number"
                    value={quotation.gstPercentage}
                    onChange={(e) => setQuotation(prev => ({ ...prev, gstPercentage: Number(e.target.value) || 0 }))}
                    placeholder="18"
                    className="h-9"
                  />
                </FormField>
              </div>

              <div className="flex justify-between text-sm border-t border-[var(--border-muted)] pt-3">
                <span className="text-[var(--text-secondary)] font-medium">Subtotal</span>
                <span className="font-bold">{CURRENCY.format(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">GST ({quotation.gstPercentage}%)</span>
                <span className="font-semibold text-[var(--amber)]">{CURRENCY.format(totals.tax)}</span>
              </div>
              
              <div className="pt-4 border-t border-dashed border-[var(--border-base)]">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Grand Total</span>
                  <span className="text-2xl font-black text-[var(--primary)]">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0
                    }).format(totals.finalPrice)}
                  </span>
                </div>
              </div>

              <div className="pt-6 space-y-3">
                <Button 
                  className="w-full h-12 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/20"
                  onClick={() => handleSave('Sent')}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
                  Generate & Save Quote
                </Button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default QuotationBuilderPage;
