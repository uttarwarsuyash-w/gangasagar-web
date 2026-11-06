import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductList } from './ProductList';

const products = [
  { id: 'p1', slug: 'peanuts', name_en: 'Peanuts', name_hi: null, brand: 'RK', is_active: true, variant_count: 2, category_name: 'Namkeen' },
];

describe('ProductList', () => {
  it('asks for confirmation before deleting a product', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => {});
    render(<ProductList lang="en" products={products} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /Delete Peanuts/ }));
    expect(onDelete).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('p1');
  });

  it('does not delete when the dialog is cancelled', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => {});
    render(<ProductList lang="en" products={products} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /Delete Peanuts/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('links each product to its edit page', () => {
    render(<ProductList lang="hi" products={products} onDelete={vi.fn()} />);
    for (const link of screen.getAllByRole('link', { name: /Peanuts/ })) {
      expect(link).toHaveAttribute('href', '/hi/admin/products/edit/?id=p1');
    }
  });
});
