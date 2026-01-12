// Generate a 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Verify OTP
export const verifyOTP = (
  inputOTP: string,
  storedOTP: string,
  otpExpires: Date
): boolean => {
  // Check if OTP matches and is not expired
  const now = new Date();

  // Ensure otpExpires is a Date object
  const expiresDate = new Date(otpExpires);

  // Compare OTP strings (make sure to trim whitespace)
  const otpMatches = inputOTP.trim() === storedOTP.trim();

  // Check if OTP is still valid
  const isNotExpired = expiresDate > now;

  return otpMatches && isNotExpired;
};

export const getOTPExpiration = (): Date => {
  const now = new Date();
  // Add 10 minutes (600000 milliseconds)
  const expires = new Date(now.getTime() + 10 * 60 * 1000);
  return expires;
};
