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

export const sendOTP = async (phone: string): Promise<boolean> => {
  console.warn("sendOTP is not wired to backend", { phone });
  throw new Error("sendOTP is not implemented for production.");
};

export const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
  console.warn("verifyOTP is not wired to backend", { phone, otp });
  throw new Error("verifyOTP is not implemented for production.");
};

export const createAccount = async (_userData: unknown): Promise<boolean> => {
  throw new Error("createAccount helper is not implemented for production.");
};

export const resetPassword = async (phone: string, _newPassword: string): Promise<boolean> => {
  console.warn("resetPassword is not wired to backend", { phone });
  throw new Error("resetPassword is not implemented for production.");
};
