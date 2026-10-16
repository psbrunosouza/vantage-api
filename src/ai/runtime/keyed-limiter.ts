export class KeyedLimiter {
  private readonly active = new Map<string, number>();
  private readonly waiting = new Map<string, (() => void)[]>();

  constructor(private readonly limit: number) {}

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    await this.acquire(key);

    try {
      return await task();
    } finally {
      this.release(key);
    }
  }

  private acquire(key: string): Promise<void> {
    const active = this.active.get(key) ?? 0;

    if (active < this.limit) {
      this.active.set(key, active + 1);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.waiting.set(key, [...(this.waiting.get(key) ?? []), resolve]);
    });
  }

  private release(key: string): void {
    const [next, ...rest] = this.waiting.get(key) ?? [];

    if (next) {
      if (rest.length > 0) this.waiting.set(key, rest);
      else this.waiting.delete(key);
      next();
      return;
    }

    const active = (this.active.get(key) ?? 1) - 1;

    if (active > 0) this.active.set(key, active);
    else this.active.delete(key);
  }
}
