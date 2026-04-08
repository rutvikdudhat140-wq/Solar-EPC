import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Type, Square, Image as ImageIcon, Table,
  MousePointer, Move, Trash2, Copy, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Underline, Palette, Grid3X3,
  Download, Save, Undo, Redo, ZoomIn, ZoomOut, RotateCcw,
  ChevronUp, ChevronDown, Eye, Lock, Unlock, Layers,
  Plus, Minus, Settings, FileText, Sparkles, Frame,
  TextCursor, Highlighter, StickyNote, Shapes, X, Loader2, Send,
  FilePlus, ArrowLeft
} from 'lucide-react';

// ─── Custom Document Editor Component ────────────────────────────────────────
const CustomDocumentEditor = ({ onBack }) => {
  const canvasRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [exporting, setExporting] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 794, height: 1123 }); // A4 size

  // Text formatting state
  const [textFormat, setTextFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
    highlight: null,
    color: '#1f2937',
    align: 'left',
    fontSize: 14
  });

  // Save history for undo/redo
  const saveHistory = useCallback((newElements) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newElements)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // Add new element
  const addElement = (type) => {
    const newElement = {
      id: `el-${Date.now()}`,
      type,
      x: 100,
      y: 100 + elements.length * 20,
      width: type === 'text' ? 300 : type === 'table' ? 600 : type === 'image' ? 200 : 150,
      height: type === 'text' ? 100 : type === 'table' ? 200 : type === 'image' ? 150 : 100,
      content: type === 'text' ? '<div style="font-size: 14px; color: #1f2937;">Enter text here</div>' : '',
      headers: type === 'table' ? ['Column 1', 'Column 2', 'Column 3'] : undefined,
      data: type === 'table' ? [['Row 1 Cell 1', 'Row 1 Cell 2', 'Row 1 Cell 3'], ['Row 2 Cell 1', 'Row 2 Cell 2', 'Row 2 Cell 3']] : undefined,
      style: {
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        color: '#1f2937',
        backgroundColor: type === 'shape' ? '#e5e7eb' : 'transparent',
        borderColor: type === 'table' ? '#d1d5db' : 'transparent',
        borderWidth: type === 'table' ? 1 : 0
      },
      zIndex: elements.length + 1
    };

    const newElements = [...elements, newElement];
    setElements(newElements);
    saveHistory(newElements);
    setSelectedElement(newElement.id);
  };

  // Update element
  const updateElement = (id, updates) => {
    const newElements = elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(newElements);
    saveHistory(newElements);
  };

  // Update element style
  const updateElementStyle = (id, styleUpdates) => {
    const newElements = elements.map(el =>
      el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el
    );
    setElements(newElements);
    saveHistory(newElements);
  };

  // Delete element
  const deleteElement = (id) => {
    const newElements = elements.filter(el => el.id !== id);
    setElements(newElements);
    saveHistory(newElements);
    setSelectedElement(null);
  };

  // Duplicate element
  const duplicateElement = (id) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      const newElement = {
        ...element,
        id: `el-${Date.now()}`,
        x: element.x + 20,
        y: element.y + 20,
        zIndex: elements.length + 1
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      saveHistory(newElements);
      setSelectedElement(newElement.id);
    }
  };

  // Change z-index
  const changeZIndex = (id, direction) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      const newZIndex = direction === 'up' ? element.zIndex + 1 : Math.max(1, element.zIndex - 1);
      updateElement(id, { zIndex: newZIndex });
    }
  };

  // Mouse handlers for dragging
  const handleMouseDown = (e, id) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const element = elements.find(el => el.id === id);
    if (element) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setIsDragging(true);
        setSelectedElement(id);
        setDragOffset({
          x: (e.clientX - rect.left) / scale - element.x,
          y: (e.clientY - rect.top) / scale - element.y
        });
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedElement) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      let newX = (e.clientX - rect.left) / scale - dragOffset.x;
      let newY = (e.clientY - rect.top) / scale - dragOffset.y;

      if (snapToGrid) {
        newX = Math.round(newX / 10) * 10;
        newY = Math.round(newY / 10) * 10;
      }

      const newElements = elements.map(el =>
        el.id === selectedElement ? { ...el, x: newX, y: newY } : el
      );
      setElements(newElements);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      saveHistory(elements);
    }
  };

  // Toggle text format
  const toggleTextFormat = (formatType) => {
    const newValue = !textFormat[formatType];
    setTextFormat(prev => ({ ...prev, [formatType]: newValue }));

    if (selectedElement) {
      const element = elements.find(el => el.id === selectedElement);
      if (element?.type === 'text') {
        const updates = {};
        switch (formatType) {
          case 'bold':
            updates.fontWeight = newValue ? 'bold' : 'normal';
            break;
          case 'italic':
            updates.fontStyle = newValue ? 'italic' : 'normal';
            break;
          case 'underline':
            updates.textDecoration = newValue ? 'underline' : 'none';
            break;
        }
        updateElementStyle(selectedElement, updates);
      }
    }
  };

  // Apply text format
  const applyTextFormat = (format) => {
    setTextFormat(prev => ({ ...prev, ...format }));
    if (selectedElement) {
      updateElementStyle(selectedElement, format);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      let heightLeft = imgHeight - pageHeight;
      let position = -pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('custom-document.pdf');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
    setExporting(false);
  };

  const selectedEl = elements.find(el => el.id === selectedElement);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Header */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
          <div className="w-px h-8 bg-gray-300" />
          <div className="flex items-center gap-2">
            <FilePlus className="text-blue-600" size={24} />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Custom Document Creator</h1>
              <p className="text-xs text-gray-500">Create custom documents from scratch</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Template Selector */}
          <select
            onChange={(e) => {
              const template = e.target.value;
              if (template === 'blank') {
                setElements([]);
                saveHistory([]);
              } else if (template === 'letterhead') {
                const templateElements = [
                  {
                    id: `header-${Date.now()}`,
                    type: 'shape',
                    x: 0, y: 0, width: 794, height: 100,
                    shapeType: 'rectangle',
                    style: { backgroundColor: '#1e40af', borderColor: 'transparent' },
                    zIndex: 1
                  },
                  {
                    id: `logo-${Date.now()}`,
                    type: 'text',
                    x: 40, y: 30, width: 300, height: 40,
                    content: '<div style="font-size: 28px; color: white; font-weight: bold;">YOUR COMPANY</div>',
                    style: { fontSize: 28, color: '#ffffff', fontWeight: 'bold' },
                    zIndex: 2
                  },
                  {
                    id: `date-${Date.now()}`,
                    type: 'text',
                    x: 550, y: 120, width: 200, height: 30,
                    content: `<div style="font-size: 12px; color: #6b7280;">Date: ${new Date().toLocaleDateString()}</div>`,
                    style: { fontSize: 12, color: '#6b7280' },
                    zIndex: 1
                  }
                ];
                setElements(templateElements);
                saveHistory(templateElements);
              } else if (template === 'invoice') {
                const templateElements = [
                  {
                    id: `title-${Date.now()}`,
                    type: 'text',
                    x: 40, y: 40, width: 200, height: 40,
                    content: '<div style="font-size: 32px; color: #1f2937; font-weight: bold;">INVOICE</div>',
                    style: { fontSize: 32, color: '#1f2937', fontWeight: 'bold' },
                    zIndex: 1
                  },
                  {
                    id: `table-${Date.now()}`,
                    type: 'table',
                    x: 40, y: 150, width: 700, height: 200,
                    headers: ['Item', 'Description', 'Qty', 'Rate', 'Amount'],
                    data: [['1', 'Service/Item', '1', '$0.00', '$0.00']],
                    style: { borderColor: '#d1d5db', borderWidth: 1 },
                    zIndex: 1
                  }
                ];
                setElements(templateElements);
                saveHistory(templateElements);
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose Template...</option>
            <option value="blank">Blank Document</option>
            <option value="letterhead">Letterhead</option>
            <option value="invoice">Simple Invoice</option>
          </select>

          <div className="w-px h-8 bg-gray-300" />

          {/* Export Button */}
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2 z-10">
          <button
            onClick={() => setSelectedElement(null)}
            className={`p-3 rounded-lg transition-colors ${selectedElement ? 'hover:bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-600'}`}
            title="Select"
          >
            <MousePointer size={20} />
          </button>

          <div className="w-8 h-px bg-gray-200 my-1" />

          <button
            onClick={() => addElement('text')}
            className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Add Text"
          >
            <Type size={20} />
          </button>

          <button
            onClick={() => addElement('table')}
            className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Add Table"
          >
            <Table size={20} />
          </button>

          <button
            onClick={() => addElement('image')}
            className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Add Image"
          >
            <ImageIcon size={20} />
          </button>

          <button
            onClick={() => addElement('shape')}
            className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Add Shape"
          >
            <Shapes size={20} />
          </button>

          <button
            onClick={() => addElement('sticky')}
            className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Add Sticky Note"
          >
            <StickyNote size={20} />
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`p-3 rounded-lg transition-colors ${showLayers ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Layers"
          >
            <Layers size={20} />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Toolbar */}
          <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-10">
            <div className="flex items-center gap-3">
              {/* Undo/Redo */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-2 rounded hover:bg-white hover:shadow-sm disabled:opacity-30 text-gray-600 transition-all"
                  title="Undo"
                >
                  <Undo size={18} />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 rounded hover:bg-white hover:shadow-sm disabled:opacity-30 text-gray-600 transition-all"
                  title="Redo"
                >
                  <Redo size={18} />
                </button>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setScale(s => Math.max(0.25, s - 0.1))}
                  className="p-2 rounded hover:bg-white hover:shadow-sm text-gray-600 transition-all"
                >
                  <Minus size={16} />
                </button>
                <span className="text-sm text-gray-600 w-14 text-center font-medium">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(s => Math.min(3, s + 0.1))}
                  className="p-2 rounded hover:bg-white hover:shadow-sm text-gray-600 transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Grid Toggle */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 rounded-lg transition-all ${showGrid ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}
                title="Toggle Grid"
              >
                <Grid3X3 size={18} />
              </button>

              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`p-2 rounded-lg transition-all ${snapToGrid ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}
                title="Snap to Grid"
              >
                <Frame size={18} />
              </button>
            </div>

            {/* Element Count */}
            <div className="text-sm text-gray-500">
              {elements.length} elements
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-gray-100 p-8">
            <div
              ref={canvasRef}
              className="relative mx-auto bg-white shadow-lg"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                backgroundImage: showGrid ? 'radial-gradient(#cbd5e1 1px, transparent 1px)' : 'none',
                backgroundSize: showGrid ? '20px 20px' : 'auto'
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {elements
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(element => (
                  <CanvasElement
                    key={element.id}
                    element={element}
                    isSelected={selectedElement === element.id}
                    onMouseDown={(e) => handleMouseDown(e, element.id)}
                    onUpdate={(updates) => updateElement(element.id, updates)}
                    onUpdateStyle={(style) => updateElementStyle(element.id, style)}
                    onDelete={() => deleteElement(element.id)}
                    onDuplicate={() => duplicateElement(element.id)}
                    readOnly={false}
                  />
                ))}

              {/* Selection Box */}
              {selectedEl && (
                <SelectionBox
                  element={selectedEl}
                  onBringToFront={() => changeZIndex(selectedEl.id, 'up')}
                  onSendToBack={() => changeZIndex(selectedEl.id, 'down')}
                  onDelete={() => deleteElement(selectedEl.id)}
                  onDuplicate={() => duplicateElement(selectedEl.id)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Layers */}
        {showLayers && (
          <div className="w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm z-20">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Layers size={16} />
                Layers
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {elements
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((el, index) => (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElement(el.id)}
                    className={`p-3 border-b border-gray-100 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedElement === el.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      {el.type === 'text' && <Type size={14} className="text-gray-500" />}
                      {el.type === 'table' && <Table size={14} className="text-gray-500" />}
                      {el.type === 'image' && <ImageIcon size={14} className="text-gray-500" />}
                      {el.type === 'shape' && <Square size={14} className="text-gray-500" />}
                      {el.type === 'sticky' && <StickyNote size={14} className="text-yellow-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700 font-medium block truncate capitalize">
                        {el.type} {index + 1}
                      </span>
                      <span className="text-xs text-gray-400">z-index: {el.zIndex}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          changeZIndex(el.id, 'up');
                        }}
                        className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          changeZIndex(el.id, 'down');
                        }}
                        className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Canvas Element Component ───────────────────────────────────────────────
const CanvasElement = ({
  element,
  isSelected,
  onMouseDown,
  onUpdate,
  onUpdateStyle,
  onDelete,
  onDuplicate,
  readOnly
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef(null);

  const handleClick = () => {
    if (element.type === 'text' && !readOnly) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    if (isEditing && contentRef.current) {
      onUpdate({ content: contentRef.current.innerHTML });
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && element.type === 'text') {
      e.preventDefault();
      handleBlur();
    }
  };

  // Render based on element type
  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            ref={contentRef}
            contentEditable={isEditing && !readOnly}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            dangerouslySetInnerHTML={{ __html: element.content }}
            className={`w-full h-full p-2 ${isEditing ? 'cursor-text' : 'cursor-pointer'}`}
            style={{
              fontSize: element.style?.fontSize || 14,
              fontWeight: element.style?.fontWeight || 'normal',
              fontStyle: element.style?.fontStyle || 'normal',
              textDecoration: element.style?.textDecoration || 'none',
              color: element.style?.color || '#1f2937',
              fontFamily: element.style?.fontFamily || 'Inter, sans-serif',
              textAlign: element.style?.textAlign || 'left',
              lineHeight: element.style?.lineHeight || 1.4,
              backgroundColor: element.style?.backgroundColor || 'transparent',
              outline: isEditing ? '2px solid #3b82f6' : 'none',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          />
        );

      case 'table':
        return (
          <div className="w-full h-full overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {element.headers?.map((header, i) => (
                    <th
                      key={i}
                      className="border border-gray-300 p-2 text-sm font-semibold bg-gray-50 text-left"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {element.data?.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className="border border-gray-300 p-2 text-sm"
                        contentEditable={!readOnly}
                        onBlur={(e) => {
                          const newData = [...element.data];
                          newData[rowIndex][colIndex] = e.target.innerText;
                          onUpdate({ data: newData });
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'image':
        const handleImageDoubleClick = () => {
          if (readOnly) return;
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                onUpdate({ content: event.target?.result });
              };
              reader.readAsDataURL(file);
            }
          };
          input.click();
        };

        const handleImageDrop = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (readOnly) return;

          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
              onUpdate({ content: event.target?.result });
            };
            reader.readAsDataURL(file);
          }
        };

        return (
          <div
            className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
            onDoubleClick={handleImageDoubleClick}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleImageDrop}
          >
            {element.content ? (
              <img
                src={element.content}
                alt="Canvas element"
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
            ) : (
              <div className="text-center p-4">
                <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">Double click to add image</p>
                <p className="text-[10px] text-gray-400 mt-1">or drag & drop</p>
              </div>
            )}
          </div>
        );

      case 'shape':
        const shapeStyles = {
          rectangle: { borderRadius: 0 },
          circle: { borderRadius: '50%' },
          rounded: { borderRadius: 12 }
        };
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: element.style?.backgroundColor || '#e5e7eb',
              border: element.style?.borderWidth
                ? `${element.style.borderWidth}px solid ${element.style.borderColor || '#9ca3af'}`
                : 'none',
              ...shapeStyles[element.shapeType || 'rectangle']
            }}
          />
        );

      case 'sticky':
        return (
          <div
            className="w-full h-full p-3 shadow-md"
            style={{
              backgroundColor: element.style?.backgroundColor || '#fef3c7',
              transform: 'rotate(-2deg)'
            }}
          >
            <div
              contentEditable={!readOnly}
              onBlur={(e) => onUpdate({ content: e.target.innerHTML })}
              dangerouslySetInnerHTML={{ __html: element.content }}
              className="w-full h-full text-sm"
              style={{ outline: 'none' }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`absolute transition-shadow ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg z-50' : ''
      } ${readOnly ? 'pointer-events-none' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        cursor: isEditing ? 'text' : 'move'
      }}
      onMouseDown={onMouseDown}
    >
      {renderContent()}
    </div>
  );
};

// ── Selection Box Component ─────────────────────────────────────────────────
const SelectionBox = ({
  element,
  onBringToFront,
  onSendToBack,
  onDelete,
  onDuplicate
}) => {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: element.x - 4,
        top: element.y - 4,
        width: element.width + 8,
        height: element.height + 8,
        zIndex: 9999
      }}
    >
      {/* Border */}
      <div className="absolute inset-0 border-2 border-blue-500 rounded" />

      {/* Resize handles */}
      <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />

      {/* Action buttons */}
      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex gap-1 pointer-events-auto">
        <button
          onClick={onBringToFront}
          className="p-1.5 bg-white rounded shadow-md hover:bg-gray-100 text-gray-600"
          title="Bring to front"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onSendToBack}
          className="p-1.5 bg-white rounded shadow-md hover:bg-gray-100 text-gray-600"
          title="Send to back"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={onDuplicate}
          className="p-1.5 bg-white rounded shadow-md hover:bg-gray-100 text-blue-600"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 bg-white rounded shadow-md hover:bg-red-50 text-red-500"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default CustomDocumentEditor;
