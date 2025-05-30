document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateReport');
    const copyBtn = document.getElementById('copyReport');
    
    generateBtn.addEventListener('click', function() {
        this.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
        this.disabled = true;
        
        window.generateScrumReport();
    });
    
    copyBtn.addEventListener('click', function() {
        const scrumReport = document.getElementById('scrumReport');
        
        // Create container for HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scrumReport.innerHTML;
        document.body.appendChild(tempDiv);
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        
        // Select the content
        const range = document.createRange();
        range.selectNode(tempDiv);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        try {
            // Copy HTML content
            const success = document.execCommand('copy');
            if (!success) {
                throw new Error('Copy command failed');
            }
            Materialize.toast('Report copied with formatting!', 3000, 'green');
        } catch (err) {
            console.error('Failed to copy:', err);
            Materialize.toast('Failed to copy report', 3000, 'red');
        } finally {
            // Cleanup
            selection.removeAllRanges();
            document.body.removeChild(tempDiv);
        }
    });
});