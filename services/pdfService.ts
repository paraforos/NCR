
import { jsPDF } from 'jspdf';
import { ReportData, AppLists } from '../types';
import { LOGO_PATH } from '../constants';

// --- CONFIG ---
const FONT_NAME = 'Roboto';
const FONT_URL = '/Roboto-Regular.ttf';

const FILL_COLOR_HEADER = [230, 230, 230] as [number, number, number];
const COLOR_BLACK = 0;
const COLOR_BLUE = [0, 51, 153] as [number, number, number]; 

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN);

const loadFont = async (doc: jsPDF): Promise<void> => {
  try {
    const res = await fetch(FONT_URL);
    if (!res.ok) {
        console.warn("Font file not found, using default.");
        return;
    }
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result?.toString();
        const base64data = result?.split(',')[1];
        if (base64data) {
          try {
            doc.addFileToVFS('Roboto.ttf', base64data);
            doc.addFont('Roboto.ttf', FONT_NAME, 'normal');
            doc.addFont('Roboto.ttf', FONT_NAME, 'bold'); 
            doc.setFont(FONT_NAME);
          } catch (e) {
            console.error("Error adding font to VFS", e);
          }
        }
        resolve();
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Font loading failed, falling back to standard font.", error);
  }
};

const transliterateGreek = (text: string): string => {
  const mapping: Record<string, string> = {
    'Α': 'A', 'Β': 'B', 'Γ': 'G', 'Δ': 'D', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'I', 'Θ': 'TH', 'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M', 'Ν': 'N', 'Ξ': 'X', 'Ο': 'O', 'Π': 'P', 'Ρ': 'R', 'Σ': 'S', 'Τ': 'T', 'Υ': 'Y', 'Φ': 'F', 'Χ': 'CH', 'Ψ': 'PS', 'Ω': 'O',
    'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i', 'θ': 'th', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o',
    'ά': 'a', 'έ': 'e', 'ή': 'i', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'o', 'ϊ': 'i', 'ϋ': 'y', 'ΐ': 'i', 'ΰ': 'y'
  };
  return text.split('').map(char => mapping[char] || char).join('').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
};

const drawFruitInspectionForm = (doc: jsPDF, data: ReportData, fontName: string) => {
    doc.addPage();
    let y = 10;
    
    try {
        const img = new Image();
        img.src = LOGO_PATH;
        doc.addImage(img, 'PNG', (PAGE_WIDTH - 50) / 2, y, 50, 22);
    } catch (e) { }
    y += 28;

    doc.setFont(fontName, 'bold');
    doc.setFontSize(13);
    doc.text('ΕΝΤΥΠΟ ΕΠΙΘΕΩΡΗΣΗΣ ΕΙΣΕΡΧΟΜΕΝΩΝ ΦΡΟΥΤΩΝ (ΑΝΤΙΓΡΑΦΟ)', PAGE_WIDTH / 2, y, { align: 'center' });
    y += 8;

    const rowH = 9;
    const labelW = 80;
    const valueW = CONTENT_WIDTH - labelW;

    const drawRow = (label: string, value: string, currentY: number, height = rowH, labelSize = 10) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.rect(MARGIN, currentY, labelW, height);
        doc.rect(MARGIN + labelW, currentY, valueW, height);
        doc.setFont(fontName, 'bold');
        doc.setFontSize(labelSize);
        doc.text(label, MARGIN + 2, currentY + (height/2) + 1.5);
        doc.setFont(fontName, 'normal');
        doc.setFontSize(11);
        
        const wrappedValue = doc.splitTextToSize(value || '', valueW - 6);
        doc.text(wrappedValue, MARGIN + labelW + 3, currentY + (height/2) + 1.5);
        
        return currentY + height;
    };

    y = drawRow('ΕΙΣΕΡΧΟΜΕΝΟ ΦΡΟΥΤΟ', data.product, y);
    y = drawRow('ΠΡΟΜΗΘΕΥΤΗΣ', data.supplier, y);
    y = drawRow('ΑΡ. ΑΥΤΟΚΙΝΗΤΟΥ', data.vehicle, y);
    y = drawRow('ΑΡ. ΠΑΛΕΤΟΚΙΒΩΤΙΩΝ', data.quantity || '', y);
    
    const dateFormatted = data.reportDate ? new Date(data.reportDate).toLocaleDateString('el-GR') : '';
    y = drawRow('ΗΜΕΡΑ – ΩΡΑ ΠΑΡΑΛΑΒΗΣ', dateFormatted, y);

    doc.rect(MARGIN, y, labelW, rowH * 2);
    doc.setFont(fontName, 'bold');
    doc.text('ΚΑΤΑΣΤΑΣΗ ΠΟΙΟΤΗΤΑΣ', MARGIN + 2, y + 7);
    doc.text('ΦΡΟΥΤΩΝ', MARGIN + 2, y + 13);
    const subW = valueW / 2;
    doc.rect(MARGIN + labelW, y, subW, rowH * 2);
    doc.rect(MARGIN + labelW + subW, y, subW, rowH * 2);
    doc.text('ΑΠΟΔΕΚΤΗ', MARGIN + labelW + (subW/2), y + 7, { align: 'center' });
    doc.text('ΜΗ ΑΠΟΔΕΚΤΗ', MARGIN + labelW + subW + (subW/2), y + 7, { align: 'center' });
    
    doc.setFontSize(26); 
    doc.setTextColor(COLOR_BLUE[0], COLOR_BLUE[1], COLOR_BLUE[2]);
    doc.text('X', MARGIN + labelW + subW + (subW/2) - 3, y + 15);
    doc.setTextColor(0); 
    y += rowH * 2;

    y = drawRow('ΠΟΣΟΣΤΟ ΑΚΑΤΑΛΛΗΛΩΝ ΦΡΟΥΤΩΝ', data.unsuitableFruitPercentage || '5%', y);

    const containerH = 20;
    doc.rect(MARGIN, y, labelW, containerH);
    doc.setFontSize(9);
    doc.text('ΚΑΤΑΣΤΑΣΗ ΠΟΙΟΤΗΤΑΣ/', MARGIN + 2, y + 6);
    doc.text('ΚΑΘΑΡΙΟΤΗΤΑΣ ΠΕΡΙΕΚΤΩΝ', MARGIN + 2, y + 11);
    doc.rect(MARGIN + labelW, y, valueW, containerH);
    doc.line(MARGIN + labelW, y + 10, MARGIN + labelW + valueW, y + 10);
    doc.setFontSize(10);
    
    doc.text('ΑΠΟΔΕΚΤΗ', MARGIN + labelW + 2, y + 7);
    doc.rect(MARGIN + labelW + (valueW * 0.45) - 7, y + 3, 4, 4);
    
    doc.text('ΜΗ ΑΠΟΔΕΚΤΗ', MARGIN + labelW + (valueW * 0.45) + 2, y + 7);
    doc.rect(MARGIN + labelW + valueW - 7, y + 3, 4, 4);
    
    doc.setFontSize(22);
    doc.setTextColor(COLOR_BLUE[0], COLOR_BLUE[1], COLOR_BLUE[2]);
    if (data.containersQuality === 'acceptable') {
        doc.text('X', MARGIN + labelW + (valueW * 0.45) - 6.5, y + 6.5);
    } else {
        doc.text('X', MARGIN + labelW + valueW - 6.5, y + 6.5);
    }
    doc.setTextColor(0); 
    
    doc.setFontSize(10);
    doc.text('ΣΧΟΛΙΑ: .................................................................................', MARGIN + labelW + 2, y + 16);
    y += containerH;
    
    doc.rect(MARGIN, y, CONTENT_WIDTH, 45);
    doc.setFont(fontName, 'bold');
    doc.text('ΠΑΡΑΤΗΡΗΣΕΙΣ', MARGIN + 2, y + 6);
    doc.setFont(fontName, 'normal');
    if (data.ncrDescription) {
        doc.setFontSize(10);
        doc.text(doc.splitTextToSize(data.ncrDescription, CONTENT_WIDTH - 6), MARGIN + 3, y + 14);
    }
};

export const generatePDF = async (data: ReportData, lists: AppLists, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  await loadFont(doc);
  const currentFont = FONT_NAME;
  doc.setFont(currentFont, 'normal');

  const dateStrReport = data.reportDate ? new Date(data.reportDate).toLocaleDateString('el-GR') : '';
  let currentY = 10;

  const drawRect = (x: number, y: number, w: number, h: number, fill = false) => {
    if (fill) doc.setFillColor(FILL_COLOR_HEADER[0], FILL_COLOR_HEADER[1], FILL_COLOR_HEADER[2]);
    doc.setDrawColor(COLOR_BLACK);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h, fill ? 'FD' : 'S');
  };

  const drawText = (text: string | string[], x: number, y: number, fontSize = 9, align: 'left' | 'center' | 'right' = 'left', bold = false) => {
    if (!text || (typeof text === 'string' && text.trim() === '')) return; 
    doc.setFont(currentFont, bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(COLOR_BLACK);
    doc.text(text, x, y, { align });
    doc.setFont(currentFont, 'normal');
  };

  const drawCheckbox = (x: number, y: number, checked: boolean, size = 5) => {
    doc.setDrawColor(COLOR_BLACK); doc.setLineWidth(0.3); doc.rect(x, y, size, size);
    if (checked) { 
        doc.setFont(currentFont, 'bold'); 
        doc.setFontSize(size * 3.2);
        doc.setTextColor(COLOR_BLUE[0], COLOR_BLUE[1], COLOR_BLUE[2]);
        doc.text('X', x + (size * 0.05), y + (size * 0.85)); 
        doc.setTextColor(0); 
    }
  };

  const drawHeader = (y: number) => {
    try { const img = new Image(); img.src = LOGO_PATH; doc.addImage(img, 'PNG', (PAGE_WIDTH - 30) / 2, y, 30, 15); } catch (e) { }
    const titleY = y + 22; doc.setFontSize(11); doc.setFont(currentFont, 'bold'); doc.text('ΑΝΑΦΟΡΑ ΜΗ ΣΥΜΜΟΡΦΩΣΗΣ', PAGE_WIDTH / 2, titleY, { align: 'center' });
    doc.setFont(currentFont, 'italic'); doc.text('NON-CONFORMITY REPORT', PAGE_WIDTH / 2, titleY + 5, { align: 'center' });
    return titleY + 10;
  };

  const isClosed = data.controlDate && data.controlDate.trim() !== "";

  // PAGE 1
  currentY = drawHeader(5);
  drawRect(MARGIN, currentY, CONTENT_WIDTH, 10);
  drawText('ΗΜΕΡΟΜΗΝΙΑ / DATE :', MARGIN + 2, currentY + 6, 10, 'left');
  drawText(dateStrReport, MARGIN + 60, currentY + 6, 11, 'left', true); 
  currentY += 10;

  drawRect(MARGIN, currentY, 60, 12); drawRect(MARGIN + 60, currentY, CONTENT_WIDTH - 60, 12);
  drawText('Αφορά σε:', MARGIN + 1, currentY + 4, 9); drawText('Relates to', MARGIN + 1, currentY + 8, 8);
  drawText(data.supplier, MARGIN + 62, currentY + 7, 11, 'left', true); 
  currentY += 12;

  const colWHeader = CONTENT_WIDTH / 4;
  const types = [
    { gr: 'Παραλαμβανόμενο είδος', en: 'Receiving good', val: data.type.receivedItem },
    { gr: 'Υπηρεσία', en: 'Service', val: data.type.service },
    { gr: 'Επιστρεφόμενο προϊόν', en: 'Returned product', val: data.type.returnedProduct },
    { gr: 'Παραγόμενο προϊόν', en: 'Produced product', val: data.type.producedProduct }
  ];
  types.forEach((t, i) => { 
    const x = MARGIN + (i * colWHeader); 
    drawRect(x, currentY, colWHeader, 14); 
    drawText(t.gr, x + 1, currentY + 4, 8); 
    drawText(t.en, x + 1, currentY + 9, 7); 
    drawCheckbox(x + colWHeader - 7, currentY + 4.5, t.val); 
  });
  currentY += 14;

  drawRect(MARGIN, currentY, CONTENT_WIDTH / 2, 15); drawText('Όχημα / Ονοματεπώνυμο', MARGIN + 1, currentY + 4, 8); drawText('Vehicle / Driver', MARGIN + 1, currentY + 8, 7); drawText(data.vehicle, MARGIN + 1, currentY + 13, 10, 'left', true); 
  drawRect(MARGIN + CONTENT_WIDTH / 2, currentY, CONTENT_WIDTH / 2, 15); drawText('Προϊόν / Παρτίδα', MARGIN + CONTENT_WIDTH/2 + 1, currentY + 4, 8); drawText('Product / Lot', MARGIN + CONTENT_WIDTH/2 + 1, currentY + 8, 7);
  const lotInfo = [data.product, data.batch, data.quantity].filter(Boolean).join(' - ');
  drawText(lotInfo, MARGIN + CONTENT_WIDTH/2 + 1, currentY + 13, 10, 'left', true);
  currentY += 15;

  const hSectionHeader = 8; 
  drawRect(MARGIN, currentY, CONTENT_WIDTH, hSectionHeader, true); drawText('Η μη συμμόρφωση αναφέρεται σε: / No conformity referring to', PAGE_WIDTH/2, currentY + 5, 9, 'center', true); currentY += hSectionHeader;
  const hGrid = 32; drawRect(MARGIN, currentY, CONTENT_WIDTH, hGrid); doc.line(MARGIN + 63, currentY, MARGIN + 63, currentY + hGrid); doc.line(MARGIN + 126, currentY, MARGIN + 126, currentY + hGrid); for(let i=1; i<=3; i++) doc.line(MARGIN, currentY + (i*8), MARGIN + CONTENT_WIDTH, currentY + (i*8));

  const drawNCR = (c: number, r: number, gr: string, en: string, val: boolean) => { 
    let x = MARGIN + (c === 2 ? 63 : c === 3 ? 126 : 0); 
    const y = currentY + ((r-1) * 8); 
    drawCheckbox(x + 2, y + 1.5, val); 
    drawText(gr, x + 9, y + 3.5, 8); 
    drawText(en, x + 9, y + 6.5, 7); 
  };
  drawNCR(1, 1, 'Ποιότητα', 'Quality', data.ncrCategory.quality); 
  drawNCR(1, 2, 'Αποθήκευση', 'Storage', data.ncrCategory.storage); 
  drawNCR(1, 3, 'ΑΣφάλεια τροφίμου', 'Food Safety', data.ncrCategory.foodSafety); 
  drawNCR(1, 4, 'Άλλο', 'Other', data.ncrCategory.other);
  drawNCR(2, 1, 'Συσκευασία', 'Packaging', data.ncrCategory.packaging); 
  drawNCR(2, 2, 'Παραγωγή', 'Production', data.ncrCategory.production); 
  drawNCR(2, 3, 'Περιβάλλον', 'Environment', data.ncrCategory.environment);
  drawNCR(3, 1, 'Μεταφορά', 'Transport', data.ncrCategory.transport); 
  drawNCR(3, 2, 'Εξοπλισμός', 'Equipment', data.ncrCategory.equipment); 
  drawNCR(3, 3, 'Υγεία & ασφάλεια', 'Health & safety', data.ncrCategory.healthSafety);
  currentY += hGrid;

  drawRect(MARGIN, currentY, CONTENT_WIDTH, hSectionHeader, true); drawText('ΠΕΡΙΓΡΑΦΗ ΜΗ ΣΥΜΜΟΡΦΩΣΗΣ / DESCRIPTION', PAGE_WIDTH/2, currentY + 5, 9, 'center', true); currentY += hSectionHeader;
  drawRect(MARGIN, currentY, CONTENT_WIDTH, 35); 
  const wrappedDescription = doc.splitTextToSize(data.ncrDescription || '', CONTENT_WIDTH - 6);
  doc.text(wrappedDescription, MARGIN + 3, currentY + 5);
  currentY += 35;

  const hAttach = 16; 
  drawRect(MARGIN, currentY, CONTENT_WIDTH * 0.4, hAttach); 
  drawText('Συνημμένα / Attachments:', MARGIN + 1, currentY + 4, 8); 
  const attachmentsText = (data.attachmentType || []).join(', ');
  doc.text(doc.splitTextToSize(attachmentsText, (CONTENT_WIDTH * 0.4) - 4), MARGIN + 1, currentY + 8);

  drawRect(MARGIN + CONTENT_WIDTH * 0.4, currentY, CONTENT_WIDTH * 0.4, hAttach); 
  drawText('Αναφορά από / Submitted by:', MARGIN + CONTENT_WIDTH * 0.4 + 1, currentY + 4, 8); 
  if (data.reporter) drawText(data.reporter, MARGIN + CONTENT_WIDTH * 0.4 + 1, currentY + 9, 10, 'left', true);
  
  if (lists.signatureImage) {
    try { doc.addImage(lists.signatureImage, 'PNG', MARGIN + CONTENT_WIDTH * 0.8 + 2, currentY + 1, CONTENT_WIDTH * 0.2 - 4, hAttach - 6); } catch (e) { }
  }
  drawRect(MARGIN + CONTENT_WIDTH * 0.8, currentY, CONTENT_WIDTH * 0.2, hAttach); 
  drawText('Υπογραφή', MARGIN + CONTENT_WIDTH * 0.8 + 1, currentY + hAttach - 4, 7); 
  currentY += hAttach;

  drawRect(MARGIN, currentY, CONTENT_WIDTH, hSectionHeader, true); drawText('ΔΙΟΡΘΩΣΗ / CORRECTION', PAGE_WIDTH/2, currentY + 5.5, 9, 'center', true); currentY += hSectionHeader;
  
  const correctionBoxHeight = 45;
  drawRect(MARGIN, currentY, CONTENT_WIDTH, correctionBoxHeight); 
  const actionRowHeight = correctionBoxHeight / 5;
  const drawCorr = (col: number, row: number, gr: string, en: string, val: boolean) => { 
    const x = MARGIN + (col === 2 ? 50 : 0); 
    const y = currentY + ((row-1) * actionRowHeight);
    drawText(gr, x + 2, y + 3.8, 8.5, 'left', true); 
    drawCheckbox(x + 42, y + 2, val, 4.5); 
  };
  drawCorr(1,1,'Επιστροφή','Return',data.correctionAction.return); 
  drawCorr(1,2,'Καταστροφή','Destruction',data.correctionAction.destroy);
  drawCorr(1,3,'Επανακατεργασία','Rework',data.correctionAction.rework);
  drawCorr(1,4,'Διαλογή','Sorting',data.correctionAction.sorting);
  drawCorr(1,5,'Ενημ. Πελάτη','Notify Client',data.correctionAction.notifyCustomer);
  drawCorr(2,1,'Ενημ. Προμηθ.','Notify Supplier',data.correctionAction.notifySupplier);
  currentY += correctionBoxHeight;

  // PAGE 2
  if (isClosed) {
      doc.addPage();
      currentY = drawHeader(5);
      drawRect(MARGIN, currentY, CONTENT_WIDTH, hSectionHeader, true); drawText('ΕΛΕΓΧΟΣ ΔΙΟΡΘΩΣΗΣ / CHECKING', PAGE_WIDTH/2, currentY + 5, 9, 'center', true); currentY += hSectionHeader;
      drawRect(MARGIN, currentY, CONTENT_WIDTH, 40); 
      if (data.controlDescription) { 
        const wrappedControlDesc = doc.splitTextToSize(data.controlDescription, CONTENT_WIDTH - 6); 
        doc.text(wrappedControlDesc, MARGIN + 3, currentY + 5); 
      }
      currentY += 40;
      drawRect(MARGIN, currentY, CONTENT_WIDTH, 12);
      drawText('Υπεύθυνος ελέγχου:', MARGIN + 2, currentY + 4, 7); 
      if (data.qcResponsible) drawText(data.qcResponsible, MARGIN + 2, currentY + 9, 9, 'left', true);
      drawText('Ημερομηνία:', MARGIN + 140, currentY + 4, 7); 
      if (data.controlDate) drawText(new Date(data.controlDate).toLocaleDateString('el-GR'), MARGIN + 140, currentY + 9, 9, 'left', true);
  }

  // EO-11
  if (data.attachmentType.some(t => t.toUpperCase().includes('ΕΟ-11'))) {
      drawFruitInspectionForm(doc, data, currentFont);
  }

  const fn = `${transliterateGreek(data.supplier || 'NCR')}_${dateStrReport.replace(/\//g,'-')}.pdf`;
  try {
    if (mode === 'preview') {
        const blob = doc.output('blob'); window.open(URL.createObjectURL(blob), '_blank');
    } else {
        doc.save(fn);
    }
  } catch (err) { alert("Σφάλμα PDF."); }
};
