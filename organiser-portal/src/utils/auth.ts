// Validation utilities
export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length === 10 && /^[6-9]/.test(cleaned);
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Indian names sample data
export const INDIAN_NAMES = [
  "Aarav", "Vihaan", "Aditya", "Aryan", "Rohan",
  "Vikram", "Rajesh", "Amit", "Priya", "Ananya",
];

// Mock OTP service - Replace with backend call
export const sendOTP = async (phone: string): Promise<boolean> => {
  // Replace with actual API call to backend
  console.log(`OTP sent to ${phone}`);
  return true;
};

export const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
  // Replace with actual API call to backend
  // For demo: accept "123456"
  return otp === "123456";
};

export const createAccount = async (userData: any): Promise<boolean> => {
  // Replace with actual API call to backend
  console.log("Account created:", userData);
  return true;
};

export const resetPassword = async (phone: string, newPassword: string): Promise<boolean> => {
  // Replace with actual API call to backend
  console.log("Password reset for:", phone);
  return true;
};
