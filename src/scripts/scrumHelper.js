// This script is a content script that runs on email platforms and in the extension's popup.
// It communicates with the background script to get the scrum report.

function allIncluded(outputTarget = 'email') {
  const DEBUG = true;
  function log(...args) {
    if (DEBUG) console.log(`[SCRUM-HELPER ${outputTarget}]:`, ...args);
  }
  function logError(...args) {
    if (DEBUG) console.error(`[SCRUM-HELPER ${outputTarget}]:`, ...args);
  }

  let githubUsername,
    projectName,
    startingDate,
    endingDate,
    userReason,
    lastWeekContribution = false,
    yesterdayContribution = false;

  // UI rendering state
  let lastWeekArray = [], nextWeekArray = [], reviewedPrsArray = [], userPrCommitsArray = [];
  let issuesDataProcessed = false, prsReviewDataProcessed = false, userCommitsProcessed = false;

  function getYesterdayString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function getChromeDataAndFetch() {
    chrome.storage.local.get(
      ['githubUsername', 'projectName', 'startingDate', 'endingDate', 'userReason', 'lastWeekContribution', 'yesterdayContribution'],
      (items) => {
        if (items.lastWeekContribution) {
          lastWeekContribution = true;
          const today = new Date();
          const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
          startingDate = lastWeek.toISOString().split('T')[0];
          endingDate = today.toISOString().split('T')[0];
        } else if (items.yesterdayContribution) {
          yesterdayContribution = true;
          const yesterdayString = getYesterdayString();
          startingDate = yesterdayString;
          endingDate = yesterdayString;
        } else if (items.startingDate && items.endingDate) {
          startingDate = items.startingDate;
          endingDate = items.endingDate;
        } else { // Default to last 7 days
          const today = new Date();
          const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
          startingDate = lastWeek.toISOString().split('T')[0];
          endingDate = today.toISOString().split('T')[0];
        }

        githubUsername = items.githubUsername;
        projectName = items.projectName;
        userReason = items.userReason || 'No Blocker at the moment';

        if (githubUsername) {
          log(`Getting data for ${githubUsername} from ${startingDate} to ${endingDate}`);
          const payload = { username: githubUsername, startingDate, endingDate };

          chrome.runtime.sendMessage({ action: 'fetchGithubData', payload }, (response) => {
            if (chrome.runtime.lastError) {
              logError('Connection failed:', chrome.runtime.lastError.message);
              showErrorToast('Connection to background script failed. Please reload the extension and try again.');
              return;
            }

            if (response && response.success) {
              log("Received data from background", response.data);
              processGithubData(response.data);
            } else {
              const errorMessage = response ? response.error : 'An unknown error occurred.';
              logError('Failed to fetch data from background:', errorMessage);
              showErrorToast(errorMessage);
            }
          });
        } else if (outputTarget === 'popup') {
          showErrorToast('Please set your GitHub username in the settings.');
        }
      },
    );
  }

  function showErrorToast(message) {
    if (outputTarget !== 'popup') return; // Only show toasts in the popup
    const oldToast = document.getElementById('error-toast');
    if (oldToast) oldToast.remove();
    const toast = document.createElement('div');
    toast.id = 'error-toast';
    Object.assign(toast.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', background: '#cc3333',
      color: 'white', padding: '12px', textAlign: 'center', zIndex: '10000',
      fontSize: '14px', fontWeight: 'bold'
    });
    toast.innerHTML = `<span>${message}</span><button style='margin-left:15px;background:none;border:none;color:white;font-size:16px;cursor:pointer;vertical-align:middle' onclick='this.parentNode.remove()'>&times;</button>`;
    document.body.appendChild(toast);

    // Also re-enable the generate button
    const generateBtn = document.getElementById('generateReport');
    if (generateBtn) {
      generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
      generateBtn.disabled = false;
    }
  }

  function processGithubData(data) {
    // Reset arrays
    lastWeekArray = [];
    nextWeekArray = [];
    reviewedPrsArray = [];
    userPrCommitsArray = [];
    issuesDataProcessed = false;
    prsReviewDataProcessed = false;
    userCommitsProcessed = false;

    writeGithubIssuesPrs(data.githubIssuesData);
    writeGithubPrsReviews(data.githubPrsReviewData);
    processUserCommits(data.userPrCommitsData);
  }

  function triggerScrumGeneration() {
    if (issuesDataProcessed && prsReviewDataProcessed && userCommitsProcessed) {
      log('All data processed, generating scrum body.');
      writeScrumBody();
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  function writeScrumBody() {
    // 1. Combine all past activity into a single list
    const pastActivityHTML =
      '<ul>' +
      lastWeekArray.join('') +
      reviewedPrsArray.join('') +
      userPrCommitsArray.join('') +
      '</ul>';

    // 2. Combine all future activity into a single list
    const futureActivityHTML = '<ul>' + nextWeekArray.join('') + '</ul>';

    // 3. Determine the phrasing for the date ranges
    let firstQuestion;
    if (lastWeekContribution) {
      firstQuestion = '<b>1. What did I do last week?</b>';
    } else if (yesterdayContribution) {
      firstQuestion = '<b>1. What did I do yesterday?</b>';
    } else {
      firstQuestion = `<b>1. What did I do from ${formatDate(startingDate)} to ${formatDate(endingDate)}?</b>`;
    }

    let secondQuestion;
    if (lastWeekContribution) {
      secondQuestion = '<b>2. What do I plan to do this week?</b>';
    } else {
      secondQuestion = '<b>2. What do I plan to do today?</b>';
    }
    const thirdQuestion = '<b>3. What is blocking me from making progress?</b>';

    // 4. Assemble the final report
    const finalReport = [
      firstQuestion,
      pastActivityHTML,
      secondQuestion,
      futureActivityHTML,
      thirdQuestion,
      userReason
    ].join('\n');

    if (outputTarget === 'popup') {
      const scrumReportDiv = document.getElementById('scrumReport');
      const generateBtn = document.getElementById('generateReport');
      if (scrumReportDiv) scrumReportDiv.innerHTML = finalReport.replace(/\n/g, '<br>');
      if (generateBtn) {
        generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
        generateBtn.disabled = false;
      }
    } else { // For email clients
      if (window.emailClientAdapter) {
        const editor = window.emailClientAdapter.getEditorElements();
        if (editor && editor.body) {
          log('Injecting scrum into email body.');
          editor.body.innerHTML = finalReport.replace(/\n/g, '<br>');
        } else {
          logError('Could not find email editor body to inject report.');
        }
      }
    }
  }

  function processUserCommits(data) {
    if (!data || Object.keys(data).length === 0) {
      userCommitsProcessed = true;
      triggerScrumGeneration();
      return;
    }
    for (const prNum in data) {
      const { pr, commits } = data[prNum];
      let prSection = `<li><i>(${pr.repository_url.substr(pr.repository_url.lastIndexOf('/') + 1)})</i> - Commits on PR <a href='${pr.html_url}' target='_blank'>#${pr.number}</a> (${pr.title})<ul>`;
      for (const commit of commits) {
        prSection += `<li><a href='${commit.html_url}' target='_blank'>${commit.commit.message.split('\n')[0]}</a></li>`;
      }
      prSection += '</ul></li>';
      userPrCommitsArray.push(prSection);
    }
    log(`Processed ${Object.keys(data).length} PRs with commits.`);
    userCommitsProcessed = true;
    triggerScrumGeneration();
  }

  function writeGithubPrsReviews(githubPrsReviewData) {
    let items = githubPrsReviewData.items;
    if (!items) {
      prsReviewDataProcessed = true;
      triggerScrumGeneration();
      return;
    };

    const githubPrsReviewDataProcessed = {};
    for (let item of items) {
      if (item.user.login == githubUsername || !item.pull_request) continue;
      let project = item.repository_url.substr(item.repository_url.lastIndexOf('/') + 1);
      if (!githubPrsReviewDataProcessed[project]) githubPrsReviewDataProcessed[project] = [];
      githubPrsReviewDataProcessed[project].push({
        number: item.number,
        html_url: item.html_url,
        title: item.title,
        state: item.state,
      });
    }

    for (let repo in githubPrsReviewDataProcessed) {
      let repoLi = `<li><i>(${repo})</i> - Reviewed ${githubPrsReviewDataProcessed[repo].length > 1 ? 'PRs' : 'PR'} - `;
      if (githubPrsReviewDataProcessed[repo].length <= 1) {
        const pr_arr = githubPrsReviewDataProcessed[repo][0];
        repoLi += `<a href='${pr_arr.html_url}' target='_blank'>#${pr_arr.number}</a> (${pr_arr.title})`;
      } else {
        repoLi += '<ul>';
        for (let pr1 of githubPrsReviewDataProcessed[repo]) {
          repoLi += `<li><a href='${pr1.html_url}' target='_blank'>#${pr1.number}</a> (${pr1.title})</li>`;
        }
        repoLi += '</ul>';
      }
      reviewedPrsArray.push(repoLi + '</li>');
    }
    prsReviewDataProcessed = true;
    triggerScrumGeneration();
  }

  function writeGithubIssuesPrs(githubIssuesData) {
    let items = githubIssuesData.items;
    if (!items) {
      issuesDataProcessed = true;
      triggerScrumGeneration();
      return;
    };

    for (let item of items) {
      let li = '';
      const project = item.repository_url.substr(item.repository_url.lastIndexOf('/') + 1);
      if (item.pull_request) {
        li = `<li><i>(${project})</i> - Made PR (#${item.number}) - <a href='${item.html_url}' target='_blank'>${item.title}</a></li>`;
      } else {
        if (item.state === 'open' && item.body?.toUpperCase().includes('YES')) {
          nextWeekArray.push(`<li><i>(${project})</i> - Work on Issue(#${item.number}) - <a href='${item.html_url}' target='_blank'>${item.title}</a></li>`);
        }
        li = `<li><i>(${project})</i> - Opened Issue(#${item.number}) - <a href='${item.html_url}' target='_blank'>${item.title}</a></li>`;
      }
      lastWeekArray.push(li);
    }
    issuesDataProcessed = true;
    triggerScrumGeneration();
  }

  getChromeDataAndFetch();
}


// --- Entry Point ---

// Ensure the script only initializes once per page/context
if (typeof window.scrumHelperLoaded === 'undefined') {
  window.scrumHelperLoaded = true;

  // This function is called from the popup UI
  window.generateScrumReport = function () {
    allIncluded('popup');
  };

  // This part runs automatically in content scripts on email clients
  const isEmailClient = window.location.host.includes("mail.google.com") ||
    window.location.host.includes("outlook.live.com") ||
    window.location.host.includes("outlook.office.com") ||
    window.location.host.includes("mail.yahoo.com") ||
    window.location.host.includes("groups.google.com");

  if (isEmailClient) {
    console.log("[SCRUM-HELPER] Loaded on an email client.");

    let injectionInterval = null;
    let hasInjected = false;

    const attemptInjection = () => {
      // Check if the editor is available and we haven't injected yet
      if (!hasInjected && window.emailClientAdapter && window.emailClientAdapter.getEditorElements()) {
        console.log("[SCRUM-HELPER] Compose window detected. Running scrum helper.");
        hasInjected = true; // Set flag to prevent re-injection
        allIncluded('email');

        // Stop the interval check once we've successfully injected
        if (injectionInterval) {
          clearInterval(injectionInterval);
        }
        return true;
      }
      return false;
    };

    // Start an interval to check for the compose window periodically.
    // This is more robust for email clients that load the editor dynamically.
    injectionInterval = setInterval(attemptInjection, 1000); // Check every second
  }
}

// Re-add the listener for 'New Conversation' clicks to handle single-page apps
// This was a key part of the original, working injection logic.
$(document).on('click', ':contains("New conversation")', function () {
  console.log('[SCRUM-HELPER] "New conversation" clicked, re-initializing injection.');
  // The allIncluded function handles the rest of the logic
  allIncluded('email');
});
