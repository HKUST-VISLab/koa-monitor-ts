console.log("We are here!");

let visData = [];
let schemas = ['cpu', 'memory', 'count', 'responseTime'];
let schema2Title = { 'cpu': 'CPU Usage', 'memory': 'Memory Usage', 'responseTime': 'Response Time', 'count': 'Request Frequency:' };
let id2Values = {};
let dataLen = 5;

schemas.forEach((d, i) => {
    let values = [];
    visData.push(values);
    id2Values[i] = values;
});



let width = 600;
let height = 800;
let dataList = [];
let svg = d3.select('#container').append('svg')
    .attr('height', height).attr('width', width);

console.log('visData', visData)
let statusContainers = svg.selectAll('.status')
    .data(visData).enter()
    .append('g').attr('class', 'status')
    .attr('transform', (d, i) => {
        return 'translate(0,' + i * height / visData.length + ')'
    })

statusContainers.append('rect').attr('width', width).attr('height', height / visData.length)
    .attr('stroke', 'blue').attr('stroke-opacity', (d, i) => {
        return i * 0.2;
    })
    .attr('fill', 'none')
statusContainers.each(function (d, i) {
    let container = d3.select(this);
    let title = container.append('text').attr('class', 'label').text(schema2Title[schemas[i]]);
    let box = title.node().getBBox();
    title.attr('x', 10).attr('y', box.height + 10)
    console.log('box', schema2Title[schemas[i]], box);
    let value = container.append('text').attr('class', 'value').text();
});

let upateData = function () {
    statusContainers.each(function (d, index) {
        let container = d3.select(this);
        let value = container.select('.value').text(d[d.length - 1]);
        let box = value.node().getBBox();
        value.attr('x', 10).attr('y', box.height + 40);
    })
}


var socket = io();

socket.on('welcome', function (data) {
    console.log('imhere')
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
        upateData();
        addMessage(visData[0]);
    }
});

function addMessage(message) {
    d3.select('#messages').text(message);
    // var text = document.createTextNode(message),
    //     el = document.createElement('li'),
    //     messages = document.getElementById('messages');
    // el.appendChild(text);
    // messages.appendChild(el);
}