import { MessageBuffer } from '../pipeline/messageBuffer.js';

// Mock for testing
const mockFlushFn = jest.fn();

describe('MessageBuffer', () => {
  beforeEach(() => {
    mockFlushFn.mockClear();
  });

  it('should create a buffer with correct max size', () => {
    const buffer = new MessageBuffer(10, mockFlushFn, 'test');
    expect(buffer).toBeDefined();
  });

  it('should accumulate items in buffer', () => {
    const buffer = new MessageBuffer(10, mockFlushFn, 'test');
    buffer.push({ id: 1 });
    buffer.push({ id: 2 });
    // Can't directly access buffer, but we know it was called
    expect(mockFlushFn).not.toHaveBeenCalled();
  });

  it('should flush when buffer reaches max size', async () => {
    const buffer = new MessageBuffer(2, mockFlushFn, 'test');
    buffer.push({ id: 1 });
    buffer.push({ id: 2 });
    // Should trigger flush on third push
    buffer.push({ id: 3 });
    // Wait for async flush
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockFlushFn).toHaveBeenCalled();
  });

  it('should pass all items to flush function', async () => {
    const buffer = new MessageBuffer(2, mockFlushFn, 'test');
    buffer.push({ id: 1 });
    buffer.push({ id: 2 });
    buffer.push({ id: 3 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockFlushFn).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })]),
    );
  });

  it('should not flush empty buffer', async () => {
    const buffer = new MessageBuffer(10, mockFlushFn, 'test');
    await buffer.flush();
    expect(mockFlushFn).not.toHaveBeenCalled();
  });
});
