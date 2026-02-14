// this is for reference and isnt used anywhere
export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

export class ApplicationClient {
  baseUrl: string;
  id: string;
  secret: string;
  accessToken?: string;
  refreshToken?: string;

  constructor(opts: { baseUrl: string; id: string; secret: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.id = opts.id;
    this.secret = opts.secret;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
    const res = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.id,
        client_secret: this.secret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`token request failed: ${res.status} ${JSON.stringify(err)}`);
    }

    const data = (await res.json()) as TokenResponse;
    this.accessToken = data.access_token;
    if (data.refresh_token) this.refreshToken = data.refresh_token;
    return data;
  }

  async refresh(refreshToken?: string): Promise<TokenResponse> {
    const tokenToUse = refreshToken ?? this.refreshToken;
    if (!tokenToUse) throw new Error('no refresh token available');

    const res = await fetch(`${this.baseUrl}/oauth2/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.id,
        client_secret: this.secret,
        refresh_token: tokenToUse
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`refresh request failed: ${res.status} ${JSON.stringify(err)}`);
    }

    const data = (await res.json()) as TokenResponse;
    this.accessToken = data.access_token;
    if (data.refresh_token) this.refreshToken = data.refresh_token;
    return data;
  }

  async getUserInfo(accessToken?: string) {
    const token = accessToken ?? this.accessToken;
    if (!token) throw new Error('no access token available');

    const res = await fetch(`${this.baseUrl}/oauth2/userinfo`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`userinfo request failed: ${res.status} ${JSON.stringify(err)}`);
    }

    return await res.json();
  }
}
