export const STRIPE_PRODUCTS = {
  ENTERPRISE: {
    id: 'prod_S6qesDxxgPZFFu',
    priceId: 'price_1RCcwkPqxAfGLqhdqhp4MPQE',
    name: 'Mieter-App Enterprise',
    description: 'Unbegrenzte Objekte',
    price: '600,00 €',
    mode: 'subscription' as const,
    maxObjects: 999999
  },
  PRO: {
    id: 'prod_S6qdvJNkrNK6er',
    priceId: 'price_1RCcwRPqxAfGLqhdOtoQZl1j',
    name: 'Mieter-App (Pro)',
    description: '10 Objekte',
    price: '250,00 €',
    mode: 'subscription' as const,
    maxObjects: 10
  },
  BASIC: {
    id: 'prod_S6fGfSkwa6c2xK',
    priceId: 'price_1RCRw1PqxAfGLqhdHIp3hw3z',
    name: 'Mieter-App Basic',
    description: '2 Objekte',
    price: '49,00 €',
    mode: 'subscription' as const,
    maxObjects: 2
  }
} as const;

export type StripePlan = keyof typeof STRIPE_PRODUCTS;