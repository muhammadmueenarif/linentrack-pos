// Access Mode enum for POS portal
export const AccessMode = {
  POS: 'POS'
};

// Helper function to check if user has POS access (case-insensitive)
export const hasPOSAccess = (userAccessMode) => {
  if (!userAccessMode) return false;
  return userAccessMode.toLowerCase() === AccessMode.POS.toLowerCase();
};

