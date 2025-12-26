
import { jsPDF } from 'jspdf';
import { ReportData, AppLists } from '../types';
import { LOGO_PATH } from '../constants';

// --- CONFIG ---
const FONT_NAME = 'Roboto';
const FONT_FILENAME = 'Roboto-Regular.ttf';

const COLOR_BLACK = 0;
const COLOR_BLUE = [0, 51, 153] as [number, number, number]; 

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN);

/**
 * Φορτώνει τη γραμματοσειρά Roboto από τον ριζικό κατάλογο και την ενσωματώνει στο PDF.
 * Διασφαλίζει ότι οι ελληνικοί χαρακτήρες θα εμφανίζονται σωστά.
 */
const loadFont = async (doc: jsPDF): Promise<void> => {
  try {
    const response = await fetch(`/${FONT_FILENAME}`);
    if (!response.ok) throw new Error("Font file not found");
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64data = btoa(binary);

    // Προσθήκη της γραμματοσειράς στο Virtual File System του jsPDF
    doc.addFileToVFS(FONT_FILENAME, base64data);
    
    // Αντιστοίχιση του αρχείου σε όλα τα στυλ για να μην χάνεται το encoding στα Bold
    doc.addFont(FONT_FILENAME, FONT_NAME, 'normal');
    doc.addFont(FONT_FILENAME, FONT_NAME, 'bold');
    doc.addFont(FONT_FILENAME, FONT_NAME, 'italic');
    
    doc.setFont(FONT_NAME, 'normal');
  } catch (error) {
    console.error("Font loading error:", error);
    alert("Πρόβλημα με τη φόρτωση της γραμματοσειράς. Τα Ελληνικά μπορεί να μην εμφανίζονται σωστά στο PDF.");
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

    const drawRow = (label: string, value: string, currentY: number, height = rowH) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.rect(MARGIN, currentY, labelW, height);
        doc.rect(MARGIN + labelW, currentY, valueW, height);
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
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
  
  // Φόρτωση γραμματοσειράς Unicode για υποστήριξη Ελληνικών
  await loadFont(doc);
  const currentFont = FONT_NAME;

  const dateStrReport = data.reportDate ? new Date(data.reportDate).toLocaleDateString('el-GR') : '';
  let currentY = 10;

  const drawRect = (x: number, y: number, w: number, h: number, fill = false) => {
    if (fill) doc.setFillColor(230, 230, 230);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h, fill ? 'FD' : 'S');
  };

  const drawText = (text: string | string[], x: number, y: number, fontSize = 9, align: 'left' | 'center' | 'right' = 'left', bold = false) => {
    if (!text || (typeof text === 'string' && text.trim() === '')) return; 
    doc.setFont(currentFont, bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(0);
    doc.text(text, x, y, { align });
  };

  const drawCheckbox = (x: number, y: number, checked: boolean, size = 5) => {
    doc.setDrawColor(0); 
    doc.setLineWidth(0.3); 
    doc.rect(x, y, size, size);
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
    const titleY = y + 22; 
    drawText('ΑΝΑΦΟΡΑ ΜΗ ΣΥΜΜΟΡΦΩΣΗΣ', PAGE_WIDTH / 2, titleY, 11, 'center', true);
    doc.setFont(currentFont, 'normal');
    drawText('NON-CONFORMITY REPORT', PAGE_WIDTH / 2, titleY + 5, 10, 'center');
    return titleY + 10;
  };

  const isClosed = data.controlDate && data.controlDate.trim() !== "";

  // PAGE 1
  currentY = drawHeader(5);
  drawRect(MARGIN, currentY, CONTENT_WIDTH, 10);
  drawText('ΗΜΕΡΟΜΗΝΙΑ / DATE :', MARGIN + 2, currentY + 6, 10, 'left');
  drawText(dateStrReport, MARGIN + 60, currentY + 6, 11, 'left', true); 
  currentY += 10;

  drawRect(MARGIN, currentY, 60, 12); 
  drawRect(MARGIN + 60, currentY, CONTENT_WIDTH - 60, 12);
  drawText('Αφορά σε:', MARGIN + 1, currentY + 4, 9); 
  drawText('Relates to', MARGIN + 1, currentY + 8, 8);
  drawText(data.supplier, MARGIN + 62, currentY + 7, 11, 'left', true); 
  currentY += 12;

  const colWHeader = CONTENT_WIDTH / 4;
  const types = [
    { gr: 'Παραλαμβανόμενο', en: 'Receiving', val: data.type.receivedItem },
    { gr: 'Υπηρεσία', en: 'Service', val: data.type.service },
    { gr: 'Επιστρεφόμενο', en: 'Returned', val: data.type.returnedProduct },
    { gr: 'Παραγόμενο', en: 'Produced', val: data.type.producedProduct }
  ];
  types.forEach((t, i) => { 
    const x = MARGIN + (i * colWHeader); 
    drawRect(x, currentY, colWHeader, 14); 
    drawText(t.gr, x + 1, currentY + 4, 7.5); 
    drawText(t.en, x + 1, currentY + 9, 7); 
    drawCheckbox(x + colWHeader - 7, currentY + 4.5, t.val); 
  });
  currentY += 14;

  drawRect(MARGIN, currentY, CONTENT_WIDTH / 2, 15); 
  drawText('Όχημα / Vehicle', MARGIN + 1, currentY + 4, 8); 
  drawText(data.vehicle, MARGIN + 1, currentY + 11, 10, 'left', true); 
  
  drawRect(MARGIN + CONTENT_WIDTH / 2, currentY, CONTENT_WIDTH / 2, 15); 
  drawText('Προϊόν / Product', MARGIN + CONTENT_WIDTH/2 + 1, currentY + 4, 8); 
  const lotInfo = [data.product, data.batch, data.quantity].filter(Boolean).join(' - ');
  drawText(lotInfo, MARGIN + CONTENT_WIDTH/2 + 1, currentY + 11, 10, 'left', true);
  currentY += 15;

  drawRect(MARGIN, currentY, CONTENT_WIDTH, 8, true); 
  drawText('ΠΕΡΙΓΡΑΦΗ ΜΗ ΣΥΜΜΟΡΦΩΣΗΣ / DESCRIPTION', PAGE_WIDTH/2, currentY + 5.5, 9, 'center', true); 
  currentY += 8;

  drawRect(MARGIN, currentY, CONTENT_WIDTH, 50); 
  if (data.ncrDescription) {
    const wrappedDescription = doc.splitTextToSize(data.ncrDescription, CONTENT_WIDTH - 6);
    doc.text(wrappedDescription, MARGIN + 3, currentY + 6);
  }
  currentY += 50;

  // Φωτογραφίες αν υπάρχουν
  if (data.images && data.images.length > 0) {
      doc.addPage();
      currentY = 20;
      drawText('ΦΩΤΟΓΡΑΦΙΚΗ ΤΕΚΜΗΡΙΩΣΗ / PHOTOS', PAGE_WIDTH / 2, currentY, 12, 'center', true);
      currentY += 10;
      
      let imgX = MARGIN;
      let imgY = currentY;
      const imgSize = (CONTENT_WIDTH - 10) / 2;

      data.images.forEach((imgBase64, index) => {
          try {
              doc.addImage(imgBase64, 'JPEG', imgX, imgY, imgSize, imgSize);
              if ((index + 1) % 2 === 0) {
                  imgX = MARGIN;
                  imgY += imgSize + 5;
                  if (imgY > PAGE_HEIGHT - 60 && index < data.images.length - 1) {
                      doc.addPage();
                      imgY = 20;
                  }
              } else {
                  imgX += imgSize + 10;
              }
          } catch (e) { console.warn("Image skip"); }
      });
  }

  // Έλεγχος / Κλείσιμο
  if (isClosed) {
      doc.addPage();
      currentY = drawHeader(5);
      drawRect(MARGIN, currentY, CONTENT_WIDTH, 8, true); 
      drawText('ΕΛΕΓΧΟΣ ΔΙΟΡΘΩΣΗΣ / QUALITY CONTROL CHECKING', PAGE_WIDTH/2, currentY + 5.5, 9, 'center', true); 
      currentY += 8;
      
      drawRect(MARGIN, currentY, CONTENT_WIDTH, 60); 
      if (data.controlDescription) { 
        const wrappedControlDesc = doc.splitTextToSize(data.controlDescription, CONTENT_WIDTH - 6); 
        doc.text(wrappedControlDesc, MARGIN + 3, currentY + 6); 
      }
      currentY += 60;
      
      drawRect(MARGIN, currentY, CONTENT_WIDTH, 15);
      drawText('Υπεύθυνος Ελέγχου:', MARGIN + 2, currentY + 5, 8); 
      if (data.qcResponsible) drawText(data.qcResponsible, MARGIN + 2, currentY + 11, 10, 'left', true);
      
      drawText('Ημερομηνία Ελέγχου:', MARGIN + 120, currentY + 5, 8); 
      if (data.controlDate) drawText(new Date(data.controlDate).toLocaleDateString('el-GR'), MARGIN + 120, currentY + 11, 10, 'left', true);
  }

  // EO-11
  if (data.attachmentType.some(t => t.toUpperCase().includes('ΕΟ-11'))) {
      drawFruitInspectionForm(doc, data, currentFont);
  }

  const filename = `${transliterateGreek(data.supplier || 'NCR')}_${dateStrReport.replace(/\//g,'-')}.pdf`;
  
  if (mode === 'preview') {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } else {
    doc.save(filename);
  }
};
