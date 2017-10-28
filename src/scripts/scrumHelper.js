/* global $*/
var scrumBody = null;
var scrumSubject = null;
var startingDate="";
var endingDate="";
var githubUsername="";
var lastWeekArray=[];
var nextWeekArray=[];
var reviewedPrsArray=[];
var githubIssuesData=null;
var githubPrsReviewData=null;
var githubUserData=null;
var githubPrsReviewDataProccessed = {};
var showOpenLabel=true;
var enableToggle=true;
var showClosedLabel=true;
var pr_merged_button="<div style=\"vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;\" class=\"State State--purple\">closed</div>";
var pr_unmerged_button="<div style=\"vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;\"  class=\"State State--green\">open</div>";

var issue_closed_button="<div style=\"vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;\" class=\"State State--purple\">closed</div>";
var issue_opened_button="<div style=\"vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;\"  class=\"State State--green\">open</div>";

var linkStyle="";
chrome.storage.local.get(["githubUsername","enableToggle","startingDate","endingDate","showOpenLabel","showClosedLabel"],function(items){
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
		fetchGithubData();
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
function fetchGithubData(){
	var issueUrl="https://api.github.com/search/issues?q=author%3A"+githubUsername+"+org%3Afossasia+created%3A"+startingDate+".."+endingDate;
	$.ajax({
		dataType: "json",
		type: "GET",
		url: issueUrl,
		error: function(xhr,textStatus,errorThrown) {
			// error
		},
		success: function (data) {
			githubIssuesData=data;
		}
	});
	// fetch github prs review data
	var prUrl="https://api.github.com/search/issues?q=commenter%3A"+githubUsername+"+org%3Afossasia+updated%3A"+startingDate+".."+endingDate;
	$.ajax({
		dataType: "json",
		type: "GET",
		url: prUrl,
		error: function(xhr,textStatus,errorThrown) {
			// error
		},
		success: function (data) {
			githubPrsReviewData=data;
		}
	});
	// fetch github user data
	var userUrl="https://api.github.com/users/"+githubUsername;
	$.ajax({
		dataType: "json",
		type: "GET",
		url: userUrl,
		error: function(xhr,textStatus,errorThrown) {
			// error
		},
		success: function (data) {
			githubUserData=data;
		}
	});
}

//load initial text in scrum body
function writeScrumBody(){
	if(!enableToggle)
		return;
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
	for(i in githubPrsReviewDataProccessed){
		nextWeekUl+="<li><i>("+i+")</i> - Review more PRs </li>";
	}
	nextWeekUl+="</ul>";

	scrumBody.innerHTML="<b>1. What did I do last week?</b>\
    <br>"+lastWeekUl+"<br><br>\
    <b>2. What I plan to do this week?</b>\
    <br>"+nextWeekUl+"<br><br>\
    <b>3. What is stopping me from doing my work?</b>\
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;No blocker at the moment</p>";
}

function getProject(){
	var project="<project name>";
	var url=window.location.href;
	var projectUrl=url.substr(url.lastIndexOf("/")+1);
	if(projectUrl==="susiai")
		project="SUSI.AI";
	return project;
}
//load initial scrum subject
function scrumSubjectLoaded(){
	if(!enableToggle) return;
	var name = githubUserData.name || githubUsername;
	var project = getProject();
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
	scrumSubject.value = "[Scrum] "+name+" - "+project+" - "+dateCode+" - FALSE";
}

// write PRs Reviewed
function writeGithubPrsReviews(){
	var items=githubPrsReviewData.items;
	var i;
	for(i=0;i<items.length;i++){
		var item=items[i];
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
		if(githubPrsReviewDataProccessed[repo].length<=1){
			for(var pr in githubPrsReviewDataProccessed[repo]){
				var pr_arr=githubPrsReviewDataProccessed[repo][pr];
				var prText="";
				prText+="<a href='"+pr_arr.html_url+"' target='_blank'>#"+pr_arr.number+"</a> ("+pr_arr.title+")";
				repoLi+=prText;
			}
		}
		else{
			repoLi+="<ul>";
			for(var pr1 in githubPrsReviewDataProccessed[repo]){
				var pr_arr1=githubPrsReviewDataProccessed[repo][pr1];
				var prText1="";
				prText1+="<li><a href='"+pr_arr1.html_url+"' target='_blank'>#"+pr_arr1.number+"</a> ("+pr_arr1.title+")</li>";
				repoLi+=prText1;
			}
			repoLi+="</ul>";
		}
		repoLi+="</li>";
		reviewedPrsArray.push(repoLi);
	}
	writeScrumBody();
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
				li="<li><i>("+project+")</i> - Made PR (#"+number+") - <a href='"+html_url+"' style='"+linkStyle+"' target='_blank'>"+title+"</a> "+pr_merged_button+"&nbsp;&nbsp;</li>";
			}
			else if(item.state==="open"){
				// is open PR
				li="<li><i>("+project+")</i> - Made PR (#"+number+") - <a href='"+html_url+"' target='_blank'>"+title+"</a> "+pr_unmerged_button+"&nbsp;&nbsp;</li>";
			}
			else{
				// else
				li="<li><i>("+project+")</i> - Made PR (#"+number+") - <a href='"+html_url+"' target='_blank'>"+title+"</a> &nbsp;&nbsp;</li>";
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
	var scrumBody0=document.getElementById("p-b-0");
	var scrumBody1=document.getElementById("p-b-1");
	var scrumBody2=document.getElementById("p-b-2");
	if(scrumBody0){
		clearInterval(intervalBody);
		scrumBody=document.getElementById("p-b-0");
		writeScrumBody();
	}
	if(scrumBody1){
		clearInterval(intervalBody);
		scrumBody=document.getElementById("p-b-1");
		writeScrumBody();
	}
	if(scrumBody2){
		clearInterval(intervalBody);
		scrumBody=document.getElementById("p-b-2");
		writeScrumBody();
	}
},1000);

//check for subject loaded
var intervalSubject = setInterval(function(){
	var scrumSubject0=document.getElementById("p-s-0");
	var scrumSubject1=document.getElementById("p-s-1");
	var scrumSubject2=document.getElementById("p-s-2");
	if(scrumSubject0 && githubUserData){
		clearInterval(intervalSubject);
		scrumSubject=document.getElementById("p-s-0");
		scrumSubjectLoaded();
	}
	else if(scrumSubject1 && githubUserData){
		clearInterval(intervalSubject);
		scrumSubject=document.getElementById("p-s-1");
		scrumSubjectLoaded();
	}
	else if(scrumSubject2 && githubUserData){
		clearInterval(intervalSubject);
		scrumSubject=document.getElementById("p-s-2");
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
