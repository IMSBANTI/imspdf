import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Annotation } from '../types/annotation';

// Helper to convert hex color (#ffffff) to pdf-lib rgb structure (0 to 1)
const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
};

// Helper to extract raw byte array from base64 data URL
const getBytesFromDataUrl = (dataUrl: string) => {
  const parts = dataUrl.split(',');
  const base64 = parts[1] || parts[0];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const exportAnnotatedPdf = async (
  originalPdfArrayBuffer: ArrayBuffer,
  annotations: Annotation[]
): Promise<Uint8Array> => {
  // Load original PDF
  const pdfDoc = await PDFDocument.load(originalPdfArrayBuffer);
  const pages = pdfDoc.getPages();

  // Load standard fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaObliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldObliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  // Process annotations page-by-page
  for (const ann of annotations) {
    const pageIdx = ann.pageNumber - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const page = pages[pageIdx];
    const { width: pageW, height: pageH } = page.getSize();

    // Map screen relative coords (0-1) to PDF page coords (0 to W, 0 to H from bottom-left)
    const pdfX = ann.x * pageW;
    const pdfY = (1 - ann.y - ann.height) * pageH;
    const pdfW = ann.width * pageW;
    const pdfH = ann.height * pageH;

    switch (ann.type) {
      case 'text': {
        const textFont = ann.isBold && ann.isItalic
          ? helveticaBoldObliqueFont
          : ann.isBold
          ? helveticaBoldFont
          : ann.isItalic
          ? helveticaObliqueFont
          : helveticaFont;

        // Draw text using baseline adjustment (pdf-lib draws text from bottom-left baseline)
        // Adjust pdfY upwards slightly so it doesn't clip off the bottom of the bounding box
        const fontSizePdf = ann.fontSize * 0.95; // scaling factor
        page.drawText(ann.text, {
          x: pdfX,
          y: pdfY + (pdfH * 0.1), // push baseline slightly up from the bounding box bottom
          size: fontSizePdf,
          font: textFont,
          color: hexToRgb(ann.color),
        });
        break;
      }

      case 'image':
      case 'signature': {
        const url = ann.type === 'image' ? ann.imageUrl : ann.signatureUrl;
        const opacity = ann.opacity ?? 1;

        try {
          const imageBytes = getBytesFromDataUrl(url);
          let embeddedImage;

          if (url.includes('image/png')) {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }

          page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            opacity: opacity,
          });
        } catch (err) {
          console.error(`Error embedding image/signature for annotation ${ann.id}:`, err);
        }
        break;
      }

      case 'drawing': {
        if (!ann.points || ann.points.length < 2) continue;
        const color = hexToRgb(ann.color);
        const thickness = ann.strokeWidth;

        // Draw individual line segments
        for (let i = 0; i < ann.points.length - 1; i++) {
          const p1 = ann.points[i];
          const p2 = ann.points[i + 1];

          page.drawLine({
            start: { x: p1.x * pageW, y: (1 - p1.y) * pageH },
            end: { x: p2.x * pageW, y: (1 - p2.y) * pageH },
            thickness,
            color,
            opacity: 1,
          });
        }
        break;
      }

      case 'shape': {
        const color = hexToRgb(ann.color);
        const thickness = ann.strokeWidth;
        const hasFill = ann.isFilled && ann.fillColor;
        const fillColor = hasFill ? hexToRgb(ann.fillColor!) : undefined;

        if (ann.shapeType === 'rectangle') {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            borderWidth: thickness,
            borderColor: color,
            color: fillColor,
          });
        } else if (ann.shapeType === 'ellipse') {
          // pdf-lib drawEllipse operates using centerX, centerY, and radii
          const centerX = pdfX + pdfW / 2;
          const centerY = pdfY + pdfH / 2;
          page.drawEllipse({
            x: centerX,
            y: centerY,
            xRadius: pdfW / 2,
            yRadius: pdfH / 2,
            borderWidth: thickness,
            borderColor: color,
            color: fillColor,
          } as any);
        } else if (ann.shapeType === 'arrow') {
          // Drawing an arrow from top-left to bottom-right of bounding box
          const x1 = pdfX;
          const y1 = pdfY + pdfH; // Top-left in PDF
          const x2 = pdfX + pdfW;
          const y2 = pdfY; // Bottom-right in PDF

          // Draw main shaft line
          page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness,
            color,
          });

          // Draw arrow head
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLength = 12;
          const arrowAngle = Math.PI / 6; // 30 degrees

          const arrowX1 = x2 - headLength * Math.cos(angle - arrowAngle);
          const arrowY1 = y2 - headLength * Math.sin(angle - arrowAngle);
          const arrowX2 = x2 - headLength * Math.cos(angle + arrowAngle);
          const arrowY2 = y2 - headLength * Math.sin(angle + arrowAngle);

          page.drawLine({
            start: { x: x2, y: y2 },
            end: { x: arrowX1, y: arrowY1 },
            thickness,
            color,
          });

          page.drawLine({
            start: { x: x2, y: y2 },
            end: { x: arrowX2, y: arrowY2 },
            thickness,
            color,
          });
        }
        break;
      }
    }
  }

  // Save modified PDF as bytes
  return await pdfDoc.save();
};
