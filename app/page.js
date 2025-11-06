"use client"

import React, { useState, useEffect } from 'react';
import PosMainComponent from "./Pos/components/PosMainComponent";
import POSSidebar from "./Pos/components/POSSidebar";
import Navbar from './Admin/Navbar';
import InactivityPINPopup from './Common/Components/InactivityPINPopup';
import BackgroundBlur from './Common/Components/BackgroundBlur';
import ClockInModal from './Common/Components/ClockInModal';
import useInactivityDetection from './Common/Components/useInactivityDetection';
import { ClockProvider, useClock } from './Common/Components/ClockContext';
import useAutoClockManager from './Common/Components/AutoClockManager';

export const dynamic = 'force-dynamic';

const POSContent = () => {
  const [userData, setUserData] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const { stopClock, resumeClock } = useClock();

  // Get user data and store ID
  useEffect(() => {
    const storedUserData = JSON.parse(localStorage.getItem('userData') || 'null');
    const storedStoreId = localStorage.getItem('selectedStoreId');
    const storedSubscriptionData = localStorage.getItem('subscriptionData');

    setUserData(storedUserData);
    setStoreId(storedStoreId);
    if (storedSubscriptionData) {
      setSubscriptionData(JSON.parse(storedSubscriptionData));
    }
  }, []);

  // Use auto clock manager
  const {
    currentShift,
    isAutoClockEnabled,
    hasManualClockIn,
    performAutoClockIn,
    setHasManualClockIn
  } = useAutoClockManager(userData, storeId);

  // Use inactivity detection hook
  const {
    isInactive,
    showPINPopup,
    isClockStopped,
    handlePINSuccess,
    handlePINClose,
    getClockInFunction
  } = useInactivityDetection(userData, storeId);

  // Stop clock when staff becomes inactive
  useEffect(() => {
    if (isInactive && !isClockStopped) {
      stopClock();
    }
  }, [isInactive, isClockStopped, stopClock]);

  // Resume clock when PIN is verified
  const handlePINSuccessWithClock = async () => {
    resumeClock();

    // If auto clock is enabled, perform auto clock-in
    if (isAutoClockEnabled && !hasManualClockIn) {
      await performAutoClockIn();
    }

    handlePINSuccess();
  };

  const handleClockInSuccess = () => {
    // Mark that manual clock-in has been completed
    setHasManualClockIn(false);
    // After manual clock-in, auto-clock should be enabled for subsequent logins
    // The AutoClockManager will detect the existing shift and enable auto-clock
  };

  return (
    <div className="flex h-screen">
      <BackgroundBlur isActive={showPINPopup || hasManualClockIn}>
        <Navbar />
        <POSSidebar subscriptionData={subscriptionData} />
        <div className="flex-1" style={{ marginLeft: '280px', marginTop: '70px', marginRight: '0px' }}>
          <PosMainComponent />
        </div>
      </BackgroundBlur>

      {/* Manual Clock-In Modal */}
      {hasManualClockIn && userData && storeId && (
        <ClockInModal
          isOpen={hasManualClockIn}
          userData={userData}
          storeId={storeId}
          onClockInSuccess={handleClockInSuccess}
          onClose={() => {}} // Don't allow closing without clocking in
        />
      )}

      {/* Inactivity PIN Popup */}
      {showPINPopup && userData && storeId && (
        <InactivityPINPopup
          isOpen={showPINPopup}
          onClose={handlePINClose}
          onSuccess={handlePINSuccessWithClock}
          userData={userData}
          storeId={storeId}
          onClockIn={getClockInFunction()}
        />
      )}
    </div>
  );
};

const Page = () => {
  return (
    <ClockProvider>
      <POSContent />
    </ClockProvider>
  );
};

export default Page;
