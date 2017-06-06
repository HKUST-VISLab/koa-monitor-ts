import monitor from '../index'
import * as koa from "koa"
import * as Router from 'koa-router'

const app = new koa()

app.use(monitor(app, null))
let router = new Router()
    .get('/', async (ctx, next) => {
        ctx.body = 'Hello World'
    })
    
app.use(router.routes())
app.listen(3000)
