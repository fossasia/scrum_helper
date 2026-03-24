function saveCache(data){

    localStorage.setItem("reportData",JSON.stringify(data));

}

function getCache(){

    const data = localStorage.getItem("reportData");

    return JSON.parse(data);

}

module.exports = {

    saveCache,
    getCache

};