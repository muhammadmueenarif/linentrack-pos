"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useOrder } from '../State/OrderProvider';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config';

const MainBody = () => {
  // State for selections
  const [selectedStainDamage, setSelectedStainDamage] = useState([]);
  const [selectedPhysicalDamage, setSelectedPhysicalDamage] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  // Now store full product object rather than just the name
  const [selectedProduct, setSelectedProduct] = useState(null);

  // State for products fetched from DB
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Store settings state - default to showing all sections
  const [storeSettings, setStoreSettings] = useState({
    showColorPalets: true,
    showDamagesSection: true
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // UI toggle states for show/hide functionality
  const [showColorPalette, setShowColorPalette] = useState(true);
  const [showDamageSection, setShowDamageSection] = useState(true);

  const { updateOrderField, orderState } = useOrder();

  // Fetch store settings from Firestore
  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const storeId = localStorage.getItem('selectedStoreId');
        if (!storeId) {
          console.error("Store ID missing");
          setLoadingSettings(false);
          return;
        }
        
        const storeSettingsRef = doc(db, 'storeSettings', storeId);
        const storeSettingsDoc = await getDoc(storeSettingsRef);
        
        if (storeSettingsDoc.exists()) {
          const settingsData = storeSettingsDoc.data();
          
          // Extract the workflow settings
          const workflow = settingsData.workflow || {};
          
          setStoreSettings({
            showColorPalets: workflow.showColorPalets !== false, // Default to true if not explicitly set to false
            showDamagesSection: workflow.showDamagesSection !== false // Default to true if not explicitly set to false
          });
          
          console.log("Store settings loaded:", workflow);
        } else {
          console.log("No store settings found, using defaults");
          // Keep the default values (true for both)
        }
      } catch (error) {
        console.error("Error fetching store settings:", error);
        // On error, ensure sections are shown by default
        setStoreSettings({
          showColorPalets: true,
          showDamagesSection: true
        });
      } finally {
        setLoadingSettings(false);
      }
    };
    
    fetchStoreSettings();
  }, []);

  // Fetch products from Firestore with category "Dry Cleaning" filtering by storeId and userId
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = collection(db, 'products');
        // Get storeId and userId from localStorage
        const storeId = localStorage.getItem('selectedStoreId');
        const userData = JSON.parse(localStorage.getItem('userData'));
        const userId = userData?.id;
        
        if (!storeId || !userId) {
          console.error("Store ID or User ID missing");
          return;
        }
        
        const q = query(
          productsRef, 
          where('category', '==', 'Dry Cleaning'),
          where('storeId', '==', storeId),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(prods);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Handler for selecting damage or colour options remains the same
  const handleSelection = (item, type) => {
    const [selected, setSelected] =
      type === 'stain' ? [selectedStainDamage, setSelectedStainDamage] :
      type === 'physical' ? [selectedPhysicalDamage, setSelectedPhysicalDamage] :
      [selectedColors, setSelectedColors];

    setSelected(selected.includes(item)
      ? selected.filter(i => i !== item)
      : [...selected, item]
    );
  };

  // When a product is clicked in the grid, set the entire product
  const handleClothingItemSelect = (product) => {
    setSelectedProduct(product);
  };

  // Adds an item to the order if all selections are made
  const handleAddItem = () => {
    // Check if required selections are made based on combined settings and UI toggles
    const damageSelected = shouldShowDamageSection
      ? (selectedStainDamage.length > 0 || selectedPhysicalDamage.length > 0)
      : true;

    const colorSelected = shouldShowColorPalette
      ? selectedColors.length > 0
      : true;

    if (selectedProduct && damageSelected && colorSelected) {
      const newItem = {
        // Use the id from the product as a base
        id: selectedProduct.id,
        name: selectedProduct.name,
        imageUrl: selectedProduct.imageUrl,
        price: selectedProduct.price,
        pieces: selectedProduct.pieces,
        stainDamage: selectedStainDamage,
        physicalDamage: selectedPhysicalDamage,
        color: selectedColors.length > 0 ? selectedColors[0] : null,
        quantity: 1,
      };

      // Update the order's selectedItems array
      updateOrderField('selectedItems', [
        ...(orderState.selectedItems || []),
        newItem
      ]);

      // Reset selections
      setSelectedProduct(null);
      setSelectedStainDamage([]);
      setSelectedPhysicalDamage([]);
      setSelectedColors([]);
    } else {
      let missingSelections = [];
      if (!selectedProduct) missingSelections.push("product");
      if (shouldShowDamageSection && selectedStainDamage.length === 0 && selectedPhysicalDamage.length === 0)
        missingSelections.push("damage type");
      if (shouldShowColorPalette && selectedColors.length === 0)
        missingSelections.push("color");

      alert(`Please select a ${missingSelections.join(", ")} before adding`);
    }
  };

  // Damage types and animation variants
  const stainDamageTypes = ['Food', 'Ink', 'Oil', 'Grass', 'Mud'];
  const physicalDamageTypes = ['Rip', 'Tear', 'Hole', 'Fraying', 'Broken Zipper', 'Missing Button', 'Stain', 'Worn'];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  const buttonVariants = {
    initial: { 
      scale: 1,
      backgroundColor: 'transparent',
      borderColor: '#1F87FE',
      borderWidth: '0.8px',
      color: '#000000'
    },
    hover: { 
      scale: 1.05,
      backgroundColor: 'rgba(31, 135, 254, 0.1)',
      borderColor: '#1F87FE',
      borderWidth: '0.8px'
    },
    tap: { scale: 0.95 },
    selected: { 
      scale: 1, 
      backgroundColor: 'rgba(31, 135, 254, 0.5)',
      borderColor: '#1F87FE',
      borderWidth: '0.8px',
      color: '#000000'
    }
  };

  const colorButtonVariants = {
    initial: { scale: 1, borderWidth: 2, borderColor: 'transparent' },
    hover: { scale: 1.1 },
    tap: { scale: 0.95 },
    selected: { scale: 1, borderColor: '#1D4FB6', borderWidth: 3 }
  };

  if (loadingProducts || loadingSettings) {
    return (
      <div 
        className="flex-grow overflow-y-auto flex items-center justify-center"
        style={{ 
          marginTop: "0px",
          padding: "20px",
          marginLeft: "20px",
          marginRight: "20px"
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Debug: Log current store settings
  console.log("Current store settings:", storeSettings);
  
  // Use store settings with fallback to show sections by default
  const effectiveStoreSettings = {
    showColorPalets: storeSettings.showColorPalets !== false, // Default to true unless explicitly false
    showDamagesSection: storeSettings.showDamagesSection !== false // Default to true unless explicitly false
  };

  // Combine store settings with UI toggle states
  const shouldShowColorPalette = effectiveStoreSettings.showColorPalets && showColorPalette;
  const shouldShowDamageSection = effectiveStoreSettings.showDamagesSection && showDamageSection;

  // Check if add button should be disabled based on store settings and UI toggles
  const isAddButtonDisabled = () => {
    if (!selectedProduct) return true;

    if (shouldShowDamageSection &&
       (selectedStainDamage.length === 0 && selectedPhysicalDamage.length === 0)) {
      return true;
    }

    if (shouldShowColorPalette && selectedColors.length === 0) {
      return true;
    }

    return false;
  };

  return (
    <motion.div   
      className="flex-grow overflow-y-auto w-full h-full"
      style={{ 
        marginTop: "0px",
        padding: "10px 20px"
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Service Selection Header */}
      <motion.h2
        className="text-2xl font-bold mb-6 text-black"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily: 'Poppins',
          fontWeight: 700,
          fontSize: '24px',
          lineHeight: '36px',
          color: '#000000'
        }}
      >
        Dry Cleaning
      </motion.h2>

      {/* Product Grid from DB */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          maxHeight: '48vh',
          overflowY: 'scroll',
          overflowX: 'hidden',
        }}
        className="scrollable-div flex flex-wrap gap-4 mb-8"
      >
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            variants={itemVariants}
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              backgroundColor: '#F0F0FF',
              border: selectedProduct && selectedProduct.id === product.id ? '2px solid #1F87FE' : '2px solid transparent',
              marginRight: '15px',
              marginBottom: '15px',
              cursor: 'pointer'
            }}
            className="rounded-full flex items-center justify-center"
            onClick={() => handleClothingItemSelect(product)}
            title={product.name}
          >
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                style={{ 
                  width: '46.29px',
                  height: '47.36px',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <span 
                className="text-lg font-semibold"
                style={{
                  width: '46.29px',
                  height: '47.36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000'
                }}
              >
                {product.name ? product.name[0].toUpperCase() : '?'}
              </span>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Toggle Controls for Sections */}
      <motion.div
        className="mb-6 flex flex-wrap gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Damage Section Toggle */}
        {effectiveStoreSettings.showDamagesSection && (
          <button
            onClick={() => setShowDamageSection(!showDamageSection)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              showDamageSection
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            {showDamageSection ? 'Hide' : 'Show'} Damage Section
          </button>
        )}

        {/* Color Palette Toggle */}
        {effectiveStoreSettings.showColorPalets && (
          <button
            onClick={() => setShowColorPalette(!showColorPalette)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              showColorPalette
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            {showColorPalette ? 'Hide' : 'Show'} Color Palette
          </button>
        )}

        {/* Promo Code Toggle */}
        <button
          onClick={() => {
            // Toggle promo code visibility in RightSection via window event
            window.dispatchEvent(new CustomEvent('togglePromoCodeBox'));
          }}
          className="px-4 py-2 rounded-md text-sm font-medium bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 transition-all duration-200"
        >
          Promo Code Box
        </button>
      </motion.div>

      {/* Stain Damage - conditionally render based on combined settings */}
      {shouldShowDamageSection && (
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Stain Damage</h3>
          <div className="flex flex-wrap gap-2">
            {stainDamageTypes.map((damage, index) => (
              <motion.button
                key={index}
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                animate={selectedStainDamage.includes(damage) ? "selected" : "initial"}
                onClick={() => handleSelection(damage, 'stain')}
                style={{
                  width: "100px",
                  height: "25px",
                  borderRadius: "5px",
                  fontFamily: 'Poppins',
                  fontWeight: 400,
                  fontSize: '11px',
                  lineHeight: '16px',
                  textAlign: 'center'
                }}
                className="px-4 py-2 text-sm"
              >
                {damage}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Physical Damage - conditionally render based on combined settings */}
      {shouldShowDamageSection && (
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Physical Damage</h3>
          <div className="flex flex-wrap gap-2">
            {physicalDamageTypes.map((damage, index) => (
              <motion.button
                key={index}
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                animate={selectedPhysicalDamage.includes(damage) ? "selected" : "initial"}
                onClick={() => handleSelection(damage, 'physical')}
                style={{
                  width: "100px",
                  height: "25px",
                  borderRadius: "5px",
                  fontFamily: 'Poppins',
                  fontWeight: 400,
                  fontSize: '11px',
                  lineHeight: '16px',
                  textAlign: 'center'
                }}
                className="px-4 py-2 text-sm"
              >
                {damage}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Select Colour - conditionally render based on combined settings */}
      {shouldShowColorPalette && (
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Select Colour</h3>
          <div className="flex flex-wrap gap-4">
            {['#000000', '#404040', '#808080', '#C0C0C0', '#FFFFFF', '#000080',
              '#0000FF', '#40E0D0', '#00FFFF', '#FF0000', '#FFA500', '#FFFF00'].map((color, index) => (
                <motion.button
                  key={index}
                  variants={colorButtonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  animate={selectedColors.includes(color) ? "selected" : "initial"}
                  onClick={() => handleSelection(color, 'color')}
                  className="w-8 h-8 rounded-sm border-sky-100"
                  style={{ backgroundColor: color }}
                />
            ))}
          </div>
        </motion.div>
      )}

      <motion.button
        onClick={handleAddItem}
        disabled={isAddButtonDisabled()}
        className={`mt-4 px-8 py-2 rounded-md ${
          isAddButtonDisabled()
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-[#1D4FB6] hover:bg-[#1D4FB6]/90'
        } text-white`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        Add Item
      </motion.button>
    </motion.div>
  );
};

export default MainBody;