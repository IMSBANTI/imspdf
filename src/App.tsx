import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { 
  FileUp, 
  Settings, 
  FileText,
  Lock,
  Layers,
  Signature as SigIcon,
  X,
  Sun,
  Moon
} from 'lucide-react';

import type { Annotation } from './types/annotation';
import { Toolbar } from './components/Toolbar';
import type { ToolType } from './components/Toolbar';
import { SidebarThumbnails } from './components/SidebarThumbnails';
import { LogoSelector } from './components/LogoSelector';
import { SignatureModal } from './components/SignatureModal';
import { AnnotationsLayer } from './components/AnnotationsLayer';
import { exportAnnotatedPdf } from './utils/pdfGenerator';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function App() {
  // Document states
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.1);
  const [loading, setLoading] = useState<boolean>(false);
  const [docName, setDocName] = useState<string>('');

  // Active side panel tab
  const [sidebarTab, setSidebarTab] = useState<'pages' | 'stamps' | 'signatures'>('pages');

  // Saved signatures list
  const [savedSignatures, setSavedSignatures] = useState<string[]>(() => {
    const saved = localStorage.getItem('ims_signatures');
    return saved ? JSON.parse(saved) : [];
  });

  // Annotation states
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);

  // Formatting options
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [fontSize, setFontSize] = useState<number>(16);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [stampDataUrl, setStampDataUrl] = useState<string | null>(null);

  // Modals
  const [isSigModalOpen, setIsSigModalOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Toggle theme class on body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Undo / Redo stacks
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  // Canvas drawing sizes
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Render active page canvas
  useEffect(() => {
    if (!pdfDoc) return;

    let active = true;
    const renderPage = async () => {
      try {
        setLoading(true);
        const page = await pdfDoc.getPage(currentPage);
        if (!active) return;

        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPageWidth(viewport.width);
        setPageHeight(viewport.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext as any).promise;
        if (active) setLoading(false);
      } catch (err) {
        console.error('Failed rendering page:', err);
        setLoading(false);
      }
    };

    renderPage();

    return () => {
      active = false;
    };
  }, [pdfDoc, currentPage, zoom]);

  // Handle PDF upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadPdfFile(file);
  };

  const loadPdfFile = (file: File) => {
    setLoading(true);
    setDocName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      setPdfBytes(arrayBuffer as ArrayBuffer);

      try {
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        
        // Reset states
        setAnnotations([]);
        setHistory([[]]);
        setHistoryIdx(0);
        setSelectedAnnId(null);
        setActiveTool('select');
      } catch (err) {
        console.error('Error loading PDF document:', err);
        alert('Could not load PDF document. Please check the file formatting.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Generate blank template PDF for testing
  const handleLoadSample = async () => {
    setLoading(true);
    setDocName('IMS_Proposal_Template.pdf');
    try {
      const sampleDoc = await PDFDocument.create();
      const page = sampleDoc.addPage([612, 792]); // Standard Letter size
      
      const fontBold = await sampleDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await sampleDoc.embedFont(StandardFonts.Helvetica);
      
      // Branding colors
      const orangeBrand = rgb(255/255, 107/255, 74/255);
      const darkSlate = rgb(15/255, 23/255, 42/255);
      const mutedText = rgb(100/255, 116/255, 139/255);

      // IMS header logo embedding
      try {
        const logoRes = await fetch('/ims_logo.png');
        const logoBuf = await logoRes.arrayBuffer();
        const embeddedLogo = await sampleDoc.embedPng(logoBuf);
        page.drawImage(embeddedLogo, {
          x: 50,
          y: 708,
          width: 58,
          height: 44,
        });
      } catch (e) {
        console.error('Failed embedding logo in sample PDF:', e);
        page.drawText('IMS', { x: 50, y: 720, size: 28, font: fontBold, color: orangeBrand });
      }
      page.drawText('INTEGRATED MARKETING SERVICE', { x: 120, y: 728, size: 10, font: fontBold, color: darkSlate });
      page.drawText('Secure Employee Review & Sign-Off Portal', { x: 120, y: 712, size: 9, font: fontRegular, color: mutedText });

      page.drawLine({
        start: { x: 50, y: 690 },
        end: { x: 562, y: 690 },
        thickness: 1,
        color: rgb(226/255, 232/255, 240/255)
      });

      // Marketing campaign info
      page.drawText('CAMPAIGN PROPOSAL BRIEF', { x: 50, y: 645, size: 16, font: fontBold, color: darkSlate });
      
      page.drawText('Campaign Name:', { x: 50, y: 610, size: 11, font: fontBold, color: darkSlate });
      page.drawText('Brand Launch - Winter Fashion Collection 2026', { x: 160, y: 610, size: 11, font: fontRegular, color: darkSlate });

      page.drawText('Prepared By:', { x: 50, y: 590, size: 11, font: fontBold, color: darkSlate });
      page.drawText('Digital Marketing Division, IMS Core Team', { x: 160, y: 590, size: 11, font: fontRegular, color: darkSlate });

      page.drawText('Review Deadline:', { x: 50, y: 570, size: 11, font: fontBold, color: darkSlate });
      page.drawText('August 1st, 2026', { x: 160, y: 570, size: 11, font: fontRegular, color: darkSlate });

      // Core content box
      page.drawRectangle({
        x: 50,
        y: 280,
        width: 512,
        height: 250,
        borderWidth: 1,
        borderColor: rgb(203/255, 213/255, 225/255),
        color: rgb(248/255, 250/255, 252/255)
      });

      page.drawText('Campaign Deliverables & Target KPIs', { x: 70, y: 500, size: 13, font: fontBold, color: darkSlate });
      
      const bulletPoints = [
        'Creative Asset Design: 15 unique social graphics & 3 video spots.',
        'Target Audience: Urban lifestyle enthusiasts, ages 18-35.',
        'Core Channels: Instagram, YouTube Shorts, and IMS Affiliate Networks.',
        'Estimated Budget: $45,000 USD (Includes influencer coordination).',
        'Performance Benchmark: +25% Brand Consideration increase.'
      ];

      bulletPoints.forEach((point, i) => {
        page.drawCircle({ x: 75, y: 460 - (i * 24), size: 6, color: orangeBrand });
        page.drawText(point, { x: 90, y: 456 - (i * 24), size: 11, font: fontRegular, color: darkSlate });
      });

      // Signature Area
      page.drawText('Employee Sign-Off Required:', { x: 50, y: 150, size: 12, font: fontBold, color: orangeBrand });
      page.drawText('By signing below, you approve the marketing creative guidelines and budget allocation.', {
        x: 50,
        y: 130,
        size: 9,
        font: fontRegular,
        color: mutedText
      });

      page.drawLine({
        start: { x: 50, y: 70 },
        end: { x: 250, y: 70 },
        thickness: 1,
        color: darkSlate
      });
      page.drawText('Authorized Signature', { x: 50, y: 55, size: 9, font: fontRegular, color: mutedText });

      page.drawLine({
        start: { x: 362, y: 70 },
        end: { x: 562, y: 70 },
        thickness: 1,
        color: darkSlate
      });
      page.drawText('Date Signed', { x: 362, y: 55, size: 9, font: fontRegular, color: mutedText });

      const finalBytes = await sampleDoc.save();
      const arrayBuffer = finalBytes.buffer.slice(finalBytes.byteOffset, finalBytes.byteOffset + finalBytes.byteLength);
      setPdfBytes(arrayBuffer as ArrayBuffer);

      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      
      setAnnotations([]);
      setHistory([[]]);
      setHistoryIdx(0);
      setSelectedAnnId(null);
      setActiveTool('select');
    } catch (err) {
      console.error('Sample generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Push new state to undo/redo history
  const pushToHistory = (newAnnotations: Annotation[]) => {
    const nextHistory = history.slice(0, historyIdx + 1);
    setHistory([...nextHistory, newAnnotations]);
    setHistoryIdx(nextHistory.length);
  };

  // Manage Annotation additions/updates
  const handleAddAnnotation = (ann: Annotation) => {
    const updated = [...annotations, ann];
    setAnnotations(updated);
    pushToHistory(updated);
  };

  const handleUpdateAnnotation = (updatedAnn: Annotation) => {
    const updated = annotations.map((ann) => (ann.id === updatedAnn.id ? updatedAnn : ann));
    setAnnotations(updated);
    // Debounce pushing minor drag adjustments to history or just push
    // For drag-drop correctness, we overwrite the current slot if it's the exact same items count
    const nextHistory = [...history];
    nextHistory[historyIdx] = updated;
    setHistory(nextHistory);
  };

  const handleDeleteAnnotation = (id: string) => {
    const updated = annotations.filter((ann) => ann.id !== id);
    setAnnotations(updated);
    pushToHistory(updated);
  };

  const handleClearPageAnnotations = () => {
    if (window.confirm('Clear all annotations on this page?')) {
      const updated = annotations.filter((ann) => ann.pageNumber !== currentPage);
      setAnnotations(updated);
      pushToHistory(updated);
    }
  };

  // Undo / Redo triggers
  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setAnnotations(history[prevIdx]);
      setSelectedAnnId(null);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setAnnotations(history[nextIdx]);
      setSelectedAnnId(null);
    }
  };

  // Change active tool callback
  const handleSetActiveTool = (tool: ToolType) => {
    setActiveTool(tool);
    if (tool === 'signature') {
      setIsSigModalOpen(true);
    }
  };

  // Insert signature
  const handleApplySignature = (sigUrl: string) => {
    setStampDataUrl(sigUrl);
    if (!savedSignatures.includes(sigUrl)) {
      const updated = [sigUrl, ...savedSignatures].slice(0, 5);
      setSavedSignatures(updated);
      localStorage.setItem('ims_signatures', JSON.stringify(updated));
    }
  };

  // Append another PDF (Merge)
  const handleAppendPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pdfBytes) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const appendBytes = event.target?.result as ArrayBuffer;
        const currentDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const extraDoc = await PDFDocument.load(appendBytes, { ignoreEncryption: true });
        
        const copiedPages = await currentDoc.copyPages(extraDoc, extraDoc.getPageIndices());
        copiedPages.forEach((page) => currentDoc.addPage(page));
        
        const mergedPdfBytes = await currentDoc.save();
        const arrayBufferFinal = mergedPdfBytes.buffer.slice(mergedPdfBytes.byteOffset, mergedPdfBytes.byteOffset + mergedPdfBytes.byteLength) as ArrayBuffer;
        
        setPdfBytes(arrayBufferFinal);
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBufferFinal.slice(0)) }).promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        
        setCurrentPage(totalPages + 1);
      } catch (err) {
        console.error('Failed merging PDFs:', err);
        alert('Could not merge the selected PDF: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Delete a page (Split)
  const handleDeletePage = async (pageNumber: number) => {
    if (!pdfBytes || totalPages <= 1) return;
    setLoading(true);
    try {
      const currentDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      currentDoc.removePage(pageNumber - 1);
      
      const modifiedPdfBytes = await currentDoc.save();
      const arrayBuffer = modifiedPdfBytes.buffer.slice(modifiedPdfBytes.byteOffset, modifiedPdfBytes.byteOffset + modifiedPdfBytes.byteLength) as ArrayBuffer;
      
      const updatedAnnotations = annotations
        .filter((ann) => ann.pageNumber !== pageNumber)
        .map((ann) => {
          if (ann.pageNumber > pageNumber) {
            return { ...ann, pageNumber: ann.pageNumber - 1 };
          }
          return ann;
        });
      
      setAnnotations(updatedAnnotations);
      pushToHistory(updatedAnnotations);
      
      setPdfBytes(arrayBuffer);
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      
      if (currentPage > doc.numPages) {
        setCurrentPage(doc.numPages);
      }
    } catch (err) {
      console.error('Failed deleting page:', err);
      alert('Could not delete the page: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Close signature and switch active tool
  const handleCloseSigModal = () => {
    setIsSigModalOpen(false);
    if (!stampDataUrl) {
      setActiveTool('select');
    }
  };

  const handleSelectStamp = (dataUrl: string) => {
    setStampDataUrl(dataUrl);
    setActiveTool('stamp');
  };

  // Reset Stamp placing status
  const handleResetStampTool = () => {
    setStampDataUrl(null);
    setActiveTool('select');
  };

  // Compile and export PDF
  const handleDownload = async () => {
    if (!pdfBytes) return;
    try {
      setLoading(true);
      const modifiedBytes = await exportAnnotatedPdf(pdfBytes, annotations);
      
      const blob = new Blob([modifiedBytes as any], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = docName.replace('.pdf', '_edited.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed compiling PDF annotations:', err);
      alert('Could not export annotated PDF document.');
    } finally {
      setLoading(false);
    }
  };

  // Selected annotation properties helpers
  const selectedAnn = annotations.find(a => a.id === selectedAnnId);

  return (
    <div style={appContainerStyle}>
      {/* Navbar header */}
      <header style={headerStyle} className="glass-panel">
        <div style={logoWrapperStyle}>
          <img src="/ims_logo.png" alt="IMS Logo" style={{ height: '36px', objectFit: 'contain' }} />
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 4px 0 8px' }} />
          <div>
            <h1 style={logoTextStyle}>PDF Studio</h1>
            <span style={secureLabelStyle}>Secure Employee Editor</span>
          </div>
        </div>

        {pdfDoc && (
          <div style={docTitleContainerStyle}>
            <FileText size={16} style={{ color: 'var(--color-brand)' }} />
            <span style={docNameStyle}>{docName}</span>
          </div>
        )}

        <div style={headerActionsStyle}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={themeToggleButtonStyle}
            title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            <span>{theme === 'dark' ? 'Day Mode' : 'Dark Mode'}</span>
          </button>

          <div style={badgeStyle}>
            <Lock size={12} />
            <span>100% Client-Side Private</span>
          </div>
          <a
            href="https://docs.netlify.com"
            target="_blank"
            rel="noopener noreferrer"
            style={navLinkStyle}
          >
            Netlify Docs
          </a>
        </div>
      </header>

      {/* Main Workspace container */}
      <div style={workspaceContainerStyle}>
        {!pdfDoc ? (
          /* Empty Landing State */
          <div style={landingStyle}>
            <div style={landingCardStyle} className="glass-panel animate-fade-in">
              <div style={glowEffectStyle} />
              
              <div style={landingHeaderStyle}>
                <img src="/ims_logo.png" alt="IMS Logo" style={{ height: '64px', objectFit: 'contain', display: 'block', margin: '0 auto 16px auto' }} />
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Integrated Marketing Service
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Document Sign-Off & Annotation Portal
                </p>
              </div>

              <div style={dropzoneStyle}>
                <FileUp size={44} style={{ color: 'var(--color-brand)', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Upload Employee Document
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '240px' }}>
                  Drag and drop a PDF file here or browse from your local computer
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  style={fileInputStyle}
                  id="pdf-uploader"
                />
                <label htmlFor="pdf-uploader" style={browseButtonStyle}>
                  Browse File
                </label>
              </div>

              <div style={dividerContainerStyle}>
                <div style={lineStyle} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>OR</span>
                <div style={lineStyle} />
              </div>

              <button style={sampleButtonStyle} onClick={handleLoadSample}>
                Create Interactive Mock Document
              </button>

              <div style={featureGridStyle}>
                <div style={featureItemStyle}>
                  <SigIcon size={16} style={{ color: 'var(--color-brand)' }} />
                  <span style={featureTitleStyle}>Digital Signing</span>
                </div>
                <div style={featureItemStyle}>
                  <Layers size={16} style={{ color: 'var(--color-brand)' }} />
                  <span style={featureTitleStyle}>Branded Stamps</span>
                </div>
                <div style={featureItemStyle}>
                  <Settings size={16} style={{ color: 'var(--color-brand)' }} />
                  <span style={featureTitleStyle}>Complete Markup</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Editor Layout */
          <>
            {/* Sidebar with Thumbnails & Stamps */}
            <aside style={sidebarStyle} className="glass-panel">
              <div style={sidebarTabsStyle}>
                <button
                  style={sidebarTab === 'pages' ? activeSidebarTabStyle : sidebarTabBtnStyle}
                  onClick={() => setSidebarTab('pages')}
                >
                  Pages
                </button>
                <button
                  style={sidebarTab === 'stamps' ? activeSidebarTabStyle : sidebarTabBtnStyle}
                  onClick={() => setSidebarTab('stamps')}
                >
                  Stamps
                </button>
                <button
                  style={sidebarTab === 'signatures' ? activeSidebarTabStyle : sidebarTabBtnStyle}
                  onClick={() => setSidebarTab('signatures')}
                >
                  Signatures
                </button>
              </div>

              <div style={sidebarBodyStyle}>
                {sidebarTab === 'pages' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                      <input
                        type="file"
                        accept="application/pdf"
                        id="pdf-appender"
                        style={{ display: 'none' }}
                        onChange={handleAppendPdf}
                      />
                      <label htmlFor="pdf-appender" style={appendPdfButtonStyle}>
                        + Append / Merge PDF
                      </label>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <SidebarThumbnails
                        pdfDocument={pdfDoc}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                        totalPages={totalPages}
                        onDeletePage={handleDeletePage}
                      />
                    </div>
                  </div>
                )}
                {sidebarTab === 'stamps' && (
                  <LogoSelector onSelectStamp={handleSelectStamp} />
                )}
                {sidebarTab === 'signatures' && (
                  <div style={signaturesPanelStyle}>
                    <button style={createSigButtonStyle} onClick={() => setIsSigModalOpen(true)}>
                      + Create New Signature
                    </button>
                    
                    <div style={savedSigsHeaderStyle}>Saved Signatures</div>
                    {savedSignatures.length === 0 ? (
                      <div style={emptySigsStyle}>
                        No signatures saved. Click above to draw or type a signature.
                      </div>
                    ) : (
                      <div style={sigsGridStyle}>
                        {savedSignatures.map((sig, idx) => (
                          <div key={idx} style={sigCardWrapperStyle}>
                            <button
                              style={sigCardStyle}
                              onClick={() => {
                                setStampDataUrl(sig);
                                setActiveTool('signature');
                              }}
                              title="Click to select signature, then click on PDF to place it"
                            >
                              <img src={sig} alt={`Signature ${idx + 1}`} style={sigImgStyle} />
                            </button>
                            <button
                              style={deleteSigIconStyle}
                              onClick={() => {
                                const updated = savedSignatures.filter((_, i) => i !== idx);
                                setSavedSignatures(updated);
                                localStorage.setItem('ims_signatures', JSON.stringify(updated));
                              }}
                              title="Remove saved signature"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>

            {/* Editing board */}
            <main style={mainContentStyle}>
              {/* Floating Editor Controls Toolbar */}
              <div style={toolbarWrapperStyle}>
                <Toolbar
                  activeTool={activeTool}
                  setActiveTool={handleSetActiveTool}
                  zoom={zoom}
                  setZoom={setZoom}
                  textColor={textColor}
                  setTextColor={setTextColor}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  isBold={isBold}
                  setIsBold={setIsBold}
                  isItalic={isItalic}
                  setIsItalic={setIsItalic}
                  strokeWidth={strokeWidth}
                  setStrokeWidth={setStrokeWidth}
                  canUndo={historyIdx > 0}
                  canRedo={historyIdx < history.length - 1}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onDownload={handleDownload}
                  onUploadNew={() => setPdfDoc(null)}
                  onClearAnnotations={handleClearPageAnnotations}
                />
              </div>

              {/* Tool Helper Banner */}
              {activeTool !== 'select' && (
                <div style={toolHelperBannerStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-brand)', animation: 'pulse-subtle 1.5s infinite' }} />
                    {activeTool === 'text' && "Text Tool Active: Click anywhere on the document page to type and place text."}
                    {activeTool === 'draw' && "Pencil Tool Active: Click and drag on the document page to draw."}
                    {activeTool === 'signature' && "Signature Selected: Click anywhere on the document page to stamp your signature."}
                    {activeTool === 'stamp' && "Stamp Selected: Click anywhere on the document page to stamp the logo."}
                    {activeTool === 'rectangle' && "Rectangle Tool Active: Click and drag to draw a box."}
                    {activeTool === 'ellipse' && "Ellipse Tool Active: Click and drag to draw an oval."}
                    {activeTool === 'arrow' && "Arrow Tool Active: Click and drag to draw an arrow."}
                  </span>
                  <button style={cancelToolBtnStyle} onClick={() => { setActiveTool('select'); setStampDataUrl(null); }}>
                    Exit Tool
                  </button>
                </div>
              )}

              {/* PDF View Canvas container */}
              <div style={viewportScrollStyle}>
                {loading && (
                  <div style={canvasLoadingOverlay}>
                    <div style={spinnerStyle} />
                    <span style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Rendering PDF document page...
                    </span>
                  </div>
                )}

                <div
                  ref={containerRef}
                  style={{
                    ...pdfPageContainerStyle,
                    width: pageWidth || 'auto',
                    height: pageHeight || 'auto',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <canvas ref={canvasRef} style={{ display: 'block' }} />
                  
                  {/* Absolute Annotations Placement Layer */}
                  <AnnotationsLayer
                    pageNumber={currentPage}
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                    annotations={annotations.filter(a => a.pageNumber === currentPage)}
                    activeTool={activeTool}
                    selectedAnnotationId={selectedAnnId}
                    onSelectAnnotation={setSelectedAnnId}
                    onAddAnnotation={handleAddAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    textColor={textColor}
                    fontSize={fontSize}
                    isBold={isBold}
                    isItalic={isItalic}
                    strokeWidth={strokeWidth}
                    stampDataUrl={stampDataUrl}
                    resetStampTool={handleResetStampTool}
                  />
                </div>
              </div>
            </main>

            {/* Properties sidebar (Right side) */}
            {selectedAnn && (
              <aside style={rightSidebarStyle} className="glass-panel animate-fade-in">
                <div style={rightSidebarHeader}>
                  <Settings size={14} style={{ color: 'var(--color-brand)' }} />
                  <span style={rightSidebarTitle}>Properties</span>
                  <button style={closePropBtn} onClick={() => setSelectedAnnId(null)}>
                    <X size={14} />
                  </button>
                </div>
                
                <div style={rightSidebarBody}>
                  <div style={propField}>
                    <span style={propLabel}>Type</span>
                    <span style={propVal}>{selectedAnn.type.toUpperCase()}</span>
                  </div>

                  {selectedAnn.type === 'text' && (
                    <>
                      <div style={propField}>
                        <span style={propLabel}>Text Content</span>
                        <textarea
                          style={propTextarea}
                          value={selectedAnn.text}
                          onChange={(e) => handleUpdateAnnotation({ ...selectedAnn, text: e.target.value } as any)}
                        />
                      </div>
                      <div style={propField}>
                        <span style={propLabel}>Size</span>
                        <input
                          type="range"
                          min="10"
                          max="72"
                          value={selectedAnn.fontSize}
                          onChange={(e) => handleUpdateAnnotation({ ...selectedAnn, fontSize: Number(e.target.value) })}
                          style={rangeInput}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                          {selectedAnn.fontSize}px
                        </span>
                      </div>
                      <div style={propField}>
                        <span style={propLabel}>Text Color</span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {['#0f172a', '#ff6b4a', '#2563eb', '#16a34a', '#dc2626'].map((color) => (
                            <button
                              key={color}
                              style={{
                                ...colorDotStyle,
                                backgroundColor: color,
                                border: selectedAnn.color === color ? '2px solid var(--text-primary)' : '1px solid rgba(255,255,255,0.1)'
                              }}
                              onClick={() => handleUpdateAnnotation({ ...selectedAnn, color })}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(selectedAnn.type === 'image' || selectedAnn.type === 'signature') && (
                    <div style={propField}>
                      <span style={propLabel}>Opacity</span>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={((selectedAnn as any).opacity ?? 1) * 100}
                        onChange={(e) => handleUpdateAnnotation({ ...selectedAnn, opacity: Number(e.target.value) / 100 } as any)}
                        style={rangeInput}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {Math.round(((selectedAnn as any).opacity ?? 1) * 100)}%
                      </span>
                    </div>
                  )}

                  <button
                    style={deletePropBtn}
                    onClick={() => {
                      handleDeleteAnnotation(selectedAnn.id);
                      setSelectedAnnId(null);
                    }}
                  >
                    Remove Annotation
                  </button>
                </div>
              </aside>
            )}
          </>
        )}
      </div>

      {/* Signature pad modal overlay */}
      <SignatureModal
        isOpen={isSigModalOpen}
        onClose={handleCloseSigModal}
        onSave={handleApplySignature}
      />
    </div>
  );
}

// Layout CSS Styles
const appContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100vw',
  backgroundColor: 'var(--bg-app)',
};

const headerStyle: React.CSSProperties = {
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  zIndex: 100,
  borderBottom: '1px solid var(--border-color)',
};

const logoWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};


const logoTextStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  letterSpacing: '-0.01em',
  lineHeight: 1.1,
};

const secureLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const docTitleContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  padding: '6px 14px',
  borderRadius: '20px',
  border: '1px solid var(--border-color)',
};

const docNameStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-primary)',
  maxWidth: '220px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const badgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'rgba(22, 163, 74, 0.1)',
  border: '1px solid rgba(22, 163, 74, 0.2)',
  color: '#4ade80',
  padding: '4px 10px',
  borderRadius: '20px',
  fontSize: '11px',
  fontWeight: 500,
};

const themeToggleButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: '20px',
  color: 'var(--text-primary)',
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const navLinkStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  transition: 'color 0.2s',
};

const workspaceContainerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
};

/* Landing Screen Style */
const landingStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'radial-gradient(circle at center, rgba(255, 107, 74, 0.05) 0%, transparent 60%)',
};

const landingCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  borderRadius: 'var(--radius-xl)',
  padding: '36px',
  textAlign: 'center',
  boxShadow: 'var(--shadow-xl)',
  position: 'relative',
  overflow: 'hidden',
};

const glowEffectStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-150px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '300px',
  height: '300px',
  backgroundColor: 'var(--color-brand-glow)',
  filter: 'blur(80px)',
  borderRadius: '50%',
  zIndex: 1,
  pointerEvents: 'none',
};

const landingHeaderStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  marginBottom: '24px',
  paddingTop: '16px',
};


const dropzoneStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  border: '2px dashed var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  padding: '32px 20px',
  backgroundColor: 'rgba(255, 255, 255, 0.01)',
  transition: 'all 0.2s',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const fileInputStyle: React.CSSProperties = {
  display: 'none',
};

const browseButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '16px',
  backgroundColor: 'var(--color-brand)',
  color: 'white',
  padding: '8px 24px',
  borderRadius: 'var(--radius-md)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 10px var(--color-brand-glow)',
  transition: 'transform 0.15s, background-color 0.2s',
};

const dividerContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  margin: '18px 0',
  position: 'relative',
  zIndex: 2,
};

const lineStyle: React.CSSProperties = {
  flex: 1,
  height: '1px',
  backgroundColor: 'var(--border-color)',
};

const sampleButtonStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  width: '100%',
  padding: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const featureGridStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '32px',
  paddingTop: '20px',
  borderTop: '1px solid var(--border-color)',
  position: 'relative',
  zIndex: 2,
};

const featureItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
};

const featureTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
  fontWeight: 500,
};

/* Editor Workspace Styles */
const sidebarStyle: React.CSSProperties = {
  width: '240px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--bg-panel-solid)',
  borderRight: '1px solid var(--border-color)',
};

const sidebarTabsStyle: React.CSSProperties = {
  display: 'flex',
  padding: '12px 8px',
  gap: '4px',
  borderBottom: '1px solid var(--border-color)',
};

const sidebarTabBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 2px',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  background: 'none',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const activeSidebarTabStyle: React.CSSProperties = {
  ...sidebarTabBtnStyle,
  color: 'white',
  backgroundColor: 'rgba(255, 107, 74, 0.15)',
  border: '1px solid var(--color-brand)',
};

const sidebarBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#0c0f16',
};

const toolbarWrapperStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'rgba(10, 14, 23, 0.5)',
};

const viewportScrollStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '24px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  position: 'relative',
};

const pdfPageContainerStyle: React.CSSProperties = {
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
  backgroundColor: 'white',
  position: 'relative',
  borderRadius: '4px',
};

const canvasLoadingOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(8, 11, 17, 0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const spinnerStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: '3px solid rgba(255, 107, 74, 0.1)',
  borderTopColor: 'var(--color-brand)',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

/* Right side panel styles */
const rightSidebarStyle: React.CSSProperties = {
  width: '260px',
  borderLeft: '1px solid var(--border-color)',
  height: '100%',
  backgroundColor: 'var(--bg-panel-solid)',
  display: 'flex',
  flexDirection: 'column',
};

const rightSidebarHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '16px',
  borderBottom: '1px solid var(--border-color)',
};

const rightSidebarTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  flex: 1,
};

const closePropBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px',
};

const rightSidebarBody: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  flex: 1,
  overflowY: 'auto',
};

const propField: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const propLabel: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const propVal: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--color-brand)',
};

const propTextarea: React.CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  fontSize: '13px',
  minHeight: '80px',
  outline: 'none',
  resize: 'vertical',
};

const rangeInput: React.CSSProperties = {
  width: '100%',
  accentColor: 'var(--color-brand)',
};

const colorDotStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  cursor: 'pointer',
  outline: 'none',
};

const deletePropBtn: React.CSSProperties = {
  marginTop: 'auto',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  color: '#f87171',
  padding: '10px',
  borderRadius: 'var(--radius-md)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  outline: 'none',
};

const appendPdfButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  padding: '8px 12px',
  backgroundColor: 'rgba(255, 107, 74, 0.08)',
  border: '1px dashed var(--color-brand)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-brand)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '11px',
  transition: 'all 0.2s',
  textAlign: 'center',
};

const signaturesPanelStyle: React.CSSProperties = {
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const createSigButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: 'var(--color-brand)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  boxShadow: '0 4px 10px var(--color-brand-glow)',
  transition: 'all 0.2s',
};

const savedSigsHeaderStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  marginTop: '6px',
};

const emptySigsStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  textAlign: 'center',
  padding: '24px 12px',
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'rgba(255,255,255,0.01)',
};

const sigsGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const sigCardWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
};

const sigCardStyle: React.CSSProperties = {
  flex: 1,
  height: '64px',
  backgroundColor: 'white',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: '6px',
  overflow: 'hidden',
  transition: 'all 0.2s',
  outline: 'none',
};

const sigImgStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  filter: 'contrast(1.15)',
};

const deleteSigIconStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-6px',
  right: '-6px',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  backgroundColor: '#ef4444',
  color: 'white',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  zIndex: 5,
};

const toolHelperBannerStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-brand-light)',
  borderBottom: '1px solid var(--color-brand)',
  padding: '8px 24px',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-brand)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const cancelToolBtnStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--color-brand)',
  borderRadius: '4px',
  color: 'var(--color-brand)',
  padding: '2px 8px',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};
