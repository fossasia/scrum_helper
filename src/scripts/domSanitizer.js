const SCRUM_SANITIZER_CONFIG = {
    ALLOWED_TAGS: ['a','b','br','div','i','span','li','ul'],
    ALLOWED_ATTR: ['class','style','href','target','rel','contenteditable'],
    FORBID_TAGS:['image','script','iframe','object','embed'],
    FORBID_ATTR:['onerror','onload','onclick','onmouseover']
};

function sanitizeHtml(html) {
    if(typeof DOMPurify !== 'undefined'){
        return (DOMPurify.sanitize(html,SCRUM_SANITIZER_CONFIG))
    }
    console.warn('[scrum_helper] DOMPurify unavailable, falling back to Text')
    const div = document.createElement('div');
    div.innerHTML= html;
    return div.textContent || div.innerText || '';
}