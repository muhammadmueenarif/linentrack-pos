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
        position: 'fixed',
        left: '0',
        width: '15%',
        top: '61px',
        height: 'calc(100vh - 61px)',
        background: '#1D50B6',
        borderTopRightRadius: '13.9286px',
        borderBottomRightRadius: '1.76812px',
        zIndex: 10,
        margin: 0,
        padding: 0,
        border: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Background Gradient Circles - Positioned as per design */}
      {/* Circle 1: Bottom Left Corner */}
      <div
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          left: '-50px',
          bottom: '-80px',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 64.89%)',
          opacity: 0.5,
          borderRadius: '50%'
        }}
      />
      
      {/* Circle 2: Center Y-axis, attached to left side */}
      <div
        style={{
          position: 'absolute',
          width: '150px',
          height: '150px',
          top: '54%',
          background: 'linear-gradient(rgba(255, 255, 255, 0.15) 0%, rgb(255 255 255 / 11%) 64.89%)',
          opacity: 0.35,
          borderRadius: '50%',
          left: '-83px',
          transform: 'translateY(-50%)'
        }}
      />
      
      {/* Circle 3: Top Right with margin, attached to right side */}
      <div
        style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          right: '-200px',
          top: '50px',
          background: 'linear-gradient(rgb(255 255 255 / 9%) 0%, rgba(255, 255, 255, 0) 64.89%)',
          opacity: 0.5,
          borderRadius: '50%',
          transform: 'rotate(-87deg)'
        }}
      />
      
      {/* POS Title */}
      <button
        onClick={() => setSelectedService('Dry Cleaning')}
        className="absolute text-white cursor-pointer hover:opacity-80 transition-opacity"
        style={{
          position: 'absolute',
          left: '20px',
          top: '20px',
          fontFamily: 'Poppins',
          fontStyle: 'normal',
          fontWeight: 700,
          fontSize: '32px',
          lineHeight: '48px',
          color: '#FFFFFF',
          background: 'none',
          border: 'none',
          padding: 0,
          textAlign: 'left',
          zIndex: 1
        }}
      >
        POS
      </button>

      {/* Service Menu Items */}
      <div className="absolute w-full" style={{ top: '0', left: '0', right: '0', bottom: '0', zIndex: 1 }}>
        {services.map((service, index) => {
          const isSelected = selectedService === service.name;
          const isDisabled = !service.enabled;
          
          // Calculate positions for each item - spacing them vertically from the title
          const titleHeight = 68; // Title height (20px top + 48px line-height)
          const baseTop = titleHeight + 40; // Start below title with spacing
          const itemSpacing = 48; // Spacing between items
          const topPixels = baseTop + (index * itemSpacing);
          
          return (
            <div
              key={service.id}
              className={`relative transition-all duration-200 ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
              }`}
              onClick={() => !isDisabled && setSelectedService(service.name)}
              style={{
                position: 'absolute',
                left: '20px',
                top: `${topPixels}px`,
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                padding: '0',
                zIndex: 2
              }}
            >
              {/* Icon Container */}
              <div 
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: '19px',
                  height: '19px',
                  marginRight: '12px'
                }}
              >
                <Image
                  src={service.icon}
                  alt={service.name}
                  width={19}
                  height={19}
                  style={{
                    width: '19px',
                    height: '19px'
                  }}
                />
              </div>

              {/* Service Name */}
              <div 
                className="text-white flex items-center flex-grow"
                style={{
                  fontFamily: 'Poppins',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: '15.913px',
                  lineHeight: '24px',
                  color: isDisabled ? 'rgba(255, 255, 255, 0.5)' : '#FFFFFF'
                }}
              >
                {service.name}
              </div>

              {/* Selection Indicator - White vertical bar on the left */}
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
