export class Cache<T> {
  private values = new Map<string, { value: T; expires: number }>();
  constructor(
    private ttl: number,
    private max = 100,
  ) {}
  get(key: string): T | undefined {
    const item = this.values.get(key);
    if (!item) return;
    if (item.expires <= Date.now()) {
      this.values.delete(key);
      return;
    }
    return item.value;
  }
  set(key: string, value: T) {
    for (const [k, v] of this.values)
      if (v.expires <= Date.now()) this.values.delete(k);
    if (this.values.size >= this.max)
      this.values.delete(this.values.keys().next().value!);
    this.values.set(key, { value, expires: Date.now() + this.ttl });
    return value;
  }
}
