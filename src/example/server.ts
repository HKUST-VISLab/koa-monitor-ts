import monitor from '../index'
import * as koa from "koa"
import * as Router from 'koa-router'
import * as http from "http"

const app = new koa()
const server = http.createServer(app.callback())
app.use(monitor(server, null))
let router = new Router()
    .get('/', async (ctx, next) => {
        ctx.body = 'Hello World'
    })
    
app.use(router.routes())
server.listen(3000)
