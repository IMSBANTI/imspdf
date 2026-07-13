import React, { useRef, useState, useEffect } from 'react';
import { Upload, DollarSign, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

interface LogoSelectorProps {
  onSelectStamp: (stampDataUrl: string) => void;
}

export const LogoSelector: React.FC<LogoSelectorProps> = ({ onSelectStamp }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imsLogoBase64, setImsLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    // Fetch and convert ims logo to base64
    fetch('/ims_logo.png')
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImsLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => console.error("Error loading logo asset:", err));
  }, []);

  // Helper to generate a text-based stamp on canvas and return as data URL
  const generateStamp = (text: string, color: string, borderType: 'rect' | 'rounded' | 'circle' = 'rect') => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawRoundRectPath = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // Pre-rotate the canvas content by a dynamic angle for stamp look (-7 degrees)
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-7 * Math.PI / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (borderType === 'rounded') {
      drawRoundRectPath(12, 12, 276, 96, 15);
      ctx.stroke();
      
      // inner subtle border
      ctx.lineWidth = 1.8;
      drawRoundRectPath(20, 20, 260, 80, 10);
      ctx.stroke();
    } else if (borderType === 'circle') {
      // draw circle/ellipse
      ctx.beginPath();
      ctx.ellipse(150, 60, 120, 45, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      ctx.strokeRect(12, 12, 276, 96);
      ctx.lineWidth = 1.8;
      ctx.strokeRect(20, 20, 260, 80);
    }

    // Draw stamp text
    ctx.fillStyle = color;
    ctx.font = 'bold 22px "Plus Jakarta Sans", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IMS MARKETING', 150, 44);
    
    ctx.font = 'bold 24px "Plus Jakarta Sans", "Helvetica Neue", sans-serif';
    ctx.fillText(text, 150, 78);

    ctx.restore();

    // Create rubber stamp distressed/grit noise effect
    ctx.globalCompositeOperation = 'destination-out';
    
    // Draw 240 tiny random holes to simulate ink bleeding/fading
    for (let i = 0; i < 240; i++) {
      const nx = Math.random() * canvas.width;
      const ny = Math.random() * canvas.height;
      const nr = 0.8 + Math.random() * 1.5; // speckle size
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw random scratch lines
    ctx.lineWidth = 0.8 + Math.random() * 1.2;
    for (let i = 0; i < 10; i++) {
      const lx = Math.random() * canvas.width;
      const ly = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + (Math.random() - 0.5) * 35, ly + (Math.random() - 0.5) * 8);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';

    onSelectStamp(canvas.toDataURL('image/png'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onSelectStamp(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={containerStyle}>
      <h4 style={headingStyle}>IMS Logo & Stamps</h4>
      
      <div style={gridStyle}>
        {/* IMS Logo Stamp */}
        {imsLogoBase64 && (
          <button
            style={{ ...stampCardStyle, borderLeft: '4px solid #ef4444' }}
            onClick={() => onSelectStamp(imsLogoBase64)}
            title="Insert IMS Logo Stamp"
          >
            <img src="/ims_logo.png" alt="IMS Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <div style={stampLabelContainer}>
              <span style={stampTitle}>IMS Corporate Logo</span>
              <span style={stampDesc}>Insert corporate branding image</span>
            </div>
          </button>
        )}

        {/* Approved Stamp */}
        <button
          style={{ ...stampCardStyle, borderLeft: '4px solid #ff6b4a' }}
          onClick={() => generateStamp('APPROVED', '#ff6b4a', 'rounded')}
          title="Insert IMS Approved stamp"
        >
          <CheckCircle2 size={18} style={{ color: '#ff6b4a' }} />
          <div style={stampLabelContainer}>
            <span style={stampTitle}>IMS Approved</span>
            <span style={stampDesc}>Branded stamp</span>
          </div>
        </button>

        {/* Draft Stamp */}
        <button
          style={{ ...stampCardStyle, borderLeft: '4px solid #6b7280' }}
          onClick={() => generateStamp('DRAFT', '#6b7280', 'rect')}
          title="Insert Draft stamp"
        >
          <FileText size={18} style={{ color: '#9ca3af' }} />
          <div style={stampLabelContainer}>
            <span style={stampTitle}>Draft Copy</span>
            <span style={stampDesc}>Gray text stamp</span>
          </div>
        </button>

        {/* Confidential Stamp */}
        <button
          style={{ ...stampCardStyle, borderLeft: '4px solid #ef4444' }}
          onClick={() => generateStamp('CONFIDENTIAL', '#ef4444', 'rect')}
          title="Insert Confidential stamp"
        >
          <ShieldAlert size={18} style={{ color: '#ef4444' }} />
          <div style={stampLabelContainer}>
            <span style={stampTitle}>Confidential</span>
            <span style={stampDesc}>Warning stamp</span>
          </div>
        </button>

        {/* Paid Stamp */}
        <button
          style={{ ...stampCardStyle, borderLeft: '4px solid #15803d' }}
          onClick={() => generateStamp('PAID', '#15803d', 'rounded')}
          title="Insert Paid stamp"
        >
          <DollarSign size={18} style={{ color: '#15803d' }} />
          <div style={stampLabelContainer}>
            <span style={stampTitle}>Paid Copy</span>
            <span style={stampDesc}>Creative green stamp</span>
          </div>
        </button>
      </div>

      <div style={{ marginTop: '14px' }}>
        <input
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          style={uploadButtonStyle}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} />
          <span>Upload Custom Image/Logo</span>
        </button>
        <span style={uploadNoteStyle}>Supports PNG and JPEG (with transparency)</span>
      </div>
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '12px 14px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
};

const headingStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  marginBottom: '4px',
};

const gridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const stampCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.2s',
  outline: 'none',
};

const stampLabelContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const stampTitle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const stampDesc: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-muted)',
};

const uploadButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  padding: '10px',
  backgroundColor: 'rgba(255, 107, 74, 0.08)',
  border: '1px dashed var(--color-brand)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-brand)',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '13px',
  transition: 'all 0.2s',
};

const uploadNoteStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  color: 'var(--text-muted)',
  textAlign: 'center',
  marginTop: '4px',
};
