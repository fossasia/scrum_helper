document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateReport');
    const copyBtn = document.getElementById('copyReport');

    generateBtn.addEventListener('click', function() {
        this.innerHTML = '<i class"fa fa-spinner fa-spi"></i> Generating...';
        this.disabled = true;

        window.generateScrumReport();
    });

    copyBtn.addEventListener('click', function() {
        const scrumReport = document.getElementById('scrumReport');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scrumReport.innerHTML;

        const links = tempDiv.getElementsByTagName('a');
        Array.from(links).forEach(link => {
            const title = link.textContent;
            const url = link.href;
            const markdownLink = `[${title}](${url})`;
            link.outerHTML = markdownLink;
        });

        const stateButtons = tempDiv.getElementsByClassName('State');
        Array.from(stateButtons).forEach(button => {
            button.remove();
        });

        tempDiv.innerHTML = tempDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n');

        const listItems = tempDiv.getElementsByTagName('li');
        Array.from(listItems).forEach(item => {
            item.innerHTML = '\n- '+ item.innerHTML;
        });

        tempDiv.innerHTML = tempDiv.innerHTML.replace(/<\/?ul>/gi, '\n');
        let textContent = tempDiv.textContent;
        textContent = textContent.replace(/\n\s*\n/g, '\n\n');
        textContent = textContent.trim();

        const textArea = document.createElement('textarea');
        textArea.value = textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        
    })





})