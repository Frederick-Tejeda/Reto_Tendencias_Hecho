import express from 'express'
import helmet from 'helmet'
import cors from 'cors'

const app = express()

app.use(express.json())
app.use(helmet())
app.use(cors({
    origin: `http://localhost:${process.env.PORT}`,
    credentials: true
}))

app.set('PORT', process.env.PORT || 3001)

export default app