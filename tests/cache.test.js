/**
 * @jest-environment jsdom
 */

const {saveCache, getCache} = require('../src/scripts/cacheUtils');

test("cache saves data",()=>{

    const mockData = {

    name:"test",
    issues:5

    };

    saveCache(mockData);

    const result = getCache();

    expect(result.name).toBe("test");

});

test("cache retrieves correct data",()=>{

    const mockData = {

    repo:"scrum",
    prs:10

    };

    saveCache(mockData);

    const result = getCache();

    expect(result.prs).toBe(10);

});