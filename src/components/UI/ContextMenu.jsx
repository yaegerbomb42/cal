import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Trash2, Edit2, Copy, Palette, CheckCircle, X } from 'lucide-react';
import './ContextMenu.css';

const ContextMenu = ({ x, y, options, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Adjust position if close to edge (simple collision)
    const menuStyle = {
        top: y,
        left: x,
    };

    if (x + 200 > window.innerWidth) menuStyle.left = x - 200;
    if (y + 300 > window.innerHeight) menuStyle.top = y - 300;

    return createPortal(
        <AnimatePresence>
            <motion.div
                ref={menuRef}
                className="context-menu glass-panel"
                style={menuStyle}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
            >
                {options.map((option, index) => (
                    <button
                        key={index}
                        className={`menu-item ${option.danger ? 'danger' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            option.action();
                            onClose();
                        }}
                    >
                        <span className="menu-icon">{option.icon}</span>
                        {option.label}
                    </button>
                ))}
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default ContextMenu;
