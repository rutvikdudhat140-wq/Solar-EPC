// Solar OS – EPC Edition
// CONFIG LAYER: All app-level constants driven from env — NO hardcoding

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

export const APP_CONFIG = {
    name: process.env.REACT_APP_APP_NAME || 'Solar OS',
    edition: process.env.REACT_APP_APP_EDITION || 'EPC Edition',
    company: process.env.REACT_APP_COMPANY || 'SolarCorp India Pvt. Ltd.',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    defaultPageSize: parseInt(process.env.REACT_APP_DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.REACT_APP_MAX_PAGE_SIZE || '100', 10),
    enableMock: process.env.REACT_APP_ENABLE_MOCK === 'true',
};

export const CURRENCY = {
    symbol: '₹',
    locale: 'en-IN',
    format: (n) => {
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
        return `₹${n?.toLocaleString('en-IN') ?? 0}`;
    },
    formatFull: (n) => {
        if (!n || n === 0) return '₹0';
        // Indian numbering: Crores (1,00,00,000), Lakhs (1,00,000)
        if (n >= 10000000) { // 1 Crore or more
            return `₹${(n / 10000000).toFixed(2)} Crores`;
        }
        if (n >= 100000) { // 1 Lakh or more
            return `₹${(n / 100000).toFixed(2)} Lakhs`;
        }
        if (n >= 1000) { // 1 Thousand or more
            return `₹${parseFloat((n / 1000).toFixed(1))}K`;
        }
        return `₹${n.toLocaleString('en-IN')}`;
    },
    // Exact format - shows actual number without conversion
    formatExact: (n) => {
        if (!n || n === 0) return '₹0';
        return `₹${parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
};

export const DATE_FORMAT = {
    display: 'DD MMM YYYY',
    api: 'YYYY-MM-DD',
    time: 'HH:mm',
};
