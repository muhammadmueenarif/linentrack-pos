"use client";
import { configureStore } from '@reduxjs/toolkit';
import subscriberReducer from './slices/subscriberSlice'; 
import storeSettingsReducer from './slices/storeSettingsSlice';
// Removed admin-specific reducers that are not needed for POS
import storeUsersReducer from './slices/addStoreUser';


export const store = configureStore({
  reducer: {
    subscriber: subscriberReducer,
    storeSettings: storeSettingsReducer,
    storeUsers: storeUsersReducer
  },
});