import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  budget: vi.fn(), userFind: vi.fn(), tokenCreate: vi.fn(), tokenUpdate: vi.fn(),
  tokenFind: vi.fn(), userUpdate: vi.fn(), deliver: vi.fn(),
}));
vi.mock("@/server/attempt-budget", () => ({consumeSensitiveActionBudget: mocks.budget}));
vi.mock("@/server/recovery-email-mail", () => ({sendRecoveryEmailVerification: mocks.deliver}));
const tx = {
  recoveryEmailToken: {findUnique: mocks.tokenFind, updateMany: mocks.tokenUpdate},
  user: {updateMany: mocks.userUpdate},
};
vi.mock("@/server/db", () => ({db: {
  user: {findFirst:mocks.userFind},
  recoveryEmailToken: {create:mocks.tokenCreate, updateMany:mocks.tokenUpdate},
  $transaction: async (fn:(tx:typeof tx)=>unknown) => fn(tx),
}}));
import { requestRecoveryEmailVerification, confirmRecoveryEmailVerification } from "@/server/recovery-email-verification";
const user={userId:"u1",tenantId:"tenant-1",locale:"ar"};
const expiry=() => new Date(Date.now()+30*60_000);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.userFind.mockResolvedValue({recoveryEmail:"owner@example.test",recoveryEmailVerifiedAt:null});
  mocks.tokenCreate.mockResolvedValue({id:"record-1"});
  mocks.tokenUpdate.mockResolvedValue({count:1});
  mocks.userUpdate.mockResolvedValue({count:1});
});

describe("recovery email verification", () => {
  it("never verifies the address merely upon signup or send", async () => {
    const result=await requestRecoveryEmailVerification(user, mocks.deliver);
    expect(result).toEqual({accepted:true,sent:true});
    expect(mocks.deliver).toHaveBeenCalledWith(expect.objectContaining({email:"owner@example.test"}));
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.tokenCreate.mock.calls[0][0].data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("invalidates a token if email delivery fails", async () => {
    mocks.deliver.mockRejectedValue(new Error("SMTP unavailable"));
    expect(await requestRecoveryEmailVerification(user,mocks.deliver)).toEqual({accepted:true,sent:false});
    expect(mocks.tokenUpdate).toHaveBeenCalledWith(expect.objectContaining({data:{usedAt:expect.any(Date)}}));
  });
  it("rejects invalid or undelivered confirmation tokens", async () => {
    await expect(confirmRecoveryEmailVerification({...user,token:"bad"})).rejects.toThrow("INVALID_VERIFICATION_TOKEN");
    mocks.tokenFind.mockResolvedValue({userId:user.userId,email:"owner@example.test",expiresAt:expiry(),usedAt:null,deliveredAt:null});
    await expect(confirmRecoveryEmailVerification({...user,token:"A".repeat(43)})).rejects.toThrow("INVALID_VERIFICATION_TOKEN");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });
  it("confirms only the current address for the authenticated user", async () => {
    mocks.tokenFind.mockResolvedValue({userId:user.userId,email:"owner@example.test",expiresAt:expiry(),usedAt:null,deliveredAt:new Date()});
    const result=await confirmRecoveryEmailVerification({...user,token:"A".repeat(43)});
    expect(result).toEqual({verified:true});
    expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({
      id:"u1",tenantId:"tenant-1",recoveryEmail:"owner@example.test",recoveryEmailVerifiedAt:null,
    })}));
    expect(mocks.tokenUpdate).toHaveBeenCalledWith(expect.objectContaining({where:{userId:"u1",usedAt:null}}));
  });
  it("rejects confirmation if the target address changed", async () => {
    mocks.tokenFind.mockResolvedValue({userId:user.userId,email:"old@example.test",expiresAt:expiry(),usedAt:null,deliveredAt:new Date()});
    mocks.userUpdate.mockResolvedValue({count:0});
    await expect(confirmRecoveryEmailVerification({...user,token:"A".repeat(43)})).rejects.toThrow("INVALID_VERIFICATION_TOKEN");
  });
});
