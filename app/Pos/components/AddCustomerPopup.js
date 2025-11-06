"use client";
import React, { useState } from 'react';
import { X, Upload, FilePlus } from 'lucide-react';
// ImportExcelModal removed - POS app doesn't need Excel import functionality
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config';
import { FloatingInput } from '../../ui/components/FloatingInput';
import { Switch } from '../../ui/components/Switch';

const AddCustomerPopup = ({ onClose, onCustomerAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    tel: '',
    secondaryTel: '',
    email: '',
    streetAddress: '',
    aptNumber: '',
    city: '',
    postCode: '',
    driverInstructions: '',
    notes: '',
    privateNotes: '',
    subrent: 'No Account',
    paymentType: 'Default',
    billingOn: 'Billing on',
    invoiceStyle: 'Store Default',
    discount: '',
    credit: '',
    taxExempt: false
  });
  const [showImportExcel, setShowImportExcel] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle input change for FloatingInput components
  const handleFloatingInputChange = (id, value) => {
    setFormData(prevState => ({
      ...prevState,
      [id]: value
    }));
  };

  // Handle change for select elements and checkboxes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle switch toggle for tax exempt
  const handleSwitchChange = (e) => {
    setFormData(prevState => ({
      ...prevState,
      taxExempt: e.target.checked
    }));
  };


  // Submit the form and add customer to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset messages
    setError('');
    setSuccess('');
    
    // Validate required fields
    if (!formData.name.trim()) {
      setError('Customer name is required');
      return;
    }
    
    // Retrieve the selected store ID from localStorage
    const storeId = localStorage.getItem('selectedStoreId');
    if (!storeId) {
      setError('Please select or create a store before adding a customer.');
      return;
    }
    
    try {
      // Add the new customer to the "users" subcollection
      const customerDocRef = await addDoc(collection(db, 'StoreUsers', storeId, 'users'), {
        ...formData,
        createdAt: new Date().toISOString(),
        lastVisit: new Date().toISOString(),
        orders: [],
        totalOrders: 0,
        totalSpent: 0
      });
      
      setSuccess("Customer added successfully!");
      
      // If onCustomerAdded callback is provided, call it with the new customer
      if (typeof onCustomerAdded === 'function') {
        const newCustomer = {
          id: customerDocRef.id,
          name: formData.name,
          phone: formData.tel,
          altPhone: formData.secondaryTel,
          email: formData.email,
          address: formData.streetAddress,
          aptNumber: formData.aptNumber,
          city: formData.city,
          postCode: formData.postCode,
          driverInstructions: formData.driverInstructions,
          notes: formData.notes,
          privateNotes: formData.privateNotes,
          business: formData.subrent,
          paymentType: formData.paymentType,
          marketingOptIn: formData.billingOn,
          invoiceStyle: formData.invoiceStyle,
          discount: formData.discount,
          credit: formData.credit,
          taxExempt: formData.taxExempt,
          orders: [],
          totalOrders: 0,
          totalSpent: 0,
          lastVisit: new Date().toISOString()
        };
        onCustomerAdded(newCustomer);
      }
      
      // Close the popup after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error adding customer:", error);
      setError("Error adding customer: " + error.message);
    }
  };

  // Handle successful Excel import
  const handleExcelImportSuccess = (importedCustomers) => {
    setShowImportExcel(false);
    setSuccess(`Successfully imported ${importedCustomers.length} customers`);
    
    // If onCustomerAdded callback is provided, call it with the first imported customer
    if (typeof onCustomerAdded === 'function' && importedCustomers.length > 0) {
      onCustomerAdded(importedCustomers[0]);
    }
    
    // Close the popup after a short delay
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4" style={{ zIndex: 99999 }}>
          <div 
            className="bg-white shadow-lg relative w-full"
            style={{
              width: '942px',
              maxWidth: '100%',
              height: '838px',
              maxHeight: '90vh',
              borderRadius: '30px',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-8 border-b border-gray-100 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <h2 
                  className="font-medium"
                  style={{
                    fontFamily: 'Poppins',
                    fontWeight: 500,
                    fontSize: 'clamp(24px, 4vw, 39.81px)',
                    lineHeight: 'clamp(32px, 5vw, 56px)',
                    color: '#14181F'
                  }}
                >
                  Add Customer
                </h2>
                <button
                  onClick={() => setShowImportExcel(true)}
                  className="flex items-center justify-center gap-2.5 px-4 py-2 rounded-full text-white"
                  style={{
                    background: '#2871E6',
                    borderRadius: '50px',
                    width: '175px',
                    height: '32px',
                    fontSize: '13.33px',
                    fontFamily: 'Poppins',
                    fontWeight: 400,
                    lineHeight: '16px',
                    letterSpacing: '-0.01em'
                  }}
                >
                  <FilePlus size={16} />
                  <span className="hidden sm:inline">Import from Excel</span>
                  <span className="sm:hidden">Import</span>
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors self-end sm:self-auto"
              >
                <X size={24} />
              </button>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="p-3 bg-red-100 text-red-700 border-l-4 border-red-500 mb-4 mx-4">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-100 text-green-700 border-l-4 border-green-500 mb-4 mx-4">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-8 overflow-y-auto" style={{ height: 'calc(100% - 200px)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* First Row */}
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Name*
                  </label>
                  <FloatingInput
                    id="name"
                    value={formData.name}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter customer name"
                    required
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Tel
                  </label>
                  <FloatingInput
                    id="tel"
                    value={formData.tel}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter telephone number"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Secondary Tel
                  </label>
                  <FloatingInput
                    id="secondaryTel"
                    value={formData.secondaryTel}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter secondary telephone"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>

                {/* Second Row */}
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Email
                  </label>
                  <FloatingInput
                    id="email"
                    value={formData.email}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter email address"
                    type="email"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Street Address
                  </label>
                  <FloatingInput
                    id="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter street address"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Apt Number
                  </label>
                  <FloatingInput
                    id="aptNumber"
                    value={formData.aptNumber}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter apartment number"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>

                {/* Third Row */}
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    City
                  </label>
                  <FloatingInput
                    id="city"
                    value={formData.city}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter city"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Post Code
                  </label>
                  <FloatingInput
                    id="postCode"
                    value={formData.postCode}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter post code"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Driver Instructions
                  </label>
                  <FloatingInput
                    id="driverInstructions"
                    value={formData.driverInstructions}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter driver instructions"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>

                {/* Fourth Row */}
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Notes
                  </label>
                  <FloatingInput
                    id="notes"
                    value={formData.notes}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter notes"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Private Notes
                  </label>
                  <FloatingInput
                    id="privateNotes"
                    value={formData.privateNotes}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter private notes"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Subrent
                  </label>
                  <select
                    name="subrent"
                    value={formData.subrent}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 bg-white"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  >
                    <option>No Account</option>
                    <option>Business</option>
                    <option>Personal</option>
                  </select>
                </div>

                {/* Fifth Row */}
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Payment Type
                  </label>
                  <select
                    name="paymentType"
                    value={formData.paymentType}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 bg-white"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  >
                    <option>Default</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Credit</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Billing On
                  </label>
                  <select
                    name="billingOn"
                    value={formData.billingOn}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 bg-white"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  >
                    <option>Billing on</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Per Order</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Invoice Style
                  </label>
                  <select
                    name="invoiceStyle"
                    value={formData.invoiceStyle}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 bg-white"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  >
                    <option>Store Default</option>
                    <option>Custom</option>
                  </select>
                </div>

                {/* Last Row */}
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Discount %
                  </label>
                  <FloatingInput
                    id="discount"
                    value={formData.discount}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter discount percentage"
                    type="number"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <label 
                    className="mb-2 block"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '11.11px',
                      lineHeight: '16px',
                      color: '#414750'
                    }}
                  >
                    Credit
                  </label>
                  <FloatingInput
                    id="credit"
                    value={formData.credit}
                    onChange={handleFloatingInputChange}
                    placeholder="Enter credit amount"
                    type="number"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#8B939F'
                    }}
                  />
                </div>
                <div className="flex items-center pt-6">
                  <Switch
                    id="taxExempt"
                    checked={formData.taxExempt}
                    onChange={handleSwitchChange}
                    label="Tax Exempt"
                    labelPosition="right"
                  />
                </div>
              </div>


              {/* Required Field Note */}
              <div 
                className="mt-4"
                style={{
                  fontFamily: 'Poppins',
                  fontWeight: 400,
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#8B939F'
                }}
              >
                * Required field
              </div>

              {/* Submit Button */}
              <div className="mt-8 flex justify-center">
                <button
                  type="submit"
                  className="text-white px-7 py-4 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{
                    background: '#2871E6',
                    borderRadius: '4px',
                    width: '125px',
                    height: '56px',
                    fontFamily: 'Poppins',
                    fontWeight: 400,
                    fontSize: '19.2px',
                    lineHeight: '24px'
                  }}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
    </>
  );
};

export default AddCustomerPopup;