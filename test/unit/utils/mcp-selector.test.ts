import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectMcpServices } from '../../../src/utils/mcp-selector';
import { MCP_SERVICES } from '../../../src/constants';
import inquirer from 'inquirer';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

vi.mock('ansis', () => ({
  default: {
    gray: (text: string) => text,
    yellow: (text: string) => text
  }
}));

describe('mcp-selector utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('MCP_SERVICES constant', () => {
    it('should have MCP_SERVICES defined', () => {
      expect(MCP_SERVICES).toBeDefined();
      expect(Array.isArray(MCP_SERVICES)).toBe(true);
    });

    it('should have correct structure for each service', () => {
      MCP_SERVICES.forEach(service => {
        expect(service).toHaveProperty('id');
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('description');
        expect(service).toHaveProperty('config');
        expect(typeof service.id).toBe('string');
        expect(typeof service.name).toBe('object');
        expect(typeof service.description).toBe('object');
        expect(typeof service.config).toBe('object');
      });
    });

    it('should have at least one MCP service', () => {
      expect(MCP_SERVICES.length).toBeGreaterThan(0);
    });

    it('should have both zh-CN and en names for each service', () => {
      MCP_SERVICES.forEach(service => {
        expect(service.name).toHaveProperty('zh-CN');
        expect(service.name).toHaveProperty('en');
        expect(typeof service.name['zh-CN']).toBe('string');
        expect(typeof service.name.en).toBe('string');
      });
    });

    it('should have both zh-CN and en descriptions for each service', () => {
      MCP_SERVICES.forEach(service => {
        expect(service.description).toHaveProperty('zh-CN');
        expect(service.description).toHaveProperty('en');
        expect(typeof service.description['zh-CN']).toBe('string');
        expect(typeof service.description.en).toBe('string');
      });
    });

    it('should have unique IDs for each service', () => {
      const ids = MCP_SERVICES.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid config structure for each service', () => {
      MCP_SERVICES.forEach(service => {
        expect(service.config).toHaveProperty('command');
        expect(typeof service.config.command).toBe('string');
        
        if (service.config.args) {
          expect(Array.isArray(service.config.args)).toBe(true);
        }
        
        if (service.config.type) {
          expect(typeof service.config.type).toBe('string');
        }
      });
    });
  });

  describe('selectMcpServices', () => {
    it('should return selected services when user makes selection', async () => {
      const selectedIds = ['filesystem', 'brave-search'];
      vi.mocked(inquirer.prompt).mockResolvedValue({ services: selectedIds });

      const result = await selectMcpServices('zh-CN');

      expect(result).toEqual(selectedIds);
      expect(inquirer.prompt).toHaveBeenCalledWith({
        type: 'checkbox',
        name: 'services',
        message: expect.any(String),
        choices: expect.any(Array)
      });
    });

    it('should return empty array when no services selected', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ services: [] });

      const result = await selectMcpServices('en');

      expect(result).toEqual([]);
    });

    it('should return undefined when cancelled', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ services: undefined });
      const consoleSpy = vi.spyOn(console, 'log');

      const result = await selectMcpServices('zh-CN');

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should build choices with correct language', async () => {
      const promptSpy = vi.mocked(inquirer.prompt).mockResolvedValue({ services: [] });

      await selectMcpServices('en');

      const call = promptSpy.mock.calls[0][0] as any;
      expect(call.choices).toBeDefined();
      expect(call.choices.length).toBe(MCP_SERVICES.length);
      
      // Check that choices are built with English names
      call.choices.forEach((choice: any, index: number) => {
        expect(choice.value).toBe(MCP_SERVICES[index].id);
        expect(choice.name).toContain(MCP_SERVICES[index].name.en);
        expect(choice.selected).toBe(false);
      });
    });

    it('should build choices with Chinese language', async () => {
      const promptSpy = vi.mocked(inquirer.prompt).mockResolvedValue({ services: [] });

      await selectMcpServices('zh-CN');

      const call = promptSpy.mock.calls[0][0] as any;
      expect(call.choices).toBeDefined();
      
      // Check that choices are built with Chinese names
      call.choices.forEach((choice: any, index: number) => {
        expect(choice.value).toBe(MCP_SERVICES[index].id);
        expect(choice.name).toContain(MCP_SERVICES[index].name['zh-CN']);
        expect(choice.selected).toBe(false);
      });
    });

    it('should handle all available services selection', async () => {
      const allServiceIds = MCP_SERVICES.map(s => s.id);
      vi.mocked(inquirer.prompt).mockResolvedValue({ services: allServiceIds });

      const result = await selectMcpServices('zh-CN');

      expect(result).toEqual(allServiceIds);
      expect(result?.length).toBe(MCP_SERVICES.length);
    });
  });

  describe('selectMcpServices integration', () => {
    it('should load mcp-selector module', async () => {
      const module = await import('../../../src/utils/mcp-selector');
      expect(module).toBeDefined();
      expect(module.selectMcpServices).toBeDefined();
      expect(typeof module.selectMcpServices).toBe('function');
    });
  });
});