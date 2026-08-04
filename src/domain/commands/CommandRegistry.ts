export interface CommandContext {
  payload?: any;
}

export type CommandHandler = (context?: CommandContext) => void | Promise<void>;

export interface Command {
  id: string;
  name: string;
  description?: string;
  handler: CommandHandler;
}

class CommandRegistry {
  private commands = new Map<string, Command>();

  public register(command: Command): () => void {
    this.commands.set(command.id, command);
    return () => {
      this.commands.delete(command.id);
    };
  }

  public registerHandler(id: string, name: string, handler: CommandHandler, description?: string): () => void {
    return this.register({ id, name, handler, description });
  }

  public execute(id: string, payload?: any): boolean {
    const cmd = this.commands.get(id);
    if (cmd) {
      try {
        cmd.handler({ payload });
        return true;
      } catch (error) {
        console.error(`Failed to execute command ${id}:`, error);
        return false;
      }
    }
    return false;
  }

  public has(id: string): boolean {
    return this.commands.has(id);
  }

  public get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  public clear(): void {
    this.commands.clear();
  }
}

export const commandRegistry = new CommandRegistry();
