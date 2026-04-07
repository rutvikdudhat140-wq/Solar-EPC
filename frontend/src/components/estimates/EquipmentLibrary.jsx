import React, { useState, useEffect } from 'react';
import { 
  X, Search, Plus, Check, Zap, Sun, Wrench, Cable, 
  Droplets, Gauge, HardHat, FileCheck, Cpu, Battery,
  Loader2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, FormField } from '../ui/Input';
import { inventoryApi } from '../../services/inventoryApi';
import { toast } from '../ui/Toast';

// Pre-defined Solar Equipment Library
export const SOLAR_EQUIPMENT_LIBRARY = [
  // Solar Panels
  { 
    id: 'panel-1',
    category: 'solar_panel', 
    categoryLabel: 'Solar Panel',
    icon: Sun,
    name: 'Solar Panel 550W - Mono PERC',
    brand: 'Waaree',
    model: 'WS-550',
    description: 'High efficiency monocrystalline solar panel with 21.5% efficiency',
    unitPrice: 14500,
    specs: '550W | 21.5% Efficiency | 25 years warranty'
  },
  { 
    id: 'panel-2',
    category: 'solar_panel', 
    categoryLabel: 'Solar Panel',
    icon: Sun,
    name: 'Solar Panel 540W - Bifacial',
    brand: 'Adani',
    model: 'AS-540-BF',
    description: 'Bifacial panel with dual-side generation capability',
    unitPrice: 15200,
    specs: '540W | Bifacial | 30 years warranty'
  },
  { 
    id: 'panel-3',
    category: 'solar_panel', 
    categoryLabel: 'Solar Panel',
    icon: Sun,
    name: 'Solar Panel 445W - Mono',
    brand: 'Jinko',
    model: 'JKM445M-72HL',
    description: 'Reliable monocrystalline panel for residential use',
    unitPrice: 12500,
    specs: '445W | 20.8% Efficiency | 25 years warranty'
  },
  
  // Inverters
  { 
    id: 'inv-1',
    category: 'inverter', 
    categoryLabel: 'Inverter',
    icon: Cpu,
    name: 'String Inverter 5kW - 3 Phase',
    brand: 'Growatt',
    model: 'MAX 50KTL3 LV',
    description: 'Grid-tied string inverter with WiFi monitoring',
    unitPrice: 65000,
    specs: '5kW | 3-Phase | 98.4% Efficiency'
  },
  { 
    id: 'inv-2',
    category: 'inverter', 
    categoryLabel: 'Inverter',
    icon: Cpu,
    name: 'String Inverter 3kW - 1 Phase',
    brand: 'Luminous',
    model: 'NXT 3KW',
    description: 'Single phase inverter for residential systems',
    unitPrice: 42000,
    specs: '3kW | 1-Phase | 97.8% Efficiency'
  },
  { 
    id: 'inv-3',
    category: 'inverter', 
    categoryLabel: 'Inverter',
    icon: Cpu,
    name: 'Central Inverter 100kW',
    brand: 'SMA',
    model: 'Sunny Central 100',
    description: 'Industrial central inverter for large installations',
    unitPrice: 450000,
    specs: '100kW | 3-Phase | 98.6% Efficiency'
  },
  { 
    id: 'inv-4',
    category: 'inverter', 
    categoryLabel: 'Inverter',
    icon: Battery,
    name: 'Hybrid Inverter 5kW with MPPT',
    brand: 'Victron',
    model: 'MultiPlus-II 48/5000',
    description: 'Hybrid inverter with battery backup support',
    unitPrice: 125000,
    specs: '5kW | Hybrid | 2x MPPT'
  },
  
  // Mounting Structure
  { 
    id: 'struct-1',
    category: 'structure', 
    categoryLabel: 'Mounting Structure',
    icon: Wrench,
    name: 'Roof Mounting Structure - RCC',
    brand: 'Sterling',
    model: 'SS-RF-01',
    description: 'Aluminum mounting structure for RCC roofs',
    unitPrice: 28000,
    specs: 'Per kW | Aluminum | Anti-corrosion'
  },
  { 
    id: 'struct-2',
    category: 'structure', 
    categoryLabel: 'Mounting Structure',
    icon: Wrench,
    name: 'Roof Mounting Structure - GI',
    brand: 'Tata',
    model: 'GI-RCC',
    description: 'Galvanized iron structure for metal roofs',
    unitPrice: 22000,
    specs: 'Per kW | GI | Hot-dip galvanized'
  },
  { 
    id: 'struct-3',
    category: 'structure', 
    categoryLabel: 'Mounting Structure',
    icon: Wrench,
    name: 'Ground Mount Structure',
    brand: 'Schletter',
    model: 'FixGrid-G',
    description: 'Hot-dip galvanized ground mounting system',
    unitPrice: 38000,
    specs: 'Per kW | HDG Steel | 25 years life'
  },
  
  // DC Cables
  { 
    id: 'dc-cable-1',
    category: 'cable_dc', 
    categoryLabel: 'DC Cable',
    icon: Cable,
    name: 'Solar DC Cable 4mm - Red',
    brand: 'Polycab',
    model: 'PV-4MM-RD',
    description: 'TUV certified solar DC cable (per meter)',
    unitPrice: 85,
    specs: '4mm² | Red | TUV Certified'
  },
  { 
    id: 'dc-cable-2',
    category: 'cable_dc', 
    categoryLabel: 'DC Cable',
    icon: Cable,
    name: 'Solar DC Cable 4mm - Black',
    brand: 'Polycab',
    model: 'PV-4MM-BK',
    description: 'TUV certified solar DC cable (per meter)',
    unitPrice: 85,
    specs: '4mm² | Black | TUV Certified'
  },
  { 
    id: 'dc-cable-3',
    category: 'cable_dc', 
    categoryLabel: 'DC Cable',
    icon: Cable,
    name: 'Solar DC Cable 6mm',
    brand: 'KEI',
    model: 'SOLAR-6MM',
    description: 'Heavy duty DC cable for longer runs (per meter)',
    unitPrice: 125,
    specs: '6mm² | Double insulated'
  },
  
  // AC Cables
  { 
    id: 'ac-cable-1',
    category: 'cable_ac', 
    categoryLabel: 'AC Cable',
    icon: Cable,
    name: 'AC Cable 4mm - 3 Core',
    brand: 'Polycab',
    model: 'AC-4MM-3C',
    description: '3 phase AC cable (per meter)',
    unitPrice: 95,
    specs: '4mm² | 3 Core | Copper'
  },
  { 
    id: 'ac-cable-2',
    category: 'cable_ac', 
    categoryLabel: 'AC Cable',
    icon: Cable,
    name: 'AC Cable 6mm - 3 Core',
    brand: 'Havells',
    model: 'AC-6MM-3C',
    description: 'Heavy duty AC cable (per meter)',
    unitPrice: 145,
    specs: '6mm² | 3 Core | Copper'
  },
  
  // Earthing
  { 
    id: 'earth-1',
    category: 'earthing', 
    categoryLabel: 'Earthing Kit',
    icon: Droplets,
    name: 'Complete Earthing Kit',
    brand: 'Generic',
    model: 'EARTH-01',
    description: 'GI pipe earthing with maintenance pit',
    unitPrice: 8500,
    specs: '3m depth | GI Pipe | Chemical'
  },
  { 
    id: 'earth-2',
    category: 'earthing', 
    categoryLabel: 'Earthing Kit',
    icon: Droplets,
    name: 'Lightning Arrestor + Earthing',
    brand: 'Phoenix',
    model: 'LA-EARTH-KIT',
    description: 'Class B+C lightning protection with earthing',
    unitPrice: 12500,
    specs: 'Class B+C | 100kA | Copper bonded'
  },
  
  // Net Metering
  { 
    id: 'meter-1',
    category: 'meter', 
    categoryLabel: 'Net Meter',
    icon: Gauge,
    name: 'Net Meter 3-Phase',
    brand: 'Secure',
    model: ' Premier 300',
    description: 'Bidirectional meter for net metering',
    unitPrice: 8500,
    specs: '3-Phase | Bi-directional | LCD'
  },
  { 
    id: 'meter-2',
    category: 'meter', 
    categoryLabel: 'Net Meter',
    icon: Gauge,
    name: 'Net Meter 1-Phase',
    brand: 'HPL',
    model: 'NMM-01',
    description: 'Single phase net metering solution',
    unitPrice: 4500,
    specs: '1-Phase | Bi-directional | LCD'
  },
  
  // Installation Labour
  { 
    id: 'labor-1',
    category: 'labor', 
    categoryLabel: 'Installation',
    icon: HardHat,
    name: 'Installation & Commissioning - Residential',
    brand: 'Service',
    model: 'INST-RES',
    description: 'Complete installation labor (per kW)',
    unitPrice: 8000,
    specs: 'Per kW | Civil | Electrical | Testing'
  },
  { 
    id: 'labor-2',
    category: 'labor', 
    categoryLabel: 'Installation',
    icon: HardHat,
    name: 'Installation & Commissioning - Commercial',
    brand: 'Service',
    model: 'INST-COM',
    description: 'Commercial installation labor (per kW)',
    unitPrice: 6000,
    specs: 'Per kW | Crane | Team | Testing'
  },
  { 
    id: 'labor-3',
    category: 'labor', 
    categoryLabel: 'Installation',
    icon: HardHat,
    name: 'Civil Work - RCC Structure',
    brand: 'Service',
    model: 'CIVIL-RCC',
    description: 'Civil foundation work for ground mount',
    unitPrice: 15000,
    specs: 'Per structure | Foundation | Curing'
  },
  
  // Accessories
  { 
    id: 'acc-1',
    category: 'accessories', 
    categoryLabel: 'Accessories',
    icon: Zap,
    name: 'MC4 Connectors - Pair',
    brand: 'Multi-Contact',
    model: 'MC4-PAIR',
    description: 'Waterproof MC4 connectors for DC side',
    unitPrice: 180,
    specs: 'IP67 | 30A | UV Resistant'
  },
  { 
    id: 'acc-2',
    category: 'accessories', 
    categoryLabel: 'Accessories',
    icon: Zap,
    name: 'DC Combiner Box 4-in-1',
    brand: 'Generic',
    model: 'DC-CB-4',
    description: '4 string DC combiner with SPD and MCB',
    unitPrice: 6500,
    specs: '4 Input | SPD | MCB | 1000V'
  },
  { 
    id: 'acc-3',
    category: 'accessories', 
    categoryLabel: 'Accessories',
    icon: Zap,
    name: 'Cable Trays & Trunking',
    brand: 'Generic',
    model: 'CABLE-TRAY',
    description: 'GI cable trays for organized routing (per meter)',
    unitPrice: 145,
    specs: '100mm | GI | Perforated'
  },
];

// Category icons and colors
const CATEGORY_STYLES = {
  solar_panel: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  inverter: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  structure: { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  cable_dc: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  cable_ac: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  earthing: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  meter: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  labor: { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  accessories: { color: '#84cc16', bg: 'rgba(132,204,22,0.1)' },
};

/**
 * EquipmentLibrary Modal - Select equipment from inventory
 */
export const EquipmentLibrary = ({ isOpen, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(['all']);

  // Fetch inventory from backend
  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      console.log('[EquipmentLibrary] Fetching inventory from backend...');
      // Fetch inventory items
      const response = await inventoryApi.getAll();
      console.log('[EquipmentLibrary] Raw response:', response);
      
      const items = response?.data?.data || response?.data || response || [];
      console.log('[EquipmentLibrary] Extracted items:', items);
      console.log('[EquipmentLibrary] Items count:', items.length);
      
      if (items.length === 0) {
        console.warn('[EquipmentLibrary] No inventory items found in backend');
        toast.error('No inventory items found. Please add items in Inventory module first.');
        // Still use static library as fallback
        setInventoryItems(SOLAR_EQUIPMENT_LIBRARY);
        setCategories(['all', ...new Set(SOLAR_EQUIPMENT_LIBRARY.map(item => item.category))]);
        return;
      }
      
      // Transform backend items to frontend format
      const transformedItems = items.map(item => ({
        id: item._id || item.id,
        category: item.category || 'misc',
        categoryLabel: item.category?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Miscellaneous',
        icon: getCategoryIcon(item.category),
        name: item.description || item.name || 'Unnamed Item',
        brand: item.brand || item.make || '',
        model: item.model || item.code || '',
        description: item.description || item.name || '',
        unitPrice: item.unitPrice || item.price || 0,
        specs: item.specifications || `${item.unit || 'Unit'} | Stock: ${item.currentStock || 0}`,
        unit: item.unit || 'Piece',
        currentStock: item.currentStock || 0,
      }));
      
      console.log('[EquipmentLibrary] Transformed items:', transformedItems);
      setInventoryItems(transformedItems);

      // Extract unique categories
      const uniqueCategories = ['all', ...new Set(transformedItems.map(item => item.category))];
      setCategories(uniqueCategories);
      toast.success(`Loaded ${transformedItems.length} items from inventory`);
    } catch (error) {
      console.error('[EquipmentLibrary] Failed to fetch inventory:', error);
      toast.error('Failed to load inventory. Using default library.');
      // Fallback to static library
      setInventoryItems(SOLAR_EQUIPMENT_LIBRARY);
      setCategories(['all', ...new Set(SOLAR_EQUIPMENT_LIBRARY.map(item => item.category))]);
    } finally {
      setLoading(false);
    }
  };

  // Get icon based on category
  const getCategoryIcon = (category) => {
    const iconMap = {
      solar_panel: Sun,
      inverter: Cpu,
      structure: Wrench,
      cable_dc: Cable,
      cable_ac: Cable,
      earthing: Droplets,
      lightning: Zap,
      meter: Gauge,
      battery: Battery,
      labor: HardHat,
      accessories: Zap,
      misc: FileCheck,
    };
    return iconMap[category] || Zap;
  };
  
  // Filter items
  const filteredItems = inventoryItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelect = () => {
    if (selectedItem) {
      onSelect({
        ...selectedItem,
        quantity: quantity,
        unit: selectedItem.unit || 'Piece',
        category: selectedItem.category,
        total: selectedItem.unitPrice * quantity
      });
      onClose();
      // Reset
      setSelectedItem(null);
      setQuantity(1);
      setSearchQuery('');
    }
  };

  const getCategoryLabel = (cat) => {
    const item = SOLAR_EQUIPMENT_LIBRARY.find(i => i.category === cat);
    return item?.categoryLabel || cat;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solar Equipment Library"
      description="Select from common solar components or add custom item"
      size="xl"
    >
      <div className="space-y-4">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="all">All Categories</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
            ))}
          </select>
        </div>

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
          {loading ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <Loader2 size={32} className="animate-spin mb-3" />
              <p className="text-sm">Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <Search size={32} className="mb-3 opacity-50" />
              <p className="text-sm">No equipment found</p>
              <p className="text-xs mt-1">Try adjusting your search or category filter</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const styles = CATEGORY_STYLES[item.category] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
              const Icon = item.icon;
              const isSelected = selectedItem?.id === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]' 
                      : 'border-[var(--border-base)] hover:border-[var(--primary)]/50 hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: styles.bg, color: styles.color }}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: styles.bg, color: styles.color }}
                        >
                          {item.categoryLabel}
                        </span>
                        {isSelected && <Check size={14} className="text-[var(--primary)]" />}
                      </div>
                      <p className="font-medium text-sm text-[var(--text-primary)] mt-1 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {item.brand} {item.model}
                      </p>
                      <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                        {item.specs}
                      </p>
                      <p className="text-sm font-semibold text-emerald-500 mt-2">
                        ₹{item.unitPrice?.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Item Preview */}
        {selectedItem && (
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--primary)]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--text-primary)]">{selectedItem.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{selectedItem.brand} {selectedItem.model}</p>
              </div>
              <p className="text-lg font-bold text-emerald-500">
                ₹{(selectedItem.unitPrice * quantity).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <FormField label="Quantity" className="w-32">
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </FormField>
              <div className="flex-1"></div>
              <Button variant="secondary" onClick={() => setSelectedItem(null)}>
                Clear
              </Button>
              <Button onClick={handleSelect}>
                <Plus size={16} className="mr-1" />
                Add to Estimate
              </Button>
            </div>
          </div>
        )}

        {/* Manual Add Option */}
        <div className="pt-3 border-t border-[var(--border-base)]">
          <p className="text-xs text-[var(--text-muted)] text-center">
            Can&apos;t find what you need? You can add custom equipment manually in the form.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default EquipmentLibrary;
