// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - App Context
// ============================================================

import React, { createContext, useState, useContext, useEffect } from 'react';

// Create App Context
const AppContext = createContext();

// App Provider Component
export const AppProvider = ({ children }) => {
    // Shop Settings
    const [shopSettings, setShopSettings] = useState({
        shopName: 'OSWAGO Electrical Equipment',
        location: 'Darajani, Kigamboni, Dar es Salaam',
        phone: '0750825721',
        email: 'faustinebiliant@gmail.com',
        currency: 'TZS',
        taxRate: 0
    });

    // Theme state
    const [darkMode, setDarkMode] = useState(() => {
        // Get saved preference from localStorage
        const saved = localStorage.getItem('darkMode');
        return saved === 'true';
    });

    // Apply dark mode class to body
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        // Save preference
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    // Update shop settings
    const updateSettings = (newSettings) => {
        setShopSettings(prev => ({ ...prev, ...newSettings }));
    };

    // Toggle dark mode
    const toggleDarkMode = () => {
        setDarkMode(prev => !prev);
    };

    // Context value
    const value = {
        shopSettings,
        updateSettings,
        darkMode,
        toggleDarkMode
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// Custom hook to use app context
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export default AppContext;