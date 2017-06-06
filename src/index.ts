"use strict";


import * as pidusage from "pidusage";
import * as socketIo from "socket.io";
import * as handlebars from "handlebars";
import * as path from "path";
import * as fs from "mz/fs";


export let GLOBALCONFIG = {
    path: "/status",
    timeout: 2,
    monitorLength: 20,
    spans: [{
        responses: [],
        timeRange: 1,
    }, {
        responses: [],
        timeRange: 5,
    }, {
        responses: [],
        timeRange: 10,
    }],
};

let io = null;

/**
 * @param [Object] statOption
 *   - {number} timestampe: timestamp to generate this status record
 *   - {number} cpu: the usage of cpu
 *   - {number} memory: the usage of memory
 *   - {number} count: the number of response during the record range
 *   - {number} responseTime: average response time during the record range(timeRange)
 *   - {number} timeRange: the time range of this record
 */
export interface StatOption {
    timestamp?: number;
    cpu?: number;
    memory?: number;
    count?: number;
    responseTime?: number;
    timeRange?: number;
}

// Return the last element of an array, return null if bad input
function lastElement(array) {
    return (!array || !array.length) ? null : array[array.length - 1];
}

function collectUsage(span) {
    pidusage.stat(process.pid, (err, stat) => {
        // remove the first element of the response list if the length longer than monitorLength
        if (span.responses.length >= GLOBALCONFIG.monitorLength / span.timeRange) {
            span.responses.shift();
        }
        // Collect the memory, cpu, timestamp;
        // Init the response count, response time and timerange
        const statRecord: StatOption = {
            memory: stat.memory / 1024 / 1024, // Unit: M
            cpu: stat.cpu,
            timestamp: Date.now(),
            count: 0,
            responseTime: 0,
            timeRange: span.timeRange,
        };
        span.responses.push(statRecord);
        emitStat(span);
    });
}

function responseCount(lastResponses) {
    lastResponses.forEach((lastResponse) => {
        if (!lastResponse) { return; }
        lastResponse.count++;
        const meanTime: number = lastResponse.responseTime;
        lastResponse.responseTime = meanTime + (GLOBALCONFIG.timeout * 1000 - meanTime) / lastResponse.count;
    });
}

function responseTime(startTime, lastResponses) {
    lastResponses.forEach((lastResponse) => {
        if (!lastResponse) { return; }
        let responseTime: number = process.hrtime(startTime);
        responseTime = responseTime[0] * 10e3 + responseTime[1] * 10E-6;
        const meanTime: number = lastResponse.responseTime;
        lastResponse.responseTime = meanTime + (responseTime - GLOBALCONFIG.timeout * 1000) / lastResponse.count;
    });
}

function startMonitoring() {
    GLOBALCONFIG.spans.forEach((span) => {
        const interval: any = setInterval(() => {
            collectUsage(span);
        }, span.timeRange * 1000);
        interval.unref();
    });
}

function emitStat(span) {
    io.emit("stats", {
        responses: span.responses[span.responses.length - 2],
        timeRange: span.timeRange,
    });
}


export default function monitoringMiddlewareWrapper(app, config) {
    io = socketIo().listen(app);
    io.on('connection', (socket) => {
        console.log('Connected');
        socket.emit('welcome', { message: 'Welcome!', id: socket.id });
    })
    startMonitoring();

    return async function monitoring(ctx, next) {
        const htmlFilePath = path.join(__dirname, "index.html");
        const monitoringHtml = fs.readFileSync(htmlFilePath, { encoding: "utf8" })
        const template = handlebars.compile(monitoringHtml)
        if (ctx.path === GLOBALCONFIG.path) {
            ctx.body = template(GLOBALCONFIG);
        }
        ctx.body = template(GLOBALCONFIG)
        const startTime = process.hrtime();
        const lastResponses = [];
        GLOBALCONFIG.spans.forEach((span) => {
            lastResponses.push(lastElement(span.responses));
        });
        responseCount(lastResponses);
        await next();
        responseTime(startTime, lastResponses);
    };
};





