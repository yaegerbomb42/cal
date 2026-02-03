import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './NavigationDropdown.css';

const NavigationDropdown = ({
    label,
    value,
    options = [], // [{ label, value }]
    range, // { start, end } if basic number range
    onChange,
    type = 'grid' // 'grid' | 'list' | 'pyramid'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Generate options if range is provided
    const items = options.length > 0 ? options :
        range ? Array.from({ length: range.end - range.start + 1 }, (_, i) => {
            const val = range.start + i;
            return { label: val.toString(), value: val };
        }) : [];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    // Logic for "Pyramid" or dense grid layout
    // For weeks (52) or Days (365), we want a calculated grid

    return (
        <div className="nav-dropdown-container" ref={containerRef}>
            <button className="nav-dropdown-trigger glass-btn" onClick={() => setIsOpen(!isOpen)}>
                <span className="nav-label">{label}</span>
                <span className="nav-value">{value}</span>
                <ChevronDown size={14} className={`nav-arrow ${isOpen ? 'open' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`nav-dropdown-menu ${type}`}
                    >
                        {items.length > 50 ? (
                            // Dense Grid for large numbers (Days 1-365)
                            <div className="dense-grid-scroll">
                                <div className="dense-grid-content">
                                    {items.map((item) => (
                                        <button
                                            key={item.value}
                                            className={`grid-item-tiny ${item.value === value ? 'active' : ''}`}
                                            onClick={() => handleSelect(item.value)}
                                            title={item.label}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : items.length > 15 ? (
                            // Medium Grid (Weeks 1-52) - "Pyramid" feel by centering?
                            <div className="medium-grid">
                                {items.map((item) => (
                                    <button
                                        key={item.value}
                                        className={`grid-item ${item.value === value ? 'active' : ''}`}
                                        onClick={() => handleSelect(item.value)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            // Simple List (Years, Months)
                            <div className="simple-list">
                                {items.map((item) => (
                                    <button
                                        key={item.value}
                                        className={`list-item ${item.value === value ? 'active' : ''}`}
                                        onClick={() => handleSelect(item.value)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NavigationDropdown;
