import { describe, expect, it, vi } from "vitest";

describe("Forward Auth Setup", () => {
	it("derives base domain correctly", async () => {
		const { deriveBaseDomain } = await import(
			"@dokploy/server/setup/forward-auth-setup"
		);

		expect(deriveBaseDomain("auth.example.com")).toBe(".example.com");
		expect(deriveBaseDomain("login.company.co.uk")).toBe(".company.co.uk");
		expect(deriveBaseDomain("sso.example.com")).toBe(".example.com");
	});

	it("builds callback URL correctly", async () => {
		const { forwardAuthCallbackUrl } = await import(
			"@dokploy/server/setup/forward-auth-setup"
		);

		expect(forwardAuthCallbackUrl("auth.example.com", true)).toBe(
			"https://auth.example.com/oauth2/callback",
		);
		expect(forwardAuthCallbackUrl("auth.example.com", false)).toBe(
			"http://auth.example.com/oauth2/callback",
		);
	});

	it("derives cookie secret deterministically", async () => {
		const { deriveCookieSecret } = await import(
			"@dokploy/server/setup/forward-auth-setup"
		);

		const secret1 = deriveCookieSecret("salt1");
		const secret2 = deriveCookieSecret("salt1");
		const secret3 = deriveCookieSecret("salt2");

		expect(secret1).toBe(secret2);
		expect(secret1).not.toBe(secret3);
		expect(secret1).toHaveLength(32);
	});

	it("builds forward auth env vars", async () => {
		const { buildForwardAuthEnv } = await import(
			"@dokploy/server/setup/forward-auth-setup"
		);

		const env = buildForwardAuthEnv({
			oidc: {
				clientId: "test-client",
				clientSecret: "test-secret",
				issuer: "https://auth.example.com",
			},
			cookieSecret: "a".repeat(32),
			authDomain: "auth.example.com",
			baseDomain: ".example.com",
			authDomainHttps: true,
		});

		expect(env).toContain("OAUTH2_PROXY_PROVIDER=oidc");
		expect(env).toContain("OAUTH2_PROXY_CLIENT_ID=test-client");
		expect(env).toContain("OAUTH2_PROXY_CLIENT_SECRET=test-secret");
		expect(env).toContain("OAUTH2_PROXY_OIDC_ISSUER_URL=https://auth.example.com");
		expect(env).toContain("OAUTH2_PROXY_COOKIE_SECURE=true");
		expect(env).toContain("OAUTH2_PROXY_REDIRECT_URL=https://auth.example.com/oauth2/callback");
	});

	it("uses wildcard email domains when none specified", async () => {
		const { buildForwardAuthEnv } = await import(
			"@dokploy/server/setup/forward-auth-setup"
		);

		const env = buildForwardAuthEnv({
			oidc: { clientId: "c", clientSecret: "s", issuer: "https://i.com" },
			cookieSecret: "a".repeat(32),
			authDomain: "auth.example.com",
			baseDomain: ".example.com",
		});

		expect(env).toContain("OAUTH2_PROXY_EMAIL_DOMAINS=*");
	});

	it("uses specified email domains", async () => {
		const { buildForwardAuthEnv } = await import(
			"@dokploy/server/setup/forward-auth-setup"
		);

		const env = buildForwardAuthEnv({
			oidc: { clientId: "c", clientSecret: "s", issuer: "https://i.com" },
			cookieSecret: "a".repeat(32),
			authDomain: "auth.example.com",
			baseDomain: ".example.com",
			emailDomains: ["company.com", "partner.org"],
		});

		expect(env).toContain("OAUTH2_PROXY_EMAIL_DOMAINS=company.com,partner.org");
	});
});
