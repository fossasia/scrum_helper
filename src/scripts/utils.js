function validateDate(date){

    return date !== null;

}

function formatDate(date){

    return date.toISOString().split('T')[0];

}

module.exports = {

    validateDate,
    formatDate

};