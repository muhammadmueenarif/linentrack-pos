import { useState, useEffect } from 'react';

const useAdminId = () => {
  const [adminId, setAdminId] = useState(null);

  useEffect(() => {
    // For POS app, get userId from localStorage userData
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        setAdminId(parsedData.id || parsedData.userId || null);
      } catch (error) {
        console.error('Error parsing userData for adminId:', error);
        setAdminId(null);
      }
    }
  }, []);

  return adminId;
};

export default useAdminId;

