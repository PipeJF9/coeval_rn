import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearByPrefix, readJson, removeItem, writeJson } from '../../src/core/utils/storage';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockReset();
  (AsyncStorage.setItem as jest.Mock).mockReset();
  (AsyncStorage.removeItem as jest.Mock).mockReset();
  (AsyncStorage.getAllKeys as jest.Mock).mockReset();
  (AsyncStorage.multiRemove as jest.Mock).mockReset();
});

describe('readJson', () => {
  it('returns null when the key does not exist', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    expect(await readJson('missing')).toBeNull();
  });

  it('parses and returns stored JSON', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ name: 'Ana' }));
    expect(await readJson<{ name: string }>('user')).toEqual({ name: 'Ana' });
  });

  it('returns null when stored value is invalid JSON', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json{{{');
    expect(await readJson('bad')).toBeNull();
  });

  it('returns null when stored value is an empty string', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('');
    expect(await readJson('empty')).toBeNull();
  });
});

describe('writeJson', () => {
  it('serializes the value and calls setItem', async () => {
    await writeJson('session', { token: 'abc' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('session', JSON.stringify({ token: 'abc' }));
  });

  it('handles arrays', async () => {
    await writeJson('list', [1, 2, 3]);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('list', '[1,2,3]');
  });
});

describe('removeItem', () => {
  it('calls AsyncStorage.removeItem with the key', async () => {
    await removeItem('my_key');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('my_key');
  });
});

describe('clearByPrefix', () => {
  it('removes only keys that start with the prefix', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
      'cache:teacher:abc',
      'cache:student:xyz',
      'session',
    ]);

    await clearByPrefix('cache:teacher');

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['cache:teacher:abc']);
  });

  it('does nothing when no keys match the prefix', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['session', 'user']);
    await clearByPrefix('cache:');
    expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
  });

  it('removes all matching keys when multiple match', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
      'cache:a',
      'cache:b',
      'other',
    ]);
    await clearByPrefix('cache:');
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['cache:a', 'cache:b']);
  });
});
