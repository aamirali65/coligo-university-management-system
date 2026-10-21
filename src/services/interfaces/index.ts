import type { ListParams, Paginated } from "@/types";
import type { Actor } from "../types";

/**
 * Service ports.
 *
 * These interfaces describe the contract each feature service fulfils. The
 * mock implementations in `src/services/*` satisfy them today; a future
 * HTTP-backed implementation can satisfy the same ports and be swapped in
 * without changing any component code.
 */

export interface ReadPort<T, TInput = Partial<T>> {
  list(db: unknown, params?: ListParams): Paginated<T>;
  byId(db: unknown, id: string): T | undefined;
  create(input: TInput, actor: Actor): Promise<T>;
  update(id: string, input: TInput, actor: Actor): Promise<T>;
  remove(id: string, actor: Actor): Promise<void>;
}

export interface MutationPort<T, TInput> {
  create(input: TInput, actor: Actor): Promise<T>;
  update(id: string, input: TInput, actor: Actor): Promise<T>;
  remove?(id: string, actor: Actor): Promise<void>;
}
