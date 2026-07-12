export type NavLink = {
  label: string;
  href: string;
};

export type LoginOption = {
  role?: "player" | "organiser";
  href?: string;
  label: string;
  desc: string;
  icon: string;
};

export type Feature = {
  id: string;
  number: string;
  icon: string;
  title: string;
  description: string;
};

export type Step = {
  id: string;
  number: string;
  title: string;
  description: string;
  color: "lime" | "electric" | "coral" | "violet" | "amber";
};

export type PricingPlan = {
  id: string;
  tag: string;
  amount: string;
  period: string;
  name: string;
  items: string[];
  featured?: boolean;
  buttonText: string;
  buttonHref: string;
};

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  location: string;
};

export type FAQItem = {
  id: string;
  question: string;
  answer: string;
};
