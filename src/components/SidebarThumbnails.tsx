import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Layers } from 'lucide-react';

interface SidebarThumbnailsProps {
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  onPageChange: (pageNum: number) => void;
  totalPages: number;
}

export const SidebarThumbnails: React.FC<SidebarThumbnailsProps> = ({
  pdfDocument,
  currentPage,
  onPageChange,
  totalPages
}) => {
  if (!pdfDocument) return null;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <Layers size={16} style={{ color: 'var(--color-brand)' }} />
        <h4 style={headingStyle}>Pages ({totalPages})</h4>
      </div>
      
      <div style={scrollAreaStyle}>
        {Array.from({ length: totalPages }, (_, idx) => {
          const pageNumber = idx + 1;
          return (
            <ThumbnailItem
              key={pageNumber}
              pdfDocument={pdfDocument}
              pageNumber={pageNumber}
              isActive={currentPage === pageNumber}
              onClick={() => onPageChange(pageNumber)}
            />
          );
        })}
      </div>
    </div>
  );
};

interface ThumbnailItemProps {
  pdfDocument: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  pdfDocument,
  pageNumber,
  isActive,
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    let active = true;
    
    const renderThumbnail = async () => {
      try {
        setLoading(true);
        const page = await pdfDocument.getPage(pageNumber);
        if (!active) return;

        const viewport = page.getViewport({ scale: 0.2 }); // scale down significantly for thumb
        setRatio(viewport.height / viewport.width);
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };
        
        await page.render(renderContext as any).promise;
        if (active) setLoading(false);
      } catch (err) {
        console.error(`Failed rendering thumbnail for page ${pageNumber}:`, err);
      }
    };

    renderThumbnail();

    return () => {
      active = false;
    };
  }, [pdfDocument, pageNumber]);

  return (
    <div
      style={{
        ...itemWrapperStyle,
        borderColor: isActive ? 'var(--color-brand)' : 'transparent',
        backgroundColor: isActive ? 'var(--color-brand-light)' : 'transparent',
      }}
      onClick={onClick}
    >
      <div style={thumbnailContainerStyle}>
        {loading && <div style={loaderStyle} />}
        <canvas
          ref={canvasRef}
          style={{
            ...canvasStyle,
            display: loading ? 'none' : 'block',
            aspectRatio: `${1 / ratio}`
          }}
        />
      </div>
      <span
        style={{
          ...pageNumberStyle,
          color: isActive ? 'var(--color-brand)' : 'var(--text-secondary)',
          fontWeight: isActive ? 600 : 500
        }}
      >
        Page {pageNumber}
      </span>
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  width: '180px',
  backgroundColor: 'var(--bg-panel-solid)',
  borderRight: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '16px',
  borderBottom: '1px solid var(--border-color)',
};

const headingStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-primary)',
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const itemWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '10px',
  borderRadius: 'var(--radius-md)',
  border: '2px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.2s',
  userSelect: 'none',
};

const thumbnailContainerStyle: React.CSSProperties = {
  width: '90px',
  backgroundColor: '#f8fafc',
  borderRadius: '4px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  overflow: 'hidden',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '120px',
  position: 'relative'
};

const canvasStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  objectFit: 'contain'
};

const loaderStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  border: '3px solid rgba(255, 107, 74, 0.1)',
  borderTopColor: 'var(--color-brand)',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

const pageNumberStyle: React.CSSProperties = {
  marginTop: '8px',
  fontSize: '12px',
};
