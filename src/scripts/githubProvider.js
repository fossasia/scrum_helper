// GitHub platform provider for Scrum_Helper
class GitHubProvider {
    constructor(){
        this.baseUrl = 'https://api.github.com';
        this.graphqlUrl = 'https://api.github.com/graphql';
    }

    buildHeaders(token){
         const headers = {
            Accept: 'application/vnd.github.v3+json',
         };
         if (token){
            headers.Authorization = `token ${token}`;
         } 
         return headers;
    }

    buildGraphQLHeaders(token){
        return{
            ...this.buildHeaders(token),
            'Content-Type': 'application/json',
        }
    }

    buildUserUrl(username){
        return `${this.baseUrl}/users/${username}`;
    }

    buidlSearchUrl(query){
        return `${this.baseUrl}/search/issues?q=${query}&per_page=100`;
    }

    buildOrgQuery(orgName){
        return orgName && orgName !== 'all' ? `+org:${orgName}` : '';
    }

    buildRepoQuery(repo){
        if(!repo) return '';

        if(typeof repo === 'object' && repo.fullName){
            const cleanName = repo.fullName.startsWith('/') ? repo.fullName.substring(1) : repo;
            return `repo:${cleanName}`
        }

        return `repo:${repo}`;
    }

    
}
if(typeof module !== undefined && module.exports){
    module.exports = GitHubProvider;
}else {
    window.GitHubProvider = GitHubProvider;

    if(window.platformRegistry){
        window.platformRegistry.registerProvider('github',new GitHubProvider());
    }
}