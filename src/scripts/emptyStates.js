/**
 * Empty States Module
 * Provides reusable empty state components for the Scrum Helper extension
 */

// Empty state configurations
const EMPTY_STATES = {
    NO_TOKEN: {
        icon: '🔑',
        title: 'GitHub Token Not Found',
        description: 'Add a GitHub token to access your repositories and generate reports.',
        cta: {
            text: 'Open Settings',
            action: 'window.showSettingsView && window.showSettingsView()'
        }
    },

    NO_REPOS: {
        icon: '📁',
        title: 'No Repositories Found',
        description: 'No repositories were found for this account during the selected period.',
        secondaryText: 'Try adjusting your date range or check your GitHub account.'
    },

    RATE_LIMIT: {
        icon: '⏱️',
        title: 'GitHub API Rate Limit Reached',
        description: 'You\'ve hit the GitHub API rate limit. Add a token to increase your limits.',
        cta: {
            text: 'Add GitHub Token',
            action: 'window.showSettingsView && window.showSettingsView()'
        },
        secondaryText: 'Rate limits typically reset within 1 hour.'
    }
};

/**
 * Renders an empty state component
 * @param {Object} config - Empty state configuration
 * @returns {string} HTML string for the empty state
 */
function renderEmptyState(config) {
    if (!config) {
        console.error('Empty state config is required');
        return '';
    }

    return `<div style="text-align: center; padding-top: 40px;"><div style="font-size: 40px; margin-bottom: 8px; opacity: 0.6;">${config.icon || '📋'}</div><h3 style="font-size: 16px; font-weight: 600; margin: 0 0 6px 0; color: #374151;">${config.title || 'Something went wrong'}</h3><p style="font-size: 13px; color: #6b7280; margin: 0 0 12px 0; line-height: 1.4;">${config.description || 'Please try again later.'}</p>${config.cta ? `<button onclick="${config.cta.action}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; margin-bottom: ${config.secondaryText ? '8px' : '0'};">${config.cta.text}</button>` : ''}${config.secondaryText ? `<p style="font-size: 11px; color: #9ca3af; margin: 0;">${config.secondaryText}</p>` : ''}</div>`;
}

// Make functions and configs globally available
window.EMPTY_STATES = EMPTY_STATES;
window.renderEmptyState = renderEmptyState;
