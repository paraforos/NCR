
import { jsPDF } from 'jspdf';
import { ReportData, AppLists } from '../types';
import { LOGO_PATH } from '../constants';

// --- CONFIG ---
const FONT_NAME = 'Roboto';
const FONT_URL = '/Roboto-Regular.ttf';

const FILL_COLOR_HEADER = [230, 230, 230] as [number, number, number];
const COLOR_BLACK = 0;
const COLOR_BLUE = [0, 51, 153] as [number, number, number]; // Professional Deep Blue

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
            doc.addFont('Roboto.ttf', FONT_NAME, 'italic');
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

    const formatQuantity = (q: string, b: string) => {
        const trimmedQ = (q || '').trim();
        const trimmedB = (b || '').toUpperCase();
        if (!trimmedQ) return '';
        
        if (/^\d+$/.test(trimmedQ)) {
            if (trimmedB.includes('ΠΑΛΕΤΕΣ') || trimmedB.includes('ΠΑΛΛΕΤΕΣ') || trimmedB.includes('PALLET')) {
                return `${trimmedQ} ΠΑΛΕΤΕΣ`;
            }
            return `${trimmedQ} BINS`;
        }
        return trimmedQ;
    };

    y = drawRow('ΕΙΣΕΡΧΟΜΕΝΟ ΦΡΟΥΤΟ', data.product, y);
    y = drawRow('ΠΡΟΜΗΘΕΥΤΗΣ', data.supplier, y);
    y = drawRow('ΑΡ. ΑΥΤΟΚΙΝΗΤΟΥ', data.vehicle, y);
    y = drawRow('ΑΡ. ΠΑΛΕΤΟΚΙΒΩΤΙΩΝ', formatQuantity(data.quantity, data.batch), y);
    
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
    
    // Checkbox Style for NCR trigger (Large Blue Bold X in NON-ACCEPTABLE)
    doc.setFontSize(26); // Large
    doc.setTextColor(COLOR_BLUE[0], COLOR_BLUE[1], COLOR_BLUE[2]); // Blue
    doc.setFont(fontName, 'bold'); // Bold
    doc.text('X', MARGIN + labelW + subW + (subW/2) - 3, y + 15);
    doc.setTextColor(0); // Reset
    y += rowH * 2;

    y = drawRow('ΠΟΣΟΣΤΟ ΑΚΑΤΑΛΛΗΛΩΝ ΦΡΟΥΤΩΝ', data.unsuitableFruitPercentage || '5%', y);

    const containerH = 20;
    doc.rect(MARGIN, y, labelW, containerH);
    doc.setFontSize(9);
    doc.text('ΚΑΤΑΣΤΑΣΗ ΠΟΙΟΤΗΤΑΣ/', MARGIN + 2, y + 6);
    doc.text('ΚΑΘΑΡΙΟΤΗΤΑΣ ΠΕΡΙΕΚΤΩΝ', MARGIN + 2, y + 11);
    doc.text('ΦΡΟΥΤΩΝ (κατά την παραλαβή)', MARGIN + 2, y + 16);
    doc.rect(MARGIN + labelW, y, valueW, containerH);
    doc.line(MARGIN + labelW, y + 10, MARGIN + labelW + valueW, y + 10);
    doc.line(MARGIN + labelW + (valueW * 0.45), y, MARGIN + labelW + (valueW * 0.45), y + 10);
    doc.setFontSize(10);
    
    doc.text('ΑΠΟΔΕΚΤΗ', MARGIN + labelW + 2, y + 7);
    doc.rect(MARGIN + labelW + (valueW * 0.45) - 7, y + 3, 4, 4);
    
    doc.text('ΜΗ ΑΠΟΔΕΚΤΗ', MARGIN + labelW + (valueW * 0.45) + 2, y + 7);
    doc.rect(MARGIN + labelW + valueW - 7, y + 3, 4, 4);
    
    // Container Quality Checkbox (Large Blue Bold X)
    doc.setFontSize(22);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(COLOR_BLUE[0], COLOR_BLUE[1], COLOR_BLUE[2]);
    if (data.containersQuality === 'acceptable') {
        doc.text('X', MARGIN + labelW + (valueW * 0.45) - 6.5, y + 6.5);
    } else {
        doc.text('X', MARGIN + labelW + valueW - 6.5, y + 6.5);
    }
    doc.setTextColor(0); // Reset
    
    doc.setFontSize(10);
    doc.setFont(fontName, 'normal');
    doc.text('ΣΧΟΛΙΑ: .................................................................................', MARGIN + labelW + 2, y + 16);
    y += containerH;

    y = drawRow('ΑΡΙΘΜΟΣ ΘΕΣΗΣ ΕΝΑΠΟΘΕΣΗΣ', '', y);
    y = drawRow('ΩΡΑ ΕΝΑΡΞΗΣ ΤΡΟΦΟΔΟΣΙΑΣ ΓΡΑΜΜΗΣ ΠΑΡΑΓΩΓΗΣ', '', y, rowH, 7.5);
    y = drawRow('ΩΡΑ ΛΗΞΗΣ ΤΡΟΦΟΔΟΣΙΑΣ ΓΡΑΜΜΗΣ ΠΑΡΑΔΟΣΗΣ', '', y, rowH, 7.5);
    y = drawRow('*ΑΠΟΔΟΣΗ: ΧΥΜΟΣ BRIX', '', y);

    doc.rect(MARGIN, y, CONTENT_WIDTH, 45);
    doc.setFont(fontName, 'bold');
    doc.text('ΠΑΡΑΤΗΡΗΣΕΙΣ', MARGIN + 2, y + 6);
    doc.setFont(fontName, 'normal');
    if (data.ncrDescription) {
        doc.setFontSize(10);
        doc.text(doc.splitTextToSize(data.ncrDescription, CONTENT_WIDTH - 6), MARGIN + 3, y + 14);
    }
    y += 45;

    y += 8;
    doc.setFontSize(7);
    doc.text('1. Το παρόν έντυπο μετά την πλήρη συμπλήρωσή του παραδίδεται από τον υπεύθυνο', MARGIN, y);
    y += 4;
    doc.text('τροφοδοσίας γραμμής παραγωγής στον Τμηματάρχη Ποιότητας', MARGIN + 3, y);
    y += 6;
    doc.text('2. Η παρτίδα γίνεται αποδεκτή μόνο όταν πληρούνται οι απαιτήσεις της L 164 / 25', MARGIN, y);
    y += 6;
    doc.text('* Αφορά Εσπεριδοειδή', MARGIN, y);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(9);
    doc.text('ΕΟ-11: ε1/2', PAGE_WIDTH - MARGIN - 20, PAGE_HEIGHT - 10);
};

export const generatePDF = async (data: ReportData, lists: AppLists, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  await loadFont(doc);
  const currentFont = doc.getFont().fontName === 'helvetica' ? 'helvetica' : FONT_NAME;
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
        doc.setFontSize(size * 3.2); // VERY LARGE X
        doc.setTextColor(COLOR_BLUE[0], COLOR_BLUE[1], COLOR_BLUE[2]); // BLUE
        doc.text('X', x + (size * 0.05), y + (size * 0.85)); // Position adjustment
        doc.setTextColor(0); // Reset
    }
  };

  const drawHeader = (y: number) => {
    try { const img = new Image(); img.src = LOGO_PATH; doc.addImage(img, 'PNG', (PAGE_WIDTH - 30) / 2, y, 30, 15); } catch (e) { }
    const titleY = y + 22; doc.setFontSize(11); doc.setFont(currentFont, 'bold'); doc.text('ΑΝΑΦΟΡΑ ΜΗ ΣΥΜΜΟΡΦΩΣΗΣ', PAGE_WIDTH / 2, titleY, { align: 'center' });
    doc.setFont(currentFont, 'italic'); doc.text('NON-CONFORMITY REPORT', PAGE_WIDTH / 2, titleY + 5, { align: 'center' });
    return titleY + 10;
  };

  // Logic for report status
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

  drawRect(MARGIN, currentY, CONTENT_WIDTH / 2, 15); drawText('Αριθμός κυκλολορίας οχήματος / Ονοματεπώνυμο', MARGIN + 1, currentY + 4, 8); drawText('Vehicle plate number / Driver Name', MARGIN + 1, currentY + 8, 7); drawText(data.vehicle, MARGIN + 1, currentY + 13, 10, 'left', true); 
  drawRect(MARGIN + CONTENT_WIDTH / 2, currentY, CONTENT_WIDTH / 2, 15); drawText('Παρτίδα προϊόντος (αν σχετίζεται)', MARGIN + CONTENT_WIDTH/2 + 1, currentY + 4, 8); drawText('Lot number (where applicable)', MARGIN + CONTENT_WIDTH/2 + 1, currentY + 8, 7);
  const lotInfo = [data.product, data.batch, data.quantity].filter(Boolean).join(' - ');
  drawText(lotInfo, MARGIN + CONTENT_WIDTH/2 + 1, currentY + 13, 10, 'left', true);
  currentY += 15;

  const hSectionHeader = 8; 
  drawRect(MARGIN, currentY, CONTENT_WIDTH, hSectionHeader, true); drawText('Η μη συμμόρφωση αναφέρεται σε: / No conformity referring to', PAGE_WIDTH/2, currentY + 5, 9, 'center', true); currentY += hSectionHeader;
  const hGrid = 32; drawRect(MARGIN, currentY, CONTENT_WIDTH, hGrid); doc.line(MARGIN + 63, currentY, MARGIN + 63, currentY + hGrid); doc.line(MARGIN + 126, currentY, MARGIN + 126, currentY + hGrid); for(let i=1; i<=3; i++) doc.line(MARGIN, currentY + (i*8), MARGIN + CONTENT_WIDTH, currentY + (i*8));

  const drawNCR = (c: number, r: number, gr: string, en: string, val: boolean) => { let x = MARGIN + (c === 2 ? 63 : c === 3 ? 126 : 0); const y = currentY + ((r-1) * 8); drawCheckbox(x + 2, y + 1.5, val); drawText(gr, x + 9, y + 3.5, 8); drawText(en, x + 9, y + 6.5, 7); };
  drawNCR(1, 1, 'Ποιότητα/προδιαγραφές', 'Quality', data.ncrCategory.quality); drawNCR(1, 2, 'Αποθήκευση', 'Storage', data.ncrCategory.storage); drawNCR(1, 3, 'ΑΣφάλεια τροφίμου', 'Food Safety', data.ncrCategory.foodSafety); drawNCR(1, 4, 'Άλλο', 'Other', data.ncrCategory.other);
  drawNCR(2, 1, 'Συσκευασία είδους', 'Packaging', data.ncrCategory.packaging); drawNCR(2, 2, 'Παραγωγική διαδικασία', 'Production', data.ncrCategory.production); drawNCR(2, 3, 'Περιβάλλον', 'Environment', data.ncrCategory.environment);
  drawNCR(3, 1, 'Μεταφορά', 'Transport', data.ncrCategory.transport); drawNCR(3, 2, 'Εξοπλισμός', 'Equipment', data.ncrCategory.equipment); drawNCR(3, 3, 'Υγεία & ασφάλεια', 'Health & safety', data.ncrCategory.healthSafety);
  currentY += hGrid;

  drawRect(MARGIN, currentY, CONTENT_WIDTH, hSectionHeader, true); drawText('ΠΕΡΙΓΡΑΦΗ ΜΗ ΣΥΜΜΟΡΦΩΣΗΣ / DESCRIPTION OF NON CONFORMITY', PAGE_WIDTH/2, currentY + 5, 9, 'center', true); currentY += hSectionHeader;
  drawRect(MARGIN, currentY, CONTENT_WIDTH, 35); 
  doc.setFontSize(10); doc.setFont(currentFont, 'bold');
  const wrappedDescription = doc.splitTextToSize(data.ncrDescription || '', CONTENT_WIDTH - 6);
  doc.text(wrappedDescription, MARGIN + 3, currentY + 5);
  currentY += 35;

  const hAttach = 16; 
  drawRect(MARGIN, currentY, CONTENT_WIDTH * 0.4, hAttach); 
  drawText('Συνημμένα / Attachments:', MARGIN + 1, currentY + 4, 8); 
  // Text wrapping for attachments list
  doc.setFont(currentFont, 'bold');
  doc.setFontSize(9);
  const attachmentsText = (data.attachmentType || []).join(', ');
  const wrappedAttachments = doc.splitTextToSize(attachmentsText, (CONTENT_WIDTH * 0.4) - 4);
  doc.text(wrappedAttachments, MARGIN + 1, currentY + 8);

  drawRect(MARGIN + CONTENT_WIDTH * 0.4, currentY, CONTENT_WIDTH * 0.4, hAttach); 
  drawText('Αναφορά από / Submitted by:', MARGIN + CONTENT_WIDTH * 0.4 + 1, currentY + 4, 8); 
  if (data.reporter) drawText(data.reporter, MARGIN + CONTENT_WIDTH * 0.4 + 1, currentY + 9, 10, 'left', true);
  
  if (lists.signatureImage) {
    try { 
      const shiftLeft = 5.3; 
      doc.addImage(lists.signatureImage, 'PNG', MARGIN + CONTENT_WIDTH * 0.8 + 2 - shiftLeft, currentY + 1, (CONTENT_WIDTH * 0.2 - 4) * 1.4, (hAttach - 6) * 1.4); 
    } catch (e) { }
  }
  drawRect(MARGIN + CONTENT_WIDTH * 0.8, currentY, CONTENT_WIDTH * 0.2, hAttach); 
  drawText('Υπογραφή / Signature', MARGIN + CONTENT_WIDTH * 0.8 + 1, currentY + hAttach - 4, 7); 
  currentY += hAttach;

  drawRect(MARGIN, currentY, CONTENT_WIDTH, hSectionHeader, true); drawText('ΔΙΟΡΘΩΣΗ / CORRECTION', PAGE_WIDTH/2, currentY + 5.5, 9, 'center', true); currentY += hSectionHeader;
  
  const correctionBoxHeight = 45;
  drawRect(MARGIN, currentY, CONTENT_WIDTH, correctionBoxHeight); 
  const col1Width = 52.5; const col2Width = 52.5; const col3Width = CONTENT_WIDTH - (col1Width + col2Width);
  doc.line(MARGIN + col1Width, currentY, MARGIN + col1Width, currentY + correctionBoxHeight);
  doc.line(MARGIN + col1Width + col2Width, currentY, MARGIN + col1Width + col2Width, currentY + correctionBoxHeight);
  const actionRowHeight = correctionBoxHeight / 5;
  for (let i = 1; i < 5; i++) doc.line(MARGIN, currentY + (i * actionRowHeight), MARGIN + col1Width + col2Width, currentY + (i * actionRowHeight));

  const drawCorr = (col: number, row: number, gr: string, en: string, val: boolean) => { 
    const x = MARGIN + (col === 2 ? col1Width : 0); const y = currentY + ((row-1) * actionRowHeight);
    drawText(gr, x + 2, y + 3.8, 8.5, 'left', true); drawText(en, x + 2, y + 7.2, 7.5); drawCheckbox(x + col1Width - 8, y + 2, val, 4.5); 
  };
  drawCorr(1,1,'Επιστροφή ειδών','Return of goods',data.correctionAction.return); 
  drawCorr(1,2,'Επανακατεργασία','Rework',data.correctionAction.rework); 
  drawCorr(1,3,'Διαλογή υλικών','Selection of goods',data.correctionAction.sorting); 
  drawCorr(1,4,'Ανάκληση','Recall',data.correctionAction.recall); 
  drawCorr(1,5,'Ενημέρωση πελάτη','Client notification',data.correctionAction.notifyCustomer);
  drawCorr(2,1,'Καταστροφή ειδών','Destruction of goods',data.correctionAction.destroy); 
  drawCorr(2,2,'Όχι παραλαβή υπηρεσίας','No acceptance of service',data.correctionAction.rejectService); 
  drawCorr(2,3,'Χρήση με οδηγίες','Use under guidance',data.correctionAction.useWithInstruction); 
  drawCorr(2,4,'Επανάληψη εργασίας','Repetition of work',data.correctionAction.repeatWork); 
  drawCorr(2,5,'Ενημέρωση προμηθευτή','Supplier notification',data.correctionAction.notifySupplier);

  const s3X = MARGIN + col1Width + col2Width; const s3H1 = 26;
  doc.line(s3X, currentY + s3H1, s3X + col3Width, currentY + s3H1); doc.line(s3X + 55, currentY, s3X + 55, currentY + s3H1);
  drawText('Υπεύθυνος Διόρθωσης:', s3X + 2, currentY + 5, 8); if (data.correctionResponsible) drawText(data.correctionResponsible, s3X + 2, currentY + 12, 11, 'left', true);
  drawText('Προθεσμία:', s3X + 57, currentY + 5, 8); if (data.correctionDeadline) drawText(new Date(data.correctionDeadline).toLocaleDateString('el-GR'), s3X + 57, currentY + 12, 10, 'left', true);
  drawText('Υπεύθυνος Ποιότητας:', s3X + 2, currentY + 31, 8); if (data.finalQcResponsible) drawText(data.finalQcResponsible, s3X + 2, currentY + 38, 10, 'left', true);
  drawText('Υπογραφή', s3X + col3Width - 2, currentY + 41, 8, 'right');
  currentY += correctionBoxHeight;
  drawText('(EA-28:E1)', PAGE_WIDTH - 25, PAGE_HEIGHT - 5, 8);

  // PAGE 2
  doc.addPage();
  currentY = drawHeader(5);
  drawRect(MARGIN, currentY, CONTENT_WIDTH, hSectionHeader, true); drawText('ΕΛΕΓΧΟΣ ΕΝΕΡΓΕΙΑΣ ΔΙΟΡΘΩΣΗΣ / CHECKING OF CORRECTION', PAGE_WIDTH/2, currentY + 5, 9, 'center', true); currentY += hSectionHeader;
  drawRect(MARGIN, currentY, CONTENT_WIDTH, 40); 
  // If not closed, description is empty
  if (isClosed && data.controlDescription) { doc.setFontSize(10); doc.setFont(currentFont, 'bold'); const wrappedControlDesc = doc.splitTextToSize(data.controlDescription, CONTENT_WIDTH - 6); doc.text(wrappedControlDesc, MARGIN + 3, currentY + 5); }
  currentY += 40;
  drawRect(MARGIN, currentY, CONTENT_WIDTH, 12); doc.line(MARGIN + 80, currentY, MARGIN + 80, currentY + 12); doc.line(MARGIN + 140, currentY, MARGIN + 140, currentY + 12);
  drawText('Υπεύθυνος ελέγχου / QC Resp:', MARGIN + 2, currentY + 4, 7); if (isClosed && data.qcResponsible) drawText(data.qcResponsible, MARGIN + 2, currentY + 9, 9, 'left', true);
  drawText('Ημερομηνία / Date:', MARGIN + 142, currentY + 4, 7); if (isClosed && data.controlDate) drawText(new Date(data.controlDate).toLocaleDateString('el-GR'), MARGIN + 142, currentY + 9, 9, 'left', true);
  currentY += 17;
  drawRect(MARGIN, currentY, CONTENT_WIDTH, hSectionHeader, true); drawText('ΑΞΙΟΛΟΓΗΣΗ / EVALUATION', PAGE_WIDTH/2, currentY + 5, 9, 'center', true); currentY += hSectionHeader;
  drawRect(MARGIN, currentY, CONTENT_WIDTH, 20); drawText('Πιθανές Αιτίες / Possible Root Causes:', MARGIN + 2, currentY + 5, 9, 'left', true); 
  // If not closed, root cause is empty
  if (isClosed && data.analysisRootCause) { doc.setFontSize(10); doc.setFont(currentFont, 'bold'); const wrappedRootCauses = doc.splitTextToSize(data.analysisRootCause, CONTENT_WIDTH - 6); doc.text(wrappedRootCauses, MARGIN + 3, currentY + 12); }
  currentY += 20;
  const evaluationBoxHeight = 32; drawRect(MARGIN, currentY, CONTENT_WIDTH, evaluationBoxHeight);
  drawText('Ικανοποιητική διαχείριση; / Effective handling?', MARGIN + 2, currentY + 6, 9);
  // Checkboxes for evaluation should only be checked if closed
  drawText('ΝΑΙ / YES', MARGIN + 120, currentY + 6, 8); drawCheckbox(MARGIN + 137, currentY + 2, isClosed ? data.satisfactory.yes : false, 4);
  drawText('ΟΧΙ / NO', MARGIN + 150, currentY + 6, 8); drawCheckbox(MARGIN + 165, currentY + 2, isClosed ? data.satisfactory.no : false, 4);
  drawText('A Corrective or Preventive Action is Required?', MARGIN + 2, currentY + 14, 9);
  drawText('ΝΑΙ / YES', MARGIN + 120, currentY + 14, 8); drawCheckbox(MARGIN + 137, currentY + 10, isClosed ? data.capaRequired.yes : false, 4);
  drawText('ΟΧΙ / NO', MARGIN + 150, currentY + 14, 8); drawCheckbox(MARGIN + 165, currentY + 10, isClosed ? data.capaRequired.no : false, 4);
  drawText('Αν ΝΑΙ, Α/Α «Αίτησης Διορθωτικής – Προληπτικής Ενέργειας»', MARGIN + 2, currentY + 24, 7.5);
  currentY += evaluationBoxHeight;

  const remarksBoxHeight = 20; drawRect(MARGIN, currentY, CONTENT_WIDTH, remarksBoxHeight);
  drawText('Παρατηρήσεις: / Comments', MARGIN + 2, currentY + 5, 8); 
  // If not closed, remarks are empty
  if (isClosed && data.remarks) { 
    doc.setFontSize(9); doc.setFont(currentFont, 'bold');
    const wrappedRemarks = doc.splitTextToSize(data.remarks, CONTENT_WIDTH - 6);
    doc.text(wrappedRemarks, MARGIN + 2, currentY + 11);
  }
  currentY += remarksBoxHeight;

  const sigRowH = 22; const col1W = CONTENT_WIDTH * 0.48; const col2W = CONTENT_WIDTH * 0.24;
  drawRect(MARGIN, currentY, CONTENT_WIDTH, sigRowH); doc.line(MARGIN + col1W, currentY, MARGIN + col1W, currentY + sigRowH); doc.line(MARGIN + col1W + col2W, currentY, MARGIN + col1W + col2W, currentY + sigRowH);
  drawText('Υπεύθυνος Τμήματος Ποιότητας:', MARGIN + 2, currentY + 5, 8, 'left', true); drawText('Quality Manager', MARGIN + 2, currentY + 9, 7);
  if (isClosed && data.finalQcResponsible) drawText(data.finalQcResponsible, MARGIN + 2, currentY + 15, 10, 'left', true);
  drawText('Υπογραφή:', MARGIN + col1W + 2, currentY + 5, 8, 'left', true); drawText('Signature', MARGIN + col1W + 2, currentY + 9, 7);
  drawText('Ημερομηνία', MARGIN + col1W + col2W + 2, currentY + 5, 8, 'left', true); drawText('Date', MARGIN + col1W + col2W + 2, currentY + 9, 7);
  currentY += sigRowH;
  drawText('(EA-28:E1)', PAGE_WIDTH - 25, PAGE_HEIGHT - 5, 8);

  // PHOTOS (3x2 GRID)
  const normalizeGreek = (t: string) => t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  const hasPhotosAttachment = data.attachmentType.some(t => {
      const cleanT = normalizeGreek(t);
      return cleanT === 'ΦΩΤΟΓΡΑΦΙΕΣ' || cleanT === 'PHOTOS';
  });

  if (hasPhotosAttachment && data.images && data.images.length > 0) {
      doc.addPage(); drawHeader(5); 
      drawText('ΦΩΤΟΓΡΑΦΙΕΣ / PHOTOS', PAGE_WIDTH/2, 45, 14, 'center', true);

      const gridCols = 2;
      const cellWidth = 92;
      const cellHeight = 72;
      const horizontalGap = 6;
      const verticalGap = 8;
      const startX = MARGIN;
      const startY = 55;

      data.images.slice(0, 6).forEach((img, idx) => {
          const col = idx % gridCols;
          const row = Math.floor(idx / gridCols);
          const x = startX + col * (cellWidth + horizontalGap);
          const y = startY + row * (cellHeight + verticalGap);
          try { doc.addImage(img, 'JPEG', x, y, cellWidth, cellHeight, undefined, 'FAST'); } catch (e) {}
      });
  }

  // EO-11 FORM
  if (lists.fruitInspectionEnabled !== false) {
      const hasInspectionAttachment = data.attachmentType.some(t => {
          const cleanT = normalizeGreek(t);
          return cleanT.includes('ΕΠΙΘΕΩΡΗΣΗΣ') || cleanT.includes('ΕΟ-11') || cleanT.includes('EO-11');
      });
      if (hasInspectionAttachment) drawFruitInspectionForm(doc, data, currentFont);
  }

  const fn = `${transliterateGreek(data.supplier || 'NCR')}_${dateStrReport.replace(/\//g,'-')}.pdf`;
  try {
    if (mode === 'preview') {
        const blob = doc.output('blob'); window.open(URL.createObjectURL(blob), '_blank');
    } else {
        doc.save(fn);
    }
  } catch (err) { alert("Σφάλμα κατά την εξαγωγή του PDF."); }
};
