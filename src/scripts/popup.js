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
        
        // Create a temporary div to manipulate the content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scrumReport.innerHTML;
        
        // Convert all links to markdown format
        const links = tempDiv.getElementsByTagName('a');
        Array.from(links).forEach(link => {
            const title = link.textContent;
            const url = link.href;
            const markdownLink = `[${title}](${url})`;
            link.outerHTML = markdownLink;
        });
        
        // Remove the state buttons (open/closed labels)
        const stateButtons = tempDiv.getElementsByClassName('State');
        Array.from(stateButtons).forEach(button => {
            button.remove();
        });
        
        // Replace <br> with newlines
        tempDiv.innerHTML = tempDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n');
        
        // Replace list items with proper formatting
        const listItems = tempDiv.getElementsByTagName('li');
        Array.from(listItems).forEach(item => {
            // Add a newline before each list item and indent with a dash
            item.innerHTML = '\n- ' + item.innerHTML;
        });
        
        // Replace <ul> and </ul> with newlines
        tempDiv.innerHTML = tempDiv.innerHTML.replace(/<\/?ul>/gi, '\n');
        
        // Get the text content
        let textContent = tempDiv.textContent;
        
        // Clean up multiple newlines and spaces
        textContent = textContent.replace(/\n\s*\n/g, '\n\n');  // Replace multiple newlines with double newlines
        textContent = textContent.trim();  // Remove leading/trailing whitespace
        
        // Copy to clipboard
        const textarea = document.createElement('textarea');
        textarea.value = textContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        Materialize.toast('Report copied to clipboard!', 3000);
    });
});