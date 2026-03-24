function isDateRangeValid(fromDate,toDate){

    if(!fromDate || !toDate){
        return false;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    return from <= to;

}

module.exports = {
    isDateRangeValid
};