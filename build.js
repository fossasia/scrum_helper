const validateUsername = (username) => typeof username === 'string' && username.trim() !== '' && username.length <= 39; 
const setUsernameError = (error) => { 
  const inputField = document.getElementById('github-username'); 
  if (error) { 
    inputField.style.border = '1px solid red'; 
    const errorMessage = document.createElement('div'); 
    errorMessage.textContent = 'Username is required'; 
    errorMessage.style.color = 'red'; 
    errorMessage.setAttribute('role', 'alert'); 
    inputField.parentNode.appendChild(errorMessage); 
  } else { 
    inputField.style.border = ''; 
    const errorMessage = inputField.parentNode.querySelector('div'); 
    if (errorMessage) { 
      inputField.parentNode.removeChild(errorMessage); 
    } 
  } 
}; 
const handleUsernameInput = (event) => { 
  const username = event.target.value; 
  const error = !validateUsername(username); 
  setUsernameError(error); 
}; 
document.getElementById('github-username').addEventListener('input', handleUsernameInput);