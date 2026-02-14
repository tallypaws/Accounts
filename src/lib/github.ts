import { env } from "$env/dynamic/private";


export async function exchangeGitHubCode(
    code: string,
): Promise<{
    access_token: string,
    token_type: string,
    scope: string
}> {
    const tokenRes = await fetch(
        "https://github.com/login/oauth/access_token",
        {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code,
            }),
        }
    );
    const tokenJson = await tokenRes.json();
    console.log({ tokenJson });

    if (!tokenRes.ok) {
        throw new Error(
            `Failed to exchange code for token: ${tokenJson.error} - ${tokenJson.error_description}`
        );
    }
    return tokenJson;
}


export const getGitHubUser = async (
    accessToken: string, tokenType = 'Bearer'
): Promise<{
    login: string,
    id: number,
    node_id: string,
    avatar_url: string,
    gravatar_id: string,
    url: string,
    html_url: string,
    followers_url: string,
    following_url: string,
    gists_url: string,
    starred_url: string,
    subscriptions_url: string,
    organizations_url: string,
    repos_url: string,
    events_url: string,
    received_events_url: string,
    type: 'User',
    user_view_type: 'public',
    site_admin: boolean,
    name: string,
    company: string,
    blog: string,
    location: string,
    email: string | null,
    hireable: boolean | null,
    bio: string,
    twitter_username: string | null,
    notification_email: string | null,
    public_repos: number,
    public_gists: number,
    followers: number,
    following: number,
    created_at: string,
    updated_at: string
}> => {

    const userRes = await fetch("https://api.github.com/user", {
        headers: {
            Authorization: `${tokenType} ${accessToken}`,
            Accept: "application/vnd.github+json",
        },
    });

    const userJson = await userRes.json();

    console.log({ userJson });

    return userJson;

}