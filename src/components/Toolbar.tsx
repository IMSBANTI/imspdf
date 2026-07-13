import React from 'react';
import {
  MousePointer,
  Type,
  Pencil,
  FileSignature,
  Image as ImageIcon,
  Square,
  Circle,
  TrendingUp,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  Trash2,
  Bold,
  Italic
} from 'lucide-react';

export type ToolType =
  | 'select'
  | 'text'
  | 'draw'
  | 'signature'
  | 'stamp'
  | 'rectangle'
  | 'ellipse'
  | 'arrow';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  
  zoom: number;
  setZoom: (zoom: number) => void;
  
  textColor: string;
  setTextColor: (color: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  isBold: boolean;
  setIsBold: (bold: boolean) => void;
  isItalic: boolean;
  setIsItalic: (italic: boolean) => void;

  strokeWidth: number;
  setStrokeWidth: (width: number) => void;

  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
  onUploadNew: () => void;
  onClearAnnotations: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  zoom,
  setZoom,
  textColor,
  setTextColor,
  fontSize,
  setFontSize,
  isBold,
  setIsBold,
  isItalic,
  setIsItalic,
  strokeWidth,
  setStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDownload,
  onUploadNew,
  onClearAnnotations
}) => {
  const tools: { id: ToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Select & Move', icon: <MousePointer size={18} /> },
    { id: 'text', label: 'Add Text', icon: <Type size={18} /> },
    { id: 'draw', label: 'Free Draw', icon: <Pencil size={18} /> },
    { id: 'signature', label: 'Sign Document', icon: <FileSignature size={18} /> },
    { id: 'stamp', label: 'IMS Stamp', icon: <ImageIcon size={18} /> },
    { id: 'rectangle', label: 'Rectangle', icon: <Square size={18} /> },
    { id: 'ellipse', label: 'Ellipse', icon: <Circle size={18} /> },
    { id: 'arrow', label: 'Arrow', icon: <TrendingUp size={18} /> },
  ];

  const colors = [
    '#0f172a', // Slate/Black
    '#ff6b4a', // IMS Brand Orange
    '#2563eb', // Blue
    '#16a34a', // Green
    '#dc2626', // Red
    '#d97706'  // Yellow/Orange
  ];

  return (
    <div style={toolbarStyle} className="glass-panel">
      {/* Document Operations */}
      <div style={sectionStyle}>
        <button style={btnActionStyle} onClick={onUploadNew} title="Open new PDF">
          <Upload size={16} />
          <span style={btnLabelStyle}>Open</span>
        </button>
        <button style={btnActionStyle} onClick={onClearAnnotations} title="Clear all page annotations">
          <Trash2 size={16} />
          <span style={btnLabelStyle}>Clear</span>
        </button>
      </div>

      <div style={dividerStyle} />

      {/* Editor Tool Selectors */}
      <div style={{ ...sectionStyle, flex: 1, overflowX: 'auto', gap: '6px' }}>
        {tools.map((t) => (
          <button
            key={t.id}
            style={activeTool === t.id ? activeToolBtnStyle : toolBtnStyle}
            onClick={() => setActiveTool(t.id)}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Tool Context options */}
      {activeTool === 'text' && (
        <>
          <div style={dividerStyle} />
          <div style={sectionStyle}>
            {/* Color selection */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {colors.map((c) => (
                <button
                  key={c}
                  style={{
                    ...colorDotStyle,
                    backgroundColor: c,
                    border: textColor === c ? '2px solid var(--text-primary)' : '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                  onClick={() => setTextColor(c)}
                />
              ))}
            </div>
            {/* Font size */}
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={selectStyle}
            >
              {[12, 14, 16, 20, 24, 32, 48].map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
            {/* Bold/Italic formatting */}
            <button
              style={isBold ? activeFormatStyle : formatStyle}
              onClick={() => setIsBold(!isBold)}
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              style={isItalic ? activeFormatStyle : formatStyle}
              onClick={() => setIsItalic(!isItalic)}
              title="Italic"
            >
              <Italic size={14} />
            </button>
          </div>
        </>
      )}

      {(activeTool === 'draw' || activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'arrow') && (
        <>
          <div style={dividerStyle} />
          <div style={sectionStyle}>
            {/* Stroke color selection */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {colors.map((c) => (
                <button
                  key={c}
                  style={{
                    ...colorDotStyle,
                    backgroundColor: c,
                    border: textColor === c ? '2px solid var(--text-primary)' : '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                  onClick={() => setTextColor(c)}
                />
              ))}
            </div>
            {/* Stroke thickness */}
            <select
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              style={selectStyle}
            >
              {[2, 3, 5, 8, 12].map((w) => (
                <option key={w} value={w}>
                  {w}px line
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div style={dividerStyle} />

      {/* Zoom Settings */}
      <div style={sectionStyle}>
        <button
          style={zoomBtnStyle}
          onClick={() => setZoom(Math.max(0.5, zoom - 0.15))}
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <span style={zoomTextStyle}>{Math.round(zoom * 100)}%</span>
        <button
          style={zoomBtnStyle}
          onClick={() => setZoom(Math.min(2.5, zoom + 0.15))}
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <div style={dividerStyle} />

      {/* History Controls */}
      <div style={sectionStyle}>
        <button
          style={canUndo ? historyBtnStyle : disabledHistoryBtnStyle}
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          style={canRedo ? historyBtnStyle : disabledHistoryBtnStyle}
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div style={dividerStyle} />

      {/* Export / Download */}
      <div style={sectionStyle}>
        <button style={downloadBtnStyle} onClick={onDownload}>
          <Download size={16} />
          <span style={{ fontWeight: 600 }}>Download PDF</span>
        </button>
      </div>
    </div>
  );
};

// Styles
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  gap: '12px',
  width: '100%',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-md)',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const dividerStyle: React.CSSProperties = {
  width: '1px',
  height: '24px',
  backgroundColor: 'var(--border-color)',
};

const toolBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  transition: 'all 0.15s',
  outline: 'none',
};

const activeToolBtnStyle: React.CSSProperties = {
  ...toolBtnStyle,
  background: 'var(--color-brand-light)',
  border: '1px solid var(--color-brand)',
  color: 'var(--color-brand)',
  boxShadow: '0 0 8px var(--color-brand-glow)',
};

const btnActionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  transition: 'all 0.2s',
  outline: 'none',
};

const btnLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
};

const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '6px 10px',
  fontSize: '13px',
  cursor: 'pointer',
  outline: 'none',
};

const colorDotStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  cursor: 'pointer',
  outline: 'none',
  padding: 0,
};

const formatStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '26px',
  height: '26px',
  borderRadius: '4px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const activeFormatStyle: React.CSSProperties = {
  ...formatStyle,
  background: 'rgba(255, 107, 74, 0.15)',
  border: '1px solid var(--color-brand)',
  color: 'var(--color-brand)',
};

const zoomBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const zoomTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-primary)',
  fontWeight: 500,
  minWidth: '40px',
  textAlign: 'center',
};

const historyBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  padding: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'background 0.2s',
};

const disabledHistoryBtnStyle: React.CSSProperties = {
  ...historyBtnStyle,
  color: 'var(--text-muted)',
  cursor: 'not-allowed',
  opacity: 0.5,
};

const downloadBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-brand)',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
  boxShadow: '0 4px 10px var(--color-brand-glow)',
  transition: 'all 0.2s',
  outline: 'none',
};
