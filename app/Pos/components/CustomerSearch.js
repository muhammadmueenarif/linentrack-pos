import React, { useState, useEffect } from 'react';
import { Search, Plus, X, User, Upload } from 'lucide-react';
import { db, storage } from '../../config';
import { collection, doc, getDocs,getDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { FloatingInput } from '../../ui/components/FloatingInput';
import { Switch } from '../../ui/components/Switch';
import { orderStatus } from '../../enum/status';

const CustomerSearch = ({ onAddCustomerClick, onCustomerSelect, selectedCustomer, onCustomerAdded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [activeTab, setActiveTab] = useState('Order');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customerPhotos, setCustomerPhotos] = useState([]);
  const [orderPhotos, setOrderPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (selectedCustomer) {
      setSearchTerm(selectedCustomer.name);
    } else {
      setSearchTerm('');
    }
  }, [selectedCustomer]);

  // Handle new customer addition
  useEffect(() => {
    if (onCustomerAdded) {
      // Create a ref to store the handler
      const handleNewCustomer = (newCustomer) => {
        setCustomers(prevCustomers => {
          // Check if customer already exists to avoid duplicates
          const exists = prevCustomers.some(customer => customer.id === newCustomer.id);
          if (!exists) {
            return [...prevCustomers, newCustomer];
          }
          return prevCustomers;
        });
      };
      
      // Store the handler globally so it can be called from other components
      window.handleNewCustomer = handleNewCustomer;
      
      // Cleanup function
      return () => {
        if (window.handleNewCustomer === handleNewCustomer) {
          delete window.handleNewCustomer;
        }
      };
    }
  }, [onCustomerAdded]);

  useEffect(() => {
    const storeId = localStorage.getItem('selectedStoreId');
    if (!storeId) return;

    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'StoreUsers');
        const adminDocRef = doc(usersRef, storeId);
        const usersCollectionRef = collection(adminDocRef, 'users');
        const usersSnap = await getDocs(usersCollectionRef);

        const transformedData = [];
        usersSnap.forEach((doc) => {
          const customerData = doc.data();
          transformedData.push({
            id: doc.id,
            name: customerData.name || '',
            phone: customerData.tel || '',
            altPhone: customerData.secondaryTel || '',
            email: customerData.email || '',
            address: customerData.streetAddress || '',
            orders: customerData.orders || [],
            totalOrders: customerData.totalOrders || 0,
            totalSpent: customerData.totalSpent || 0,
            lastVisit: customerData.lastVisit || new Date().toISOString().split('T')[0],
            discount: customerData.discount || '',
            credit: customerData.credit || '',
            taxExempt: customerData.taxExempt || false,
            city: customerData.city || '',
            postCode: customerData.postCode || '',
            aptNumber: customerData.aptNumber || '',
            driverInstructions: customerData.driverInstructions || '',
            notes: customerData.notes || '',
            privateNotes: customerData.privateNotes || '',
            business: customerData.subrent || 'No Account',
            paymentType: customerData.paymentType || 'Default',
            marketingOptIn: customerData.marketingOptIn || '',
            invoiceStyle: customerData.invoiceStyle || 'Store Default',
            photos: customerData.photos || []
          });
        });

        console.log('Customers loaded:', transformedData.length);
        setCustomers(transformedData);
        setError(null);
      } catch (err) {
        setError('Error fetching customers: ' + err.message);
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const fetchCustomerOrders = async (customerId) => {
    if (!customerId) return;
  
    setLoadingOrders(true);
  
    try {
      // Get the selected store ID from localStorage
      const storeId = localStorage.getItem('selectedStoreId');
      if (!storeId) return;
  
      // First, get the store information to find the adminId (userId)
      const storeRef = doc(db, 'stores', storeId);
      const storeDoc = await getDoc(storeRef);
      
      if (!storeDoc.exists()) {
        console.error(`Store with ID ${storeId} not found`);
        setLoadingOrders(false);
        return;
      }
      
      // Get the adminId from the store document
      const storeData = storeDoc.data();
      const adminId = storeData.adminId;
      
      if (!adminId) {
        console.error(`No adminId found for store ${storeId}`);
        setLoadingOrders(false);
        return;
      }
      
      console.log(`Found adminId ${adminId} for store ${storeId}`);
      
      // Now we can query the orders using the adminId and storeId
      const ordersRef = collection(db, 'pos_orders', adminId, 'stores', storeId, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      
      const customerOrdersData = [];
      
      ordersSnapshot.forEach((orderDoc) => {
        const orderData = orderDoc.data();
        
        // Check if this order belongs to the selected customer
        if (orderData.customer && orderData.customer.id === customerId) {
          const order = {
            id: orderDoc.id,
            total: orderData.payment?.total || 0,
            subtotal: orderData.payment?.subtotal || 0,
            status: orderData.status || 'pending',
            paymentStatus: orderData.payment?.paymentMethod === 'cash' ? 'Paid' : 'Paid',
            paymentMethod: orderData.payment?.paymentMethod || 'card',
            placed: orderData.dates?.createdAt ? 
              (typeof orderData.dates.createdAt.toDate === 'function' ? 
                orderData.dates.createdAt.toDate().toLocaleDateString() : 
                new Date(orderData.dates.createdAt).toLocaleDateString()) : 
              new Date().toLocaleDateString(),
            readBy: 'Staff',
            staffName: 'Staff',
            items: orderData.items || [],
            notes: orderData.details?.notes || ''
          };
          
          customerOrdersData.push(order);
        }
      });
      
      console.log(`Found ${customerOrdersData.length} orders for customer ${customerId}`);
      setCustomerOrders(customerOrdersData);
      
      // Also update the selected customer with these orders
      if (selectedCustomer && onCustomerSelect) {
        const updatedCustomer = {
          ...selectedCustomer,
          orders: customerOrdersData
        };
        onCustomerSelect(updatedCustomer);
      }
      
    } catch (error) {
      console.error('Error fetching customer orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!value.trim()) {
      onCustomerSelect(null);
    }
    setShowDropdown(true);
  };

  const handleCustomerSelect = (customer) => {
    try {
      setSearchTerm(customer.name);
      setShowDropdown(false);
      if (typeof onCustomerSelect === 'function') {
        onCustomerSelect(customer);
      }

      // Don't automatically open the modal when customer is selected
      // User needs to click the person icon to view details
    } catch (error) {
      console.error('Error selecting customer:', error);
    }
  };

  const handleIconClick = () => {
    if (selectedCustomer) {
      // When customer is selected and user clicks the person icon, open the modal
      setShowCustomerModal(true);

      // Fetch customer photos
      if (selectedCustomer.id) {
        fetchCustomerPhotos(selectedCustomer.id);
      }

      // Fetch customer orders from pos_orders
      fetchCustomerOrders(selectedCustomer.id);
    } else {
      // When no customer is selected, clicking the plus icon should trigger add customer
      if (onAddCustomerClick) {
        onAddCustomerClick();
      }
    }
  };

  const fetchCustomerPhotos = async (customerId) => {
    try {
      const storeId = localStorage.getItem('selectedStoreId');
      if (!storeId || !customerId) return;

      // Path to customer photos in storage
      const customerPhotosRef = ref(storage, `stores/${storeId}/customers/${customerId}/photos`);
      const orderPhotosRef = ref(storage, `stores/${storeId}/customers/${customerId}/orders`);

      try {
        // Get customer photos
        const customerPhotosList = await listAll(customerPhotosRef);
        const customerPhotosUrls = await Promise.all(
          customerPhotosList.items.map(async (item) => {
            const url = await getDownloadURL(item);
            return {
              url,
              name: item.name,
              ref: item.fullPath
            };
          })
        );
        setCustomerPhotos(customerPhotosUrls);

        // Get order photos
        const orderPhotosList = await listAll(orderPhotosRef);
        const orderPhotosUrls = await Promise.all(
          orderPhotosList.items.map(async (item) => {
            const url = await getDownloadURL(item);
            return {
              url,
              name: item.name,
              ref: item.fullPath
            };
          })
        );
        setOrderPhotos(orderPhotosUrls);
      } catch (err) {
        // It's okay if photos don't exist yet
        console.log('No photos found or error fetching photos:', err);
        setCustomerPhotos([]);
        setOrderPhotos([]);
      }
    } catch (error) {
      console.error('Error fetching customer photos:', error);
    }
  };

  const handleUploadPhoto = async (e, photoType) => {
    const storeId = localStorage.getItem('selectedStoreId');
    if (!storeId || !selectedCustomer?.id) return;

    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);

    try {
      const uploadedPhotos = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExtension = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${fileExtension}`;

        // Determine path based on photo type
        const photoPath = photoType === 'customer'
          ? `stores/${storeId}/customers/${selectedCustomer.id}/photos/${fileName}`
          : `stores/${storeId}/customers/${selectedCustomer.id}/orders/${fileName}`;

        const photoRef = ref(storage, photoPath);

        // Upload the file
        await uploadBytes(photoRef, file);

        // Get download URL
        const url = await getDownloadURL(photoRef);

        uploadedPhotos.push({
          url,
          name: fileName,
          ref: photoPath
        });
      }

      // Update state with new photos
      if (photoType === 'customer') {
        setCustomerPhotos(prev => [...prev, ...uploadedPhotos]);
      } else {
        setOrderPhotos(prev => [...prev, ...uploadedPhotos]);
      }

      // Also update customer document in Firestore with photo references
      const storeUsersRef = collection(db, 'StoreUsers');
      const storeDocRef = doc(storeUsersRef, storeId);
      const customerDocRef = doc(collection(storeDocRef, 'users'), selectedCustomer.id);

      // Get current photos array from Firestore
      const customerDoc = customers.find(c => c.id === selectedCustomer.id);
      const currentPhotos = customerDoc?.photos || [];

      // Update Firestore with new photo references
      await updateDoc(customerDocRef, {
        photos: [...currentPhotos, ...uploadedPhotos.map(p => p.ref)]
      });

      alert('Photos uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Error uploading photos: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoRef, photoType) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const storageRef = ref(storage, photoRef);
      await deleteObject(storageRef);

      // Update state
      if (photoType === 'customer') {
        setCustomerPhotos(prev => prev.filter(p => p.ref !== photoRef));
      } else {
        setOrderPhotos(prev => prev.filter(p => p.ref !== photoRef));
      }

      // Update Firestore
      const storeId = localStorage.getItem('selectedStoreId');
      if (!storeId || !selectedCustomer?.id) return;

      const storeUsersRef = collection(db, 'StoreUsers');
      const storeDocRef = doc(storeUsersRef, storeId);
      const customerDocRef = doc(collection(storeDocRef, 'users'), selectedCustomer.id);

      // Get current photos array from Firestore
      const customerDoc = customers.find(c => c.id === selectedCustomer.id);
      const currentPhotos = customerDoc?.photos || [];

      // Update Firestore with filtered photo references
      await updateDoc(customerDocRef, {
        photos: currentPhotos.filter(p => p !== photoRef)
      });

      alert('Photo deleted successfully!');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Error deleting photo: ' + error.message);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.customer-search-container') && !e.target.closest('.customer-modal')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup global handler on unmount
  useEffect(() => {
    return () => {
      if (window.handleNewCustomer) {
        delete window.handleNewCustomer;
      }
    };
  }, []);

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer?.id) return;

    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      const storeId = localStorage.getItem('selectedStoreId');
      if (!storeId) return;

      const storeUsersRef = collection(db, 'StoreUsers');
      const storeDocRef = doc(storeUsersRef, storeId);
      const customerDocRef = doc(collection(storeDocRef, 'users'), selectedCustomer.id);

      // Delete customer document
      await deleteDoc(customerDocRef);

      // Update state
      setCustomers(prev => prev.filter(c => c.id !== selectedCustomer.id));

      // Close modal and reset selection
      setShowCustomerModal(false);
      onCustomerSelect(null);
      setSearchTerm('');

      alert('Customer deleted successfully!');
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer: ' + error.message);
    }
  };

  const handleUpdateCustomer = async (updatedCustomerData) => {
    if (!selectedCustomer?.id) return;

    try {
      const storeId = localStorage.getItem('selectedStoreId');
      if (!storeId) return;

      const storeUsersRef = collection(db, 'StoreUsers');
      const storeDocRef = doc(storeUsersRef, storeId);
      const customerDocRef = doc(collection(storeDocRef, 'users'), selectedCustomer.id);

      // Update customer document
      await updateDoc(customerDocRef, {
        name: updatedCustomerData.name,
        tel: updatedCustomerData.tel,
        secondaryTel: updatedCustomerData.secondaryTel,
        email: updatedCustomerData.email,
        streetAddress: updatedCustomerData.streetAddress,
        aptNumber: updatedCustomerData.aptNumber,
        city: updatedCustomerData.city,
        postCode: updatedCustomerData.postCode,
        driverInstructions: updatedCustomerData.driverInstructions,
        notes: updatedCustomerData.notes,
        privateNotes: updatedCustomerData.privateNotes,
        subrent: updatedCustomerData.business,
        paymentType: updatedCustomerData.paymentType,
        marketingOptIn: updatedCustomerData.marketingOptIn,
        invoiceStyle: updatedCustomerData.invoiceStyle,
        discount: updatedCustomerData.discount,
        credit: updatedCustomerData.credit,
        taxExempt: updatedCustomerData.taxExempt
      });

      // Update local state
      const updatedCustomers = customers.map(c => {
        if (c.id === selectedCustomer.id) {
          return {
            ...c,
            name: updatedCustomerData.name,
            phone: updatedCustomerData.tel,
            altPhone: updatedCustomerData.secondaryTel,
            email: updatedCustomerData.email,
            address: updatedCustomerData.streetAddress,
            aptNumber: updatedCustomerData.aptNumber,
            city: updatedCustomerData.city,
            postCode: updatedCustomerData.postCode,
            driverInstructions: updatedCustomerData.driverInstructions,
            notes: updatedCustomerData.notes,
            privateNotes: updatedCustomerData.privateNotes,
            business: updatedCustomerData.business,
            paymentType: updatedCustomerData.paymentType,
            marketingOptIn: updatedCustomerData.marketingOptIn,
            invoiceStyle: updatedCustomerData.invoiceStyle,
            discount: updatedCustomerData.discount,
            credit: updatedCustomerData.credit,
            taxExempt: updatedCustomerData.taxExempt
          };
        }
        return c;
      });

      setCustomers(updatedCustomers);

      // Update selected customer
      onCustomerSelect({
        ...selectedCustomer,
        name: updatedCustomerData.name,
        phone: updatedCustomerData.tel,
        altPhone: updatedCustomerData.secondaryTel,
        email: updatedCustomerData.email,
        address: updatedCustomerData.streetAddress,
        aptNumber: updatedCustomerData.aptNumber,
        city: updatedCustomerData.city,
        postCode: updatedCustomerData.postCode,
        driverInstructions: updatedCustomerData.driverInstructions,
        notes: updatedCustomerData.notes,
        privateNotes: updatedCustomerData.privateNotes,
        business: updatedCustomerData.business,
        paymentType: updatedCustomerData.paymentType,
        marketingOptIn: updatedCustomerData.marketingOptIn,
        invoiceStyle: updatedCustomerData.invoiceStyle,
        discount: updatedCustomerData.discount,
        credit: updatedCustomerData.credit,
        taxExempt: updatedCustomerData.taxExempt
      });

      alert('Customer updated successfully!');
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer: ' + error.message);
    }
  };

  const CustomerModal = () => {
    if (!selectedCustomer) return null;

    const tabs = ['Order', 'Stats', 'Edit Customer', 'Payments', 'Photos'];
    const [activeTabInModal, setActiveTabInModal] = useState('Order');
    const [editFormData, setEditFormData] = useState({
      name: selectedCustomer.name || '',
      tel: selectedCustomer.phone || '',
      secondaryTel: selectedCustomer.altPhone || '',
      email: selectedCustomer.email || '',
      streetAddress: selectedCustomer.address || '',
      aptNumber: selectedCustomer.aptNumber || '',
      city: selectedCustomer.city || '',
      postCode: selectedCustomer.postCode || '',
      driverInstructions: selectedCustomer.driverInstructions || '',
      notes: selectedCustomer.notes || '',
      privateNotes: selectedCustomer.privateNotes || '',
      business: selectedCustomer.business || 'No Account',
      paymentType: selectedCustomer.paymentType || 'Default',
      marketingOptIn: selectedCustomer.marketingOptIn || '',
      invoiceStyle: selectedCustomer.invoiceStyle || 'Store Default',
      discount: selectedCustomer.discount || '',
      credit: selectedCustomer.credit || '',
      taxExempt: selectedCustomer.taxExempt || false
    });

    const handleFormChange = (field, value) => {
      setEditFormData(prev => ({
        ...prev,
        [field]: value
      }));
    };

    const handleFloatingInputChange = (id, value) => {
      setEditFormData(prev => ({
        ...prev,
        [id]: value
      }));
    };

    const handleSubmitEdit = (e) => {
      e.preventDefault();
      handleUpdateCustomer(editFormData);
    };

    // Calculate stats from fetched orders
    const calculateStats = () => {
      const orders = customerOrders.length > 0 ? customerOrders : (selectedCustomer.orders || []);

      if (orders.length === 0) {
        return {
          orders: 0,
          sales: '$ 0.00',
          paid: '$ 0.00',
          unpaid: '$ 0.00',
          totalQty: 0,
          weight: '0lbs',
          signedUp: 'N/A',
          lastOrder: 'N/A',
          frequency: 'N/A',
          avgSpend: '$ 0.00',
          unusedPoints: 0,
          usedPoints: 0
        };
      }

      let totalSales = 0;
      let totalPaid = 0;
      let totalQty = 0;
      let dates = [];

      orders.forEach(order => {
        totalSales += Number(order.total) || 0;
        if (order.paymentStatus === 'Paid') {
          totalPaid += Number(order.total) || 0;
        }

        // Calculate total quantity based on items
        const orderQty = Array.isArray(order.items)
          ? order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
          : 0;

        totalQty += orderQty;

        if (order.placed) {
          let orderDate;
          if (typeof order.placed === 'string') {
            orderDate = new Date(order.placed);
          } else if (order.placed instanceof Date) {
            orderDate = order.placed;
          }

          if (orderDate && !isNaN(orderDate.getTime())) {
            dates.push(orderDate);
          }
        }
      });

      // Sort dates to find first and last order
      dates.sort((a, b) => a - b);
      const firstOrder = dates.length > 0 ? dates[0] : null;
      const lastOrder = dates.length > 0 ? dates[dates.length - 1] : null;

      // Calculate average order frequency
      let frequency = 'N/A';
      if (dates.length > 1) {
        const daysBetween = (lastOrder - firstOrder) / (1000 * 60 * 60 * 24);
        const avgDaysBetweenOrders = Math.round(daysBetween / (dates.length - 1));
        frequency = `${avgDaysBetweenOrders} Days`;
      }

      return {
        orders: orders.length,
        sales: `$ ${totalSales.toFixed(2)}`,
        paid: `$ ${totalPaid.toFixed(2)}`,
        unpaid: `$ ${(totalSales - totalPaid).toFixed(2)}`,
        totalQty,
        weight: `${Math.round(totalQty * 0.5)}lbs`, // Approximate weight
        signedUp: firstOrder ? firstOrder.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        lastOrder: lastOrder ? lastOrder.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        frequency,
        avgSpend: `$ ${orders.length > 0 ? (totalSales / orders.length).toFixed(2) : '0.00'}`,
        unusedPoints: selectedCustomer.unusedPoints || 0,
        usedPoints: selectedCustomer.usedPoints || 0
      };
    };

    const statsData = calculateStats();

    const contactsData = {
      address1: {
        title: 'Address 1',
        hemp: selectedCustomer.name,
        value: `${selectedCustomer.address || ''}${selectedCustomer.aptNumber ? ', Apt ' + selectedCustomer.aptNumber : ''}
${selectedCustomer.city || ''} ${selectedCustomer.postCode || ''}
${selectedCustomer.phone || ''}
${selectedCustomer.email || ''}`
      }
    };

    const renderTabContent = () => {
      switch (activeTabInModal) {
        case 'Order':
          return (
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Placed</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Order</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Payment</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingOrders ? (
                      <tr>
                        <td colSpan="7" className="px-3 py-4 text-center">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                          <p className="mt-2 text-sm text-gray-500">Loading orders...</p>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {customerOrders.length > 0 ? (
                          customerOrders.map((order, index) => (
                            <tr key={index} className="text-sm hover:bg-gray-50">
                              <td className="px-3 py-2">{order.id}</td>
                              <td className="px-3 py-2">{order.placed}</td>
                              <td className="px-3 py-2">
                                {Array.isArray(order.items) && order.items.map((item, i) => (
                                  <div key={i}>{item.name} (x{item.quantity})</div>
                                ))}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${order.status === orderStatus.Completed
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {order.status || orderStatus.Pending}
                                </span>
                              </td>
                              <td className="px-3 py-2">{order.notes || '-'}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                  {order.paymentStatus} ({order.paymentMethod})
                                </span>
                              </td>
                              <td className="px-3 py-2">${Number(order.total).toFixed(2)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="px-3 py-4 text-center text-gray-500">
                              No orders found for this customer.
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );

        case 'Stats':
          return (
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-6 gap-4">
                <StatsCard title="Orders" value={statsData.orders} />
                <StatsCard title="Sales" value={statsData.sales} />
                <StatsCard title="Paid" value={statsData.paid} />
                <StatsCard title="Unpaid" value={statsData.unpaid} light={true} />
                <StatsCard title="Total Qty" value={statsData.totalQty} />
                <StatsCard title="Weight" value={statsData.weight} />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <InfoCard title="Signed Up" value={statsData.signedUp} />
                <InfoCard title="Last Order" value={statsData.lastOrder} />
                <InfoCard title="Frequency" value={statsData.frequency} />
                <InfoCard title="Avg Spend" value={statsData.avgSpend} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <PointsCard
                  title="Unused loyalty points"
                  value={statsData.unusedPoints}
                  textColor="text-blue-600"
                />
                <PointsCard
                  title="Used loyalty points"
                  value={statsData.usedPoints}
                  textColor="text-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <ContactCard {...contactsData.address1} />
              </div>
            </div>
          );

        case 'Edit Customer':
          return (
            <div className="p-4">
              <form className="space-y-4" onSubmit={handleSubmitEdit}>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Name</label>
                    <FloatingInput
                      id="name"
                      value={editFormData.name}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Tel</label>
                    <FloatingInput
                      id="tel"
                      value={editFormData.tel}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Secondary Tel</label>
                    <FloatingInput
                      id="secondaryTel"
                      value={editFormData.secondaryTel}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email</label>
                    <FloatingInput
                      id="email"
                      type="email"
                      value={editFormData.email}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Street Address</label>
                    <FloatingInput
                      id="streetAddress"
                      value={editFormData.streetAddress}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Apt/Number</label>
                    <FloatingInput
                      id="aptNumber"
                      value={editFormData.aptNumber}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">City</label>
                    <FloatingInput
                      id="city"
                      value={editFormData.city}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Post Code</label>
                    <FloatingInput
                      id="postCode"
                      value={editFormData.postCode}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Driver Instructions</label>
                    <FloatingInput
                      id="driverInstructions"
                      value={editFormData.driverInstructions}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <FloatingInput
                      id="notes"
                      value={editFormData.notes}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Private Notes</label>
                    <FloatingInput
                      id="privateNotes"
                      value={editFormData.privateNotes}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Business</label>
                    <select
                      name="business"
                      value={editFormData.business}
                      onChange={(e) => handleFormChange('business', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option>No Account</option>
                      <option>Business</option>
                      <option>Personal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Type</label>
                    <select
                      name="paymentType"
                      value={editFormData.paymentType}
                      onChange={(e) => handleFormChange('paymentType', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option>Default</option>
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Marketing Opt-in</label>
                    <select
                      name="marketingOptIn"
                      value={editFormData.marketingOptIn}
                      onChange={(e) => handleFormChange('marketingOptIn', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Invoice Style</label>
                    <select
                      name="invoiceStyle"
                      value={editFormData.invoiceStyle}
                      onChange={(e) => handleFormChange('invoiceStyle', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option>Store Default</option>
                      <option>Custom</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Discount %</label>
                    <FloatingInput
                      id="discount"
                      type="number"
                      value={editFormData.discount}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Credit</label>
                    <FloatingInput
                      id="credit"
                      type="number"
                      value={editFormData.credit}
                      onChange={handleFloatingInputChange}
                    />
                  </div>
                  <div className="flex items-center mt-6">
                    <Switch
                      id="taxExempt"
                      checked={editFormData.taxExempt}
                      onChange={(e) => handleFormChange('taxExempt', e.target.checked)}
                      label="Tax Exempt"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={handleDeleteCustomer}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md border border-red-600"
                  >
                    Delete User
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          );

        case 'Payments':
          return (
            <div className="p-4">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Payment Type</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Payment Status</th>
                    <th className="px-4 py-2 text-left">Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOrders ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-4 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading payment records...</p>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {customerOrders.length > 0 ? (
                        customerOrders.map((order, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">{order.id}</td>
                            <td className="px-4 py-2">{order.placed}</td>
                            <td className="px-4 py-2">{order.paymentMethod || 'Card'}</td>
                            <td className="px-4 py-2">$ {Number(order.total).toFixed(2)}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td className="px-4 py-2">{order.staffName || 'Staff'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                            No payment records found for this customer.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          );

          case 'Photos':
          return (
            <div className="p-4">
              <div className="mb-8">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Drag and Drop here</p>
                    <p className="text-sm text-gray-500">or</p>
                    <label className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm cursor-pointer">
                      Select file
                      <input 
                        type="file" 
                        hidden 
                        multiple
                        accept="image/*"
                        onChange={(e) => handleUploadPhoto(e, 'customer')}
                        disabled={uploadingPhoto}
                      />
                    </label>
                    {uploadingPhoto && (
                      <p className="mt-2 text-sm text-blue-600">Uploading photos...</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-4">Customer Images</h3>
                <div className="grid grid-cols-6 gap-4 mb-8">
                  {customerPhotos.length > 0 ? (
                    customerPhotos.map((photo, index) => (
                      <div
                        key={`customer-${index}`}
                        className="aspect-square bg-gray-50 rounded-lg flex flex-col items-center justify-center relative group"
                      >
                        <img 
                          src={photo.url} 
                          alt={`Customer ${index + 1}`} 
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button 
                          onClick={() => handleDeletePhoto(photo.ref, 'customer')}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <>
                      {[...Array(6)].map((_, index) => (
                        <div
                          key={`customer-placeholder-${index}`}
                          className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center"
                        >
                          <div className="w-full h-full bg-gray-100 rounded-lg" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-4">Order Images</h3>
                <div className="mb-4">
                  <label className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm cursor-pointer inline-block">
                    Upload Order Images
                    <input 
                      type="file" 
                      hidden 
                      multiple
                      accept="image/*"
                      onChange={(e) => handleUploadPhoto(e, 'order')}
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-6 gap-4">
                  {orderPhotos.length > 0 ? (
                    orderPhotos.map((photo, index) => (
                      <div
                        key={`order-${index}`}
                        className="aspect-square bg-gray-50 rounded-lg flex flex-col items-center justify-center relative group"
                      >
                        <img 
                          src={photo.url} 
                          alt={`Order ${index + 1}`} 
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button 
                          onClick={() => handleDeletePhoto(photo.ref, 'order')}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <>
                      {[...Array(6)].map((_, index) => (
                        <div
                          key={`order-placeholder-${index}`}
                          className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center"
                        >
                          <div className="w-full h-full bg-gray-100 rounded-lg" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
      }
    };

    const StatsCard = ({ title, value, light }) => (
      <div className={`p-4 rounded-lg ${light ? 'bg-blue-50' : 'bg-gray-50'}`}>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    );

    const InfoCard = ({ title, value }) => (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    );

    const PointsCard = ({ title, value, textColor }) => (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-lg font-semibold ${textColor}`}>{value}</p>
      </div>
    );

    const ContactCard = ({ title, hemp, value }) => (
      <div className="space-y-2">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-sm font-medium">{hemp}</p>
        <p className="text-sm whitespace-pre-line">{value}</p>
      </div>
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 customer-modal">
        <div
          style={{
            position: 'fixed',
            width: '70%',
            left: '0px',
            height: '80%',
            margin: 'auto',
            marginTop: '69px'
          }}
          className="absolute right-0 top-0 h-full w-[70%] bg-white overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">{selectedCustomer.name}</h2>
            <button
              onClick={() => setShowCustomerModal(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b">
            <div className="flex space-x-1 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTabInModal(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${activeTabInModal === tab
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-auto" style={{ height: 'calc(100vh - 120px)' }}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="customer-search-container relative">
      <div className="flex items-center w-full">
        <div className="relative flex-grow">
          <input
            type="text"
            className="w-full p-2 border rounded-l-md pl-8"
            placeholder="Search customer by name, phone or email"
            value={searchTerm}
            onChange={handleInputChange}
            onClick={() => setShowDropdown(true)}
          />
          <Search
            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />

          {showDropdown && searchTerm && (
            <div
              className="absolute z-[1000] w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto"
              style={{
                top: '100%',
                left: 0,
              }}
            >
              {loading ? (
                <div className="p-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading customers...</p>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">{error}</div>
              ) : customers
                .filter(customer =>
                  customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  customer.phone?.includes(searchTerm) ||
                  customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(customer => (
                  <div
                    key={customer.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b"
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.phone}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                        <div className="text-sm text-gray-500">{customer.address}</div>
                      </div>
                      <div className="text-sm text-gray-400">
                        Last visit: {customer.lastVisit}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <button
          className="bg-[#1D4FB6] p-2 rounded-r-md"
          onClick={handleIconClick}
        >
          <span className="text-white">
            {selectedCustomer ? <User size={18} /> : <Plus size={18} />}
          </span>
        </button>
      </div>

      {showCustomerModal && <CustomerModal />}
    </div>
  );
};

export default CustomerSearch;