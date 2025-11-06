"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import RightSection from '../../Common/Components/RightSection';

const CollapsibleRightSidebar = ({ hideSidebar = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const sidebarRef = useRef(null);
  const dragHandleRef = useRef(null);

  const minWidth = 200;
  const maxWidth = 600;

  // Handle mouse down on drag handle
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(sidebarWidth);
  };

  // Handle mouse move during drag
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = startX - e.clientX; // Inverted because we're dragging from the right
    const newWidth = startWidth + deltaX;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
    
    // Auto-close sidebar when width goes below 250px
    if (newWidth < 250) {
      setIsCollapsed(true);
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for drag functionality
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging, startX, startWidth]);

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // When sidebar should be hidden, only render the RightSection
  if (hideSidebar) {
    return (
      <div className="fixed right-0 top-0" style={{ zIndex: 5, width: '380px', height: 'calc(100vh - 70px)', top: '70px' }}>
        <RightSection />
      </div>
    );
  }

  return (
    <>
      {/* Toggle Button - Fixed position - Only show when sidebar is not hidden and collapsed */}
      {!hideSidebar && isCollapsed && (
        <motion.button
          className="fixed top-1/2 right-0 bg-[#1D4FB6] text-white p-2 rounded-l-lg shadow-lg hover:bg-[#1D4FB6]/90 transition-colors"
          style={{
            zIndex: 10,
            transform: 'translateY(-50%)',
            right: '0px',
            transition: isDragging ? 'none' : 'right 0.3s ease'
          }}
          onClick={toggleSidebar}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={20} />
        </motion.button>
      )}

      {/* Sidebar Container */}
      <motion.div
        ref={sidebarRef}
        className="fixed right-0 top-0 bg-white border-l-2 shadow-lg"
        style={{
          zIndex: 5,
          width: isCollapsed ? '0px' : `${sidebarWidth}px`,
          height: 'calc(100vh - 70px)',
          top: '70px',
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}
        initial={{ width: 0 }}
        animate={{ width: isCollapsed ? 0 : sidebarWidth }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="h-full flex flex-col"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Drag Handle */}
              <div
                ref={dragHandleRef}
                className="absolute left-0 top-0 w-2 h-full bg-gray-200 hover:bg-gray-300 cursor-col-resize z-10 flex items-center justify-center"
                onMouseDown={handleMouseDown}
                style={{ cursor: 'col-resize' }}
              >
                <GripVertical size={12} className="text-gray-500" />
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-hidden flex flex-col" style={{ marginLeft: '8px' }}>
                <RightSection />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Drag Overlay - Shows when dragging */}
      {isDragging && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 15 }}>
          <div 
            className="absolute top-0 bg-blue-200 opacity-30"
            style={{
              right: 0,
              width: `${sidebarWidth}px`,
              height: '100vh',
              top: '70px'
            }}
          />
        </div>
      )}
    </>
  );
};

export default CollapsibleRightSidebar;
