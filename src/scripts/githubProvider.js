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

    buildSearchUrl(query){
        return `${this.baseUrl}/search/issues?q=${query}&per_page=100`;
    }

    buildOrgQuery(orgName){
       return orgName && orgName.trim() ? `+org%3A${orgName}` : '';
      
    }

    buildRepoQuery(repo){
        if(!repo) return '';

        if(typeof repo === 'object' && repo.fullName){
            const cleanName = repo.fullName.startsWith('/') ? repo.fullName.substring(1) : repo;
            return `repo:${cleanName}`
        }

        return `repo:${repo}`;
    }
    buildRepoQueries(selectedRepos, repoData){
        return selectedRepos.filter((repo)=> repo!== null).map((repo)=>{
            if(typeof repo === 'object' && repo.fullName){
                return this.buildRepoQuery(repo);
            }
            if(repo.includes('/')){
                return this.buildRepoQuery(repo);
            }
            const fullRepoInfo = repoData?.find((r)=>r.name === repo);
            if(fullRepoInfo && fullRepoInfo.fullName) {
                return `repo:${fullRepoInfo.fullName}`;
            }

            return this.buildRepoQuery(repo);
        }).join('+');
    }

    buildActivityUrls(options){
        const orgQuery = this.buildOrgQuery(options.orgName);
        const repoQueries= options.useRepoFilter ? this.buildRepoQueries(options.selectedRepos || [] , options.repoData) : '';
        const repoQuery= repoQueries ? `+${repoQueries}` : '';
        const dataQuery= `updated%3A${options.startDate}..${options.endDate}`;

        return{
            issueUrl:this.buildSearchUrl(`author%3A${options.username}${repoQuery}${orgQuery}+${dataQuery}`),
            prUrl:this.buildSearchUrl(`commenter%3A${options.username}${repoQuery}${orgQuery}+${dataQuery}`),
            userUrl:this.buildUserUrl(options.username),
            repoQueries
        }
    }

    
}
if(typeof module !== 'undefined' && module.exports){
    module.exports = GitHubProvider;
}else {
    window.GitHubProvider = GitHubProvider;

    if(window.platformRegistry){
        window.platformRegistry.registerProvider('github',new GitHubProvider());
    }
}