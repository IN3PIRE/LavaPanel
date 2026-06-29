const mockExec = jest.fn();
jest.mock('child_process', () => ({ exec: mockExec }));

const mockAxiosGet = jest.fn();
jest.mock('axios', () => ({ get: mockAxiosGet }));

const autoUpdate = require('../server/utils/auto-update');

describe('Auto-Update Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getCurrentVersion()', () => {
    test('returns the trimmed SHA from git rev-parse', async () => {
      mockExec.mockImplementation((cmd, cb) => {
        cb(null, 'abc123def456\n');
      });

      const version = await autoUpdate.getCurrentVersion();
      expect(version).toBe('abc123def456');
    });

    test('returns null when git command fails', async () => {
      mockExec.mockImplementation((cmd, cb) => {
        cb(new Error('not a git repository'));
      });

      const version = await autoUpdate.getCurrentVersion();
      expect(version).toBeNull();
    });
  });

  describe('getLatestVersion()', () => {
    test('returns the SHA from GitHub API', async () => {
      mockAxiosGet.mockResolvedValue({ data: { sha: 'latest_sha_789' } });

      const version = await autoUpdate.getLatestVersion();
      expect(version).toBe('latest_sha_789');
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.github.com/repos/IN3PIRE/LavaPanel/commits/main'
      );
    });

    test('returns null when API call fails', async () => {
      mockAxiosGet.mockRejectedValue(new Error('Network error'));

      const version = await autoUpdate.getLatestVersion();
      expect(version).toBeNull();
    });
  });

  describe('updatePanel()', () => {
    test('skips update when both versions match', async () => {
      mockExec.mockImplementation((cmd, cb) => {
        cb(null, 'same_sha\n');
      });
      mockAxiosGet.mockResolvedValue({ data: { sha: 'same_sha' } });

      const result = await autoUpdate.updatePanel();
      // No git pull should happen
      expect(mockExec).toHaveBeenCalledTimes(1); // only getCurrentVersion
    });

    test('skips update when version fetch fails', async () => {
      mockExec.mockImplementation((cmd, cb) => cb(new Error('fail')));

      const result = await autoUpdate.updatePanel();
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    test('performs update when versions differ', async () => {
      let callCount = 0;
      mockExec.mockImplementation((cmd, cb) => {
        callCount++;
        if (callCount === 1) {
          // getCurrentVersion
          cb(null, 'old_sha\n');
        } else {
          // git pull
          cb(null, 'Updating...');
        }
      });
      mockAxiosGet.mockResolvedValue({ data: { sha: 'new_sha' } });

      await autoUpdate.updatePanel();

      // Should have called exec twice: rev-parse + git fetch/reset/install
      expect(mockExec).toHaveBeenCalledTimes(2);
      const gitCmd = mockExec.mock.calls[1][0];
      expect(gitCmd).toContain('git fetch');
      expect(gitCmd).toContain('npm install');
    });

    test('rejects when git pull fails', async () => {
      let callCount = 0;
      mockExec.mockImplementation((cmd, cb) => {
        callCount++;
        if (callCount === 1) {
          cb(null, 'old_sha\n');
        } else {
          cb(new Error('merge conflict'));
        }
      });
      mockAxiosGet.mockResolvedValue({ data: { sha: 'new_sha' } });

      await expect(autoUpdate.updatePanel()).rejects.toThrow('merge conflict');
    });
  });

  describe('start()', () => {
    test('runs updatePanel immediately and sets interval', () => {
      mockExec.mockImplementation((cmd, cb) => cb(new Error('fail')));
      mockAxiosGet.mockRejectedValue(new Error('fail'));

      autoUpdate.start();

      // First immediate run
      expect(mockExec).toHaveBeenCalled();

      // Advance past the interval
      const intervalMs = parseInt(process.env.AUTO_UPDATE_INTERVAL) || 3600000;
      jest.advanceTimersByTime(intervalMs + 1000);

      // Should have been called again
      expect(mockExec).toHaveBeenCalledTimes(2);
    });
  });
});
