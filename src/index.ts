'use strict'
import * as pidusage from "pidusage"
import monitoringMiddlewareWrapper from '../dist/src/index';

export let GLOBALCONFIG = {
    timeout: 2,
    monitorLength: 20,
    spans: [{
        responses: [],
        timeRange: 1
    }, {
        responses: [],
        timeRange: 5
    }, {
        responses: [],
        timeRange: 10
    }]
}


/**
 * @param [Object] statOption
 *   - {number} timestampe: timestamp to generate this status record  
 *   - {number} cpu: the usage of cpu
 *   - {number} memory: the usage of memory
 *   - {number} count: the number of response during the record range
 *   - {number} responseTime: average response time during the record range(timeRange)
 *   - {number} timeRange: the time range of this record
 */
export interface statOption {
    timestamp?: number,
    cpu?: number,
    memory?: number,
    count?: number,
    responseTime?: number,
    timeRange?: number
}

// Return the last element of an array, return null if bad input
function lastElement(array) {
    return (!array || !array.length) ? null : array[array.length - 1];
}

function collectUsage(span) {
    pidusage.stat(process.pid, (err, stat) => {
        // remove the first element of the response list if the length longer than monitorLength
        if (span.responses.length >= GLOBALCONFIG.monitorLength / span.timeRange) span.responses.shift();

        // Collect the memory, cpu, timestamp; 
        // Init the response count, response time and timerange  
        const statRecord: statOption = {
            memory: stat.memory / 1024 / 1024, //Unit: M
            cpu: stat.cpu,
            timestamp: Date.now(),
            count: 0,
            responseTime: 0,
            timeRange: span.timeRange
        };
        span.responses.push(statRecord)
    })
}

function responseCount(lastResponses) {
    lastResponses.forEach(lastResponse => {
        if (!lastResponse) return;
        lastResponse.count++;
        let meanTime: number = lastResponse.responseTime;
        lastResponse.responseTime = meanTime + (GLOBALCONFIG.timeout * 1000 - meanTime) / lastResponse.count;
    })

}

function responseTime(startTime, lastResponses) {
    lastResponses.forEach(lastResponse => {
        if (!lastResponse) return;
        let responseTime: number = process.hrtime(startTime);
        responseTime = responseTime[0] * 10e3 + responseTime[1] * 10E-6;
        let meanTime: number = lastResponse.responseTime;
        lastResponse.responseTime = meanTime + (responseTime - GLOBALCONFIG.timeout * 1000) / lastResponse.count;
    })
}

function startMonitoring() {
    GLOBALCONFIG.spans.forEach((span) => {
        const interval: any = setInterval(() => collectUsage(span), span.timeRange * 1000);
        interval.unref()
    })

}

export default function monitoringMiddlewareWrapper(app, config) {
    startMonitoring();
    return async function monitoring(ctx, next) {
        const startTime = process.hrtime();
        let lastResponses = [];
        GLOBALCONFIG.spans.forEach(function (span) {
            lastResponses.push(lastElement(span.responses));
        })
        responseCount(lastResponses);
        console.log(GLOBALCONFIG.spans[0])
        await next();
        responseTime(startTime, lastResponses);
    }
}
