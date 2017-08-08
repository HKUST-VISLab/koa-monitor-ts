import monitor from '../index'
import * as koa from "koa"
import * as Router from 'koa-router'

const app = new koa()

app.use(monitor(app, {path:'/status'}))
let router = new Router()
    .get('/', async (ctx, next) => {
        ctx.body = 'Hello World2'
    })
    
app.use(router.routes())
app.listen(3000)
