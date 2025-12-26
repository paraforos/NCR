
// Data types for the Application

export interface AppLists {
  suppliers: string[];
  vehicles: string[];
  products: string[];
  batches: string[];
  managers: string[]; // Unified list for all responsible persons
  attachmentTypes: string[];
  ncrReasons: string[]; // Common reasons for description
  rootCauses: string[]; // For analysis
  signatureImage?: string; // Base64 signature for the reporter
  fruitInspectionEnabled?: boolean; // Flag to enable the EO-11 form
}

export interface ReportData {
  id?: number; // Unique identifier for DB
  // Header
  reportDate: string;
  supplier: string;
  type: {
    receivedItem: boolean;
    service: boolean;
    returnedProduct: boolean;
    producedProduct: boolean;
  };
  vehicle: string;
  product: string;
  batch: string;
  quantity: string; // "96 BINS", etc.

  // NCR Details
  ncrCategory: {
    quality: boolean;
    packaging: boolean;
    transport: boolean;
    storage: boolean;
    production: boolean;
    equipment: boolean;
    foodSafety: boolean;
    environment: boolean;
    healthSafety: boolean;
    other: boolean;
  };
  ncrDescription: string;
  attachmentType: string[]; // Array of strings for multiple attachments
  reporter: string;

  // EO-11 Specific Fields (Dynamic)
  unsuitableFruitPercentage: string;
  containersQuality: 'acceptable' | 'non-acceptable';

  // Correction
  correctionAction: {
    return: boolean;
    destroy: boolean;
    rework: boolean;
    rejectService: boolean;
    sorting: boolean;
    useWithInstruction: boolean;
    recall: boolean;
    repeatWork: boolean;
    notifyCustomer: boolean;
    notifySupplier: boolean;
  };
  correctionResponsible: string;
  correctionDeadline: string;
  qcResponsible: string;
  controlDescription: string;
  controlAttachmentType: string;
  controlResponsible: string;
  controlDate: string;

  // Analysis
  analysisRootCause: string;
  satisfactory: {
    yes: boolean;
    no: boolean;
  };
  capaRequired: {
    yes: boolean;
    no: boolean;
  };
  remarks: string;
  finalQcResponsible: string;

  // Images
  images: string[]; // Base64 strings
}

export const initialReportData: ReportData = {
  reportDate: new Date().toISOString().split('T')[0],
  supplier: '',
  type: {
    receivedItem: true,
    service: false,
    returnedProduct: false,
    producedProduct: false,
  },
  vehicle: '',
  product: '',
  batch: '',
  quantity: '',
  ncrCategory: {
    quality: true,
    packaging: false,
    transport: false,
    storage: false,
    production: false,
    equipment: false,
    foodSafety: false,
    environment: false,
    healthSafety: false,
    other: false,
  },
  ncrDescription: '',
  attachmentType: ['Φωτογραφίες', 'Αντίγραφο ΕΟ-11'], 
  reporter: '',
  unsuitableFruitPercentage: '5%',
  containersQuality: 'acceptable',
  correctionAction: {
    return: false,
    destroy: false,
    rework: false,
    rejectService: false,
    sorting: false,
    useWithInstruction: false,
    recall: false,
    repeatWork: false,
    notifyCustomer: false,
    notifySupplier: true,
  },
  correctionResponsible: '',
  correctionDeadline: new Date().toISOString().split('T')[0],
  qcResponsible: '',
  controlDescription: 'Πραγματοποιήθηκε οπτικός και μακροσκοπικός έλεγχος κατά την εκφόρτωση και τεκμηριώθηκαν τα συγκεκριμένα προβλήματα που αναφέρθηκαν. Η παρτίδα δεν παρελήφθη και επεστράφη στον προμηθευτή σύμφωνα με απόφαση του Γεωπόνου - υπευθύνου Ποιοτικού ελέγχου φρέσκων φρούτων.  Επίσης επιβεβαιώθηκε ότι δεν εισήλθε μη συμμορφούμενο προϊόν στην παραγωγική διαδικασία. Το είδος της μη συμμόρφωσης σχετίζεται με βασικές πρακτικές του προμηθευτή και ενδέχεται να επαναληφθεί. Έτσι κρίθηκε απαραίτητη η ενημέρωση του για δέσμευσή συμμόρφωσης του στις απαιτήσεις υγιεινής και ποιότητας.',
  controlAttachmentType: '',
  controlResponsible: '',
  controlDate: '',
  analysisRootCause: '',
  satisfactory: { yes: false, no: false },
  capaRequired: { yes: false, no: false },
  remarks: 'Η περίπτωση θα ληφθεί υπόψη στην επόμενη αξιολόγηση προμηθευτή αλλα και η επανεμφάνιση παρόμοιας μη συμμόρφωσης θα οδηγήσει σε πρόταση  αυστηρότερης διαχείρισης συνεργασίας.',
  finalQcResponsible: '',
  images: [],
};

export const defaultLists: AppLists = {
  suppliers: ['AGROFARM LTD', 'FRUIT UNION', 'LOCAL FARMERS COOP'],
  vehicles: ['ΦΟΡΟΖΙΔΗΣ ΒΑΛΑΝΤΗΣ ΕΚΑ9536', 'ΠΑΠΑΔΟΠΟΥΛΟΣ ΓΙΩΡΓΟΣ NIK1234'],
  products: ['Ροδάκινα', 'Μήλα', 'Αχλάδια', 'Ρόδια', 'Βερίκοκα'],
  batches: ['LOT-2025-001', 'LOT-2025-002', 'LOT-A-100'],
  managers: ['ΠΑΡΑΦΟΡΟΣ ΜΙΧΑΛΗΣ', 'ΓΕΩΡΓΙΟΥ ΑΝΝΑ', 'ΔΗΜΗΤΡΙΟΥ ΝΙΚΟΣ'],
  attachmentTypes: ['Φωτογραφίες', 'Βίντεο', 'Πιστοποιητικά', 'Email', 'Δελτίο Αποστολής', 'Αντίγραφο ΕΟ-11'],
  ncrReasons: ['Σάπιοι καρποί > 5%', 'Μη αποδεκτό μέγεθος', 'Ξένα σώματα', 'Κατεστραμμένη συσκευασία'],
  rootCauses: ['Ακραία καιρικά φαινόμενα', 'Λάθος στη συγκομιδή', 'Πρόβλημα ψύξης κατά τη μεταφορά'],
  fruitInspectionEnabled: true
};
