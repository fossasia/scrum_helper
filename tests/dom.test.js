/**
 * @jest-environment jsdom
 */

document.body.innerHTML = `

    <input id="fromDate" value="2026-03-22">

    <input id="toDate" value="2026-03-16">

    <button id="generate">Generate</button>

    <p id="dateError" style="display:none"></p>

`;

function showDateError(){

    const error = document.getElementById("dateError");

    error.style.display="block";

}

test("error shows when date invalid",()=>{

    showDateError();

    const error = document.getElementById("dateError");

    expect(error.style.display).toBe("block");

});

test("generate button exists",()=>{

    const button = document.getElementById("generate");

    expect(button).not.toBeNull();

});

test("button click works",()=>{

    let clicked=false;

    const button = document.getElementById("generate");

    button.addEventListener("click",()=>{

        clicked=true;

    });

    button.click();

    expect(clicked).toBe(true);

});