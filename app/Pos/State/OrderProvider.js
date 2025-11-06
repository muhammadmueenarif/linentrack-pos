"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, getDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '../../config';
import { orderStatus } from '../../enum/status';

// --- Initial State Definition ---
const initialOrderState = {
    selectedItems: [],
    selectedCustomer: null, // Changed from 'customer' to 'selectedCustomer' for consistency
    isExpress: false,
    isRepeat: false,
    numberOfPickups: '1 Time', // Renamed from 'frequency' 
    frequency: 'Every Week', // Added new field
    deliveryOption: 'Instore & Self-Collect', // Default changed to 'Instore & Self-Collect'
    pickupDate: new Date(),
    deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to next day
    selectedPriceList: null, // Changed from string to null/object
    priceLists: [], // Added to store available price lists
    showAddCustomerPopup: false,
    showCalendarPopup: false,
    showOrderFlow: false,
    showPaymentOptionsContent: false,
    showOrderConfirmation: false,
    orderComplete: false,
    notes: "",
    formData: {
        bagQuantity: "",
        deliveryFee: "0",
        expressDeliveryCharge: "0",
        credit: "0",
        discountPercentage: "0",
        discountFixed: "0",
        paymentMethod: "",
        cashFromCustomer: "0",
        notifyOption: "Notify",
        deliveryDocument: "No delivery document",
        subtotal: 0,
        total: 0,
        storeSettings: null // Will hold relevant fetched settings
    },
    taxSettings: null,
    paymentSettings: null
};

// --- Helper to safely parse localStorage JSON ---
const safelyParseJson = (jsonString) => {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Error parsing JSON from localStorage:", e);
        return null;
    }
};

// --- Context Creation ---
const OrderContext = createContext(null);

// --- Order Provider Component ---
export const OrderProvider = ({ children }) => {
    const [orderState, setOrderState] = useState(() => {
        // 1. Try loading from localStorage first to preserve ongoing orders
        if (typeof window !== 'undefined') {
            const savedState = localStorage.getItem('orderState');
            if (savedState) {
                const parsedState = safelyParseJson(savedState);
                if (parsedState) {
                    // Rehydrate Date objects and ensure selectedItems is an array
                    return {
                        ...initialOrderState, // Start with defaults
                        ...parsedState,       // Override with saved data
                        pickupDate: parsedState.pickupDate ? new Date(parsedState.pickupDate) : new Date(),
                        deliveryDate: parsedState.deliveryDate ? new Date(parsedState.deliveryDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
                        selectedItems: Array.isArray(parsedState.selectedItems) ? parsedState.selectedItems : [],
                        // Ensure formData exists and has its structure
                        formData: {
                           ...initialOrderState.formData, // Default form structure
                           ...(parsedState.formData || {}), // Override with saved form data
                           storeSettings: null // Reset store settings on initial load, will be fetched
                        }
                    };
                }
            }
        }
        // 2. Fallback to initial state if no localStorage data
        return initialOrderState;
    });

    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [settingsError, setSettingsError] = useState(null);

    // --- Effect to Persist State to LocalStorage ---
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Prevent saving initial state before settings might be loaded
            // Only save if it's not the exact initial object reference or after settings load attempt
             if (orderState !== initialOrderState || !isLoadingSettings) {
                 // Convert Dates to ISO strings for storage
                 const stateToSave = {
                    ...orderState,
                    pickupDate: orderState.pickupDate.toISOString(),
                    deliveryDate: orderState.deliveryDate.toISOString(),
                 };
                localStorage.setItem('orderState', JSON.stringify(stateToSave));
             }
        }
    }, [orderState, isLoadingSettings]); // Depend on orderState and loading status

    // --- Effect to Load Store Settings ---
    useEffect(() => {
        const fetchStoreSettings = async (currentStoreId) => {
            if (!currentStoreId) {
                setOrderState(prev => ({
                    ...prev,
                    formData: { ...prev.formData, storeSettings: null }
                }));
                return;
            }

            setIsLoadingSettings(true);
            setSettingsError(null);

            try {
                // Use the store ID directly as the document ID in 'storeSettings'
                const settingsRef = doc(db, 'storeSettings', currentStoreId);
                const docSnap = await getDoc(settingsRef);

                if (docSnap.exists()) {
                    const settingsData = docSnap.data();

                    // Process price lists
                    const lists = (settingsData.priceLists || []).map(list => ({ 
                        ...list, 
                        multiplier: list.multiplier || 1 
                    }));

                    // Get default price list based on workflow settings
                    const defaultPriceListName = settingsData.workflow?.defaultPriceList;
                    let defaultPriceList = null;
                    
                    if (defaultPriceListName && lists.length > 0) {
                        // Find the price list specified in workflow
                        defaultPriceList = lists.find(list => list.name === defaultPriceListName);
                    }
                    
                    // If not found or not specified, use the first in the list
                    if (!defaultPriceList && lists.length > 0) {
                        defaultPriceList = lists[0];
                    }

                    // Configure express delivery
                    const expressDeliveryCharge = 
                        settingsData.pickupDeliveries?.generatingSetting?.additionalChargesForExpressDelivery || "0";

                    // Configure tax settings
                    const taxSettings = {};
                    if (settingsData.tax?.tax1?.rate) {
                        taxSettings.tax1 = { 
                            name: settingsData.tax.tax1.name, 
                            rate: parseFloat(settingsData.tax.tax1.rate) || 0 
                        };
                    }
                    if (settingsData.tax?.tax2?.rate) {
                        taxSettings.tax2 = { 
                            name: settingsData.tax.tax2.name, 
                            rate: parseFloat(settingsData.tax.tax2.rate) || 0 
                        };
                    }
                    if (settingsData.tax?.tax3?.rate) {
                        taxSettings.tax3 = { 
                            name: settingsData.tax.tax3.name, 
                            rate: parseFloat(settingsData.tax.tax3.rate) || 0 
                        };
                    }

                    // Configure payment settings
                    const paymentSettings = {
                        allowPartialPayment: settingsData.payment?.allowPartialPayment || false,
                        cashDiscount: parseFloat(settingsData.payment?.cashDiscount) || 0,
                        defaultPaymentMethod: settingsData.payment?.defaultPaymentMethod || 'cash'
                    };

                    // Update the state with fetched settings
                    setOrderState(prev => ({
                        ...prev,
                        priceLists: lists,
                        selectedPriceList: defaultPriceList || prev.selectedPriceList,
                        taxSettings,
                        paymentSettings,
                        formData: {
                            ...prev.formData,
                            expressDeliveryCharge,
                            storeSettings: {
                                timezone: settingsData.timezone,
                                tax: settingsData.tax,
                                companyName: settingsData.settings?.companyName,
                                servicesOffered: settingsData.servicesOffered,
                            }
                        },
                        // Check if delivery is offered before setting default
                        deliveryOption: settingsData.servicesOffered?.pickupDelivery
                            ? prev.deliveryOption // Keep existing if valid
                            : 'Instore & Self-Collect', // Fallback if delivery not offered
                    }));
                } else {
                    console.warn(`No settings document found for store ID: ${currentStoreId}`);
                    setSettingsError(`Settings not found for store ${currentStoreId}.`);
                    // Clear settings if document doesn't exist
                    setOrderState(prev => ({
                        ...prev,
                        formData: { ...prev.formData, storeSettings: null }
                    }));
                }
            } catch (error) {
                console.error("Error fetching store settings:", error);
                setSettingsError("Failed to load store settings.");
                // Clear settings on error
                setOrderState(prev => ({
                    ...prev,
                    formData: { ...prev.formData, storeSettings: null }
                }));
            } finally {
                setIsLoadingSettings(false);
            }
        };

        // Get storeId from localStorage inside the effect
        const selectedStoreId = typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') : null;
        fetchStoreSettings(selectedStoreId);

    }, []); // Run once on component mount

    // --- State Update Functions ---
    const updateOrderField = useCallback((field, value) => {
        setOrderState(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const updateFormData = useCallback((field, value) => {
        setOrderState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value
            }
        }));
    }, []);

    const addItem = useCallback((item) => {
        setOrderState(prev => {
            // Check if item already exists
            const existingIndex = prev.selectedItems.findIndex(i => 
                i.id === item.id && 
                JSON.stringify(i.stainDamage) === JSON.stringify(item.stainDamage) && 
                JSON.stringify(i.physicalDamage) === JSON.stringify(item.physicalDamage) &&
                i.color === item.color
            );

            if (existingIndex !== -1) {
                // Update quantity of existing item
                const updatedItems = [...prev.selectedItems];
                updatedItems[existingIndex].quantity += 1;
                
                return {
                    ...prev,
                    selectedItems: updatedItems
                };
            } else {
                // Add new item with quantity 1
                return {
                    ...prev,
                    selectedItems: [...prev.selectedItems, { ...item, quantity: 1 }]
                };
            }
        });
    }, []);

    const updateItemQuantity = useCallback((index, change) => {
        setOrderState(prev => {
            const updatedItems = [...prev.selectedItems];
            if (updatedItems[index]) {
                const newQuantity = Math.max(1, updatedItems[index].quantity + change);
                updatedItems[index] = {
                    ...updatedItems[index],
                    quantity: newQuantity
                };
            }
            return {
                ...prev,
                selectedItems: updatedItems
            };
        });
    }, []);

    const removeItem = useCallback((index) => {
        setOrderState(prev => ({
            ...prev,
            selectedItems: prev.selectedItems.filter((_, i) => i !== index)
        }));
    }, []);

    // --- Calculation Logic ---
    const calculateTotals = useCallback(() => {
        setOrderState(prev => {
            // Base calculation
            const subtotal = prev.selectedItems.reduce(
                (total, item) => total + (item.price * item.quantity || 0),
                0
            );
            
            // Apply price list multiplier
            const multiplier = prev.selectedPriceList?.multiplier || 1;
            let calculatedTotal = subtotal * multiplier;
            
            // Apply express delivery charge if enabled
            if (prev.isExpress && prev.formData.expressDeliveryCharge) {
                calculatedTotal += parseFloat(prev.formData.expressDeliveryCharge);
            }
            
            // Apply discount
            if (prev.formData.discountPercentage) {
                const discountAmount = calculatedTotal * (parseFloat(prev.formData.discountPercentage) / 100);
                calculatedTotal -= discountAmount;
            }
            
            // Apply cash discount if payment method is cash
            if (prev.formData.paymentMethod === 'cash' && prev.paymentSettings?.cashDiscount) {
                const cashDiscountAmount = calculatedTotal * (prev.paymentSettings.cashDiscount / 100);
                calculatedTotal -= cashDiscountAmount;
            }
            
            // Apply taxes if customer is not tax exempt
            if (prev.selectedCustomer && !prev.selectedCustomer.taxExempt && prev.taxSettings) {
                const taxes = prev.taxSettings;
                
                if (taxes.tax1) calculatedTotal += calculatedTotal * (taxes.tax1.rate / 100);
                if (taxes.tax2) calculatedTotal += calculatedTotal * (taxes.tax2.rate / 100);
                if (taxes.tax3) calculatedTotal += calculatedTotal * (taxes.tax3.rate / 100);
            }
            
            // Apply delivery fee
            calculatedTotal += parseFloat(prev.formData.deliveryFee || 0);
            
            // Subtract credit
            calculatedTotal -= parseFloat(prev.formData.credit || 0);
            
            return {
                ...prev,
                formData: {
                    ...prev.formData,
                    subtotal,
                    total: calculatedTotal
                }
            };
        });
    }, []);

    // --- Reset Order Logic ---
    const resetOrder = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('orderState');
        }
        
        // Preserve store settings when resetting
        const storeSettings = orderState.formData.storeSettings;
        const taxSettings = orderState.taxSettings;
        const paymentSettings = orderState.paymentSettings;
        const priceLists = orderState.priceLists;
        const selectedPriceList = orderState.selectedPriceList;
        
        setOrderState({
            ...initialOrderState,
            priceLists,
            selectedPriceList,
            taxSettings,
            paymentSettings,
            formData: {
                ...initialOrderState.formData,
                storeSettings
            }
        });
    }, [orderState.formData.storeSettings, orderState.taxSettings, orderState.paymentSettings, orderState.priceLists, orderState.selectedPriceList]);

    // --- Submit Order Logic ---
    const submitOrder = async (userId, storeId) => {
        try {
            if (!userId || !storeId) {
                throw new Error('User ID and Store ID are required');
            }
            
            if (!orderState.selectedItems || orderState.selectedItems.length === 0) {
                throw new Error('Please select at least one item');
            }
            
            if (!orderState.selectedCustomer) {
                throw new Error('Please select a customer');
            }

            // Generate order ID
            const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // Prepare order data
            const orderData = {
                customer: {
                    id: orderState.selectedCustomer?.id || null,
                    name: orderState.selectedCustomer?.name || '',
                    email: orderState.selectedCustomer?.email || '',
                    phone: orderState.selectedCustomer?.phone || '',
                    address: orderState.selectedCustomer?.address || '',
                    taxExempt: orderState.selectedCustomer?.taxExempt || false
                },
                items: orderState.selectedItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    stainDamage: item.stainDamage || [],
                    physicalDamage: item.physicalDamage || [],
                    color: item.color || '#000000'
                })),
                details: {
                    bagQuantity: orderState.formData.bagQuantity,
                    isExpress: orderState.isExpress,
                    isRepeat: orderState.isRepeat,
                    notes: orderState.notes,
                    numberOfPickups: orderState.numberOfPickups,
                    frequency: orderState.frequency,
                    deliveryOption: orderState.deliveryOption
                },
                dates: {
                    pickupDate: Timestamp.fromDate(new Date(orderState.pickupDate)),
                    deliveryDate: Timestamp.fromDate(new Date(orderState.deliveryDate)),
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                },
                payment: {
                    subtotal: parseFloat(orderState.formData.subtotal),
                    discountPercentage: parseFloat(orderState.formData.discountPercentage || 0),
                    deliveryFee: parseFloat(orderState.formData.deliveryFee || 0),
                    credit: parseFloat(orderState.formData.credit || 0),
                    expressDeliveryCharge: orderState.isExpress ? parseFloat(orderState.formData.expressDeliveryCharge || 0) : 0,
                    paymentMethod: orderState.formData.paymentMethod,
                    cashReceived: parseFloat(orderState.formData.cashFromCustomer || 0),
                    total: parseFloat(orderState.formData.total),
                    taxApplied: orderState.selectedCustomer && !orderState.selectedCustomer.taxExempt
                },
                priceList: {
                    id: orderState.selectedPriceList?.id || null,
                    name: orderState.selectedPriceList?.name || 'Default',
                    multiplier: orderState.selectedPriceList?.multiplier || 1
                },
                status: orderStatus.Pending,
                storeId,
                userId,
                orderId,
                notifyOption: orderState.formData.notifyOption || 'Notify',
                deliveryDocument: orderState.formData.deliveryDocument || 'No delivery document'
            };

            // Remove store settings before saving
            const formDataForSave = { ...orderState.formData };
            delete formDataForSave.storeSettings;
            orderData.formData = formDataForSave;

            // Save to Firestore
            const orderRef = doc(db, 'pos_orders', userId, 'stores', storeId, 'orders', orderId);
            await setDoc(orderRef, orderData);

            console.log("Order submitted successfully:", orderId);
            
            // Update UI to show completion
            setOrderState(prev => ({
                ...prev,
                orderComplete: true
            }));

            return {
                success: true,
                orderId,
                message: 'Order submitted successfully'
            };
        } catch (error) {
            console.error('Error submitting order:', error);
            throw error;
        }
    };

    // --- Recalculate Totals When Dependencies Change ---
    useEffect(() => {
        calculateTotals();
    }, [
        calculateTotals,
        orderState.selectedItems,
        orderState.selectedPriceList,
        orderState.isExpress,
        orderState.formData.discountPercentage,
        orderState.formData.deliveryFee,
        orderState.formData.credit,
        orderState.formData.expressDeliveryCharge,
        orderState.formData.paymentMethod
    ]);

    // --- Context Provider Value ---
    const value = {
        orderState,
        isLoadingSettings,
        settingsError,
        updateOrderField,
        updateFormData,
        addItem,
        updateItemQuantity,
        removeItem,
        calculateTotals,
        resetOrder,
        submitOrder
    };

    return (
        <OrderContext.Provider value={value}>
            {children}
        </OrderContext.Provider>
    );
};

// --- Custom Hook to Use Context ---
export const useOrder = () => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error('useOrder must be used within an OrderProvider');
    }
    return context;
};

export default OrderProvider;