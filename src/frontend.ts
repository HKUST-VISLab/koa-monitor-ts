let visData = [];
let schemas = ['cpu', 'memory', 'count', 'responseTime'];
let schema2Title = { 'cpu': 'CPU Usage', 'memory': 'Memory Usage', 'responseTime': 'Response Time', 'count': 'Request Frequency' };
let schema2Unit = { 'cpu': '%', 'memory': 'MB', 'responseTime': 'ms', 'count': '' }
let id2Values = {};
let dataLen = 60;

let width = 600;
let height = 600;
let dataList = [];
let timestamps = [];

let marginTopAndBottom = 30;
let marginLeftAndRight = 10
let left = 200;
let now = 0;
let duration = 1000;

let yScales = [];
let largestYValue = [];
let axisMarginBottom = 15;
let legendHeight = 30;


schemas.forEach((d, i) => {
    let values = [];
    visData.push(values);
    id2Values[i] = values;
});

let svg = d3.select('#container').append('svg')
    .attr('height', height + legendHeight).attr('width', width);


let legend = svg.append('text').attr('class', 'legend').text('Koa Status');
let legendBox = legend.node().getBBox();
legend.attr('x', 10).attr('y', legendBox['height'] + 5);

let current = new Date();
var datestring = current.getDate() + "-" + (current.getMonth() + 1) + "-" + current.getFullYear() + " "
    + current.getHours() + ":" + current.getMinutes() + ":" + current.getSeconds();
let timeElement = svg.append('text').attr('class', 'legend').text(datestring);
let timeBox = timeElement.node().getBBox();
timeElement.attr('x', width - timeBox['width'] - 20).attr('y',timeBox['height'] + 5);

let container = svg.append('g').attr('transform', 'translate(0, 40)');

let statusContainers = container.selectAll('.status')
    .data(visData).enter()
    .append('g').attr('class', 'status')
    .attr('transform', (d, i) => {
        return 'translate(0,' + i * height / visData.length + ')'
    });


statusContainers.each(function (d, i) {
    let container = d3.select(this);
    let title = container.append('text').attr('class', 'label').text(schema2Title[schemas[i]]);
    let box = title.node().getBBox();
    title.attr('x', 10).attr('y', box.height + 10)
    let value = container.append('text').attr('class', 'value').text();
    let lineChart = container.append('path')
});


schemas.forEach((d, i) => {
    largestYValue.push(1);
    yScales[i] = d3.scaleLinear()
        .domain([0, 2])
        .range([height / visData.length - marginTopAndBottom - axisMarginBottom, marginTopAndBottom]);
})


let xScale = d3.scaleTime()
    // .domain([now - (dataLen - 1) * duration, now])
    .range([0, width - left - marginLeftAndRight * 2]);


let chartContainers = statusContainers.append('g')
    .attr('transform', (d, i) => {
        return 'translate(' + left + ',0)';
    });

chartContainers.append('rect').attr('class', 'rect')
    .attr('x', marginLeftAndRight).attr('y', marginTopAndBottom)
    .attr('width', width - left - marginLeftAndRight * 2)
    .attr('height', height / visData.length - marginTopAndBottom * 2)
    .attr('fill', 'none');


chartContainers.each(function (d, i) {
    let container = d3.select(this);
    container.append('g').attr('class', 'xAxis')
        .attr('transform', 'translate(' + marginLeftAndRight + ',' + (height / visData.length - marginTopAndBottom - axisMarginBottom) + ')')
        .attr('opacity', 0.5)
        .call(d3.axisBottom(xScale));

    let leftAxis = d3.axisLeft(yScales[i])


    container.append('g').attr('class', 'yAxis')
        .attr('transform', 'translate(' + marginLeftAndRight + ',' + 0 + ')')
        .attr('opacity', 0.5)
        .call(leftAxis);

    container.append('g')
        .attr('transform', 'translate(' + marginLeftAndRight + ',' + 0 + ')')
        .append('path').attr('class', 'lineChart')
        .datum(d)
        .attr("fill", "none")
        .attr("stroke", "steelblue");
});


let updateData = function (visData) {
    now = new Date(timestamps[timestamps.length - 1]);
    // xScale.domain([timestamps[0], now]);
    xScale.domain([now - (dataLen - 1) * duration, now])
    visData.forEach((dataList, index) => {
        if (dataList.length == 0) {
            return
        }
        if (largestYValue[index] < dataList[dataList.length - 1]) {
            largestYValue[index] = dataList[dataList.length - 1];
            yScales[index].domain([0, largestYValue[index]]);
        }
    });

    statusContainers.each(function (d, index) {
        let container = d3.select(this);
        let v = d[d.length - 1];
        v = Math.floor(v * 100) / 100;
        v += schema2Unit[schemas[index]];
        let value = container.select('.value').text(v);
        let box = value.node().getBBox();
        value.attr('x', 10).attr('y', box.height + 40);
    });
    chartContainers.each(function (d, index) {
        let container = d3.select(this);
        container.select('.xAxis')
            .transition()
            .duration(duration)
            .ease(d3.easeLinear)
            .call(d3.axisBottom(xScale));

        let yAxis = d3.axisLeft(yScales[index]);
        yAxis.tickSize(-1 * width).ticks(5);

        container.select('.yAxis')
            .transition()
            .duration(duration)
            .ease(d3.easeLinear)
            .call(yAxis);
        container.selectAll(".tick line").attr("stroke", "#777").attr("stroke-dasharray", "2,2");

        let line = d3.line()
            .x((d, i) => xScale(timestamps[i]))
            .y((d, i) => yScales[index](d));

        container.select('.lineChart')
            .datum(d)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", line);
    });

    let current = new Date();
    let datestring = current.getDate() + "-" + (current.getMonth() + 1) + "-" + current.getFullYear() + " "
        + current.getHours() + ":" + current.getMinutes() + ":" + current.getSeconds();
    timeElement.text(datestring);
}


var socket = io();

socket.on('welcome', function (data) {
    socket.emit('i am client', { data: 'foo!', id: data.id });
});

socket.on('stats', function (data) {
    if (data.timeRange == 1) {
        schemas.forEach((attr, index) => {
            let d = Math.floor(data.responses[attr] * 10000) / 10000;
            id2Values[index].push(d);
            if (id2Values[index].length > dataLen) {
                id2Values[index].shift();
            }
        })
        timestamps.push(data.responses.timestamp);
        if (timestamps.length > dataLen) {
            timestamps.shift();
        }
        updateData(visData);
    }
});
