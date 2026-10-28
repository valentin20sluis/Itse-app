import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  updateUserMetadata: vi.fn(),
  returning: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("react", () => ({ cache: <T,>(fn: T) => fn }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
  clerkClient: async () => ({ users: { updateUserMetadata: mocks.updateUserMetadata } }),
}));
vi.mock("@/db", () => {
  const insertChain = {
    values: () => ({ onConflictDoUpdate: mocks.onConflictDoUpdate }),
  };
  mocks.onConflictDoUpdate.mockImplementation(() => ({ returning: mocks.returning }));
  return {
    db: {
      insert: () => insertChain,
      select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }),
    },
  };
});

import { getCurrentUser, getOrCreateUser } from "./user.service";

const clerkUser = (role?: unknown) => ({
  publicMetadata: role === undefined ? {} : { role },
  primaryEmailAddress: { emailAddress: "a@b.pe" },
  firstName: "Ana",
  lastName: "Perez",
});

describe("getOrCreateUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve null sin sesión", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect(await getOrCreateUser()).toBeNull();
    expect(mocks.returning).not.toHaveBeenCalled();
  });

  it("usuario nuevo: inserta como cliente y escribe metadata en Clerk", async () => {
    mocks.auth.mockResolvedValue({ userId: "u1" });
    mocks.currentUser.mockResolvedValue(clerkUser());
    mocks.returning.mockResolvedValue([{ clerkId: "u1", rol: "cliente", activo: true }]);

    const result = await getOrCreateUser();

    expect(result?.rol).toBe("cliente");
    expect(mocks.updateUserMetadata).toHaveBeenCalledWith("u1", {
      publicMetadata: { role: "cliente" },
    });
  });

  it("rol de Clerk distinto: lo propaga a la tabla y no reescribe metadata", async () => {
    mocks.auth.mockResolvedValue({ userId: "u1" });
    mocks.currentUser.mockResolvedValue(clerkUser("admin"));
    mocks.returning.mockResolvedValue([{ clerkId: "u1", rol: "admin", activo: true }]);

    const result = await getOrCreateUser();

    expect(result?.rol).toBe("admin");
    expect(mocks.updateUserMetadata).not.toHaveBeenCalled();
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: expect.objectContaining({ rol: "admin" }) }),
    );
  });

  it("rol inválido en Clerk se trata como cliente", async () => {
    mocks.auth.mockResolvedValue({ userId: "u1" });
    mocks.currentUser.mockResolvedValue(clerkUser("root"));
    mocks.returning.mockResolvedValue([{ clerkId: "u1", rol: "cliente", activo: true }]);

    await getOrCreateUser();

    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: expect.objectContaining({ rol: "cliente" }) }),
    );
  });

  it("la sincronización no modifica activo", async () => {
    mocks.auth.mockResolvedValue({ userId: "u1" });
    mocks.currentUser.mockResolvedValue(clerkUser("admin"));
    mocks.returning.mockResolvedValue([{ clerkId: "u1", rol: "admin", activo: false }]);

    await getOrCreateUser();

    const { set } = mocks.onConflictDoUpdate.mock.calls[0][0];
    expect(Object.keys(set)).not.toContain("activo");
  });

  it("es idempotente: dos llamadas usan upsert por clerk_id", async () => {
    mocks.auth.mockResolvedValue({ userId: "u1" });
    mocks.currentUser.mockResolvedValue(clerkUser("cliente"));
    mocks.returning.mockResolvedValue([{ clerkId: "u1", rol: "cliente", activo: true }]);

    await getOrCreateUser();
    await getOrCreateUser();

    expect(mocks.onConflictDoUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.anything() }),
    );
  });
});

describe("getCurrentUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve null sin sesión", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect(await getCurrentUser()).toBeNull();
  });

  it("devuelve el usuario de la tabla o null", async () => {
    mocks.auth.mockResolvedValue({ userId: "u1" });
    mocks.limit.mockResolvedValueOnce([{ clerkId: "u1", rol: "admin" }]);
    expect((await getCurrentUser())?.rol).toBe("admin");
    mocks.limit.mockResolvedValueOnce([]);
    expect(await getCurrentUser()).toBeNull();
  });
});
