import React, { useState, useRef } from 'react';
import { X, Move } from 'lucide-react';
import type { Annotation, DrawingPathPoint, TextAnnotation, ShapeAnnotation } from '../types/annotation';
import type { ToolType } from './Toolbar';

interface AnnotationsLayerProps {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  annotations: Annotation[];
  activeTool: ToolType;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: (ann: Annotation) => void;
  onUpdateAnnotation: (ann: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  
  textColor: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  strokeWidth: number;
  stampDataUrl: string | null;
  resetStampTool: () => void;
}

export const AnnotationsLayer: React.FC<AnnotationsLayerProps> = ({
  pageNumber,
  pageWidth,
  pageHeight,
  annotations,
  activeTool,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  textColor,
  fontSize,
  isBold,
  isItalic,
  strokeWidth,
  stampDataUrl,
  resetStampTool
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Dragging and resizing states
  const [dragState, setDragState] = useState<{
    id: string;
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Drawing state (freehand & shapes)
  const [currentPath, setCurrentPath] = useState<DrawingPathPoint[] | null>(null);
  const [tempShape, setTempShape] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);

  const getRelativeCoords = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / pageWidth;
    const y = (e.clientY - rect.top) / pageHeight;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left click only
    if (e.button !== 0) return;

    const { x, y } = getRelativeCoords(e);

    // 1. Text Tool Action
    if (activeTool === 'text') {
      const newTextAnn: TextAnnotation = {
        id: `text_${Date.now()}`,
        type: 'text',
        pageNumber,
        x,
        y,
        width: 0.25, // default width
        height: 0.05, // default height
        text: 'Double click to edit text',
        fontSize,
        color: textColor,
        isBold,
        isItalic
      };
      onAddAnnotation(newTextAnn);
      onSelectAnnotation(newTextAnn.id);
      return;
    }

    // 2. Free Draw Tool Action
    if (activeTool === 'draw') {
      setCurrentPath([{ x, y }]);
      return;
    }

    // 3. Shape Tool Action (Rectangle, Ellipse, Arrow)
    if (['rectangle', 'ellipse', 'arrow'].includes(activeTool)) {
      setTempShape({ startX: x, startY: y, curX: x, curY: y });
      return;
    }

    // 4. Stamp / Signature Tool Action
    if ((activeTool === 'stamp' || activeTool === 'signature') && stampDataUrl) {
      const type = activeTool === 'stamp' ? 'image' : 'signature';
      const w = type === 'image' ? 0.25 : 0.22; // relative size presets
      const h = type === 'image' ? 0.10 : 0.07;
      
      const newAnn: Annotation = {
        id: `${type}_${Date.now()}`,
        type: type,
        pageNumber,
        x: Math.max(0, x - w / 2),
        y: Math.max(0, y - h / 2),
        width: w,
        height: h,
        opacity: 1,
        ...(type === 'image' ? { imageUrl: stampDataUrl } : { signatureUrl: stampDataUrl })
      } as Annotation;

      onAddAnnotation(newAnn);
      onSelectAnnotation(newAnn.id);
      resetStampTool();
      return;
    }

    // Deselect if clicking on empty space in select mode
    if (activeTool === 'select' && e.target === containerRef.current) {
      onSelectAnnotation(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getRelativeCoords(e);

    // Freehand drawing in progress
    if (activeTool === 'draw' && currentPath) {
      setCurrentPath([...currentPath, { x, y }]);
      return;
    }

    // Shape placement in progress
    if (tempShape) {
      setTempShape({ ...tempShape, curX: x, curY: y });
      return;
    }

    // Annotation dragging or resizing in progress
    if (dragState) {
      const dx = (e.clientX - dragState.startX) / pageWidth;
      const dy = (e.clientY - dragState.startY) / pageHeight;
      const ann = annotations.find(a => a.id === dragState.id);
      if (!ann) return;

      if (dragState.type === 'move') {
        const nextX = Math.max(0, Math.min(1 - ann.width, dragState.origX + dx));
        const nextY = Math.max(0, Math.min(1 - ann.height, dragState.origY + dy));
        onUpdateAnnotation({ ...ann, x: nextX, y: nextY });
      } else {
        const nextW = Math.max(0.02, Math.min(1 - ann.x, dragState.origW + dx));
        const nextH = Math.max(0.02, Math.min(1 - ann.y, dragState.origH + dy));
        onUpdateAnnotation({ ...ann, width: nextW, height: nextH });
      }
    }
  };

  const handleMouseUp = () => {
    // Finalize drawing
    if (activeTool === 'draw' && currentPath && currentPath.length > 1) {
      // Find bounding box for drawing selection
      const xs = currentPath.map(p => p.x);
      const ys = currentPath.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      onAddAnnotation({
        id: `draw_${Date.now()}`,
        type: 'drawing',
        pageNumber,
        x: minX,
        y: minY,
        width: maxX - minX || 0.01,
        height: maxY - minY || 0.01,
        points: currentPath,
        color: textColor,
        strokeWidth: strokeWidth
      });
      setCurrentPath(null);
    }

    // Finalize Shape
    if (tempShape) {
      const x = Math.min(tempShape.startX, tempShape.curX);
      const y = Math.min(tempShape.startY, tempShape.curY);
      const width = Math.abs(tempShape.startX - tempShape.curX) || 0.01;
      const height = Math.abs(tempShape.startY - tempShape.curY) || 0.01;

      onAddAnnotation({
        id: `${activeTool}_${Date.now()}`,
        type: 'shape',
        shapeType: activeTool as ShapeAnnotation['shapeType'],
        pageNumber,
        x,
        y,
        width,
        height,
        color: textColor,
        strokeWidth: strokeWidth,
        isFilled: false
      });

      setTempShape(null);
    }

    // Finalize move/resize
    if (dragState) {
      setDragState(null);
    }
  };

  const startDrag = (e: React.MouseEvent, id: string, type: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    const ann = annotations.find(a => a.id === id);
    if (!ann) return;

    onSelectAnnotation(id);

    setDragState({
      id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      origX: ann.x,
      origY: ann.y,
      origW: ann.width,
      origH: ann.height
    });
  };

  const handleTextChange = (id: string, text: string) => {
    const ann = annotations.find(a => a.id === id);
    if (ann && ann.type === 'text') {
      onUpdateAnnotation({ ...ann, text });
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: activeTool === 'select' ? 'default' : 'crosshair',
        zIndex: 10,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* SVG Layer for Drawings & Shapes */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* Draw temporary paths being created */}
        {activeTool === 'draw' && currentPath && currentPath.length > 1 && (
          <polyline
            points={currentPath.map(p => `${p.x * pageWidth},${p.y * pageHeight}`).join(' ')}
            fill="none"
            stroke={textColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Draw temporary shapes being created */}
        {tempShape && activeTool === 'rectangle' && (
          <rect
            x={Math.min(tempShape.startX, tempShape.curX) * pageWidth}
            y={Math.min(tempShape.startY, tempShape.curY) * pageHeight}
            width={Math.abs(tempShape.startX - tempShape.curX) * pageWidth}
            height={Math.abs(tempShape.startY - tempShape.curY) * pageHeight}
            fill="none"
            stroke={textColor}
            strokeWidth={strokeWidth}
          />
        )}

        {tempShape && activeTool === 'ellipse' && (
          <ellipse
            cx={((tempShape.startX + tempShape.curX) / 2) * pageWidth}
            cy={((tempShape.startY + tempShape.curY) / 2) * pageHeight}
            rx={(Math.abs(tempShape.startX - tempShape.curX) / 2) * pageWidth}
            ry={(Math.abs(tempShape.startY - tempShape.curY) / 2) * pageHeight}
            fill="none"
            stroke={textColor}
            strokeWidth={strokeWidth}
          />
        )}

        {tempShape && activeTool === 'arrow' && (
          <g>
            <line
              x1={tempShape.startX * pageWidth}
              y1={tempShape.startY * pageHeight}
              x2={tempShape.curX * pageWidth}
              y2={tempShape.curY * pageHeight}
              stroke={textColor}
              strokeWidth={strokeWidth}
            />
            {/* Draw arrowhead */}
            {(() => {
              const x1 = tempShape.startX * pageWidth;
              const y1 = tempShape.startY * pageHeight;
              const x2 = tempShape.curX * pageWidth;
              const y2 = tempShape.curY * pageHeight;
              
              const angle = Math.atan2(y2 - y1, x2 - x1);
              const headLength = 12;
              const arrowAngle = Math.PI / 6;

              const arrowX1 = x2 - headLength * Math.cos(angle - arrowAngle);
              const arrowY1 = y2 - headLength * Math.sin(angle - arrowAngle);
              const arrowX2 = x2 - headLength * Math.cos(angle + arrowAngle);
              const arrowY2 = y2 - headLength * Math.sin(angle + arrowAngle);

              return (
                <polyline
                  points={`${arrowX1},${arrowY1} ${x2},${y2} ${arrowX2},${arrowY2}`}
                  fill="none"
                  stroke={textColor}
                  strokeWidth={strokeWidth}
                />
              );
            })()}
          </g>
        )}

        {/* Draw saved Drawings and Shapes */}
        {annotations.map((ann) => {
          if (ann.type === 'drawing') {
            return (
              <polyline
                key={ann.id}
                points={ann.points.map(p => `${p.x * pageWidth},${p.y * pageHeight}`).join(' ')}
                fill="none"
                stroke={ann.color}
                strokeWidth={ann.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: selectedAnnotationId === ann.id ? 'drop-shadow(0px 0px 3px var(--color-brand))' : 'none'
                }}
              />
            );
          }

          if (ann.type === 'shape') {
            const strokeColor = ann.color;
            const thickness = ann.strokeWidth;
            const x = ann.x * pageWidth;
            const y = ann.y * pageHeight;
            const w = ann.width * pageWidth;
            const h = ann.height * pageHeight;

            if (ann.shapeType === 'rectangle') {
              return (
                <rect
                  key={ann.id}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={thickness}
                />
              );
            }
            if (ann.shapeType === 'ellipse') {
              return (
                <ellipse
                  key={ann.id}
                  cx={x + w / 2}
                  cy={y + h / 2}
                  rx={w / 2}
                  ry={h / 2}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={thickness}
                />
              );
            }
            if (ann.shapeType === 'arrow') {
              const x1 = x;
              const y1 = y;
              const x2 = x + w;
              const y2 = y + h;
              const angle = Math.atan2(y2 - y1, x2 - x1);
              const headLength = 12;
              const arrowAngle = Math.PI / 6;
              const arrowX1 = x2 - headLength * Math.cos(angle - arrowAngle);
              const arrowY1 = y2 - headLength * Math.sin(angle - arrowAngle);
              const arrowX2 = x2 - headLength * Math.cos(angle + arrowAngle);
              const arrowY2 = y2 - headLength * Math.sin(angle + arrowAngle);

              return (
                <g key={ann.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth={thickness} />
                  <polyline points={`${arrowX1},${arrowY1} ${x2},${y2} ${arrowX2},${arrowY2}`} fill="none" stroke={strokeColor} strokeWidth={thickness} />
                </g>
              );
            }
          }
          return null;
        })}
      </svg>

      {/* HTML Interactive Elements (Text, Image, Signature, Drawing BBox) */}
      {annotations.map((ann) => {
        const isSelected = selectedAnnotationId === ann.id;
        const left = `${ann.x * 100}%`;
        const top = `${ann.y * 100}%`;
        const width = `${ann.width * 100}%`;
        const height = `${ann.height * 100}%`;

        // Render draggable interactive overlay box
        return (
          <div
            key={ann.id}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              cursor: activeTool === 'select' ? 'move' : 'default',
              border: isSelected ? '1px solid var(--color-brand)' : '1px solid transparent',
              boxShadow: isSelected ? '0 0 0 2px var(--color-brand-glow)' : 'none',
              zIndex: isSelected ? 20 : 12,
            }}
            onMouseDown={(e) => {
              if (activeTool === 'select') {
                startDrag(e, ann.id, 'move');
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAnnotation(ann.id);
            }}
          >
            {/* Delete button when selected */}
            {isSelected && (
              <button
                style={deleteBtnStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAnnotation(ann.id);
                  onSelectAnnotation(null);
                }}
                title="Delete Annotation"
              >
                <X size={12} />
              </button>
            )}

            {/* Drag Handle icon */}
            {isSelected && activeTool === 'select' && (
              <div style={dragHandleIconStyle}>
                <Move size={10} />
              </div>
            )}

            {/* Resize Handle when selected */}
            {isSelected && (
              <div
                style={resizeHandleStyle}
                onMouseDown={(e) => startDrag(e, ann.id, 'resize')}
                title="Resize"
              />
            )}

            {/* Render details based on type */}
            {ann.type === 'text' && (
              <div style={textWrapperStyle}>
                <textarea
                  value={ann.text}
                  onChange={(e) => handleTextChange(ann.id, e.target.value)}
                  style={{
                    ...textInputStyle,
                    color: ann.color,
                    fontSize: `${ann.fontSize * (pageWidth / 800)}px`, // Responsive text scale
                    fontWeight: ann.isBold ? 'bold' : 'normal',
                    fontStyle: ann.isItalic ? 'italic' : 'normal',
                  }}
                  onMouseDown={(e) => {
                    // Stop event propagation during drag to allow typing selection
                    if (activeTool !== 'select') e.stopPropagation();
                  }}
                />
              </div>
            )}

            {ann.type === 'image' && (
              <img
                src={ann.imageUrl}
                alt="Logo Stamp"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: ann.opacity ?? 1,
                  pointerEvents: 'none'
                }}
              />
            )}

            {ann.type === 'signature' && (
              <img
                src={ann.signatureUrl}
                alt="Signature"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: ann.opacity ?? 1,
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* Invisible selector block for drawing and shapes so they are easily clickable */}
            {(ann.type === 'drawing' || ann.type === 'shape') && (
              <div style={{ width: '100%', height: '100%', background: 'transparent' }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Styles
const deleteBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-10px',
  right: '-10px',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#ef4444',
  color: 'white',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 100,
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

const dragHandleIconStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-10px',
  left: '-10px',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: 'var(--color-brand)',
  color: 'white',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

const resizeHandleStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '-5px',
  right: '-5px',
  width: '10px',
  height: '10px',
  backgroundColor: 'var(--color-brand)',
  border: '1px solid white',
  cursor: 'se-resize',
  zIndex: 100,
  borderRadius: '2px',
};

const textWrapperStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

const textInputStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  resize: 'none',
  fontFamily: 'inherit',
  lineHeight: 1.2,
  padding: '2px',
  overflow: 'hidden',
};
