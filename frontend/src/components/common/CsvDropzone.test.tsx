import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CsvDropzone } from './CsvDropzone';

const csv = () => new File(['customer_id\nC1'], 'customers.csv', { type: 'text/csv' });
describe('CsvDropzone', () => {
  it('accepts a dropped CSV and prevents browser navigation', () => {
    const onChange = vi.fn();
    render(<CsvDropzone file={null} onChange={onChange} />);
    const zone = screen.getByRole('button', { name: 'Browse Files' });
    fireEvent.dragEnter(zone);
    expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument();
    const file = csv();
    expect(fireEvent.drop(zone, { dataTransfer: { files: [file] } })).toBe(false);
    expect(onChange).toHaveBeenCalledWith(file);
  });
  it('browses, shows metadata, replaces and removes a file', async () => {
    const onChange = vi.fn();
    const file = csv();
    const { rerender } = render(<CsvDropzone file={null} onChange={onChange} />);
    await userEvent.upload(screen.getByLabelText('CSV file'), file);
    expect(onChange).toHaveBeenCalledWith(file);
    rerender(<CsvDropzone file={file} onChange={onChange} />);
    expect(screen.getByText('customers.csv')).toBeInTheDocument();
    expect(screen.getByText(/text\/csv/)).toBeInTheDocument();
    const picker = screen.getByLabelText('CSV file');
    const click = vi.spyOn(picker, 'click');
    await userEvent.click(screen.getByRole('button', { name: 'Replace file' }));
    expect(click).toHaveBeenCalled();
    await userEvent.upload(picker, new File(['a\nb'], 'replacement.csv'));
    expect(onChange.mock.lastCall?.[0].name).toBe('replacement.csv');
    await userEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
  it.each([
    [new File(['x'], 'a.pdf'), /Unsupported file format/],
    [new File([], 'a.csv'), /file is empty/],
    [new File(['123456'], 'a.csv'), /too large/],
  ])('rejects invalid files before preview', (file, message) => {
    const onChange = vi.fn();
    render(<CsvDropzone file={null} maxBytes={5} onChange={onChange} />);
    fireEvent.drop(screen.getByRole('button', { name: 'Browse Files' }), { dataTransfer: { files: [file] } });
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(onChange).toHaveBeenCalledWith(null);
  });
  it('supports keyboard browsing and blocks drops during upload', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<CsvDropzone file={null} onChange={onChange} />);
    const click = vi.spyOn(screen.getByLabelText('CSV file'), 'click');
    screen.getByRole('button', { name: 'Browse Files' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(click).toHaveBeenCalled();
    rerender(<CsvDropzone file={null} disabled onChange={onChange} />);
    fireEvent.drop(screen.getByRole('button', { name: 'Browse Files' }), { dataTransfer: { files: [csv()] } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
