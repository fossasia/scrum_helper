document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateReport');
    const copyBtn = document.getElementById('copyReport');
    
    generateBtn.addEventListener('click', function() {
        this.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
        this.disabled = true;
        
        // Call the scrum generation function
        window.generateScrumReport();
    });
    
    copyBtn.addEventListener('click', function() {
        const scrumReport = document.getElementById('scrumReport');
        const range = document.createRange();
        range.selectNodeContents(scrumReport);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        Materialize.toast('Report copied to clipboard!', 3000);
    });
});