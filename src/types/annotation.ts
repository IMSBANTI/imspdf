export interface BaseAnnotation {
  id: string;
  pageNumber: number; // 1-indexed
  x: number; // relative x (0 to 1) from top-left
  y: number; // relative y (0 to 1) from top-left
  width: number; // relative width (0 to 1)
  height: number; // relative height (0 to 1)
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: number; // in pixels/points
  color: string; // hex color
  isBold?: boolean;
  isItalic?: boolean;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image';
  imageUrl: string; // base64 string
  opacity: number; // 0 to 1
  rotation?: number; // rotation in degrees
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature';
  signatureUrl: string; // base64 PNG data URL
  opacity: number; // 0 to 1
}

export interface DrawingPathPoint {
  x: number; // relative x (0 to 1)
  y: number; // relative y (0 to 1)
}

export interface DrawingAnnotation extends BaseAnnotation {
  type: 'drawing';
  points: DrawingPathPoint[];
  color: string;
  strokeWidth: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse' | 'arrow';
  color: string;
  strokeWidth: number;
  fillColor?: string; // hex
  isFilled?: boolean;
}

export type Annotation =
  | TextAnnotation
  | ImageAnnotation
  | SignatureAnnotation
  | DrawingAnnotation
  | ShapeAnnotation;
