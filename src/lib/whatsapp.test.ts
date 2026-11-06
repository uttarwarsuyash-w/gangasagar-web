import { describe, expect, it } from 'vitest';
import { statusMessage, telLink, waLink } from './whatsapp';

describe('waLink', () => {
  it('builds a wa.me link with the 10 digits and encoded text', () => {
    expect(waLink('+91 94039 51524', 'Hi there')).toBe('https://wa.me/919403951524?text=Hi%20there');
  });
  it('accepts a bare 10-digit number', () => {
    expect(waLink('9372188080', 'a&b')).toBe('https://wa.me/919372188080?text=a%26b');
  });
});

describe('telLink', () => {
  it('uses +91', () => expect(telLink('94039 51524')).toBe('tel:+919403951524'));
});

describe('statusMessage', () => {
  const order = { number: 'GKS-2611-00012', total: 389 };
  it('includes the order number and status in English', () => {
    const m = statusMessage(order, 'Dispatched', 'en');
    expect(m).toContain('GKS-2611-00012');
    expect(m).toContain('Dispatched');
    expect(m).toContain('₹389');
  });
  it('includes the order number and status in Hindi', () => {
    const m = statusMessage(order, 'Dispatched', 'hi');
    expect(m).toContain('GKS-2611-00012');
    expect(m).toContain('भेज दिया');
    expect(m).toMatch(/[ऀ-ॿ]/);
  });
});

describe('statusMessage order link', () => {
  it('links the customer back to their order page (where outside-Nanded orders are paid)', () => {
    const m = statusMessage({ id: 'o-123', number: 'GKS-2611-00012', total: 389 }, 'Order Confirmed', 'en');
    expect(m).toContain(`${window.location.origin}/en/account/order/?id=o-123`);
  });
  it('uses the Hindi page for a Hindi message', () => {
    const m = statusMessage({ id: 'o-123', number: 'GKS-2611-00012', total: 389 }, 'Order Confirmed', 'hi');
    expect(m).toContain('/hi/account/order/?id=o-123');
  });
});
