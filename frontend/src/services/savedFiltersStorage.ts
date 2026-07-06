export interface SavedFilterRecord {
  id: string;
  name: string;
  filters: Record<string, string | number>;
  created_at: string;
}

function storageKey(viewKey: string) {
  return `super:saved-filters:${viewKey}`;
}

function readAll(viewKey: string): SavedFilterRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(viewKey));
    return raw ? (JSON.parse(raw) as SavedFilterRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(viewKey: string, items: SavedFilterRecord[]) {
  localStorage.setItem(storageKey(viewKey), JSON.stringify(items));
}

export function createLocalSavedFiltersClient(viewKey: string) {
  return {
    async list(): Promise<SavedFilterRecord[]> {
      return readAll(viewKey);
    },
    async create(body: {
      name: string;
      filters: Record<string, string | number>;
    }): Promise<SavedFilterRecord> {
      const item: SavedFilterRecord = {
        id: crypto.randomUUID(),
        name: body.name.trim(),
        filters: body.filters,
        created_at: new Date().toISOString(),
      };
      const items = readAll(viewKey);
      items.unshift(item);
      writeAll(viewKey, items);
      return item;
    },
    async remove(id: string): Promise<void> {
      writeAll(
        viewKey,
        readAll(viewKey).filter((item) => item.id !== id)
      );
    },
  };
}

export const managerTasksSavedFiltersClient = createLocalSavedFiltersClient("manager_tasks");
