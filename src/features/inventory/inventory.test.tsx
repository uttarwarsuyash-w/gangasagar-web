import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui/Toast';
import { getDictionary } from '@/i18n/get-dictionary';
import { AppError } from '@/lib/errors';

const { adjustStock } = vi.hoisted(() => ({ adjustStock: vi.fn() }));
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  adjustStock,
  listStock: vi.fn(),
  listMovements: vi.fn(async () => []),
}));

import { AdjustStockDialog } from './AdjustStockDialog';
import { StockTable } from './StockTable';
import type { StockRow } from './api';

const en = getDictionary('en');
const row: StockRow = {
  variantId: 'v1',
  productName: 'Peanuts',
  productNameHi: null,
  label: '500 g',
  labelHi: null,
  stockQty: 7,
  stockUnit: 'packs',
  minStock: 10,
  limitedBelow: 5,
};

const renderDialog = (onSaved = vi.fn()) =>
  render(
    <ToastProvider>
      <AdjustStockDialog lang="en" row={row} open onClose={vi.fn()} onSaved={onSaved} />
    </ToastProvider>,
  );

const qtyInput = () => screen.getByLabelText(/Quantity/);
const save = () => screen.getByRole('button', { name: en.common.save });

describe('AdjustStockDialog', () => {
  beforeEach(() => {
    adjustStock.mockReset();
  });

  it('keeps Save disabled for quantity ≤ 0 on incoming, damaged and expired', async () => {
    const user = userEvent.setup();
    renderDialog();
    for (const kind of ['incoming', 'damaged', 'expired']) {
      await user.selectOptions(screen.getByLabelText(en.admin.stock.kind), kind);
      await user.clear(qtyInput());
      expect(save()).toBeDisabled();
      await user.type(qtyInput(), '0');
      expect(save()).toBeDisabled();
      await user.clear(qtyInput());
      await user.type(qtyInput(), '-3');
      expect(save()).toBeDisabled();
      await user.clear(qtyInput());
      await user.type(qtyInput(), '2');
      expect(save()).toBeEnabled();
    }
  });

  it('allows a negative quantity for adjustment', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.selectOptions(screen.getByLabelText(en.admin.stock.kind), 'adjustment');
    await user.type(qtyInput(), '-2');
    expect(save()).toBeEnabled();
    await user.clear(qtyInput());
    await user.type(qtyInput(), '0');
    expect(save()).toBeDisabled();
  });

  it('sends the typed quantity and kind unchanged', async () => {
    const user = userEvent.setup();
    adjustStock.mockResolvedValue(4.5);
    const onSaved = vi.fn();
    renderDialog(onSaved);
    await user.selectOptions(screen.getByLabelText(en.admin.stock.kind), 'damaged');
    await user.type(qtyInput(), '2.5');
    await user.type(screen.getByLabelText(en.admin.stock.note), 'torn pouches');
    await user.click(save());
    expect(adjustStock).toHaveBeenCalledWith('v1', 'damaged', 2.5, 'torn pouches');
    expect(onSaved).toHaveBeenCalledWith(4.5);
  });

  it('shows a readable message for insufficient_stock', async () => {
    const user = userEvent.setup();
    adjustStock.mockImplementation(async () => {
      throw new AppError('insufficient_stock');
    });
    renderDialog();
    await user.selectOptions(screen.getByLabelText(en.admin.stock.kind), 'damaged');
    await user.type(qtyInput(), '20');
    await user.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent(en.admin.errors.insufficient_stock);
  });
});

describe('StockTable', () => {
  const rows: StockRow[] = [
    row,
    { ...row, variantId: 'v2', productName: 'Chana', stockQty: 12 },
    { ...row, variantId: 'v3', productName: 'Peas', stockQty: 3, minStock: null },
  ];

  it('shows every row by default', () => {
    render(<StockTable lang="en" rows={rows} onAdjust={vi.fn()} onHistory={vi.fn()} />);
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('“Low stock” shows only rows below their minimum', async () => {
    const user = userEvent.setup();
    render(<StockTable lang="en" rows={rows} onAdjust={vi.fn()} onHistory={vi.fn()} />);
    await user.click(screen.getByLabelText(en.admin.stock.lowOnly));
    const body = screen.getAllByRole('rowgroup')[1];
    const shown = within(body).getAllByRole('row');
    expect(shown).toHaveLength(1);
    expect(shown[0]).toHaveTextContent('Peanuts');
  });
});
