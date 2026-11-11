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

export interface RegisterCommandOptions {
  silent?: boolean;
}

class CommandRegistry {
  private commands = new Map<string, Command>();

  public register(command: Command, options?: RegisterCommandOptions): () => void {
    if (this.commands.has(command.id) && !options?.silent) {
      console.warn(`[CommandRegistry] Warning: Command with ID "${command.id}" is already registered and will be overwritten.`);
    }
    this.commands.set(command.id, command);
    return () => {
      if (this.commands.get(command.id) === command) {
        this.commands.delete(command.id);
      }
    };
  }

  public registerHandler(
    id: string,
    name: string,
    handler: CommandHandler,
    description?: string,
    options?: RegisterCommandOptions
  ): () => void {
    return this.register({ id, name, handler, description }, options);
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
