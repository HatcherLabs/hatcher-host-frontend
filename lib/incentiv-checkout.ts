import { getToken } from './api';
import { API_URL } from './config';

export async function startIncentivCheckout(target: {
  kind: string;
  key: string;
  billingPeriod: 'monthly' | 'annual';
  agentId?: string | null;
  quantity?: number;
} | {kind: "hosting"; projectId:string}) {
  const token = getToken();
  const response = await fetch(API_URL + '/payments/incentiv-x402/orders', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(target),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? result.error ?? 'Checkout unavailable');
  const checkout = new URL(result.url);
  if (checkout.origin !== new URL(API_URL).origin || !/^\/payments\/incentiv-x402\/orders\/[a-f0-9-]{36}$/.test(checkout.pathname)) throw new Error('Invalid checkout URL');
  window.location.assign(checkout.href + '/checkout');
}
