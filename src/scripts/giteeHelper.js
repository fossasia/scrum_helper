class GiteeHelper {
    constructor() {
        this.baseUrl = 'https://gitee.com/api/v5';
        this.cache = {
            data: null,
            cacheKey: null,
            timestamp: 0,
            ttl: 10 * 60 * 1000,
            fetching: false,
            queue: [],
        };
    }

    async getCacheTTL() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['cacheInput'], (items) => {
                const ttl = items.cacheInput ? Number.parseInt(items.cacheInput, 10) * 60 * 1000 : 10 * 60 * 1000;
                resolve(ttl);
            });
        });
    }

    appendToken(url, token) {
        if (!token || !token.trim()) return url;
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}access_token=${encodeURIComponent(token.trim())}`;
    }

    async saveToStorage(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(
                {
                    giteeCache: {
                        data: data,
                        cacheKey: this.cache.cacheKey,
                        timestamp: this.cache.timestamp,
                    },
                },
                resolve,
            );
        });
    }

    async loadFromStorage() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['giteeCache'], (items) => {
                if (items.giteeCache) {
                    this.cache.data = items.giteeCache.data;
                    this.cache.cacheKey = items.giteeCache.cacheKey;
                    this.cache.timestamp = items.giteeCache.timestamp;
                }
                resolve();
            });
        });
    }

    clearCache() {
        this.cache.data = null;
        this.cache.cacheKey = null;
        this.cache.timestamp = 0;
        this.cache.fetching = false;
        this.cache.queue = [];
    }

    async fetchGiteeData(username, startDate, endDate, token = null) {
        const tokenMarker = token ? 'auth' : 'noauth';
        const cacheKey = `gitee-${username}-${startDate}-${endDate}-${tokenMarker}`;

        if (this.cache.fetching || (this.cache.cacheKey === cacheKey && this.cache.data)) {
            return this.cache.data;
        }

        if (!this.cache.data && !this.cache.fetching) {
            await this.loadFromStorage();
        }

        const currentTTL = await this.getCacheTTL();
        this.cache.ttl = currentTTL;

        const now = Date.now();
        const isCacheFresh = now - this.cache.timestamp < this.cache.ttl;
        const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

        if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
            return this.cache.data;
        }

        if (!isCacheKeyMatch) {
            this.cache.data = null;
        }

        if (this.cache.fetching) {
            return new Promise((resolve, reject) => {
                this.cache.queue.push({ resolve, reject });
            });
        }

        this.cache.fetching = true;
        this.cache.cacheKey = cacheKey;

        const startDateTime = new Date(startDate + 'T00:00:00Z').getTime();
        const endDateTime = new Date(endDate + 'T23:59:59Z').getTime();

        try {
            await new Promise((res) => setTimeout(res, 500));

            const userUrl = this.appendToken(`${this.baseUrl}/users/${encodeURIComponent(username)}`, token);
            const userRes = await fetch(userUrl);
            if (userRes.status === 404) {
                throw new Error(`Gitee user '${username}' not found`);
            }
            if (!userRes.ok) {
                throw new Error(`Error fetching Gitee user: ${userRes.status} ${userRes.statusText}`);
            }
            const user = await userRes.json();

            const reposUrl = this.appendToken(`${this.baseUrl}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, token);
            const reposRes = await fetch(reposUrl);
            if (!reposRes.ok) {
                throw new Error(`Error fetching Gitee repos: ${reposRes.status} ${reposRes.statusText}`);
            }
            const repos = await reposRes.json();

            const fullName = (r) => r.full_name || (r.namespace ? `${r.namespace.path || r.namespace.full_name}/${r.path || r.name}` : `${username}/${r.path || r.name}`);
            const owner = (r) => (r.owner && r.owner.login) || (r.namespace && (r.namespace.path || r.namespace.full_name)) || username;
            const repoName = (r) => r.path || r.name || (r.full_name ? r.full_name.split('/')[1] : '');

            let allIssues = [];
            let allPulls = [];

            for (const repo of repos) {
                const o = owner(repo);
                const r = repoName(repo);
                try {
                    const issuesUrl = this.appendToken(`${this.baseUrl}/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}/issues?state=all&sort=updated&direction=desc&per_page=100`, token);
                    const issuesRes = await fetch(issuesUrl);
                    if (issuesRes.ok) {
                        const issues = await issuesRes.json();
                        for (const i of issues) {
                            if (i.pull_request) continue;
                            const updated = new Date(i.updated_at || i.created_at).getTime();
                            if (updated >= startDateTime && updated <= endDateTime) {
                                const creator = i.user?.login || i.user?.login || i.assignee?.login;
                                if (creator === username) {
                                    allIssues.push({ ...i, _owner: o, _repo: r, _fullName: `${o}/${r}` });
                                }
                            }
                        }
                    }
                    await new Promise((resolve) => setTimeout(resolve, 100));
                } catch (e) {
                    console.error(`[Gitee] Error fetching issues for ${o}/${r}:`, e);
                }

                try {
                    const pullsUrl = this.appendToken(`${this.baseUrl}/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}/pulls?state=all&sort=updated&direction=desc&per_page=100`, token);
                    const pullsRes = await fetch(pullsUrl);
                    if (pullsRes.ok) {
                        const pulls = await pullsRes.json();
                        for (const p of pulls) {
                            const updated = new Date(p.updated_at || p.created_at).getTime();
                            if (updated >= startDateTime && updated <= endDateTime) {
                                const author = p.user?.login || p.head?.user?.login;
                                if (author === username) {
                                    allPulls.push({ ...p, _owner: o, _repo: r, _fullName: `${o}/${r}` });
                                }
                            }
                        }
                    }
                    await new Promise((resolve) => setTimeout(resolve, 100));
                } catch (e) {
                    console.error(`[Gitee] Error fetching pulls for ${o}/${r}:`, e);
                }
            }

            const mapToGitHubFormat = (item, isPull) => {
                const o = item._owner || item.base?.repo?.owner?.login || username;
                const r = item._repo || item.base?.repo?.name || item.head?.repo?.name;
                const fn = item._fullName || `${o}/${r}`;
                const htmlUrl = item.html_url || item.url || `https://gitee.com/${fn}/${isPull ? 'pulls' : 'issues'}/${item.number}`;
                const repoUrl = `https://gitee.com/api/v5/repos/${fn}`;
                let state = (item.state || 'open').toLowerCase();
                if (state === 'opened') state = 'open';

                return {
                    ...item,
                    html_url: htmlUrl,
                    repository_url: repoUrl,
                    number: item.number || item.iid,
                    title: item.title,
                    state: state,
                    pull_request: isPull,
                    user: item.user ? { login: item.user.login || username } : { login: username },
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    body: item.body,
                    state_reason: item.state_reason,
                    project: r,
                };
            };

            const mappedIssues = allIssues.map((i) => mapToGitHubFormat(i, false));
            const mappedPulls = allPulls.map((p) => mapToGitHubFormat(p, true));

            const giteeData = {
                user: {
                    login: user.login || username,
                    name: user.name || user.login || username,
                    html_url: user.html_url,
                },
                projects: repos,
                issues: mappedIssues,
                mergeRequests: mappedPulls,
            };

            this.cache.data = giteeData;
            this.cache.timestamp = Date.now();
            await this.saveToStorage(giteeData);

            this.cache.queue.forEach(({ resolve }) => resolve(giteeData));
            this.cache.queue = [];
            return giteeData;
        } catch (err) {
            console.error('Gitee Fetch Failed:', err);
            this.cache.queue.forEach(({ reject }) => reject(err));
            this.cache.queue = [];
            throw err;
        } finally {
            this.cache.fetching = false;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GiteeHelper;
} else {
    window.GiteeHelper = GiteeHelper;
}
