const ScrumHelper = {
    state: {
        // Data state
        scrumBody: null,
        scrumSubject: null,
        startingDate: "",
        endingDate: "",
        githubUsername: "",
        projectName: "",
        lastWeekArray: [],
        nextWeekArray: [],
        reviewedPrsArray: [],
        githubIssuesData: null,
        lastWeekContribution: false,
        githubPrsReviewData: null,
        githubUserData: null,
        githubPrsReviewDataProccessed: {},
        showOpenLabel: true,
        showClosedLabel: true,
        userReason: "",
        gsoc: 0, //0 means codeheat. 1 means gsoc
        refreshButton_Placed: false,
        enableToggle: true,

        // UI elements
        pr_merged_button: "<div style=\"vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;\" class=\"State State--purple\">closed</div>",
        pr_unmerged_button: "<div style=\"vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;\"  class=\"State State--green\">open</div>",
        issue_closed_button: "<div style=\"vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;\" class=\"State State--purple\">closed</div>",
        issue_opened_button: "<div style=\"vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;\"  class=\"State State--green\">open</div>",
        linkStyle: ""
    },

    // Add listener for popup UI changes
    initializePopupListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updateFromPopup') {
                const { 
                    githubUsername, 
                    projectName, 
                    startDate, 
                    endDate, 
                    showOpenLabel,
                    showClosedLabel,
                    userReason,
                    gsoc
                } = request.data;

                // Update state
                this.state.githubUsername = githubUsername;
                this.state.projectName = projectName;
                this.state.startingDate = startDate;
                this.state.endingDate = endDate;
                this.state.showOpenLabel = showOpenLabel;
                this.state.showClosedLabel = showClosedLabel;
                this.state.userReason = userReason;
                this.state.gsoc = gsoc ? 1 : 0;

                // Trigger data refresh
                this.fetchGithubData();
            }
        });
    },

    // Keep your existing functions but update them to use this.state
    fetchGithubData() {
        const { githubUsername, startingDate, endingDate } = this.state;
        var issueUrl="https://api.github.com/search/issues?q=author%3A"+githubUsername+"+org%3Afossasia+created%3A"+startingDate+".."+endingDate+"&per_page=100";
        $.ajax({
            dataType: "json",
            type: "GET",
            url: issueUrl,
            error: function (xhr, textStatus, errorThrown) {
                // error
            },
            success: function (data) {
                ScrumHelper.state.githubIssuesData = data;
            }
        });
        // fetch github prs review data
        var prUrl="https://api.github.com/search/issues?q=commenter%3A"+githubUsername+"+org%3Afossasia+updated%3A"+startingDate+".."+endingDate+"&per_page=100";

        $.ajax({
            dataType: "json",
            type: "GET",
            url: prUrl,
            error: function (xhr, textStatus, errorThrown) {
                // error
            },
            success: function (data) {
                ScrumHelper.state.githubPrsReviewData = data;
            }
        });
        // fetch github user data
        var userUrl = "https://api.github.com/users/" + githubUsername;
        $.ajax({
            dataType: "json",
            type: "GET",
            url: userUrl,
            error: function (xhr, textStatus, errorThrown) {
                // error
            },
            success: function (data) {
                ScrumHelper.state.githubUserData = data;
            }
        });
    },

    writeGithubPrsReviews() {
        const { 
            githubPrsReviewData, 
            githubUsername, 
            issue_opened_button, 
            issue_closed_button 
        } = this.state;
        var items = githubPrsReviewData.items;
        var i;
        for (i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.user.login == githubUsername || !item.pull_request) continue;
            var repository_url = item.repository_url;
            var project = repository_url.substr(repository_url.lastIndexOf("/") + 1);
            var title = item.title;
            var number = item.number;
            var html_url = item.html_url;
            if (!ScrumHelper.state.githubPrsReviewDataProccessed[project]) {// first pr in this repo
                ScrumHelper.state.githubPrsReviewDataProccessed[project] = [];
            }
            var obj = {
                number: number,
                html_url: html_url,
                title: title,
                state: item.state
            };
            ScrumHelper.state.githubPrsReviewDataProccessed[project].push(obj);
        }
        for (var repo in ScrumHelper.state.githubPrsReviewDataProccessed) {
            var repoLi = "<li> \
        <i>("+ repo + ")</i> - Reviewed ";
            if (ScrumHelper.state.githubPrsReviewDataProccessed[repo].length > 1)
                repoLi += "PRs - ";
            else {
                repoLi += "PR - ";
            }
            if (ScrumHelper.state.githubPrsReviewDataProccessed[repo].length <= 1) {
                for (var pr in ScrumHelper.state.githubPrsReviewDataProccessed[repo]) {
                    var pr_arr = ScrumHelper.state.githubPrsReviewDataProccessed[repo][pr];
                    var prText = "";
                    prText += "<a href='" + pr_arr.html_url + "' target='_blank'>#" + pr_arr.number + "</a> (" + pr_arr.title + ") ";
                    if (pr_arr.state === "open")
                        prText += issue_opened_button;
                    else
                        prText += issue_closed_button;
                    prText += "&nbsp;&nbsp;";
                    repoLi += prText;
                }
            }
            else {
                repoLi += "<ul>";
                for (var pr1 in ScrumHelper.state.githubPrsReviewDataProccessed[repo]) {
                    var pr_arr1 = ScrumHelper.state.githubPrsReviewDataProccessed[repo][pr1];
                    var prText1 = "";
                    prText1 += "<li><a href='" + pr_arr1.html_url + "' target='_blank'>#" + pr_arr1.number + "</a> (" + pr_arr1.title + ") ";
                    if (pr_arr1.state === "open")
                        prText1 += issue_opened_button;
                    else
                        prText1 += issue_closed_button;
                    prText1 += "&nbsp;&nbsp;</li>";
                    repoLi += prText1;
                }
                repoLi += "</ul>";
            }
            repoLi += "</li>";
            ScrumHelper.state.reviewedPrsArray.push(repoLi);
        }
        ScrumHelper.writeScrumBody();
    },

    writeGithubIssuesPrs() {
        const { 
            githubIssuesData, 
            githubUsername, 
            pr_merged_button, 
            pr_unmerged_button, 
            issue_opened_button, 
            issue_closed_button, 
            linkStyle 
        } = this.state;
        var items = githubIssuesData.items;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var html_url = item.html_url;
            var repository_url = item.repository_url;
            var project = repository_url.substr(repository_url.lastIndexOf("/") + 1);
            var title = item.title;
            var number = item.number;
            var li = "";
            if (item.pull_request) {
                // is a pull request
                if (item.state === "closed") {
                    // is closed PR
                    li = "<li><i>(" + project + ")</i> - Made PR (#" + number + ") - <a href='" + html_url + "' style='" + linkStyle + "' target='_blank'>" + title + "</a> " + pr_merged_button + "&nbsp;&nbsp;</li>";
                }
                else if (item.state === "open") {
                    // is open PR
                    li = "<li><i>(" + project + ")</i> - Made PR (#" + number + ") - <a href='" + html_url + "' target='_blank'>" + title + "</a> " + pr_unmerged_button + "&nbsp;&nbsp;</li>";
                }
                else {
                    // else
                    li = "<li><i>(" + project + ")</i> - Made PR (#" + number + ") - <a href='" + html_url + "' target='_blank'>" + title + "</a> &nbsp;&nbsp;</li>";
                }

            }
            else {
                // is a issue
                if (item.state === "open" && item.body.toUpperCase().indexOf("YES") > 0) {
                    //probably the author wants to work on this issue!
                    var li2 = "<li><i>(" + project + ")</i> - Work on Issue(#" + number + ") - <a href='" + html_url + "' target='_blank'>" + title + "</a> " + issue_opened_button + "&nbsp;&nbsp;</li>";
                    ScrumHelper.state.nextWeekArray.push(li2);
                }
                if (item.state === "open") {
                    li = "<li><i>(" + project + ")</i> - Opened Issue(#" + number + ") - <a href='" + html_url + "' target='_blank'>" + title + "</a> " + issue_opened_button + "&nbsp;&nbsp;</li>";
                }
                else if (item.state === "closed") {
                    li = "<li><i>(" + project + ")</i> - Opened Issue(#" + number + ") - <a href='" + html_url + "' target='_blank'>" + title + "</a> " + issue_closed_button + "&nbsp;&nbsp;</li>";
                }
                else {
                    li = "<li><i>(" + project + ")</i> - Opened Issue(#" + number + ") - <a href='" + html_url + "' target='_blank'>" + title + "</a> </li>";
                }
            }
            ScrumHelper.state.lastWeekArray.push(li);
        }
        ScrumHelper.writeScrumBody();
    },

    writeScrumBody() {
        const { 
            enableToggle, 
            lastWeekArray, 
            reviewedPrsArray, 
            nextWeekArray, 
            userReason, 
            gsoc, 
            lastWeekContribution, 
            startingDate, 
            endingDate 
        } = this.state;
        if(!enableToggle) return;
        
        setTimeout(function(){
            // Generate content first
            var lastWeekUl="<ul>";
            var i;
            for(i =0;i<lastWeekArray.length;i++)
                lastWeekUl+=lastWeekArray[i];
            for(i =0;i<reviewedPrsArray.length;i++)
                lastWeekUl+=reviewedPrsArray[i];
            lastWeekUl+="</ul>";
    
            var nextWeekUl="<ul>";
            for(i =0;i<nextWeekArray.length;i++)
                nextWeekUl+=nextWeekArray[i];
            nextWeekUl+="</ul>";
    
            var weekOrDay = gsoc==1?"yesterday":"last week";
            var weekOrDay2= gsoc==1?"today":"this week";
    
            // Create the complete content
            let content;
            if(lastWeekContribution==true){
                content = `<b>1. What did I do ${weekOrDay}?</b>
                          <br>${lastWeekUl}<br><br>
                          <b>2. What I plan to do ${weekOrDay2}?</b>
                          <br>${nextWeekUl}<br><br>
                          <b>3. What is stopping me from doing my work?</b>
                          <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${userReason}</p>`;
            } else {
                content = `<b>1. What did I do from ${ScrumHelper.formatDate(startingDate)} to ${ScrumHelper.formatDate(endingDate)}?</b>
                          <br>${lastWeekUl}<br><br>
                          <b>2. What I plan to do ${weekOrDay2}?</b>
                          <br>${nextWeekUl}<br><br>
                          <b>3. What is stopping me from doing my work?</b>
                          <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${userReason}</p>`;
            }
    
            // Use the adapter to inject content
            const elements = window.emailClientAdapter.getEditorElements();
            if (!elements || !elements.body) {
                console.error('Email client editor not found');
                return;
            }
    
            window.emailClientAdapter.injectContent(
                elements.body,
                content,
                elements.eventTypes.contentChange
            );
        });
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    handleLastWeekContributionChange() {
        ScrumHelper.state.endingDate = ScrumHelper.getToday();
        ScrumHelper.state.startingDate = ScrumHelper.getLastWeek();
    },

    getLastWeek() {
        var today = new Date();
        var noDays_to_goback = ScrumHelper.state.gsoc == 0 ? 7 : 1;
        var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);
        var lastWeekMonth = lastWeek.getMonth() + 1;
        var lastWeekDay = lastWeek.getDate();
        var lastWeekYear = lastWeek.getFullYear();
        var lastWeekDisplayPadded = ("0000" + lastWeekYear.toString()).slice(-4) + "-" + ("00" + lastWeekMonth.toString()).slice(-2) + "-" + ("00" + lastWeekDay.toString()).slice(-2);
        return lastWeekDisplayPadded;
    },

    getToday() {
        var today = new Date();
        var Week = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var WeekMonth = Week.getMonth() + 1;
        var WeekDay = Week.getDate();
        var WeekYear = Week.getFullYear();
        var WeekDisplayPadded = ("0000" + WeekYear.toString()).slice(-4) + "-" + ("00" + WeekMonth.toString()).slice(-2) + "-" + ("00" + WeekDay.toString()).slice(-2);
        return WeekDisplayPadded;
    },

    getProject() {
        if (ScrumHelper.state.projectName != "")
            return ScrumHelper.state.projectName;

        var project = "<project name>";
        var url = window.location.href;
        var projectUrl = url.substr(url.lastIndexOf("/") + 1);
        if (projectUrl === "susiai")
            project = "SUSI.AI";
        else if (projectUrl === "open-event")
            project = "Open Event";
        return project;
    },

    scrumSubjectLoaded() {
        if (!ScrumHelper.state.enableToggle) return;
        setTimeout(function () { //to apply this after google has autofilled
            var name = ScrumHelper.state.githubUserData.name || ScrumHelper.state.githubUsername;
            var project = ScrumHelper.getProject();
            var curDate = new Date();
            var year = curDate.getFullYear().toString();
            var date = curDate.getDate();
            var month = curDate.getMonth();
            month++;
            if (month < 10)
                month = "0" + month;
            if (date < 10)
                date = "0" + date;
            var dateCode = year.toString() + month.toString() + date.toString();
            ScrumHelper.state.scrumSubject.value = "[Scrum] " + name + " - " + project + " - " + dateCode + " - False";
            ScrumHelper.state.scrumSubject.dispatchEvent(new Event("input", { bubbles: true }));
        });
    },

    getChromeData() {
        chrome.storage.local.get(["githubUsername", "projectName", "enableToggle", "startingDate", "endingDate", "showOpenLabel", "showClosedLabel", "lastWeekContribution", "userReason", "gsoc"], function (items) {
            if (items.gsoc) {//gsoc
                ScrumHelper.state.gsoc = 1;
            }
            else {
                ScrumHelper.state.gsoc = 0;//codeheat
            }
            if (items.lastWeekContribution) {
                ScrumHelper.state.lastWeekContribution = true;
                ScrumHelper.handleLastWeekContributionChange();
            }
            if (!items.enableToggle) {
                ScrumHelper.state.enableToggle = items.enableToggle;

            }
            if (items.endingDate && !ScrumHelper.state.lastWeekContribution) {
                ScrumHelper.state.endingDate = items.endingDate;
            }
            if (items.startingDate && !ScrumHelper.state.lastWeekContribution) {
                ScrumHelper.state.startingDate = items.startingDate;
            }
            if (items.githubUsername) {
                ScrumHelper.state.githubUsername = items.githubUsername;
                ScrumHelper.fetchGithubData();
            } else {
                console.warn('No GitHub username found in storage');
            }
            if (items.projectName) {
                ScrumHelper.state.projectName = items.projectName;
            }

            if (!items.showOpenLabel) {
                ScrumHelper.state.showOpenLabel = false;
                ScrumHelper.state.pr_unmerged_button = "";
                ScrumHelper.state.issue_opened_button = "";
            }
            if (!items.showClosedLabel) {
                ScrumHelper.state.showClosedLabel = false;
                ScrumHelper.state.pr_merged_button = "";
                ScrumHelper.state.issue_closed_button = "";
            }
            if (items.userReason) {
                ScrumHelper.state.userReason = items.userReason;
            }
            if (!items.userReason) {
                ScrumHelper.state.userReason = "No Blocker at the moment";
            }

        });
    },

    handleRefresh() {
        ScrumHelper.getChromeData();
    },

    initialize() {
        ScrumHelper.getChromeData();

        var intervalBody = setInterval(function () {
            if (!window.emailClientAdapter) return;

            const elements = window.emailClientAdapter.getEditorElements();
            if (!elements || !elements.body) return;

            clearInterval(intervalBody);
            ScrumHelper.state.scrumBody = elements.body;
            ScrumHelper.writeScrumBody();
        }, 500);
        
        var intervalSubject = setInterval(function () {
            if (!ScrumHelper.state.githubUserData || !window.emailClientAdapter) return;

            const elements = window.emailClientAdapter.getEditorElements();
            if (!elements || !elements.subject) return;

            clearInterval(intervalSubject);
            ScrumHelper.state.scrumSubject = elements.subject;
            ScrumHelper.scrumSubjectLoaded();
        }, 500);


        //check for github safe writing
        var intervalWriteGithub = setInterval(function () {
            if (ScrumHelper.state.scrumBody && ScrumHelper.state.githubUsername && ScrumHelper.state.githubIssuesData) {
                clearInterval(intervalWriteGithub);
                ScrumHelper.writeGithubIssuesPrs();
            }
        }, 500);
        //check for github prs reviews safe writing
        var intervalWriteGithubReviews = setInterval(function () {
            if (ScrumHelper.state.scrumBody && ScrumHelper.state.githubUsername && ScrumHelper.state.githubPrsReviewData) {
                clearInterval(intervalWriteGithubReviews);
                ScrumHelper.writeGithubPrsReviews();
            }
        }, 500);
        if (!ScrumHelper.state.refreshButton_Placed) {
            var intervalWriteButton = setInterval(function () {
                if (document.getElementsByClassName("F0XO1GC-x-b").length == 3 && ScrumHelper.state.scrumBody && ScrumHelper.state.enableToggle) {
                    ScrumHelper.state.refreshButton_Placed = true;
                    clearInterval(intervalWriteButton);
                    var td = document.createElement("td");
                    var button = document.createElement("button");
                    button.style = "background-image:none;background-color:#3F51B5;";
                    button.setAttribute("class", "F0XO1GC-n-a F0XO1GC-G-a");
                    button.title = "Rewrite your SCRUM using updated settings!";
                    button.id = "refreshButton";
                    var elemText = document.createTextNode("↻ Rewrite SCRUM!");
                    button.appendChild(elemText);
                    td.appendChild(button);
                    document.getElementsByClassName("F0XO1GC-x-b")[0].children[0].children[0].appendChild(td);
                    document.getElementById("refreshButton").addEventListener("click", ScrumHelper.handleRefresh);
                }
            }, 1000);
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ScrumHelper.initializePopupListeners();
    ScrumHelper.initialize();
});

$("button>span:contains(New conversation)").parent("button").click(function () {
	ScrumHelper.handleRefresh();
});
