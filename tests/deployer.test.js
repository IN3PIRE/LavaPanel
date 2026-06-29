// Mock fs.promises — inline jest.fn() to avoid Jest hoisting issues
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    rm: jest.fn().mockResolvedValue(undefined)
  }
}));

// Keep references for assertions — read from the mocked module
const mockFsMkdir = require('fs').promises.mkdir;
const mockFsWriteFile = require('fs').promises.writeFile;
const mockFsRm = require('fs').promises.rm;

// Mock child_process spawn
const mockSpawn = jest.fn(() => ({
  pid: 55555,
  on: jest.fn(),
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() }
}));
jest.mock('child_process', () => ({ spawn: mockSpawn }));

const Deployer = require('../deployer/index');

describe('Deployer', () => {
  let deployer;

  beforeEach(() => {
    deployer = new Deployer();
    jest.clearAllMocks();
  });

  describe('deploy()', () => {
    test('throws error for unsupported type', async () => {
      await expect(
        deployer.deploy({ type: 'unknown', name: 'test', config: {}, userId: 1 })
      ).rejects.toThrow('Unsupported server type: unknown');
    });

    test('deploys a Discord bot and creates template files', async () => {
      const result = await deployer.deploy({
        type: 'discord',
        name: 'My Bot',
        config: { token: 'discord_token_123' },
        userId: 1
      });

      expect(result.serverId).toBeDefined();
      expect(result.serverId).toMatch(/^srv_/);
      expect(result.path).toContain('1');

      // Should have created 3 files
      expect(mockFsMkdir).toHaveBeenCalled();
      expect(mockFsWriteFile).toHaveBeenCalledTimes(3);

      // Check that index.js was written with Discord client code
      const indexJsCall = mockFsWriteFile.mock.calls.find(
        call => call[0].endsWith('index.js')
      );
      expect(indexJsCall).toBeDefined();
      expect(indexJsCall[1]).toContain('discord.js');
      expect(indexJsCall[1]).toContain('client.login');
    });

    test('deploys a Minecraft server and creates config files', async () => {
      const result = await deployer.deploy({
        type: 'minecraft',
        name: 'Survival World',
        config: { port: 25565, ram: '4G', maxPlayers: 10, motd: 'Welcome!' },
        userId: 2
      });

      expect(result.serverId).toBeDefined();
      expect(result.serverId).toMatch(/^srv_/);

      // Should have created 4 files
      expect(mockFsMkdir).toHaveBeenCalled();
      expect(mockFsWriteFile).toHaveBeenCalledTimes(4);

      // Verify server.properties
      const propsCall = mockFsWriteFile.mock.calls.find(
        call => call[0].endsWith('server.properties')
      );
      expect(propsCall).toBeDefined();
      expect(propsCall[1]).toContain('server-port=25565');
      expect(propsCall[1]).toContain('max-players=10');

      // Verify eula.txt
      const eulaCall = mockFsWriteFile.mock.calls.find(
        call => call[0].endsWith('eula.txt')
      );
      expect(eulaCall).toBeDefined();
      expect(eulaCall[1]).toContain('eula=true');
    });
  });

  describe('start / stop / restart', () => {
    let serverId;

    beforeEach(async () => {
      const result = await deployer.deploy({
        type: 'discord',
        name: 'Test Bot',
        config: { token: 'x' },
        userId: 1
      });
      serverId = result.serverId;
    });

    test('start() spawns a child process', async () => {
      const result = await deployer.start(serverId);
      expect(result.pid).toBe(55555);
      expect(mockSpawn).toHaveBeenCalled();
    });

    test('start() throws for unknown server', async () => {
      await expect(deployer.start('srv_nonexistent')).rejects.toThrow('Server not found');
    });

    test('stop() kills the process', async () => {
      const mockKill = jest.fn();
      mockSpawn.mockReturnValue({
        pid: 55555,
        kill: mockKill,
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() }
      });

      await deployer.start(serverId);
      const result = await deployer.stop(serverId);

      expect(result.message).toBe('Server stopped');
      expect(mockKill).toHaveBeenCalled();
    });

    test('stop() throws when server is not running', async () => {
      await expect(deployer.stop(serverId)).rejects.toThrow('Server is not running');
    });

    test('restart() stops then starts', async () => {
      const mockKill = jest.fn();
      mockSpawn.mockReturnValue({
        pid: 55555,
        kill: mockKill,
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() }
      });

      await deployer.start(serverId);
      const result = await deployer.restart(serverId);
      expect(mockKill).toHaveBeenCalled();
      expect(result.pid).toBe(55555);
    });
  });

  describe('delete()', () => {
    test('removes a server and its files', async () => {
      const result = await deployer.deploy({
        type: 'discord',
        name: 'Delete Me',
        config: { token: 'x' },
        userId: 1
      });

      const delResult = await deployer.delete(result.serverId);
      expect(delResult.message).toBe('Server deleted');
      expect(mockFsRm).toHaveBeenCalled();
    });

    test('throws for non-existent server', async () => {
      await expect(deployer.delete('srv_nonexistent')).rejects.toThrow('Server not found');
    });
  });

  describe('list()', () => {
    test('returns all deployed servers', async () => {
      await deployer.deploy({ type: 'discord', name: 'Bot 1', config: {}, userId: 1 });
      await deployer.deploy({ type: 'minecraft', name: 'MC 1', config: {}, userId: 1 });

      const list = deployer.list();
      expect(list).toHaveLength(2);
    });

    test('filters by userId when provided', async () => {
      await deployer.deploy({ type: 'discord', name: 'Bot 1', config: {}, userId: 1 });
      await deployer.deploy({ type: 'minecraft', name: 'MC 1', config: {}, userId: 2 });

      const user1Servers = deployer.list(1);
      const user2Servers = deployer.list(2);

      expect(user1Servers).toHaveLength(1);
      expect(user2Servers).toHaveLength(1);
    });
  });

  describe('getLogs()', () => {
    test('returns empty array (placeholder)', () => {
      const logs = deployer.getLogs('any_id');
      expect(logs).toEqual([]);
    });
  });

  describe('generateServerId()', () => {
    test('generates unique IDs', () => {
      const id1 = deployer.generateServerId();
      const id2 = deployer.generateServerId();
      expect(id1).toMatch(/^srv_/);
      expect(id1).not.toBe(id2);
    });
  });
});
