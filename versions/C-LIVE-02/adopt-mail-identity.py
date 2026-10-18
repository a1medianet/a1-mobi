from pathlib import Path

root=Path(r"C:\A1Hub\a1-mobi")
conf=root/"src/server/recovery-mail.ts"
text=conf.read_text(encoding="utf-8")
before='    from: process.env.A1_MOBI_SMTP_FROM,'
after='    from: process.env.A1_MOBI_SMTP_FROM?.trim() || "hi@a1medianet.com",'
assert text.count(before)==1,"Unexpected recovery-mail config"
conf.write_text(text.replace(before,after,1),encoding="utf-8",newline="\n")

example=root/".env.example"
text=example.read_text(encoding="utf-8")
before="A1_MOBI_SMTP_FROM=\n"
after="# Official sender for A1 Mobi account-recovery messages (not tenant storefront contact).\nA1_MOBI_SMTP_FROM=hi@a1medianet.com\n"
assert text.count(before)==1,"Unexpected .env.example"
example.write_text(text.replace(before,after,1),encoding="utf-8",newline="\n")

test=root/"tests/recovery-delivery.test.ts"
text=test.read_text(encoding="utf-8")
before='vi.stubEnv("A1_MOBI_SMTP_FROM", "noreply@example.test");'
after='vi.stubEnv("A1_MOBI_SMTP_FROM", "hi@a1medianet.com");'
assert text.count(before)==1
text=text.replace(before,after,1)
before='''    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "owner@example.test", text: expect.stringContaining(token), html: expect.stringContaining('dir="rtl"'),
    }));'''
after='''    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "hi@a1medianet.com",
      to: "owner@example.test", text: expect.stringContaining(token), html: expect.stringContaining('dir="rtl"'),
    }));'''
assert text.count(before)==1
text=text.replace(before,after,1)
before='''  it("returns a generic failure and closes transport without exposing SMTP error data", async () => {'''
after='''  it("uses the approved A1 Mobi sender when SMTP_FROM is not configured", async () => {
    vi.stubEnv("A1_MOBI_SMTP_FROM", "");
    expect(recoveryConfigurationStatus().ready).toBe(true);
    expect((await POST(request())).status).toBe(200);
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "hi@a1medianet.com", to: "owner@example.test",
    }));
  });
  it("rejects malformed custom SMTP sender instead of delivering mail", async () => {
    vi.stubEnv("A1_MOBI_SMTP_FROM", "wrong\\r\\nBcc: victim@example.test");
    expect(recoveryConfigurationStatus().ready).toBe(false);
    expect((await POST(request())).status).toBe(503);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
  it("returns a generic failure and closes transport without exposing SMTP error data", async () => {'''
assert text.count(before)==1
test.write_text(text.replace(before,after,1),encoding="utf-8",newline="\n")
print("A1 Mobi official sender configured in code, env example and recovery tests")
