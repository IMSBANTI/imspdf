import React, { useRef, useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typeText, setTypeText] = useState('');
  const [typeFont, setTypeFont] = useState<'cursive-1' | 'cursive-2' | 'serif'>('cursive-1');
  const [sigColor, setSigColor] = useState('#0f172a'); // default black/slate
  const [sigName, setSigName] = useState('');
  const [sigDesignation, setSigDesignation] = useState('');
  const [sigDept, setSigDept] = useState('');

  // Initialize canvas with proper DPI scaling
  useEffect(() => {
    if (tab === 'draw' && canvasRef.current && isOpen) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = sigColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Clear canvas initially with white background or transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [tab, isOpen, sigColor]);

  if (!isOpen) return null;

  // Drawing Pad Functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    
    // Get mouse/touch coordinates
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Compile and Save
  const handleSave = () => {
    const hasMetadata = sigName.trim() || sigDesignation.trim() || sigDept.trim();

    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const isCanvasBlank = !buffer.data.some(channel => channel !== 0);
      
      if (isCanvasBlank) {
        alert('Please draw a signature first.');
        return;
      }
      
      if (!hasMetadata) {
        // Export canvas to transparent PNG directly
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
        onClose();
      } else {
        // Create a taller compound canvas (550 width, 330 height)
        const compoundCanvas = document.createElement('canvas');
        compoundCanvas.width = 550;
        compoundCanvas.height = 330;
        const cCtx = compoundCanvas.getContext('2d');
        if (cCtx) {
          cCtx.clearRect(0, 0, compoundCanvas.width, compoundCanvas.height);
          
          // Copy drawn signature to the top portion of the compound canvas
          cCtx.drawImage(canvas, 0, 0);
          
          // Draw thin divider line
          cCtx.strokeStyle = '#cbd5e1';
          cCtx.lineWidth = 1.5;
          cCtx.beginPath();
          cCtx.moveTo(40, 230);
          cCtx.lineTo(510, 230);
          cCtx.stroke();
          
          // Draw metadata
          cCtx.fillStyle = sigColor;
          cCtx.textAlign = 'center';
          cCtx.textBaseline = 'top';
          
          let currentY = 245;
          if (sigName.trim()) {
            cCtx.font = 'bold 15px "Plus Jakarta Sans", "Helvetica Neue", sans-serif';
            cCtx.fillText(sigName.trim(), 275, currentY);
            currentY += 22;
          }
          
          const metaParts = [];
          if (sigDesignation.trim()) metaParts.push(sigDesignation.trim());
          if (sigDept.trim()) metaParts.push(sigDept.trim());
          if (metaParts.length > 0) {
            cCtx.font = '12px "Plus Jakarta Sans", "Helvetica Neue", sans-serif';
            cCtx.fillStyle = '#64748b'; // slate gray
            cCtx.fillText(metaParts.join(' | '), 275, currentY);
          }
          
          const dataUrl = compoundCanvas.toDataURL('image/png');
          onSave(dataUrl);
          onClose();
        }
      }
    } else {
      if (!typeText.trim()) {
        alert('Please type your signature.');
        return;
      }

      // Create a temporary canvas
      const width = 600;
      const height = hasMetadata ? 310 : 200;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');
      
      if (ctx) {
        ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.fillStyle = sigColor;
        
        let fontStyle = '48px "Brush Script MT", cursive';
        if (typeFont === 'cursive-2') fontStyle = '48px "Great Vibes", "Playball", "Alex Brush", cursive';
        else if (typeFont === 'serif') fontStyle = 'italic 44px "Georgia", serif';
        
        ctx.font = fontStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw typed signature centered horizontally at Y = 100
        ctx.fillText(typeText, 300, 100);
        
        if (hasMetadata) {
          // Draw thin divider line
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(50, 210);
          ctx.lineTo(550, 210);
          ctx.stroke();
          
          // Draw metadata
          ctx.fillStyle = sigColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          let currentY = 225;
          if (sigName.trim()) {
            ctx.font = 'bold 15px "Plus Jakarta Sans", "Helvetica Neue", sans-serif';
            ctx.fillText(sigName.trim(), 300, currentY);
            currentY += 22;
          }
          
          const metaParts = [];
          if (sigDesignation.trim()) metaParts.push(sigDesignation.trim());
          if (sigDept.trim()) metaParts.push(sigDept.trim());
          if (metaParts.length > 0) {
            ctx.font = '12px "Plus Jakarta Sans", "Helvetica Neue", sans-serif';
            ctx.fillStyle = '#64748b'; // slate gray
            ctx.fillText(metaParts.join(' | '), 300, currentY);
          }
        }
        
        const dataUrl = tempCanvas.toDataURL('image/png');
        onSave(dataUrl);
        onClose();
      }
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContainerStyle} className="glass-panel animate-fade-in">
        <div style={modalHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit2 size={18} style={{ color: 'var(--color-brand)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Create Signature</h3>
          </div>
          <button style={closeButtonStyle} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Cursive fonts styles inclusion */}
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playball&family=Alex+Brush&display=swap');
          .cursive-font-1 { font-family: 'Great Vibes', cursive; font-size: 36px; }
          .cursive-font-2 { font-family: 'Playball', cursive; font-size: 34px; }
          .serif-font { font-family: Georgia, serif; font-style: italic; font-size: 32px; }
        `}} />

        <div style={tabContainerStyle}>
          <button
            style={tab === 'draw' ? activeTabStyle : tabStyle}
            onClick={() => setTab('draw')}
          >
            Draw Freehand
          </button>
          <button
            style={tab === 'type' ? activeTabStyle : tabStyle}
            onClick={() => setTab('type')}
          >
            Type Signature
          </button>
        </div>

        <div style={modalBodyStyle}>
          {tab === 'draw' ? (
            <div style={canvasWrapperStyle}>
              <canvas
                ref={canvasRef}
                width={550}
                height={220}
                style={drawCanvasStyle}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <button style={clearButtonStyle} onClick={clearCanvas}>
                Clear Board
              </button>
            </div>
          ) : (
            <div style={typeWrapperStyle}>
              <input
                type="text"
                placeholder="Type your name..."
                value={typeText}
                onChange={(e) => setTypeText(e.target.value)}
                style={typeInputStyle}
                maxLength={25}
              />

              <div style={fontSelectionStyle}>
                <label style={labelStyle}>Choose Style:</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    style={typeFont === 'cursive-1' ? activeStyleCard : styleCard}
                    onClick={() => setTypeFont('cursive-1')}
                  >
                    <span className="cursive-font-1" style={{ color: sigColor }}>{typeText || 'Signature'}</span>
                  </button>
                  <button
                    style={typeFont === 'cursive-2' ? activeStyleCard : styleCard}
                    onClick={() => setTypeFont('cursive-2')}
                  >
                    <span className="cursive-font-2" style={{ color: sigColor }}>{typeText || 'Signature'}</span>
                  </button>
                  <button
                    style={typeFont === 'serif' ? activeStyleCard : styleCard}
                    onClick={() => setTypeFont('serif')}
                  >
                    <span className="serif-font" style={{ color: sigColor }}>{typeText || 'Signature'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Metadata Credentials Inputs */}
          <div style={metaFieldsContainerStyle}>
            <span style={metaFieldsTitleStyle}>Credentials Overlay (Optional)</span>
            <div style={metaFieldsGridStyle}>
              <div style={inputWrapperStyle}>
                <label style={inputLabelStyle}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={sigName}
                  onChange={(e) => setSigName(e.target.value)}
                  style={metaInputStyle}
                  maxLength={25}
                />
              </div>
              <div style={inputWrapperStyle}>
                <label style={inputLabelStyle}>Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Campaign Lead"
                  value={sigDesignation}
                  onChange={(e) => setSigDesignation(e.target.value)}
                  style={metaInputStyle}
                  maxLength={25}
                />
              </div>
              <div style={inputWrapperStyle}>
                <label style={inputLabelStyle}>Department</label>
                <input
                  type="text"
                  placeholder="e.g. Creative Ops"
                  value={sigDept}
                  onChange={(e) => setSigDept(e.target.value)}
                  style={metaInputStyle}
                  maxLength={25}
                />
              </div>
            </div>
          </div>

          {/* Color Selector */}
          <div style={colorSelectorContainer}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Ink Color:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { name: 'Black', hex: '#0f172a' },
                { name: 'Royal Blue', hex: '#1e40af' },
                { name: 'IMS Brand', hex: '#ff6b4a' }
              ].map(c => (
                <button
                  key={c.hex}
                  style={{
                    ...colorDotStyle,
                    backgroundColor: c.hex,
                    outline: sigColor === c.hex ? '2px solid var(--color-brand)' : 'none',
                    outlineOffset: '2px'
                  }}
                  onClick={() => setSigColor(c.hex)}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={modalFooterStyle}>
          <button style={cancelButtonStyle} onClick={onClose}>
            Cancel
          </button>
          <button style={saveButtonStyle} onClick={handleSave}>
            Apply Signature
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(5, 7, 12, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(4px)',
};

const modalContainerStyle: React.CSSProperties = {
  width: '600px',
  borderRadius: 'var(--radius-lg)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-xl)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid var(--border-color)',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  outline: 'none',
};

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--border-color)',
  background: 'rgba(255, 255, 255, 0.02)',
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  background: 'none',
  border: 'none',
  padding: '12px',
  color: 'var(--text-secondary)',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  borderBottom: '2px solid transparent',
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  color: 'var(--color-brand)',
  borderBottom: '2px solid var(--color-brand)',
  background: 'rgba(255, 107, 74, 0.05)',
};

const modalBodyStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const canvasWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const drawCanvasStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  cursor: 'crosshair',
  touchAction: 'none',
  width: '100%',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
};

const clearButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  color: '#ffffff',
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 500,
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const typeWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const typeInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: '16px',
  outline: 'none',
  transition: 'all 0.2s',
};

const fontSelectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  fontWeight: 500,
};

const styleCard: React.CSSProperties = {
  flex: 1,
  height: '90px',
  backgroundColor: 'white',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  padding: '8px',
  overflow: 'hidden',
};

const activeStyleCard: React.CSSProperties = {
  ...styleCard,
  border: '2px solid var(--color-brand)',
  boxShadow: '0 0 10px var(--color-brand-glow)',
};

const colorSelectorContainer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: '8px',
  borderTop: '1px solid var(--border-color)',
};

const colorDotStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.2)',
  cursor: 'pointer',
};

const modalFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '16px 20px',
  borderTop: '1px solid var(--border-color)',
  background: 'rgba(5, 7, 12, 0.4)',
};

const cancelButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  padding: '10px 20px',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '14px',
  transition: 'all 0.2s',
};

const saveButtonStyle: React.CSSProperties = {
  background: 'var(--color-brand)',
  border: 'none',
  color: 'white',
  padding: '10px 20px',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '14px',
  transition: 'all 0.2s',
  boxShadow: '0 4px 12px var(--color-brand-glow)',
};

const metaFieldsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid var(--border-color)',
};

const metaFieldsTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
};

const metaFieldsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '10px',
  width: '100%',
};

const inputWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const inputLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--text-muted)',
};

const metaInputStyle: React.CSSProperties = {
  padding: '8px 10px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 0.2s',
};
