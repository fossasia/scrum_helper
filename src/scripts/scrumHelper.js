var scrumBody = null;
var scrumSubject = null;
var name = "<your name>";
var startingDate="";
var endingDate="";
var githubUsername="";
var lastWeekArray=[];
var nextWeekArray=[];
var reviewedPrsArray=[];
var githubIssuesData=null;
var githubPrsReviewData=null;
var githubPrsReviewDataRendered = {};
var showOpenLabel=true;
var enableToggle=true;
var showClosedLabel=true;
var pr_merged_button='<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
var pr_unmerged_button='<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

var issue_closed_button='<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
var issue_opened_button='<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

var linkStyle="";
chrome.storage.local.get(["name","githubUsername","enableToggle","startingDate","endingDate","showOpenLabel","showClosedLabel"],function(items){
    if(items.name){
        name= items.name;
    }
    if(!items.enableToggle){
        enableToggle=items.enableToggle;
    }
    if(items.endingDate){
        endingDate= items.endingDate;
    }
    if(items.startingDate){
        startingDate= items.startingDate;
    }
    if(items.githubUsername){
        githubUsername=items.githubUsername;
        fetchGithubIssuesData();
    }
    if(!items.showOpenLabel){
        showOpenLabel=false;
        pr_unmerged_button="";
        issue_opened_button="";
    }
    if(!items.showClosedLabel){
        showClosedLabel=false;
        pr_merged_button="";
        issue_closed_button="";
    }
});

// fetch github data
function fetchGithubIssuesData(){
    var url="https://api.github.com/search/issues?q=author%3A"+githubUsername+"+org%3Afossasia+created%3A"+startingDate+".."+endingDate;
    $.ajax({
		dataType: "json",
		type: "GET",
		url: url,
		error: function(xhr,textStatus,errorThrown) {
            console.log(textStatus);
		},
		success: function (data) {
            githubIssuesData=data;
        }
    });
    // fetch github prs review data
    var url="https://api.github.com/search/issues?q=commenter%3A"+githubUsername+"+org%3Afossasia+updated%3A"+startingDate+".."+endingDate;
    console.log(url);
    $.ajax({
		dataType: "json",
		type: "GET",
		url: url,
		error: function(xhr,textStatus,errorThrown) {
            console.log(textStatus);
		},
		success: function (data) {
            githubPrsReviewData=data;
        }
    });
}
//load initial text in scrum body
function writeScrumBody(){
    if(!enableToggle)
    return;
    var lastWeekUl="<ul>";
    for(var i of lastWeekArray)
        lastWeekUl+=i;
    for(var i of reviewedPrsArray)
        lastWeekUl+=i;
    lastWeekUl+="</ul>";

    var nextWeekUl="<ul>";
    for(var i of nextWeekArray)
        nextWeekUl+=i;
    nextWeekUl+="</ul>";

    scrumBody.innerHTML="<b>1. What did I do last week?</b>\
    <br>"+lastWeekUl+"<br><br>\
    <b>2. What I plan to do this week?</b>\
    <br>"+nextWeekUl+"<br><br>\
    <b>3. What is stopping me from doing my work?</b>\
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;No blocker at the moment</p>";
}

//load initial scrum subject
function scrumSubjectLoaded(){
    if(!enableToggle)
    return;
    var project = "SUSI.AI";
    var curDate = new Date();
    var year=curDate.getFullYear().toString();
    var date=curDate.getUTCDate();
    var month=curDate.getMonth();
    month++;
    if(month<10)
        month="0"+month;
    if(date<10)
        date="0"+date;
    var dateCode=year.toString()+month.toString()+date.toString();
    console.log("Executed")
    scrumSubject.value = "[SCRUM] "+name+" - "+project+" - "+dateCode+" - FALSE"
}

// write PRs Reviewed
function writeGithubPrsReviews(){
    var githubPrsReviewDataProccessed={};
    var items=githubPrsReviewData.items;
    for(var item of items){
        console.log(item)
        if(item.user.login == githubUsername || !item.pull_request) continue;
        var repository_url=item.repository_url;
        var project=repository_url.substr(repository_url.lastIndexOf("/")+1);
        var title=item.title;
        var number= item.number;
        var html_url=item.html_url;
        if(!githubPrsReviewDataProccessed[project]){// first pr in this repo
            githubPrsReviewDataProccessed[project]=[];
        }
        var obj={
            number:number,
            html_url:html_url,
            title:title
        };
        githubPrsReviewDataProccessed[project].push(obj);
    }
    for(var repo in githubPrsReviewDataProccessed){
        var repoLi="<li> \
        <i>("+repo+")</i> - Reviewed ";
        if(githubPrsReviewDataProccessed[repo].length>1)
        repoLi+="PRs - ";
        else {
            repoLi+="PR - ";
        }
        var i=0;
        for(var pr in githubPrsReviewDataProccessed[repo]){
            console.log("PR:");
            var pr_arr=githubPrsReviewDataProccessed[repo][pr];
            console.log(pr_arr);
            var prText="";
            if(i!==0){
                prText+=", ";
            }
            prText+="<a href='"+pr_arr.html_url+"' target='_blank'>#"+pr_arr.number+"</a>("+pr_arr.title+")";
            repoLi+=prText;
            i++;
        }
        repoLi+="</li>";
        reviewedPrsArray.push(repoLi);
    }
    writeScrumBody();
    console.log(githubPrsReviewDataProccessed)
}
//write issues and Prs from github
function writeGithubIssuesPrs(){
    var data=githubIssuesData;
    var items=data.items;
    for(var i =0;i<items.length;i++){
        var item=items[i];
        var html_url=item.html_url;
        var repository_url=item.repository_url;
        var project=repository_url.substr(repository_url.lastIndexOf("/")+1);
        var title=item.title;
        var number= item.number;
        var li="";
        if(item.pull_request){
            // is a pull request
            if(item.state==="closed"){
                // is closed PR
                li="<li><i>("+project+")</i> - Made PR(#"+number+") - <a href='"+html_url+"' style='"+linkStyle+"' target='_blank'>"+title+"</a> "+pr_merged_button+"&nbsp;&nbsp;</li>";
            }
            else if(item.state==="open"){
                // is open PR
                li="<li><i>("+project+")</i> - Made PR(#"+number+") - <a href='"+html_url+"' target='_blank'>"+title+"</a> "+pr_unmerged_button+"&nbsp;&nbsp;</li>";
            }
            else{
                // else
                li="<li><i>("+project+")</i> - Made PR(#"+number+") - <a href='"+html_url+"' target='_blank'>"+title+"</a> &nbsp;&nbsp;</li>";
            }

        }
        else{
            // is a issue
            if(item.state==="open" && item.body.toUpperCase().indexOf("YES")>0){
                //probably the author wants to work on this issue!
                var li2="<li><i>("+project+")</i> - Work on Issue(#"+number+") - <a href='"+html_url+"' target='_blank'>"+title+"</a> "+issue_opened_button+"&nbsp;&nbsp;</li>";
                nextWeekArray.push(li2);
            }
            if(item.state==="open"){
            li="<li><i>("+project+")</i> - Opened Issue(#"+number+") - <a href='"+html_url+"' target='_blank'>"+title+"</a> "+issue_opened_button+"&nbsp;&nbsp;</li>";
            }
            else if(item.state==="closed"){
            li="<li><i>("+project+")</i> - Opened Issue(#"+number+") - <a href='"+html_url+"' target='_blank'>"+title+"</a> "+issue_closed_button+"&nbsp;&nbsp;</li>";
            }
            else{
            li="<li><i>("+project+")</i> - Opened Issue(#"+number+") - <a href='"+html_url+"' target='_blank'>"+title+"</a> </li>";
            }
        }
        lastWeekArray.push(li);
    }
    writeScrumBody();
}
//check for scrum body loaded
var intervalBody = setInterval(function(){
    var scrumBody1=document.getElementById("p-b-0");
    if(scrumBody1){
        clearInterval(intervalBody);
        scrumBody=document.getElementById("p-b-0");
        writeScrumBody();
    }
},1000);

//check for subject loaded
var intervalSubject = setInterval(function(){
    var scrumSubject1=document.getElementById("p-s-0");
    if(scrumSubject1){
        clearInterval(intervalSubject);
        scrumSubject=document.getElementById("p-s-0");
        console.log(scrumSubject)
        scrumSubjectLoaded();
    }
},1000);

//check for github safe writing
var intervalWriteGithub = setInterval(function(){
    if(scrumBody && githubUsername && githubIssuesData){
        clearInterval(intervalWriteGithub);
        writeGithubIssuesPrs();
    }
},1000);
//check for github prs reviews safe writing
var intervalWriteGithubReviews = setInterval(function(){
    if(scrumBody && githubUsername && githubPrsReviewData){
        clearInterval(intervalWriteGithubReviews);
        writeGithubPrsReviews();
    }
},1000);
