"use client";
import React, { useState } from 'react';
import Image from 'next/image';

const POSSidebar = ({ subscriptionData }) => {
  const [selectedService, setSelectedService] = useState('Dry Cleaning');

  // Get features from subscription data
  const features = subscriptionData?.features || {};

  const services = [
    {
      id: 'dry-cleaning',
      name: 'Dry Cleaning',
      icon: '/Pos/sidebar/drycleaning.svg',
      enabled: true
    },
    {
      id: 'laundromat',
      name: 'Laundromat',
      icon: '/Pos/sidebar/Laundromat.svg',
      enabled: false
    },
    {
      id: 'bulk-laundry',
      name: 'Bulk Laundry',
      icon: '/Pos/sidebar/BulkLaundry.svg',
      enabled: false
    },
    {
      id: 'rental',
      name: 'Rental',
      icon: '/Pos/sidebar/Rental.svg',
      enabled: features.rental !== false // Enable if rental feature is not explicitly disabled
    }
  ];

  return (
    <div 
      className="fixed left-0"
      style={{
        width: '280px',
        height: 'calc(100vh - 64px)',
        left: '0px',
        top: '64px',
        background: '#1D50B6',
        borderRadius: '0px',
        zIndex: 1,
        margin: 0,
        padding: 0,
        border: 'none'
      }}
    >
      {/* POS Title */}
      <div 
        className="absolute text-white"
        style={{
          position: 'absolute',
          left: '20px',
          top: '20px',
          fontFamily: 'Poppins',
          fontStyle: 'normal',
          fontWeight: 700,
          fontSize: '32px',
          lineHeight: '48px',
          color: '#FFFFFF'
        }}
      >
        POS
      </div>

      {/* Service Menu Items */}
      <div className="absolute w-full" style={{ top: '80px', left: '0', right: '0', padding: '0 20px' }}>
        {services.map((service, index) => {
          const isSelected = selectedService === service.name;
          const isDisabled = !service.enabled;
          
          return (
            <div
              key={service.id}
              className={`relative cursor-pointer transition-all duration-200 ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
              }`}
              onClick={() => !isDisabled && setSelectedService(service.name)}
              style={{
                left: '0',
                right: '0',
                top: `${index * 35}px`,
                height: '30px',
                marginBottom: '5px',
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px'
              }}
            >
              {/* Icon Container */}
              <div 
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: '19px',
                  height: '19px',
                  background: 'rgba(217, 217, 217, 0.1)',
                  border: '0.542857px solid #FFFFFF',
                  borderRadius: '2.71429px',
                  marginRight: '20px'
                }}
              >
                <Image
                  src={service.icon}
                  alt={service.name}
                  width={19}
                  height={19}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Service Name */}
              <div 
                className="text-white flex items-center flex-grow"
                style={{
                  fontFamily: 'Poppins',
                  fontWeight: isSelected ? 900 : 500,
                  fontSize: '15.913px',
                  lineHeight: '24px'
                }}
              >
                {service.name}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div 
                  className="absolute bg-white rounded-full"
                  style={{
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '6px',
                    height: '30px'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default POSSidebar;
