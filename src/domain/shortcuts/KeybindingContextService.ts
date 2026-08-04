/**
 * 上下文服务：负责维护系统当前激活的上下文 Key，并评估 when 条件表达式
 */
export class KeybindingContextService {
  private activeContexts = new Set<string>(['global']);

  /**
   * 设置上下文键状态
   */
  public setContext(key: string, value: boolean): void {
    if (value) {
      this.activeContexts.add(key);
    } else {
      this.activeContexts.delete(key);
    }
  }

  /**
   * 检查指定上下文键是否处于激活状态
   */
  public hasContext(key: string): boolean {
    return this.activeContexts.has(key);
  }

  /**
   * 评估 when 表达式
   * 支持简单条件: "inEditor", "!modalOpen", "inEditor && !modalOpen", "searchFocused || inEditor"
   */
  public evaluate(when?: string): boolean {
    if (!when || !when.trim()) {
      return true;
    }

    const orClauses = when.split('||').map(s => s.trim());
    return orClauses.some(orClause => {
      const andClauses = orClause.split('&&').map(s => s.trim());
      return andClauses.every(clause => {
        if (clause.startsWith('!')) {
          const key = clause.substring(1).trim();
          return !this.activeContexts.has(key);
        }
        return this.activeContexts.has(clause);
      });
    });
  }

  /**
   * 重置所有非全局上下文
   */
  public reset(): void {
    this.activeContexts.clear();
    this.activeContexts.add('global');
  }
}

export const defaultContextService = new KeybindingContextService();
