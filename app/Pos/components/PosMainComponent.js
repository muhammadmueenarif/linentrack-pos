
"use client"
import CollapsibleRightSidebar from './CollapsibleRightSidebar';
import React, { useState } from 'react';
import MainBody from './MainBody';
import { OrderProvider, useOrder } from '../State/OrderProvider';

const PosMainContent = ({ isSidebarOpen }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const { orderState } = useOrder();

  const handleItemSelect = (newItem) => {
    setSelectedItems([...selectedItems, { ...newItem, quantity: 1 }]);
  };

  const handleUpdateQuantity = (index, change) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = Math.max(1, updatedItems[index].quantity + change);
    setSelectedItems(updatedItems);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(updatedItems);
  };

  return (
    <div className="flex flex-grow w-full">
      <MainBody onItemSelect={handleItemSelect} isSidebarOpen={isSidebarOpen} />
      <CollapsibleRightSidebar hideSidebar={orderState.showAddCustomerPopup} />
    </div>
  );
};

const PosMainComponent = ({ isSidebarOpen }) => {
  return (
    <div className="flex flex-grow w-full h-full">
      <OrderProvider>
        <PosMainContent isSidebarOpen={isSidebarOpen} />
      </OrderProvider>
    </div>
  );
};

export default PosMainComponent;
